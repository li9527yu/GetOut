# GetOut · 逃出绝命课题组

一个网页文字游戏：扮演硕士研究生「萝卜」，三年二十四周，在导师和同门之间周旋，想办法拿到学位证走出去。

## 怎么跑

不接大模型，直接用浏览器打开 `game/index.html` 就能玩，全部按规则运行。

接大模型（导师和同门的话每局现写，可以自己打字回复）：

```bash
cd game
cp .env.example .env   # 填上自己的模型地址和密钥
npm start              # 打开 http://localhost:8787
```

服务端没有任何依赖，需要 Node 18 以上。模型走 OpenAI 兼容接口，现在配的是 DeepSeek（`deepseek-flash` 负责改写措辞，`deepseek-v4-pro` 负责判断和生成）。

默认只有本机能访问。要让同一个 Wi-Fi 下的手机打开，用 `HOST=0.0.0.0 npm start`。

服务拿着你的模型密钥，所以带了几道闸，可以在 `.env` 里调：

| 变量 | 默认 | 含义 |
|---|---|---|
| `LLM_PER_MIN` | 30 | 每个地址每分钟最多调多少次模型 |
| `LLM_BURST` | 20 | 每个地址短时间内最多连发多少次 |
| `LLM_DAILY_MAX` | 5000 | 所有人加起来每天最多多少次，到顶后游戏退回纯规则 |

要放到服务器上给别人玩，照着 [DEPLOY.md](DEPLOY.md) 做：里面有部署步骤、日志怎么看、监控和告警怎么配、出问题怎么查。

## 目录

| 路径 | 内容 |
|---|---|
| `game/index.html` | 页面和全部样式 |
| `game/js/engine.js` | 规则引擎 |
| `game/js/content.js` | 全部文本：事件、台词、学院、结局 |
| `game/js/ui.js` | 界面 |
| `game/js/art.js` | 代码画的人物、场景、明信片 |
| `game/js/llm.js`、`game/server.mjs` | 大模型接入 |
| `game/corpus.json` | 从公开网页采集的导师和学生原话，给模型当语感示范 |
| `game/test/` | 自动跑局和界面冒烟测试 |
| `逃出绝命课题组-设计文档.md` | 完整设计文档 |
| `balance_sim.py` | 早期的数值模拟脚本，已经落后于游戏里的规则 |
| `DEPLOY.md`、`deploy/` | 部署手册，以及 systemd、Caddy、巡检脚本的现成配置 |

## 往里加东西

| 要加的 | 改哪里 |
|---|---|
| 一个事件 | `content.js` 里用 `E / M / G` 这些辅助函数写一条 |
| 一个结局 | `engine.js` 的 `finish()`、`content.js` 的 `endings` 和 `endingOrder`、`art.js` 的 `endings` |
| 一种导师 | `content.js` 的 `mentors`、`scold`、`sick`、`paper.mentorOk`、`mentorReveal`，`engine.js` 的 `POOL`、`GOAL_MATCH`、`EV_MIX`，`art.js` 的 `mentors`，`server.mjs` 提示词里讲各导师腔调的那一条 |
| 一个模型接入点 | `server.mjs` 的 `SLOTS` 表加一项，`engine.js` 写它的上下文和校验函数，`ui.js` 里调用 |
| 状态里的新字段 | `engine.js` 的 `SAVE_V` 加一，在 `migrate()` 里写老存档怎么补 |

漏了配图或配套文本，`node test/bot.js` 会直接报出缺哪一样。

## 测试

```bash
cd game
node test/bot.js 2000        # 随机跑 2000 局，检查规则和文本
node test/ui_smoke.js 200    # 不开浏览器把界面从头点到结局
node test/server_test.mjs    # 拿畸形请求打服务端，确认不崩、不被绕过
node test/validate_test.js   # 拿畸形的模型返回喂引擎，确认数值不越界、存档读得回来
npm test                     # 上面四个一起跑
```
