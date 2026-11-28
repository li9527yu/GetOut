// 自动跑局: 检查流程不卡死、数值不越界、结局都能到达。用法: node test/bot.js [局数]
const Eng = require('../js/engine.js'), C = require('../js/content.js');
const N = +process.argv[2] || 3000, rnd = Math.random;
const styles = ['obey', 'balanced', 'selfish', 'slacker', 'random'];
const ends = {}, byMentor = {}, evSeen = {}, titles = {}; let turnsTotal = 0, evCount = 0, problems = [];
// 内容检查
C.events.forEach((e) => {
  const plain = e.text.replace(/\{[^}]+\}/g, 'XX').replace(/\n/g, '');
  if (plain.length > 62) problems.push('正文超 60 字: ' + e.id + ' (' + plain.length + ')');
  if (e.options.length > 3) problems.push('选项超 3 个: ' + e.id);
  e.options.forEach((o) => { if (['怂', '刚', '歪'].indexOf(o.tone) < 0) problems.push('口气缺失: ' + e.id); });
});
C.endingOrder.forEach((n) => { if (!C.endings[n]) problems.push('缺结局文本: ' + n); });
function plan(s, c, style) {
  const cells = Eng.cells(s), p = { lab: 0, thesis: 0, chips: 0, heal: 0, help: 0, slack: 0, rewrite: 0, fun: 0 };
  let ap = c.ap;
  const give = (k, n) => { n = Math.max(0, Math.min(ap, n)); p[k] += n; ap -= n; };
  if (style === 'random') { while (ap > 0) give(cells[Math.floor(rnd() * cells.length)], 1); }
  else {
    const rest = cells.indexOf('slack') >= 0 && style !== 'obey' ? 'slack' : 'heal';
    if (cells.indexOf(rest) >= 0 && s.san < 45) give(rest, s.san < 25 ? 2 : 1);
    if (style === 'obey') give('lab', c.demand);
    else if (style === 'balanced') give('lab', s.favor < 50 || s.contrib < 60 ? c.demand : c.demand - 1);
    else if (style === 'selfish') give('lab', s.favor < 35 ? c.demand : 0);
    else give('lab', s.favor < 40 ? c.demand : 1);
    if (cells.indexOf('rewrite') >= 0 && Eng.aiRate(s) > 30) give('rewrite', 1);
    if (cells.indexOf('help') >= 0 && rnd() < 0.2) give('help', 1);
    if (style === 'slacker' && cells.indexOf('slack') >= 0) give('slack', 1);
    const line = Eng.P.thesisLine[Math.min(2, Eng.stageOf(s))];
    while (ap > 0) {
      if (s.thesis + p.thesis * Eng.thesisRate(s) < line + 5 || cells.indexOf('chips') < 0) give('thesis', 1);
      else if (s.chips < Eng.chipsCap(s)) give('chips', 1);
      else give(cells.indexOf(rest) >= 0 ? rest : 'thesis', 1);
    }
  }
  p.short = Eng.freeOn(s) && rnd() < 0.7 ? 'done' : ['plain', 'dump', 'lie', 'ask'][Math.floor(rnd() * 4)];
  if (Eng.freeOn(s) && style !== 'random') { const k = cells.indexOf('fun') >= 0 ? 'fun' : 'heal'; p.lab = Math.min(p.lab, 1); p.thesis = 0; p.chips = 0; p[k] += c.ap - Object.keys(p).filter((x) => typeof p[x] === 'number' && x !== k).reduce((n, x) => n + p[x], 0) - p[k]; }
  p.aiLab = s.ai.unlocked && rnd() < 0.3; p.aiThesis = s.ai.unlocked && rnd() < 0.3;
  const np = Eng.normalPeers(s);
  if (np.length) { p.dumpTo = np[Math.floor(rnd() * np.length)].slot; p.helpTo = s.omenSlot || np[0].slot; }
  p.unblock = ['mentor', 'peer', 'explore', s.ai.unlocked ? 'ai' : 'explore'][Math.floor(rnd() * 4)];
  return p;
}
// 各种开局: 普通的占一半（上面的统计只算普通局），其余轮着试天龙人、金手指、保底、受苦
const STARTS = [['天龙人 B1', { tl: 'B1' }], ['天龙人 B2', { tl: 'B2' }], ['天龙人 B3', { tl: 'B3' }], ['天龙人 B4', { tl: 'B4' }], ['天龙人 B5', { tl: 'B5' }], ['假天龙人', { tl: 'B6' }],
  ['教学局', { tl: 'B2', good: true, tut: true }], ['好导师', { good: true }], ['加强过的', { boost: { nao: 1, gan: 1, fangren: 1, renpin: 1 }, perks: { favor: true } }], ['金手指全带', { perks: { know: true, favor: true, senior: true, shield: true, paper: true } }], ['受苦', { hard: true }]];
