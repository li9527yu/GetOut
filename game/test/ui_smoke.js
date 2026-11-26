// 不开浏览器，用假的 DOM 把界面从头点到结局，确认渲染代码不报错。用法: node test/ui_smoke.js [局数]
const fs = require('fs'), path = require('path'), vm = require('vm');
const N = +process.argv[2] || 200;
let html = '', handler = null; const store = {};
const appEl = { set innerHTML(v) { html = v; }, get innerHTML() { return html; }, addEventListener(t, f) { handler = f; }, querySelector() { return null; } };
const ctx = { window: {}, document: { getElementById: (id) => (id === 'app' ? appEl : null) }, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, console, Math, JSON };
ctx.window.window = ctx.window; vm.createContext(ctx);
['content.js', 'engine.js', 'art.js', 'ui.js'].forEach((f) => {
  let src = fs.readFileSync(path.join(__dirname, '../js', f), 'utf8');
  if (f !== 'ui.js' && f !== 'art.js') src = '(function(){var module=undefined;' + src + '}).call(window);';
  vm.runInContext(src, ctx, { filename: f });
  if (f === 'content.js') ctx.CONTENT = ctx.window.CONTENT;
});
const g = ctx.window.__game, ends = {}; let clicks = 0, maxLen = 0;
const buttons = () => { const out = []; const re = /<button([^>]*)>/g; let m; while ((m = re.exec(html))) { if (/disabled/.test(m[1])) continue; const d = {}; m[1].replace(/data-([a-z]+)="([^"]*)"/g, (_, k, v) => { d[k] = v; }); if (d.act) out.push(d); } return out; };
for (let n = 0; n < N; n++) {
  g.acts.new({}); let guard = 0;
  while (guard++ < 3000) {
    if (/undefined|NaN|\[object/.test(html)) throw new Error('界面出现 undefined/NaN: ' + html.match(/.{60}(undefined|NaN|\[object).{60}/)[0]);
    maxLen = Math.max(maxLen, html.length);
    let bs = buttons().filter((b) => ['file', 'hole', 'book', 'home', 'resume', 'closeSheet', 'tab'].indexOf(b.act) < 0);
    if (/本次新增归档/.test(html)) break;
    if (/class="dm"/.test(html)) bs = bs.filter((b) => b.act === 'dm' || b.act === 'dmClose');   // 私聊窗口盖着的时候只能点它里面的按钮
    if (!bs.length) throw new Error('没有可点的按钮: ' + html.slice(0, 300));
    const confirm = bs.find((b) => b.act === 'confirm');
    let b;
    if (confirm && /就这样|熬过|没有精力/.test(html) && Math.random() < 0.45) b = confirm;
    else { const pool = bs.filter((x) => x.act !== 'new'); b = pool[Math.floor(Math.random() * pool.length)]; }
    if (Math.random() < 0.03) { g.acts.file({}); g.acts.closeSheet({}); }
    if (Math.random() < 0.03 && !/class="dm"/.test(html)) { g.acts.hole({}); g.acts.closeSheet({}); }
    g.acts[b.act](b); clicks++;
  }
  if (guard >= 3000) throw new Error('点了 3000 下还没到结局: ' + html.slice(0, 200));
  const e = g.S.ended; ends[e.name] = (ends[e.name] || 0) + 1;
}
g.acts.book({}); g.acts.tab({ i: 1 }); g.acts.tab({ i: 2 }); g.acts.home({});
console.log('界面冒烟测试通过:', N, '局，共点击', clicks, '次，平均每局', Math.round(clicks / N));
console.log('图鉴:', Object.keys(g.META.endings).length + '/25 结局,', Object.keys(g.META.mentors).length + '/7 导师,', g.META.titles.length + '/7 称号');
console.log(Object.entries(ends).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' | '));
