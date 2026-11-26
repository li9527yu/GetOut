// 用一个会算账的机器人对照 balance_sim.py 的「平衡」策略，确认 JS 引擎的难度和模拟一致。
const Eng = require('../js/engine.js');
const N = +process.argv[2] || 4000, by = {}, kinds = {};
for (let n = 0; n < N; n++) {
  const s = Eng.newGame({}); let guard = 0;
  while (!s.ended && guard++ < 60) {
    const c = Eng.beginTurn(s), st = Eng.stageOf(s);
    if (c.event) {
      const ok = c.event.options.filter((o) => !o.disabled);
      const want = /_door$/.test(c.event.id) ? (process.argv[3] === 'wild' ? '刚' : '怂') : c.event.id.indexOf('node_quit') === 0 || c.event.id === 'node_stay' ? '歪' : c.event.id === 'node_switch' ? (s.mentor.type === '控制狂' ? '刚' : '怂') : c.event.id === 'node_union' ? '刚' : s.assim >= 40 ? '刚' : s.san < 50 ? '歪' : '怂';
      let o = ok.find((x) => x.tone === want) || ok[0];
      if (c.event.id === 'node_stay' && !ok.find((x) => x.tone === '歪')) o = ok.find((x) => x.tone === '刚') || ok[0];
      Eng.pickOption(s, o.i); if (s.ended) break;
    }
    const cells = Eng.cells(s), p = { lab: 0, thesis: 0, chips: 0, heal: 0, help: 0, slack: 0, rewrite: 0, short: 'plain', aiThesis: s.ai.unlocked && Eng.aiRate(s) < 20 };
    let ap = c.ap; const give = (k, n) => { n = Math.max(0, Math.min(ap, n)); p[k] += n; ap -= n; };
    const rest = cells.indexOf('slack') >= 0 ? 'slack' : 'heal', per = rest === 'slack' ? Eng.slackRate(s) : Eng.healRate(s);
    if (cells.indexOf(rest) >= 0) while (ap > 0 && s.san + per * p[rest] < 45) give(rest, 1);
    const line = Eng.P.thesisLine[Math.min(2, st)], cl = Eng.P.contribLine[Math.min(2, st)];
    const behind = s.thesis < line * ((s.t % 8) + 1) / 8;
    const safe = s.favor >= (s.goal === '读博' ? 65 : 55) && s.contrib >= cl * ((s.t % 8) + 1) / 8;
    give('lab', safe && behind ? Math.max(0, c.demand - 1) : c.demand);
    if (cells.indexOf('rewrite') >= 0 && Eng.aiRate(s) > 30) give('rewrite', 1);
    p.unblock = s.ai.unlocked && Eng.aiRate(s) < 20 ? 'ai' : s.mentor.level >= 3 ? 'mentor' : 'explore';
    let proj = s.thesis;
    while (ap > 0) {
      const blockedNow = Eng.blocked(s) && p.thesis === 0;
      if ((proj < line || st === 0 || s.chips >= Eng.chipsCap(s)) && proj < 100 || blockedNow && proj < line) { give('thesis', 1); proj += Eng.thesisRate(s); }
      else if (cells.indexOf('chips') >= 0 && s.chips < Eng.chipsCap(s)) give('chips', 1);
      else give(cells.indexOf(rest) >= 0 ? rest : 'thesis', 1);
    }
    const r = Eng.commit(s, p);
    if (r.next === 'gate') { const g = Eng.gate(s); if (g.next === 'goal') { const m = Eng.GOAL_MATCH[s.mentor.type]; Eng.chooseGoal(s, Object.keys(m).sort((a, b) => '低中高'.indexOf(m[b]) - '低中高'.indexOf(m[a]))[0]); } }
  }
  const b = (by[s.origType] = by[s.origType] || { n: 0, got: 0, grad: 0 });
  b.n++; if (s.ended.got) b.got++; if (s.ended.how === 'grad') b.grad++;
  kinds[s.ended.name] = (kinds[s.ended.name] || 0) + 1;
}
let g = 0; Object.keys(by).forEach((k) => { g += by[k].got; console.log(k, '上岸', (by[k].got * 100 / by[k].n).toFixed(0) + '%', '毕业', (by[k].grad * 100 / by[k].n).toFixed(0) + '%'); });
console.log('整体上岸', (g * 100 / N).toFixed(0) + '%');
console.log(Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (v * 100 / N).toFixed(1) + '%').join(' | '));
