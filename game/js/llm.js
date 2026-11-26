/* 逃出绝命课题组 · 大模型接入层（浏览器端）
 * 游戏只认一个接口: POST <endpoint>  {slot, payload}  ->  {result: {...} | null}
 * 换哪家模型、怎么写提示词，都在服务端（server.mjs）里决定，游戏不关心。
 * 连不上、超时、返回格式不对，一律返回 null，游戏退回到纯规则。
 *
 * 接入点 (slot) 的完整清单、各自的提示词和返回格式，都在 server.mjs 的 SLOTS 表里。
 * 模型返回的东西一律当作不可信: engine.js 里对应的函数会校验类型、截断长度、把数值限制在很小的范围内。
 */
(function () {
  'use strict';
  // 只连自己这个站点的 /llm。以前可以用网址参数指到别的服务器上，那样一条链接就能把玩家打的字骗走，去掉了
  const endpoint = /^https?:/.test(location.protocol) ? '/llm' : null;
  let ok = false;
  const TIMEOUT = 10000;                 // 界面最多等 9 秒；到点就断开，服务端会跟着取消对模型的请求
  function call(path, body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
    return fetch(endpoint + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal } : { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null).finally(() => clearTimeout(timer));
  }
  const ready = endpoint ? call('/health').then((j) => { ok = !!(j && j.ok); return ok; }) : Promise.resolve(false);
  window.LLM = {
    ready,
    enabled: () => ok,
    ask: (slot, payload) => (ok ? call('', { slot, payload }).then((j) => (j && j.result) || null) : Promise.resolve(null)),
  };
})();
