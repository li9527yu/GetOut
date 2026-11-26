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
  const cells = Eng.cells(s), p = { lab: 0, thesis: 0, chips: 0, heal: 0, help: 0, slack: 0, rewrite: 0 };
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
  p.short = ['plain', 'dump', 'lie', 'ask'][Math.floor(rnd() * 4)];
  p.aiLab = s.ai.unlocked && rnd() < 0.3; p.aiThesis = s.ai.unlocked && rnd() < 0.3;
  const np = Eng.normalPeers(s);
  if (np.length) { p.dumpTo = np[Math.floor(rnd() * np.length)].slot; p.helpTo = s.omenSlot || np[0].slot; }
  p.unblock = ['mentor', 'peer', 'explore', s.ai.unlocked ? 'ai' : 'explore'][Math.floor(rnd() * 4)];
  return p;
}
for (let n = 0; n < N; n++) {
  const style = styles[n % styles.length];
  const s = Eng.newGame({});
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
const never = C.events.filter((e) => !evSeen[e.id] && e.id !== 'node_first_omen').map((e) => e.id);
console.log('\n事件总数', C.events.length, ' 从未出现:', never.join(', ') || '无');
const uniq = [...new Set(problems)];
console.log('\n问题 ' + uniq.length + ' 个'); uniq.slice(0, 30).forEach((x) => console.log('  ' + x));
process.exit(uniq.length ? 1 : 0);
