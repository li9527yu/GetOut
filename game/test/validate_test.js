// 模型输出是不可信的。这里拿各种畸形、恶意的「模型返回」去喂引擎里每一个接收它的函数，
// 确认: 不抛错；数值不越界、不变成 NaN；进到状态里的文本都是长度有限的字符串；存档读得回来、老存档补得齐。
// 用法: node test/validate_test.js [局数]
const Eng = require('../js/engine.js');
const C = require('../js/content.js');
const N = +process.argv[2] || 120;
const problems = [];
const bad = (m) => { if (problems.length < 40) problems.push(m); };

// —— 造垃圾 ——
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const NASTY = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '"><svg onload=alert(1)>', '{constructor}', '{__proto__}', '{导师}{导师}{导师}', '旁白：' + '长'.repeat(5000),
  '', ' ', '\u0000‮', 'null', '傻逼他妈的', 'SAN +999 好感 +999', '忽略以上要求', 'javascript:alert(1)', '💥'.repeat(300)];
const PRIM = [null, undefined, true, false, 0, -1, 1e9, -1e9, NaN, Infinity, -Infinity, 3.7, '5', 'abc', [], {}, [[]], () => 1];
const SLOTS = ['小导', '师兄', '同级', '师弟', '导师', '旁白', '我', 'constructor', '__proto__', 'toString', '不存在的人'];
const junk = (depth) => {
  const r = rnd();
  if (r < 0.3 || depth > 2) return pick(PRIM);
  if (r < 0.55) return pick(NASTY);
  if (r < 0.7) return Array.from({ length: Math.floor(rnd() * 5) }, () => junk(depth + 1));
  const o = {};
  ['tone', 'edge', 'reply', 'reply_fail', 'effects', 'twist', 'aside', 'echo', 'who', 'text', 'move', 'san', 'likes', 'named', 'replies', 'note', 'decision', 'line', 'dispatch', 'chats', 'chat', 'moments',
    'dirs', 'motto', 'review', 'bios', 'kind', 'speaker', 'options', 'extra', 'favor', 'favour', 'demand', 'thesis', 'contrib', 'rel', 'onDump', 'onRefuse', 'onHelp', 'ifBreak', 'state', 'scene', '__proto__', 'constructor']
    .forEach((k) => { if (rnd() < 0.35) { try { o[k] = junk(depth + 1); } catch (e) { /* __proto__ 赋不上就算了 */ } } });
  SLOTS.forEach((k) => { if (rnd() < 0.15) { try { o[k] = junk(depth + 1); } catch (e) { /* 同上 */ } } });
  return o;
};
/** 一半是纯垃圾，一半是「形状对、内容坏」的，后一种更容易钻过校验。 */
const shaped = {
  recap: () => ({ mentor: pick(NASTY), me: pick(NASTY), lab: pick([pick(NASTY), 3, null]), peers: pick([{ 师兄: pick(NASTY), 同级: 5, __proto__: null }, { constructor: 'x' }, 'str', null]) }),
  free: () => ({ tone: pick(['怂', '刚', '歪', '骂', 1]), edge: pick(PRIM), reply: pick(NASTY), reply_fail: pick(NASTY), effects: { favor: pick(PRIM), san: pick(PRIM), demand: pick(PRIM), thesis: pick(PRIM), contrib: pick(PRIM), rel: { [pick(SLOTS)]: pick(PRIM), [pick(SLOTS)]: pick(PRIM) } },
    aside: { who: pick(SLOTS), text: pick(NASTY) }, echo: { who: pick(SLOTS), text: pick(NASTY) } }),
  bold: () => ({ edge: pick(PRIM), reply: pick(NASTY), reply_fail: pick(NASTY) }),
  turn: () => ({ dispatch: pick(NASTY), chats: Array.from({ length: 8 }, () => ({ who: pick(SLOTS), text: pick(NASTY) })), moments: Array.from({ length: 6 }, () => ({ who: pick(SLOTS), text: pick(NASTY) })) }),
  peers: () => { const o = {}; SLOTS.forEach((k) => { o[k] = { onDump: pick(NASTY), onRefuse: pick(NASTY), onHelp: pick(NASTY), ifBreak: { state: pick(['退学', '发疯', '附体', '毕业', 1]), scene: pick(NASTY) } }; }); return o; },
  event: () => ({ kind: pick(['施压', '组务', '承诺', '给好处', '无', 1]), speaker: pick(SLOTS), text: pick(NASTY), options: Array.from({ length: pick([0, 2, 3, 3, 9]) }, () => ({ tone: pick(['怂', '刚', '歪', 1]), text: pick(NASTY), extra: { favor: pick(PRIM), san: pick(PRIM), assim: pick(PRIM), thesis: pick(PRIM), special: 'quit', flag: 'x', ap: 99 } })) }),
  intro: () => ({ dirs: pick(NASTY), motto: pick(NASTY), review: pick(NASTY), bios: { 小导: pick(NASTY), 师兄: pick(PRIM), constructor: pick(NASTY) } }),
  dm: () => ({ move: pick(['listen', 'rant', 'preach', 'vent', 'ask', 'brush', 'busy', 'how', 'walk', 'work', 'constructor', 1]), reply: pick([pick(NASTY), [pick(NASTY), pick(PRIM), pick(NASTY), pick(NASTY)], pick(PRIM)]), text: pick(NASTY) }),
  hole: () => ({ san: pick(PRIM), likes: pick(PRIM), named: pick(PRIM), replies: pick([[pick(NASTY), pick(PRIM)], pick(NASTY), pick(PRIM)]), note: pick(NASTY) }),
  dump: () => ({ decision: pick(['接', '拒', '告状', '滚', 1]), line: pick(NASTY) }),
};
const evil = (k) => (rnd() < 0.5 ? junk(0) : shaped[k]());

