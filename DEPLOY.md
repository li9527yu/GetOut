# 部署手册

把《逃出绝命课题组》放到一台 Linux 服务器上给别人玩。照着做完大约半小时。

整套东西很简单：一个没有依赖的 Node 进程（`game/server.mjs`）提供页面并代理模型请求，前面放一个 Caddy 负责 HTTPS。没有数据库，玩家的存档在他们自己的浏览器里。

```
玩家浏览器 ──HTTPS──▶ Caddy :443 ──▶ Node 127.0.0.1:8787 ──▶ 模型服务商
                                         │
                                         └─ 写 quotes.jsonl（玩家投稿）
```

## 0. 上线前先做这一件事

去模型服务商的控制台，给要用的密钥设一个**消费上限**。服务自己有限流，但那只是减速；真正兜底的是这一条。

## 1. 需要什么

| 项目 | 要求 |
|---|---|
| 服务器 | 1 核 1 G 就够。进程常驻内存约 100 MB |
| 系统 | 任意带 systemd 的 Linux（下面的命令按 Ubuntu / Debian 写） |
| Node | 18 以上 |
| 域名 | 一个，已经解析到这台机器 |
| 端口 | 对外只开 80 和 443 |
| 模型 | 一个 OpenAI 兼容的接口地址和密钥 |

## 2. 第一次部署

```bash
# 装 Node 和 Caddy（Ubuntu / Debian）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs caddy git

# 专门的用户和目录
sudo useradd --system --home /opt/getout --shell /usr/sbin/nologin getout
sudo git clone https://github.com/li9527yu/GetOut.git /opt/getout
sudo chown -R getout:getout /opt/getout

# 密钥
sudo -u getout cp /opt/getout/game/.env.example /opt/getout/game/.env
sudo -u getout nano /opt/getout/game/.env      # 填 LLM_BASE_URL 和 LLM_API_KEY
sudo chmod 600 /opt/getout/game/.env

# 服务
sudo cp /opt/getout/deploy/getout.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now getout

# HTTPS
sudo cp /opt/getout/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile                 # 把 game.example.com 换成你的域名
sudo systemctl reload caddy

# 防火墙
sudo ufw allow 80,443/tcp && sudo ufw enable
```

`.env` 里能填的项：

| 变量 | 必填 | 默认 | 含义 |
|---|---|---|---|
| `LLM_BASE_URL` | 是 | | 模型接口地址，到 `/v1` 为止 |
| `LLM_API_KEY` | 是 | | 密钥 |
| `LLM_MODEL` | | `deepseek-flash` | 便宜快的模型，只改写措辞的地方用 |
| `LLM_MODEL_STRONG` | | 同上 | 要做判断、文笔要求高的地方用 |
| `LLM_PER_MIN` | | 30 | 每个玩家每分钟最多调多少次模型 |
| `LLM_BURST` | | 20 | 每个玩家短时间内最多连发多少次 |
| `LLM_DAILY_MAX` | | 5000 | 所有人加起来每天最多多少次，到顶后游戏退回纯规则 |
| `ADMIN_TOKEN` | | 空 | 想从别的机器看运行情况时设一个长随机串 |
| `LLM_THINKING` | | 关 | 模型的「思考」。默认关掉；写 `1` 才打开。打开后回话会慢好几秒，可能超过界面的等待时间 |
| `LLM_PROVIDER` | | 按地址自动认 | `deepseek` 或 `aliyun`。服务靠它决定用哪个参数关思考；接口地址里看不出是哪家时才需要填 |
| `LLM_EXTRA` | | 空 | 每次请求额外带的参数，写成一行 JSON。别家模型要用别的参数关思考时填 |

`HOST`、`PORT`、`TRUST_PROXY` 已经写在服务单元里，不用放进 `.env`。

## 3. 验证上线成功

逐条过，每条都要对：

```bash
systemctl is-active getout                          # active
curl -s http://127.0.0.1:8787/llm/health            # {"ok":true}
curl -s http://127.0.0.1:8787/stats | head -5       # 一段 JSON
curl -sI https://你的域名/ | head -1                 # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://你的域名/stats       # 404（运行情况不对外）
curl -s -o /dev/null -w '%{http_code}\n' https://你的域名/.env        # 404
curl -s -o /dev/null -w '%{http_code}\n' http://服务器IP:8787/        # 连不上（端口没对外开）
```

然后用手机打开域名，开一局玩到第二周。封面能打开、第一周群里的话是现写的（每次不一样）、事件里有输入框，就说明模型通了。

`{"ok":false}` 表示模型没连上：游戏照样能玩，但全部走固定文本。看第 6 节。

## 4. 更新和回滚

