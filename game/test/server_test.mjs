// 服务端的防护测试。起一个假的模型接口和一个真的 server.mjs，拿各种畸形请求去打，确认它不崩、不被绕过。
// 用法: node test/server_test.mjs
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const UP = 8797, PORT = 8798, BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let upstreamCalls = 0, upstreamAborted = 0, lastSystem = '', slow = 0, lastBody = null;
const upstream = http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    upstreamCalls += 1;
    try { lastBody = JSON.parse(raw); lastSystem = lastBody.messages[0].content; } catch (e) { lastSystem = ''; lastBody = null; }
    res.on('close', () => { if (!res.writableEnded) upstreamAborted += 1; });
    setTimeout(() => { if (res.destroyed) return; res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: '{"text":"好的"}' } }] })); }, slow);
  });
}).listen(UP, '127.0.0.1');

const srv = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', LLM_BASE_URL: 'http://127.0.0.1:' + UP, LLM_API_KEY: 'test-key', LLM_MODEL: 'fake', LLM_MODEL_STRONG: 'fake', LLM_BURST: '8', LLM_PER_MIN: '30', LLM_DAILY_MAX: '40', LLM_PROVIDER: 'deepseek', LLM_THINKING: '', LLM_EXTRA: '' }) });
let exited = null; srv.on('exit', (code) => { exited = code; });
let log = ''; srv.stdout.on('data', (d) => { log += d; }); srv.stderr.on('data', (d) => { log += d; });
await sleep(900);

const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? '通过' : '失败') + '  ' + name + (detail ? '  →  ' + detail : '')); };
const alive = () => exited === null;
const post = (p, body, headers) => fetch(BASE + p, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: typeof body === 'string' ? body : JSON.stringify(body) });
const J = async (r) => { try { return await r.json(); } catch (e) { return null; } };
/** 发一行原始的 HTTP 请求（fetch 会把畸形的路径改掉，测不到）。 */
const rawReq = (line) => new Promise((resolve) => {
  const s = net.connect(PORT, '127.0.0.1', () => s.write(line + '\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n'));
  let out = ''; s.on('data', (d) => { out += d; }); s.on('close', () => resolve(out.split('\r\n')[0])); s.on('error', () => resolve('连接出错'));
});

// —— 不能被一个请求打崩 ——
check('畸形网址 /% 不崩', /400/.test(await rawReq('GET /% HTTP/1.1')) && alive());
check('请求行是 // 不崩', /^HTTP\/1\.1 4/.test(await rawReq('GET // HTTP/1.1')) && alive());
let r = await post('/llm', 'null'); check('请求体是 null 不崩', r.status === 400 && alive(), '状态 ' + r.status);
r = await post('/llm', '{坏的'); check('请求体不是 JSON', r.status === 400 && alive());
r = await post('/llm', '[]'); check('请求体是数组', r.status === 400 && alive());

// —— 接入点和大小 ——
const before = upstreamCalls;
for (const slot of ['constructor', '__proto__', 'toString', 'nope', 123, null]) { r = await post('/llm', { slot, payload: {} }); if (r.status !== 400) check('乱填接入点 ' + slot, false, '状态 ' + r.status); }
check('乱填的接入点都被挡下，没有一次到模型', upstreamCalls === before, '到模型 ' + (upstreamCalls - before) + ' 次');
r = await post('/llm', { slot: 'rest', payload: { 帖子: '字'.repeat(4000) } }); check('请求体超过 8 KB 被拒', r.status === 413, '状态 ' + r.status);
r = await post('/llm', { slot: 'rest', payload: { 活动: '爬山' } }); const ok1 = await J(r);
check('正常请求能通，模型的话能回来', r.status === 200 && ok1 && ok1.result && ok1.result.text === '好的', JSON.stringify(ok1));
check('发给模型的是游戏的提示词', /逃出绝命课题组/.test(lastSystem));
check('默认带着关掉思考的参数', !!lastBody && !!lastBody.thinking && lastBody.thinking.type === 'disabled', JSON.stringify(lastBody && lastBody.thinking));

// —— 别的网站借不了 ——
r = await post('/llm', { slot: 'rest', payload: {} }, { 'content-type': 'text/plain' }); check('不是 JSON 头的请求被拒', r.status === 403, '状态 ' + r.status);
r = await post('/llm', { slot: 'rest', payload: {} }, { origin: 'https://evil.example' }); check('别的网站来的请求被拒', r.status === 403, '状态 ' + r.status);
r = await post('/llm', { slot: 'rest', payload: {} }, { origin: BASE }); check('自己页面来的请求放行', r.status === 200, '状态 ' + r.status);
r = await post('/quote', { who: '导师', text: '这个不难吧，周一给我' }, { origin: 'https://evil.example' }); check('别的网站投稿被拒', r.status === 403);

