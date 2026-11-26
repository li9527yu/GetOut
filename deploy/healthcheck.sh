#!/bin/sh
# 巡检脚本: 看服务活着没有、模型能不能用、额度和成功率正不正常。有问题就打印一行，并发到 WEBHOOK（飞书群机器人的地址）。
# 用法: 放进 cron，每 5 分钟跑一次:
#   */5 * * * * WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx /opt/getout/deploy/healthcheck.sh >> /var/log/getout-check.log 2>&1
URL="${URL:-http://127.0.0.1:8787}"
WEBHOOK="${WEBHOOK:-}"

alert() {
  echo "$(date '+%F %T') 告警: $1"
  if [ -n "$WEBHOOK" ]; then
    curl -s -m 10 -H 'content-type: application/json' \
      -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"[GetOut] $1\"}}" "$WEBHOOK" >/dev/null
  fi
}

health=$(curl -s -m 8 "$URL/llm/health") || { alert "服务没有响应（$URL）"; exit 1; }
echo "$health" | grep -q '"ok":true' || alert "模型不可用，游戏正在按纯规则运行。检查密钥、额度和模型服务商的状态"

stats=$(curl -s -m 8 "$URL/stats") || { alert "取不到运行情况"; exit 1; }
# 用 node 读 JSON 判断阈值（服务器上本来就有 node）
msg=$(printf '%s' "$stats" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let j; try { j = JSON.parse(s); } catch (e) { console.log("运行情况不是 JSON"); return; }
  const out = [];
  if (j["今天已调用"] >= j["每日上限"] * 0.8) out.push("今天的模型调用已用 " + j["今天已调用"] + "/" + j["每日上限"]);
  if (j["模型调用总数"] >= 30 && j["成功率"] !== null && j["成功率"] < 0.8) out.push("模型调用成功率只有 " + Math.round(j["成功率"] * 100) + "%");
  if (j["内存MB"] > 300) out.push("内存用到了 " + j["内存MB"] + " MB");
  let slow = 0, n = 0; for (const k in j["各接入点"]) { slow += j["各接入点"][k]["超过7秒"]; n += j["各接入点"][k]["调用"]; }
  if (n >= 30 && slow / n > 0.2) out.push("有 " + Math.round(slow * 100 / n) + "% 的模型调用超过 7 秒，玩家基本等不到");
  console.log(out.join("；"));
});')
[ -n "$msg" ] && alert "$msg"
exit 0