```bash
cd /opt/getout
sudo -u getout git fetch && sudo -u getout git log --oneline HEAD..origin/main   # 先看要更新什么
sudo -u getout git pull
sudo systemctl restart getout
curl -s http://127.0.0.1:8787/llm/health
```

重启会断开正在等模型回话的玩家约一两秒，他们那一步会退回固定文本，进度不丢。

回滚：

```bash
sudo -u getout git log --oneline | head -5          # 找到上一个好的版本
sudo -u getout git checkout <那个版本号>
sudo systemctl restart getout
```

更新不会碰 `.env` 和 `quotes.jsonl`，它们不在仓库里。

改了状态里的字段的版本会自动迁移老存档；玩家不需要做任何事。

## 5. 日志

服务把日志写到标准输出，一件事一行 JSON，systemd 会收进 journald。

```bash
journalctl -u getout -f                              # 实时看
journalctl -u getout --since "1 hour ago" -o cat     # 最近一小时，只要正文
```

| `ev` | 什么时候记 | 主要字段 |
|---|---|---|
| `start` | 启动 | 端口、模型名、限流设置、密钥有没有配上 |
| `page` | 有人打开首页 | `ip` |
| `llm` | 一次模型调用结束 | `slot` 哪个接入点，`ok` 成没成，`ms` 耗时，`aborted` 玩家是不是没等，`in` / `out` 用了多少 token |
| `reject` | 一次调用被限流挡下 | `ip`、`why` 原因 |
| `quote` | 有人投稿 | `ip`、`ok` |
| `error` | 某个请求出了没料到的错 | `msg` |
| `stop` | 收到停止信号 | |

**日志里不记玩家打的字，也不记模型写的内容。** 记了玩家的 IP，用来查滥用；如果你那边对此有合规要求，在 `server.mjs` 的 `log` 函数里去掉 `ip` 字段。

常用的几条查询（需要装 `jq`）：

```bash
# 今天调了多少次模型、成功多少
journalctl -u getout --since today -o cat | jq -c 'select(.ev=="llm")' | jq -s '{调用: length, 成功: (map(select(.ok)) | length)}'

# 每个接入点的平均耗时
journalctl -u getout --since today -o cat | jq -c 'select(.ev=="llm")' | jq -s 'group_by(.slot) | map({slot: .[0].slot, 次数: length, 平均毫秒: (map(.ms) | add / length | floor)})'

# 谁调得最多
journalctl -u getout --since today -o cat | jq -r 'select(.ev=="llm") | .ip' | sort | uniq -c | sort -rn | head

# 今天花了多少 token
journalctl -u getout --since today -o cat | jq -c 'select(.ev=="llm")' | jq -s '{输入: (map(.in // 0) | add), 输出: (map(.out // 0) | add)}'
```

journald 默认会自己控制大小。想明确限制，在 `/etc/systemd/journald.conf` 里设 `SystemMaxUse=500M`。Caddy 的访问日志在 `/var/log/caddy/getout.log`，配置里已经设了 20 MB 一卷、留 10 卷。

## 6. 监控

### 看一眼现在怎么样

```bash
curl -s http://127.0.0.1:8787/stats
```

返回这次启动以来的累计：今天已调用多少次和上限、各接入点的调用数、成功数、平均耗时、超过 7 秒的次数、token 用量、被限流的次数、出错次数、内存。只有登上服务器才能看；从外面访问是 404。

### 自动巡检和告警

`deploy/healthcheck.sh` 每次运行检查五件事，有问题就发到飞书群机器人：

| 检查 | 告警条件 |
|---|---|
| 服务有没有响应 | 8 秒内没回 |
| 模型能不能用 | 健康检查返回不可用 |
| 今天的额度 | 用到每日上限的 80% |
| 调用成功率 | 调用满 30 次后低于 80% |
| 慢调用 | 超过两成的调用超过 7 秒（玩家基本等不到） |
| 内存 | 超过 300 MB |

```bash
sudo crontab -e
# 加一行，每 5 分钟跑一次。WEBHOOK 换成你的飞书群机器人地址；不填就只写日志
*/5 * * * * WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx /opt/getout/deploy/healthcheck.sh >> /var/log/getout-check.log 2>&1
```

注意它是「每次有问题都发」，问题持续的话每 5 分钟会重复提醒一次。

### 从外面探活

巡检脚本跑在同一台机器上，机器整个挂了它也发不出告警。再加一个外部的探活服务（UptimeRobot、阿里云云监控的站点监控都行），每分钟请求一次 `https://你的域名/llm/health`，返回内容里没有 `"ok":true` 就告警。这一个接口同时说明了三件事：机器活着、进程活着、模型能用。