// —— 文件 ——
for (const p of ['/.env', '/quotes.jsonl', '/corpus.json', '/server.mjs', '/package.json', '/test/bot.js', '/js/../.env', '/js/..%2f.env', '/events.json']) { r = await fetch(BASE + p); if (r.status !== 404 && r.status !== 400) check('不该能取到 ' + p, false, '状态 ' + r.status); }
check('密钥、投稿、语料、服务端源码都取不到', true);
r = await fetch(BASE + '/'); const csp = r.headers.get('content-security-policy') || '';
check('首页能打开，带安全响应头', r.status === 200 && /default-src 'self'/.test(csp) && r.headers.get('x-content-type-options') === 'nosniff');
r = await fetch(BASE + '/js/engine.js'); check('游戏脚本能取到', r.status === 200);
r = await fetch(BASE + '/llm/health'); const h = await J(r); check('健康检查不再报模型名', h && h.ok === true && !('model' in h), JSON.stringify(h));
r = await fetch(BASE + '/x', { method: 'DELETE' }); check('别的请求方法被拒', r.status === 405);

// —— 限流 ——
let pass = 0, limited = 0;
for (let i = 0; i < 16; i++) { r = await post('/llm', { slot: 'rest', payload: { i } }); if (r.status === 200) pass += 1; else if (r.status === 429) limited += 1; }
check('连发 16 次，超过的被限流', limited >= 6 && pass >= 1, '放行 ' + pass + '，限流 ' + limited);
check('被限流的请求没有到模型', upstreamCalls <= before + 2 + 8 + 1, '模型一共被调 ' + upstreamCalls + ' 次');

// —— 玩家不等了，服务端也不再等模型 ——
await sleep(2200);                                  // 等令牌回来一个
slow = 3000; const ctl = new AbortController(), a0 = upstreamAborted;
const pending = fetch(BASE + '/llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'rest', payload: {} }), signal: ctl.signal }).catch(() => null);
await sleep(400); ctl.abort(); await pending; await sleep(500);
check('玩家断开后，发给模型的请求被取消', upstreamAborted === a0 + 1, '取消 ' + (upstreamAborted - a0) + ' 次');
slow = 0;

// —— 运行情况和日志 ——
r = await fetch(BASE + '/stats'); const st = await J(r);
check('本机能看运行情况，里面有各接入点的统计', r.status === 200 && st && st.各接入点 && st.各接入点.rest && st.各接入点.rest.调用 >= 1 && st.今天已调用 >= 1, st ? '今天已调用 ' + st.今天已调用 + '，被拒绝 ' + JSON.stringify(st.被拒绝) : '');
r = await fetch(BASE + '/stats', { headers: { 'x-forwarded-for': '1.2.3.4' } }); check('经代理转进来的人看不到运行情况', r.status === 404, '状态 ' + r.status);
const lines = log.split('\n').filter((l) => l[0] === '{').map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
check('日志是一行一个 JSON，有启动、调用、拒绝三种', ['start', 'llm', 'reject'].every((ev) => lines.some((l) => l.ev === ev)), '共 ' + lines.length + ' 行');
check('日志里没有玩家的字和模型的话', !/好的|爬山|帖子/.test(lines.filter((l) => l.ev !== 'start').map((l) => JSON.stringify(l)).join('')));

// —— 思考: 只有明确配了 LLM_THINKING=1 才开 ——
{
  const srv2 = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, stdio: 'ignore', env: Object.assign({}, process.env, { PORT: '8796', HOST: '127.0.0.1', LLM_BASE_URL: 'http://127.0.0.1:' + UP, LLM_API_KEY: 'test-key', LLM_MODEL: 'fake', LLM_MODEL_STRONG: 'fake', LLM_PROVIDER: 'deepseek', LLM_THINKING: '1', LLM_EXTRA: '' }) });
  await sleep(900); lastBody = null;
  await fetch('http://127.0.0.1:8796/llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot: 'rest', payload: {} }) }).catch(() => null);
  check('配了 LLM_THINKING=1 之后不再带关思考的参数', !!lastBody && lastBody.thinking === undefined && lastBody.enable_thinking === undefined, lastBody ? '请求里的键: ' + Object.keys(lastBody).join(',') : '没收到请求');
  srv2.kill();
}

check('全程服务没有退出', alive(), alive() ? '' : '退出码 ' + exited + '\n' + log.slice(-400));
srv.kill(); upstream.close();
const bad = results.filter((x) => !x).length;
console.log('\n' + results.length + ' 项，失败 ' + bad + ' 项');
process.exit(bad ? 1 : 0);