const byStart = {}, allMet = Object.keys(C.mentors).reduce((o, k) => { o[k] = true; return o; }, {});
for (let n0 = 0; n0 < N * 2; n0++) {
  const special = n0 >= N, n = n0 % N, style = special ? ['balanced', 'obey', 'selfish'][n % 3] : styles[n % styles.length];
  const st = special ? STARTS[n % STARTS.length] : null;
  const s = Eng.newGame(special ? { opts: JSON.parse(JSON.stringify(st[1])), met: n % 2 ? allMet : null, grudge: n % 3 ? null : '青椒卷王', legacy: n % 2 === 0 } : {});
  let guard = 0;
  while (!s.ended && guard++ < 60) {
    const c = Eng.beginTurn(s);
    if (c.event) {
      evCount++; evSeen[c.event.id] = (evSeen[c.event.id] || 0) + 1;
      const ok = c.event.options.filter((o) => !o.disabled);
      if (!ok.length) { problems.push('事件没有可选项: ' + c.event.id); break; }
      if (/\{/.test(c.event.text)) problems.push('变量没替换: ' + c.event.id + ' ' + c.event.text);
      let o = ok[Math.floor(rnd() * ok.length)];
      if (c.event.id.indexOf('node_quit') === 0 && rnd() < 0.8) o = ok[0];
      Eng.pickOption(s, o.i);
      if (s.ended) break;
    }
    c.msgs.forEach((m) => { if (/\{/.test(m.text)) problems.push('消息变量没替换: ' + m.text); });
    const r = Eng.commit(s, plan(s, c, style));
    ['san', 'favor', 'assim', 'seen', 'contrib', 'thesis', 'chips'].forEach((k) => {
      if (isNaN(s[k]) || s[k] > 120.001 || (k !== 'san' && s[k] < -0.001)) problems.push('越界 ' + k + '=' + s[k]);
    });
    if (s.t <= 4 && s.ended) problems.push('前 4 回合出现结局: ' + s.ended.name);
    if (r.next === 'gate') {
      const g = Eng.gate(s);
      if (g.next === 'goal') Eng.chooseGoal(s, ['就业', '读博', '考公'][Math.floor(rnd() * 3)]);
    }
  }
  if (!s.ended) { problems.push('没有结局: t=' + s.t + ' phase=' + s.phase); continue; }
  if (/\{/.test(s.ended.text)) problems.push('结局变量没替换: ' + s.ended.name);
  if (special) { const q = (byStart[st[0]] = byStart[st[0]] || { n: 0, got: 0, grad: 0, ends: {} }); q.n++; if (s.ended.got || s.ended.joy || s.ended.cat === '天龙人') q.got++; if (s.ended.how === 'grad') q.grad++; q.ends[s.ended.name] = (q.ends[s.ended.name] || 0) + 1; continue; }
  ends[s.ended.name] = (ends[s.ended.name] || 0) + 1;
  const b = (byMentor[s.origType] = byMentor[s.origType] || { n: 0, got: 0 });
  b.n++; if (s.ended.got) b.got++;
  if (s.ended.title) titles[s.ended.title] = (titles[s.ended.title] || 0) + 1;
  turnsTotal += s.stats.turns;
}
console.log('局数', N, ' 平均回合', (turnsTotal / N).toFixed(1), ' 平均每局事件', (evCount / N).toFixed(1));
console.log('\n结局分布:'); C.endingOrder.forEach((k) => console.log('  ' + k.padEnd(12, '　') + ((ends[k] || 0) * 100 / N).toFixed(1) + '%'));
console.log('\n各导师上岸率（机器人水平，仅供参考）:'); Object.keys(byMentor).forEach((k) => console.log('  ' + k + ' ' + (byMentor[k].got * 100 / byMentor[k].n).toFixed(0) + '%  (' + byMentor[k].n + ' 局)'));
console.log('\n称号:', JSON.stringify(titles));
console.log('\n各种开局（上岸或爽局 / 毕业 / 最常见的三个结局）:'); Object.keys(byStart).forEach((k) => { const q = byStart[k]; console.log('  ' + k.padEnd(8, '　') + (q.got * 100 / q.n).toFixed(0).padStart(3) + '% / ' + (q.grad * 100 / q.n).toFixed(0).padStart(3) + '%  ' + Object.keys(q.ends).sort((x, y) => q.ends[y] - q.ends[x]).slice(0, 3).map((e) => e + ' ' + q.ends[e]).join('，')); });
const never = C.events.filter((e) => !evSeen[e.id] && e.id !== 'node_first_omen').map((e) => e.id);
console.log('\n事件总数', C.events.length, ' 从未出现:', never.join(', ') || '无');
// 配套检查: 加了一个结局、导师、称号、活动，却忘了配图或配套文本，界面会直接空白。这里一次查全
const Art = require('../js/art.js');
const need = (ok, what) => { if (!ok) problems.push('缺 ' + what); };
C.endingOrder.forEach((n) => { need(C.endings[n] && C.endings[n].text && C.endings[n].hint, '结局文本 ' + n); need(typeof Art.endings[n] === 'function', '结局图 ' + n); });
Object.keys(C.endings).forEach((n) => need(C.endingOrder.indexOf(n) >= 0, '结局没排进顺序表 ' + n));
Object.keys(C.mentors).forEach((t) => { need(typeof Art.mentors[t] === 'function', '导师图 ' + t); need(C.scold[t], '导师训人的话 ' + t); need(C.sick.leaveOk[t] && C.sick.leaveNo[t], '导师批假的话 ' + t); need(C.paper.mentorOk[t], '导师对小论文的话 ' + t); need(C.mentorReveal[t], '导师档案批注 ' + t); need(Eng.GOAL_MATCH[t] && Eng.POOL[t] != null, '导师的抽取权重或去向匹配 ' + t); need((C.mentors[t].truths || []).length === 3, '导师的三条真相 ' + t); });
Object.keys(C.titles).forEach((t) => need(typeof Art.titles[t] === 'function', '称号章 ' + t));
Object.keys(C.restActs).forEach((a) => { need(typeof Art.cards[a] === 'function', '明信片 ' + a); need(C.cardNote[a], '明信片背面的字 ' + a); need((C.restWhy[a] || []).length, '去这儿的由头 ' + a); need(C.wildDirs[C.restActs[a].dir], '活动的方向 ' + a); });
['小导', '师兄', '师姐', '同级', '师弟'].forEach((k) => need(typeof Art.peers[k] === 'function', '同门头像 ' + k));
Object.keys(C.personas).forEach((slot) => C.personas[slot].forEach((p) => need(C.chatter[p.name], '人设的闲聊 ' + p.name)));
C.colleges.forEach((c) => need(c.gear && c.stuff && c.coat && c.topics.length >= 2, '学院的仪器、耗材、工作服或方向 ' + c.name));
const uniq = [...new Set(problems)];
console.log('\n问题 ' + uniq.length + ' 个'); uniq.slice(0, 30).forEach((x) => console.log('  ' + x));
process.exit(uniq.length ? 1 : 0);