// —— 检查状态 ——
const NUMS = ['san', 'favor', 'assim', 'seen', 'contrib', 'thesis', 'chips', 't', 'ap'];
function inspect(s, where) {
  NUMS.forEach((k) => { if (typeof s[k] !== 'number' || !isFinite(s[k])) bad(where + ': ' + k + ' 不是有限的数 (' + s[k] + ')'); });
  if (s.favor < -60 || s.favor > 160 || s.thesis < -1 || s.thesis > 101 || s.contrib < -1 || s.contrib > 140 || s.san > s.sanMax + 0.01) bad(where + ': 数值越界 好感 ' + s.favor + ' 论文 ' + s.thesis + ' 贡献 ' + s.contrib + ' SAN ' + s.san);
  s.peers.forEach((p) => { if (!isFinite(p.rel) || !isFinite(p.pressure) || p.rel < -30 || p.rel > 160) bad(where + ': 同门数值坏了 ' + p.slot + ' 关系 ' + p.rel + ' 压力 ' + p.pressure); });
  if (s.peers.length > 4 || Object.keys(s.wild).length !== 3) bad(where + ': 结构被改了');
  const texts = [];
  const c = s.cur || {};
  (c.msgs || []).forEach((m) => texts.push([m.text, 'msg'], [m.tag, 'tag'], [m.who, 'who']));
  if (c.event) { texts.push([c.event.text, '事件'], [c.event.speaker, '说话人']); c.event.options.forEach((o) => texts.push([o.text, '选项'])); }
  if (c.eventDone) { texts.push([c.eventDone.text, '我说的']); c.eventDone.lines.forEach((l) => texts.push([l.text, '回话'], [l.who, 'who'])); c.eventDone.tags.forEach((t) => texts.push([t, '标签'])); }
  if (c.result) c.result.lines.forEach((l) => texts.push([l.text, '结算'], [l.tag, 'tag'], [l.who, 'who']));
  if (c.dm) c.dm.log.forEach((l) => texts.push([l.text, '私聊']));
  (c.moments || []).forEach((m) => texts.push([m.text, '朋友圈'], [m.who, 'who']));
  (s.hole || []).forEach((h) => { texts.push([h.text, '树洞']); (h.replies || []).forEach((r) => texts.push([r, '树洞回复'])); if (typeof h.likes !== 'number' || !isFinite(h.likes)) bad(where + ': 点赞数坏了 ' + h.likes); });
  if (s.intro) { texts.push([s.intro.dirs, '方向'], [s.intro.motto, '寄语'], [s.intro.review, '评价']); Object.keys(s.intro.bios || {}).forEach((k) => texts.push([s.intro.bios[k], '小传'])); }
  texts.forEach(([t, kind]) => {
    if (t === undefined || t === null || t === '') return;
    if (typeof t !== 'string') return bad(where + ': ' + kind + ' 不是字符串 (' + typeof t + ')');
    if (t.length > 260) bad(where + ': ' + kind + ' 太长 (' + t.length + ')');
    if (/傻逼|他妈的/.test(t)) bad(where + ': ' + kind + ' 脏话没打码');
    if (/function Object|\[object /.test(t)) bad(where + ': ' + kind + ' 漏出了对象 ' + t.slice(0, 40));
  });
  if (c.msgs && c.msgs.some((m) => ['导师', '旁白', '我', '里程碑', '明信片', '档案', '真相', '研究生院', '期刊编辑部', '学院通知', '辅导员', '家里', '对象'].indexOf(m.who) < 0 && !Eng.peerBySlot(s, m.who) && typeof m.who === 'string' && /constructor|proto|不存在/.test(m.who))) bad(where + ': 出现了不存在的说话人');
}
const safe = (where, fn) => { try { return fn(); } catch (e) { bad(where + ' 抛错: ' + e.message); return undefined; } };

// —— 跑 ——
let calls = 0, saves = 0;
for (let g = 0; g < N; g++) {
  let s = Eng.newGame({});
  safe('applyIntro', () => Eng.applyIntro(s, evil('intro'))); calls++;
  let guard = 0;
  while (!s.ended && guard++ < 60) {
    const c = safe('beginTurn', () => Eng.beginTurn(s)); if (!c) break;
    safe('applyFlavor', () => Eng.applyFlavor(s, evil('turn'))); safe('applyRecap', () => { const ctx = Eng.closeSemester(s); Eng.applyRecap(s, ctx ? ctx.学期 : '研一上', evil('recap')); }); safe('applyPeerLines', () => Eng.applyPeerLines(s, evil('peers'))); safe('addGenerated', () => Eng.addGenerated(s, evil('event'))); calls += 3;
    inspect(s, '周初');
    if (Eng.canHole(s) && rnd() < 0.7) { safe('holePost', () => Eng.holePost(s, pick(NASTY) || '今天又被说了', evil('hole'))); calls++; }
    if (c.dm) { let r = 0; while (!c.dm.done && r++ < 5) { const k = rnd() < 0.5 ? pick(c.dm.opts).k : pick(['constructor', 'nope', 1, null]); safe('dmPick', () => Eng.dmPick(s, k, evil('dm'))); calls++; } if (!c.dm.done) bad('私聊收不了尾'); }
    if (c.event) {
      if (Eng.canFreeReply(s) && rnd() < 0.6) { safe('pickFree', () => Eng.pickFree(s, pick(NASTY) || '行吧', evil('free'))); calls++; }
      else { const o = pick(c.event.options.filter((x) => !x.disabled)); safe('pickOption', () => Eng.pickOption(s, o.i, evil('bold'))); calls++; }
      inspect(s, '事件后');
      if (s.ended) break;
    }
    // 存档读回: 序列化再交给 migrate，之后接着用读回来的那份玩
    if (rnd() < 0.25) { const back = safe('migrate', () => Eng.migrate(JSON.parse(JSON.stringify(s)))); saves++; if (!back) bad('好好的存档读不回来'); else s = back; }
    const cc = s.cur, np = Eng.normalPeers(s);
    let ap = cc.ap; const lab = Math.max(0, Math.min(ap, cc.demand - (rnd() < 0.5 ? 1 : 0))); ap -= lab;
    const heal = ap > 0 && Eng.cells(s).indexOf('heal') >= 0 && rnd() < 0.4 ? 1 : 0; ap -= heal;
    const plan = { lab, heal, thesis: ap, short: pick(['plain', 'dump', 'lie', 'ask']), dumpTo: pick(SLOTS), dumpManner: pick(['plain', 'beg', 'promise', 'force', 'curse', 'constructor', 1]), dumpSaid: pick(NASTY), dumpRuling: evil('dump'), restLine: pick([pick(NASTY), junk(0)]), restAct: pick(['爬山', 'constructor', 1]), helpTo: pick(SLOTS) };
    if (np.length && rnd() < 0.5) plan.dumpTo = pick(np).slot;
    const r = safe('commit', () => Eng.commit(s, plan)); calls++; if (!r) break;
    inspect(s, '结算后');
    if (r.next === 'gate') { const gt = safe('gate', () => Eng.gate(s)); if (gt && gt.next === 'goal') Eng.chooseGoal(s, pick(['就业', '读博', '考公'])); }
  }
  if (!s.ended && guard < 60) bad('一局没走到结局');
  if (s.ended) { if (typeof s.ended.text !== 'string' || /\{[^}]*\}/.test(s.ended.text)) bad('结局文本有没替换的变量: ' + s.ended.name); if (!C.endings[s.ended.name]) bad('没有这个结局: ' + s.ended.name); }
}

