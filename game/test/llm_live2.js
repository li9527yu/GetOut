// 实测「发言权放大」的几个接入点: 开局生成、甩锅判定、硬气的话、同门出事。需要先 npm start。用法: node test/llm_live2.js
const Eng = require('../js/engine.js');
const post = (slot, payload) => { const t = Date.now(); return fetch('http://localhost:8787/llm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot, payload }) }).then((r) => r.json()).then((j) => ({ r: j.result, ms: Date.now() - t })); };
(async () => {
  for (let k = 0; k < 2; k++) {                                   // 开局
    const s = Eng.newGame({}), a = await post('intro', Eng.introContext(s));
    console.log(`\n== 开局【${s.mentor.type}】${a.ms}ms`); if (a.r) { console.log(`  方向：${a.r.dirs}\n  寄语：${a.r.motto}\n  评价：${a.r.review}`); Object.keys(a.r.bios || {}).forEach((b) => console.log(`  ${b}（${Eng.peerBySlot(s, b) && Eng.peerBySlot(s, b).persona}）：${a.r.bios[b]}`)); console.log('  校验通过：' + Eng.applyIntro(s, a.r)); }
  }
  // 两种打法: 一直甩给同一个人 / 先帮他三次再甩
  for (const style of ['一直甩', '先帮后甩']) {
    const s = Eng.newGame({}); let g = 0, tgt = null; const log = [];
    while (!s.ended && s.t < 9 && g++ < 20) {
      const c = Eng.beginTurn(s);
      if (c.event) { Eng.pickOption(s, c.event.options.filter((x) => !x.disabled)[0].i); if (s.ended) break; }
      const np = Eng.normalPeers(s); if (!tgt || !np.find((p) => p.slot === tgt)) tgt = np[0] && np[0].slot;
      const plan = { lab: 0, thesis: c.ap, unblock: 'explore', short: 'plain' };
      const helping = style === '先帮后甩' && s.t >= 2 && s.t <= 4 && c.ap > 0;
      if (helping) { plan.thesis = c.ap - 1; plan.help = 1; plan.helpTo = tgt; plan.lab = Math.min(plan.thesis, c.demand); plan.thesis -= plan.lab; }
      else if (s.t >= 2 && c.demand > 0 && tgt) {
        plan.short = 'dump'; plan.dumpTo = tgt;
        const p = Eng.peerBySlot(s, tgt), a = await post('dump', Eng.dumpContext(s, tgt));
        plan.dumpRuling = a.r;
        log.push(`  第${s.t + 1}周 → ${p.name}（${p.persona}，被甩${p.dumped}次，关系${Math.round(p.rel)}，规则估计不接 ${Math.round(Eng.dumpRefuseChance(p) * 100)}%）模型：${a.r ? a.r.decision + '「' + a.r.line + '」' : '没返回'} ${a.ms}ms`);
      }
      const r = Eng.commit(s, plan);
      if (r.next === 'gate') { const x = Eng.gate(s); if (x.next === 'goal') Eng.chooseGoal(s, '就业'); }
    }
    console.log(`\n== 甩锅【${style}】`); log.forEach((l) => console.log(l));
  }
  // 硬气的话: 同一个事件，一个乖学生和一个刚被抓到糊弄的学生
  let done = 0;
  for (let k = 0; k < 200 && done < 2; k++) {
    const s = Eng.newGame({}); let g = 0;
    while (!s.ended && g++ < 20 && done < 2) {
      const c = Eng.beginTurn(s);
      if (c.event) {
        const o = c.event.options.find((x) => x.tone === '刚' && !x.disabled);
        if (o && Eng.needsRuling(s, o.i) && c.event.speaker === '导师' && s.t >= 3) {
          for (const mem of [['一连三周都把活交满了', '主动替他取了快递'], ['萝卜说活干完了，其实没干，被他发现了', '派了 2 点活，萝卜少交了 2 点']]) {
            s.mem = mem.map((m) => '第' + s.t + '周，' + m);
            const a = await post('bold', Eng.boldContext(s, o.i));
            console.log(`\n== 硬气【${s.mentor.type}】${c.event.text.replace(/\n/g, ' ').slice(0, 40)}\n  萝卜：${o.text}\n  他记得：${mem.join('；')}\n  模型：edge ${a.r && a.r.edge}｜让步：${a.r && a.r.reply}｜不让步：${a.r && a.r.reply_fail} ${a.ms}ms`);
          }
          done = 2;
        }
        Eng.pickOption(s, c.event.options.filter((x) => !x.disabled)[0].i); if (s.ended) break;
      }
      const r = Eng.commit(s, { lab: Math.min(c.ap, c.demand), thesis: c.ap - Math.min(c.ap, c.demand), unblock: 'explore' });
      if (r.next === 'gate') { const x = Eng.gate(s); if (x.next === 'goal') Eng.chooseGoal(s, '就业'); }
    }
  }
  // 同门出事的那一幕
  const s = Eng.newGame({}); Eng.beginTurn(s);
  s.peers[1].pressure = 82; s.peers[1].mem = ['第2周，萝卜把自己的活甩给了他，他接了', '第3周，萝卜把自己的活甩给了他，他接了', '第5周，萝卜想把活甩给他，他没接'];
  s.peers[2].pressure = 78; s.peers[2].mem = ['第4周，他撑不住的时候，萝卜花时间帮了他'];
  const a = await post('peers', Eng.worldContext(s));
  console.log(`\n== 同门出事 ${a.ms}ms`);
  if (a.r) { Object.keys(a.r).forEach((k2) => { const p = Eng.peerBySlot(s, k2); if (a.r[k2].ifBreak) console.log(`  ${p.name}（${p.persona}，倾向${p.tend}）→ ${a.r[k2].ifBreak.state}：${a.r[k2].ifBreak.scene}`); }); console.log('  校验通过：' + Eng.applyPeerLines(s, a.r)); }
})();