### 模型服务商那边

在控制台设消费告警（比如日消费超过某个数发短信）。服务端的每日上限按进程计，重启会清零；服务商那边的数字才是准的。

成本参考：一次调用的输入约 1200 到 3500 token（提示词加这一局的上下文），输出几十到两百多；一局游戏大约 100 到 150 次调用。现在配的是 DeepSeek 的 `deepseek-flash` 和 `deepseek-v4-pro`。上线后用第 5 节的查询看真实数字。

## 7. 备份

要备份的只有两个文件：

| 文件 | 内容 | 丢了会怎样 |
|---|---|---|
| `/opt/getout/game/.env` | 密钥 | 重新填一遍 |
| `/opt/getout/game/quotes.jsonl` | 玩家投的原话 | 找不回来 |

```bash
# 每天凌晨把投稿拷一份
0 4 * * * cp /opt/getout/game/quotes.jsonl /var/backups/getout-quotes-$(date +\%F).jsonl
```

投稿不会自动进游戏。隔一段时间看一遍 `quotes.jsonl`，挑好的手工并进 `game/corpus.json`，然后提交、更新。**合并时把投稿当作不可信的文字**：去掉能认出具体人的信息，不要原样放进任何像是指令的句子。

## 8. 出问题了怎么办

| 现象 | 先查 | 常见原因 |
|---|---|---|
| 网站打不开 | `systemctl status caddy getout` | 进程没起来；域名没解析对；80/443 没开 |
| 能打开，但话都是固定的 | `curl -s 127.0.0.1:8787/llm/health` | 密钥错了或过期；额度用完；服务商故障。修好后不用重启，45 秒内自动恢复 |
| 部分玩家没有模型 | `journalctl -u getout --since "10 min ago" -o cat \| grep reject` | 被限流。多人共用一个出口地址时把 `LLM_PER_MIN` 调大 |
| 所有人下午开始没有模型 | `curl -s 127.0.0.1:8787/stats \| grep 今天` | 到了每日上限。调大 `LLM_DAILY_MAX` 后重启 |
| 回话很慢，经常等不到 | `/stats` 里的平均毫秒和「超过 7 秒」 | 模型在思考。看启动日志那一行的 `thinking`：是 `true` 说明配了 `LLM_THINKING=1`，去掉它；是 `false` 但 `provider` 是「认不出」，说明服务不知道怎么替这家关，填 `LLM_PROVIDER` 或 `LLM_EXTRA`（DeepSeek 开着思考一次要 6 到 8 秒，关掉约 2 秒）；或者服务商本身慢，把 `LLM_MODEL_STRONG` 换成和 `LLM_MODEL` 一样的快模型 |
| 进程反复重启 | `journalctl -u getout -n 50` | 看最后几行 `error`。内存超过 400 MB 会被 systemd 杀掉重启 |
| 投稿都失败 | `ls -l /opt/getout/game/quotes.jsonl` | 文件到了 2 MB 上限：归档后清空；或者目录权限不对 |
| 限流不按人算，一个人刷大家都被挡 | 日志里的 `ip` 是不是都是 `127.0.0.1` | 服务单元里没有 `TRUST_PROXY=1` |

改了 `.env` 之后要 `sudo systemctl restart getout` 才生效。

## 9. 安全上要知道的

已经做了的：

- Node 只听本机，外面的流量只能从 Caddy 进来。
- 模型接口只认固定的几个接入点；按玩家限流、每日总量封顶、请求大小封顶；只接受本站页面发来的请求。
- 密钥、投稿、语料、服务端源码都取不到。
- 页面带内容安全策略，只运行本站的脚本。
- 模型写的和玩家打的字进页面前全部转义；模型给的数值在引擎里被限制在很小的范围内。
- 服务进程没有系统的写权限，只能写游戏目录。

没有做的，放给很多人之前要想清楚：

- **没有登录，也没有口令。** 知道网址的人都能玩，都会花你的额度，只是速度有上限。只想给熟人玩的话，在 Caddy 里加一层 `basic_auth`。
- **限流记在内存里。** 重启清零；开多个进程的话各记各的。现在的设计就是单进程。
- **`/stats` 在服务器内部没有保护。** 能登上这台机器的人都能看。

## 10. 不用 Caddy 的情况

用 nginx 也可以，注意两点：把玩家地址放进请求头时用 `proxy_set_header X-Forwarded-For $remote_addr;`（不要用会保留客户端自带值的 `$proxy_add_x_forwarded_for`，否则玩家可以伪造地址绕过限流）；并且同样把 `/stats` 挡在外面。

只在自己电脑上玩，不需要这份手册：`cd game && npm start`。