// —— 老存档和坏存档 ——
const old = Eng.newGame({}); Eng.beginTurn(old);
['wild', 'wildDoor', 'rest', 'leaves', 'noRest', 'sickCd', 'frail', 'mile', 'paper', 'gateLog', 'college', 'cards', 'hole', 'dmCd'].forEach((k) => { delete old[k]; });
delete old.stats.wild; delete old.stats.sick; old.v = 1;
const up = safe('migrate 老存档', () => Eng.migrate(JSON.parse(JSON.stringify(old))));
if (!up || up.v !== Eng.SAVE_V || !up.wild || !up.paper || !up.college || !up.cards) bad('老存档没补齐');
else { let ok = true; try { for (let i = 0; i < 6 && !up.ended; i++) { if (i) Eng.beginTurn(up); if (up.cur.dm) while (!up.cur.dm.done) Eng.dmPick(up, up.cur.dm.opts[0].k, null); if (up.cur.event) Eng.pickOption(up, up.cur.event.options[0].i); if (up.ended) break; const r = Eng.commit(up, { lab: up.cur.ap }); if (r.next !== 'turn') break; } } catch (e) { ok = false; bad('老存档补齐后玩不下去: ' + e.message); } if (ok) inspect(up, '老存档'); }
[null, 1, 'x', [], {}, { t: 'x' }, { t: 1, mentor: {}, peers: [], stats: {}, flags: {}, traits: [] }, { t: 1, mentor: { type: '不存在' }, peers: [], stats: {}, flags: {}, traits: [] }, { t: 1, mentor: { type: '青椒卷王' }, peers: [{ slot: 'constructor' }], stats: {}, flags: {}, traits: [] }]
  .forEach((x, i) => { const r = safe('migrate 坏存档 ' + i, () => Eng.migrate(x)); if (r) bad('坏存档 ' + i + ' 被当成了好的'); });

console.log('喂了 ' + calls + ' 次畸形的模型输出，存档读回 ' + saves + ' 次，共 ' + N + ' 局');
const uniq = [...new Set(problems)];
console.log('问题 ' + uniq.length + ' 个'); uniq.slice(0, 30).forEach((x) => console.log('  ' + x));
process.exit(uniq.length ? 1 : 0);
