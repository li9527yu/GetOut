/* 逃出绝命课题组 · 规则引擎
 * 数值以这个文件里的 P、R、EV 为准。上一级目录的 balance_sim.py 是早期的模拟脚本，后来加的系统它都没有，不要拿它对数。
 * 不碰 DOM，浏览器和 node 都能跑。状态 s 是纯 JSON，可以直接存档。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./content.js'));
  else root.Engine = factory(root.CONTENT);
})(this, function (C) {
  'use strict';

  const P = {
    turns: 24, tps: 8, extraTurns: 4, courseAp: 1, courseFreeNao: 4,
    apByGan: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5 },
    demandByPush: { 1: 1, 2: 1.5, 3: 2, 4: 2.2, 5: 2.4 },
    favorStart: 40, favorExtraDemand: 75, spillChance: 0.5, spillCap: 2,
    contribFull: 4, contribOver: 2, thesisBase: 1, thesisPerNao: 2,
    chipsNaoMid: 3, chipsPerNao: 0.75, chipsByMatch: { 高: 7, 中: 5, 低: 4 },
    helpPressure: -10, helpRel: 10, helpAssim: -2, healBase: 6, healPerXintai: 2,
    slackBoost: 1.5, slackAssim: -3, slackSeen: 3, slackUnlock: 25,
    seenPeer: { 退学: 10, 发疯: 6, 附体: 4 }, seenRenege: 8, seenMisguide: 5,
    seenGateFail: 8, seenCaught: 3, seenPerTurn: 0.5, seenDual: -5, seenGatePass: -3,
    seenTiers: [[75, 0.5, 0.7, -1], [50, 0.75, 0.85, 0]], seenPassiveCap: 60, seenEnd: 75,
    slackCaughtBase: 4, slackCaughtControl: 0.5,
    paperAt: 45, paperWait: 4, paperBase: 0.1, paperPerLevel: 0.05, paperPerNao: 0.04, paperPerTry: 0.15, paperRevise: 0.45,
    restFail: 0.15, restFailPush: 0.02, restFailSan: 4,
    askTruthRel: 60, askTruth: 0.35, askTruthSenior: 0.6,
    fraudChance: 0.06, fraudThesis: 12, fraudSan: 5, fraudDrain: 2, fraudAsk: 0.05, fraudBlind: 0.15, fraudEnd: 0.25,
    wildCircle: 3, wildDoor: 6, wildEnd: 8, wildEventChance: 0.3, restSeenPerPush: 0.05,
    sickBase: 0.02, sickMid: 0.08, sickLow: 0.2, sickNoRest: 0.04, sickOutdoor: 0.08, sickCap: 0.35, sickBig: 0.2, sickBigLow: 0.4, sickCd: 4,
    leaveBase: 0.2, leavePerRenpin: 0.1, leavePerFangren: 0.06, leavePerUsed: 0.1, leaveFrail: 3, frailContrib: 0.75,
    sickWorse: 0.3, sickWorseBig: 0.5,
    favorFull: 2, favorOver: 3, favorDump: 1, shortBase: 1,
    sanBase: 60, sanPerXintai: 8, sanDrain: [4, 5, 5], sanDrainExtra: 6,
    sanMadPeer: 2, sanPeerMad: 10, sanPeerQuit: 15, sanGateFail: 15, sanCaught: 8, sanLow: 20,
    sanShortWhenAssim: 5,
    assimFull: 5, assimOver: 2, assimShort: -3, assimDump: 3, assimDumpJunior: 8,
    assimPeerQuit: -10, assimGray: 60, assimEnd: 100,
    dumpPressure: 15, dumpRel: -15, tellBase: 0.40, tellPerRel: 0.005, tellJunior: 0.05, tellFavor: -8,
    askBase: 0.10, askPerRenqing: 0.08, askPerRel: 0.005, askPressure: 8, askRel: -5,
    lieBase: 0.05, liePerPush: 0.04, liePerPossessed: 0.15,
    bargainBase: 0.10, bargainPer: 0.08, bargainTurns: 4, bargainFailFavor: -5, bargainAssim: -5,
    renegePer: 0.05,
    dualPerRes: 0.03, dualGetBase: 0.30, dualGetPer: 0.10, dualTurns: 4, dualRatio: 0.5,
    peerStart: [30, 50], juniorStart: [10, 25], peerRand: [0, 2],
    peerGrowth: { 1: 0.2, 2: 0.5, 3: 0.8, 4: 1.1, 5: 1.4 },
    peerShortSpill: 3, peerGate: 3, peerChain: 4, peerWarn: 60, warnLines: [50, 75],
    peerBreakRate: 0.01, peerRandomExit: 0.005, madLeave: 0.15,
    tendency: {
      硬扛: { 发疯: 65, 退学: 20, 附体: 15 },
      顺从: { 附体: 65, 发疯: 20, 退学: 15 },
      清醒: { 退学: 65, 发疯: 20, 附体: 15 },
    },
    thesisLine: [30, 60, 100], contribLine: [20, 40, 60],
    signFavorMin: 30, signFavorSure: 50, signFavorAlone: 70, signBase: 0.40, signPerRenpin: 0.12,
    gateFailLostTurns: 2, chipsGoal: 100,
    assimCap: 120, relStart: 30, sanLossCap: 25, favorChangeCap: 20,
    choreWeight: 0.5, choreFavor: 1, sciBonusChance: 0.25, sciBonusRatio: 0.5,
    checkpoints: [20, 50, 80], guidePerLevel: 0.20,
    misguideLevel: 2, misguideChance: 0.30, misguideLoss: 5,
    peerGuideBase: 0.20, peerGuidePerRel: 0.006, exploreBase: 4, explorePerNao: 0.5,
    aiBoost: 1.5, aiUnlockRel: 50, aiUnlockRandom: 0.03, aiUnlockPusher: 0.10,
    aiCheckpointRate: 8, aiRateLine: 30, aiRateSlope: 0.02, aiRewrite: 10,
    aiMineBase: 0.14, aiMinePerNao: 0.02, aiMineFavor: -8, aiDetectSelf: 0.03,
    aiExtraDemand: 1, aiBanFavor: -10,
  };

  const R = {
    jobCaughtBase: 6, jobBoost: 1.3, jobWindows: [12, 13, 16, 17, 18],
    phdSelfCap: 60, phdPerSci: 2, phdLetterTurn: 22, phdLetter: [[60, 40], [40, 20]], phdLetterOther: 10,
    examTurns: { 18: 70, 20: 80 }, examCap: 85,
    meetingTurn: 2, winterTurn: 3, winterFangren: 3, precheckTurn: 19, blindTurn: 21,
    switchFrom: 6, switchTo: 9, switchAllyBase: 0.30, switchAllyPer: 0.10,
    switchBase: 0.30, switchPer: 0.10, switchPerEvidence: 0.10, switchControl: 0.20,
    switchThesis: 0.6, switchSeen: -20, switchFailFavor: -25, switchGrudge: 2, evidenceCap: 3,
    unionRel: 60, unionNeed: 2, unionBase: 0.20, unionPer: 0.20, unionMax: 0.80,
    unionPush: 3, unionFangren: 3, unionFloor: 30, unionFailFavor: -30,
    fallBase: 0.02, fallPerIncident: 0.02, fallPerEvidence: 0.02,
    stayTurns: [16, 21], stayFavor: 75, stayRefusePer: 0.20,
    stayOkFavor: -5, stayFailFavor: -20, staySignPenalty: 10, stayAssim: 40,
  };

  const EV = {
    chance: 0.6, chanceQuiet: 0.3,
    meek: { favor: 2, assim: 3, san: -1 },
    boldOk: { favor: -1, assim: -4 }, boldFail: { favor: -5, assim: -2, san: -3 },
    boldBase: 0.10, boldPer: 0.08,
    odd: { san: 3, seen: 2 }, oddBackfire: 0.5, oddFavor: -2,
    pressure: { san: -2, peer: 2 }, perk: { favor: 3, assim: 3 }, dutyRel: 5,
    promisePer: 0.20, promiseTurns: 4, promiseDelay: 3,
  };

  const EV_MIX = { 青椒卷王: [5, 2, 2, 1], 帽子大牛: [2, 5, 2, 1], 横向老板: [2, 1, 3, 4], 佛系放养: [2, 4, 2, 2], 行政领导: [1, 2, 4, 3], 控制狂: [10, 8, 1, 1], 神仙导师: [0.2, 3, 2, 5] };
  const ARCH = {
    青椒卷王: { push: [4, 5], res: [2, 4], fangren: [1, 3], renpin: [2, 4], level: [4, 5], chore: 0.1, sci: 0.7, ai: '加活' },
    帽子大牛: { push: [3, 4], res: [4, 5], fangren: [2, 4], renpin: [2, 4], level: [3, 3], chore: 0.1, sci: 0.4, ai: '加活' },
    横向老板: { push: [3, 5], res: [1, 3], fangren: [2, 3], renpin: [1, 3], level: [2, 3], chore: 0.2, sci: 0.1, ai: '加活' },
    佛系放养: { push: [1, 2], res: [1, 2], fangren: [4, 5], renpin: [3, 5], level: [2, 4], chore: 0.5, sci: 0.2, ai: '禁用' },
    行政领导: { push: [2, 4], res: [2, 3], fangren: [3, 4], renpin: [2, 4], level: [1, 2], chore: 0.8, sci: 0.0, ai: '禁用' },
    控制狂: { push: [5, 5], res: [1, 3], fangren: [1, 1], renpin: [1, 2], level: [2, 3], chore: 0.4, sci: 0.3, ai: '禁用' },
    神仙导师: { push: [1, 2], res: [4, 5], fangren: [5, 5], renpin: [5, 5], level: [4, 5], chore: 0.0, sci: 0.6, ai: '支持' },
  };
  const GOAL_MATCH = {
    青椒卷王: { 就业: '低', 读博: '高', 考公: '低' }, 帽子大牛: { 就业: '中', 读博: '高', 考公: '中' },
    横向老板: { 就业: '中', 读博: '低', 考公: '中' }, 佛系放养: { 就业: '高', 读博: '低', 考公: '高' },
    行政领导: { 就业: '中', 读博: '低', 考公: '高' }, 控制狂: { 就业: '低', 读博: '低', 考公: '低' },
    神仙导师: { 就业: '高', 读博: '高', 考公: '高' },
  };
  const POOL = { 青椒卷王: 0.176, 帽子大牛: 0.176, 横向老板: 0.176, 佛系放养: 0.176, 行政领导: 0.176, 控制狂: 0.10, 神仙导师: 0.02 };
  const TRAITS = {
    出身: ['本校保研', '双非逆袭', '跨专业', '二战上岸', '调剂生', '工作后读研'],
    家境: ['家里有矿', '助学贷款', '体制内父母', '高校教师子女', '家里老大'],
    性格: ['社牛', '大心脏', '小镇做题家', '社恐', '讨好型', '反骨', '拖延症'],
    技能: ['会写代码', '文笔好', '英语好', '早就会用AI', '会来事', '体力好'],
    生活: ['有对象', '异地恋', '养猫', '健身习惯', '夜猫子', '游戏搭子'],
  };
  const HARD_TRAITS = ['双非逆袭', '跨专业', '调剂生', '助学贷款', '异地恋', '拖延症', '社恐', '讨好型'];
  const SCORE = { 旷野: 80, 旷野肄业: 60, 上岸: 100, 延毕上岸: 70, 想开了: 60, 毕业即失业: 50, 延毕失业: 35, 退出: 20, 状态: 10 };
  const DIFF = { 神仙导师: 0.5, 佛系放养: 0.6, 帽子大牛: 1.0, 行政领导: 1.3, 控制狂: 1.5, 青椒卷王: 1.5, 横向老板: 1.8 };
  const ATTR_KEY = { push: 'push', 资源: 'res', 放人度: 'fangren', 人品: 'renpin', 水平: 'level', 匹配: 'match' };
  const SLOTS = ['小导', '师兄', '同级', '师弟'];

  // ---------- 小工具 ----------
  const rnd = () => Math.random();
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const wpick = (items, weights) => {
    let x = rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; }
    return items[items.length - 1];
  };
  const clampN = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const has = (s, tr) => s.traits.indexOf(tr) >= 0 ? 1 : 0;
  const stageOf = (s) => (s.delayed ? 3 : Math.min(2, Math.floor(s.t / P.tps)));
  const normalPeers = (s) => s.peers.filter((p) => p.state === '正常');
  const peerBySlot = (s, slot) => s.peers.find((p) => p.slot === slot);
  const EVENTS = {};
  C.events.forEach((e) => { EVENTS[e.id] = e; });
  // 记忆: 导师和每个同门各记几条和萝卜之间发生过的事，交给模型，让前后的事能连起来
  const wk = (s) => '第' + (s.t + 1) + '周';
  function remember(s, text) { s.mem = s.mem || []; s.mem.push(wk(s) + '，' + text); if (s.mem.length > 10) s.mem.shift(); }
  function prem(s, p, text) { if (!p) return; p.mem = p.mem || []; p.mem.push(wk(s) + '，' + text); if (p.mem.length > 6) p.mem.shift(); }
  const getEv = (s, id) => EVENTS[id] || (s.genEvents && s.genEvents[id]);

  // ---------- 开局 ----------
  function makePeer(slot, used) {
    const junior = slot === '师弟', senior = slot === '小导' || slot === '师兄';
    const persona = pick(C.personas[slot]);
    let sur; do { sur = pick(C.surnames); } while (used.indexOf(sur) >= 0);
    used.push(sur);
    const female = rnd() < 0.5;
    const name = slot === '小导' ? sur + '博' : slot === '师兄' ? sur + (female ? '师姐' : '师兄')
      : slot === '同级' ? pick(['阿', '小', '大']) + sur : '小' + sur;
    const range = junior ? P.juniorStart : P.peerStart;
    return { slot, name, persona: persona.name, tend: persona.tend, pressure: ri(range[0], range[1]), rel: P.relStart,
      state: '正常', inLab: true, junior, senior, warned: 0, pending: null, dumped: 0, mem: [] };
  }

  function setMentor(s, type, keepName) {
    const a = ARCH[type], m = { type };
    ['push', 'res', 'fangren', 'renpin', 'level'].forEach((k) => { m[k] = ri(a[k][0], a[k][1]); });
    m.ai = a.ai; m.control = type === '控制狂';
    m.weights = [a.chore + 0.2 * has(s, '文笔好') + 0.1 * has(s, '英语好'), a.sci,
      1 - a.chore - a.sci + 0.2 * has(s, '会写代码')].map((x) => Math.max(0, x));
    if (!keepName) {
      const prof = C.mentors[type];
      m.surname = pick(C.surnames); m.given = pick(C.givenNames);
      m.call = prof.call.replace('{姓}', m.surname);
      m.dirs = prof.dirs; m.title = prof.title;
    } else { ['surname', 'given', 'call', 'dirs', 'title'].forEach((k) => { m[k] = s.mentor[k]; }); }
    s.mentor = m;
    s.known = { push: 0, res: 0, fangren: 0, renpin: 0, level: 0, match: 0 };
  }

  // ---------- 存档版本 ----------
  // 存档就是状态 s。每次给 s 加了新字段、或者改了字段的意思，把 SAVE_V 加一，并在 migrate 里写清楚老存档怎么补。
  // 读档只走 migrate 这一个入口: 认不出来的存档返回 null，由界面决定怎么办。
  const SAVE_V = 2;
  function migrate(s) {
    if (!s || typeof s !== 'object' || typeof s.t !== 'number' || !s.mentor || !Array.isArray(s.peers) || !s.stats || !s.flags || !Array.isArray(s.traits)) return null;
    if (!C.mentors[s.mentor.type] || s.peers.some((p) => !p || SLOTS.indexOf(p.slot) < 0)) return null;
    // 1 → 2: 课题组之外、生病、里程碑和小论文、学院、明信片、树洞、私聊，都是后来加的
    wildInit(s); mileInit(s);
    if (!C.colleges.some((x) => x.name === s.college)) s.college = C.colleges[0].name;
    s.cards = s.cards || {}; s.hole = s.hole || []; s.queue = s.queue || []; s.mem = s.mem || []; s.known = s.known || {}; s.seenEvents = s.seenEvents || []; s.gen = s.gen || []; s.genEvents = s.genEvents || {};
    s.dmCd = s.dmCd || 0;
    s.peers.forEach((p) => { p.owed = p.owed || 0; p.mem = p.mem || []; });
    if (s.cur && s.cur.dm && !peerBySlot(s, s.cur.dm.slot)) s.cur.dm = null;
    if (s.cur && !s.cur.rest && !s.cur.result && s.t >= 1) s.cur.rest = null;
    s.v = SAVE_V;
    return s;
  }
  function newGame(meta) {
    meta = meta || {};
    const total = rnd() < 0.10 ? 16 : 12;
    let a; do { a = [ri(1, 5), ri(1, 5), ri(1, 5), ri(1, 5)]; } while (a[0] + a[1] + a[2] + a[3] !== total);
    const groups = Object.keys(TRAITS).sort(() => rnd() - 0.5).slice(0, 3);
    const traits = groups.map((g) => pick(TRAITS[g]));
    const s = { v: SAVE_V, traits, baseAttrs: { nao: a[0], gan: a[1], xintai: a[2], renqing: a[3] } };
    s.nao = a[0]; s.gan = a[1];
    s.xintai = Math.min(5, a[2] + has(s, '双非逆袭') + has(s, '助学贷款'));
    s.renqing = Math.min(5, a[3] + has(s, '工作后读研') + has(s, '社牛'));
    setMentor(s, wpick(Object.keys(POOL), Object.values(POOL)));
    s.origType = s.mentor.type;
    const col = pick(C.colleges);
    s.college = col.name; s.topic = pick(col.topics);
    s.goal = null; s.match = '中'; s.t = 0;
    s.ap = P.apByGan[s.gan];
    s.sanMax = P.sanBase + P.sanPerXintai * s.xintai + 8 * has(s, '二战上岸') + 8 * has(s, '健身习惯');
    s.san = s.sanMax;
    s.favor = P.favorStart - 8 * has(s, '双非逆袭') - 5 * has(s, '调剂生');
    s.assim = 0; s.seen = 0; s.contrib = 0; s.thesis = 0; s.chips = 0; s.thesisAi = 0;
    s.cleared = 0; s.explore = 0; s.unblockMethod = null;
    const used = [s.mentor.surname];
    s.peers = ['小导', '师兄', '同级'].map((sl) => makePeer(sl, used));
    if (has(s, '本校保研')) s.peers[1].rel = 50;
    s.ai = { unlocked: !!has(s, '早就会用AI'), found: false, banned: false, mode: 'off' };
    s.mines = []; s.bargain = 0; s.dual = 0; s.lost = 0; s.incidents = 0; s.delayed = false; s.extraLeft = 0;
    s.examPassed = false; s.evidence = 0; s.switchUsed = false; s.switchedOk = false; s.grudge = 0;
    s.united = false; s.unionOk = false; s.favorFloor = 0; s.autoSign = false; s.fell = false;
    s.stayAsked = false; s.stayBlocked = false; s.signPenalty = 0; s.stayAccepted = false; s.stayWait = 0;
    s.blindFail = false; s.blindDelay = false; s.shield = 0; s.gen = []; s.genEvents = {}; s.genCount = 0; s.lastNotes = []; s.mem = []; s.intro = null; s.flags = {}; s.seenEvents = []; s.queue = []; s.promises = [];
    s.truth = null; s.knownTruths = (meta.truths && meta.truths[s.mentor.type]) || [];
    s.recent = meta.recent || [];
    s.stats = { demand: 0, shorts: 0, help: 0, dumps: 0, slack: 0, ai: 0, turns: 0, chores: 0, wild: 0, sick: 0 };
    wildInit(s);
    s.omenSlot = null; s.lastFull = false; s.ended = null; s.cur = null; s.phase = 'intro';
    if (has(s, '高校教师子女')) s.known[pick(['push', 'res', 'fangren', 'renpin', 'level'])] = 1;
    return s;
  }

  // ---------- 看得见的进度: 毕业论文的里程碑、小论文、能不能毕业 ----------
  function mileInit(s) {
    if (s.mile == null) { s.mile = 0; while (s.mile < C.milestones.length && s.thesis >= C.milestones[s.mile].at) s.mile++; }
    s.paper = s.paper || { state: 'none', due: 0, tries: 0 };
    s.gateLog = s.gateLog || [];
  }
  function mileStep(s, L) {
    const M = C.milestones;
    while (s.mile < M.length && s.thesis >= M[s.mile].at - 1e-9) { const m = M[s.mile]; s.mile += 1; L.push({ who: '里程碑', text: fill(s, m.text), tag: '毕业论文 ' + s.mile + '/' + M.length + ' · ' + m.name }); }
    // 研二以后，论文做到一半会顺手投一篇小论文。它不卡毕业，中了是好事
    const pp = s.paper;
    if (pp.state === 'none' && s.thesis >= P.paperAt && stageOf(s) >= 1) {
      pp.state = 'review'; pp.due = s.t + 1 + P.paperWait;
      L.push({ who: '旁白', text: fill(s, pick(C.paper.submit)), tag: '小论文：已投稿，大约 ' + P.paperWait + ' 周后有消息。答辩前必须录用' });
      if (s.mentor.renpin <= 2) { see(s, 2); L.push({ who: '旁白', text: fill(s, pick(C.paper.author)), tag: '' }); }
    }
  }
  function paperResult(s, c, say) {
    const pp = s.paper, m = s.mentor, r = rnd();
    const pa = clampN(P.paperBase + P.paperPerLevel * m.level + P.paperPerNao * s.nao - aiRate(s) / 200 + P.paperPerTry * pp.tries, 0.1, 0.9);
    if (r < pa) {
      pp.state = 'accepted'; c.favor += 4; s.san = Math.min(s.sanMax, s.san + 8);
      if (s.goal === '读博') addChips(s, 10);
      say('期刊编辑部', pick(C.paper.accept), '小论文录用了：导师好感 +4，SAN +8' + (s.goal === '读博' ? '，发表 +10' : ''));
      say('导师', C.paper.mentorOk[m.type] || '中了？好。', '');
      remember(s, '萝卜的小论文被录用了');
    } else if (r < pa + P.paperRevise) {
      pp.tries += 1; pp.due = s.t + 3; c.ap = Math.max(0, c.ap - 1);
      openHole(s, '小论文被打回来大修');
      say('期刊编辑部', pick(C.paper.revise), '小论文大修：这周精力 −1 用来改稿，大约 3 周后再有消息');
    } else {
      pp.tries += 1; pp.due = s.t + P.paperWait; c.sanLoss += 5;
      openHole(s, '小论文被拒稿了');
      say('期刊编辑部', pick(C.paper.reject), '小论文被拒：SAN −5。你换了个期刊，又投了出去');
    }
  }
  /** 按现在的进度，下一关过不过得去。给状态栏和档案用，只看玩家看得见的三样: 论文、贡献、导师好感。 */
  function outlook(s) {
    const i = s.delayed ? 2 : Math.min(2, stageOf(s)), left = s.delayed ? Math.max(1, s.extraLeft) : Math.max(1, (i + 1) * P.tps - s.t);
    const tn = Math.max(0, P.thesisLine[i] - s.thesis), cn = Math.max(0, P.contribLine[i] - s.contrib);
    const tAp = tn / left / thesisRate(s), cW = cn / left / P.contribFull;
    let th = tn <= 0 || tAp <= 1 ? '稳' : tAp <= 2 ? '悬' : '危';
    if (tn > 0 && blocked(s) && th === '稳') th = '悬';
    const co = cn <= 0 || cW <= 0.7 ? '稳' : cW <= 1 ? '悬' : '危';
    const sg = s.autoSign || s.favor >= P.signFavorSure ? '稳' : s.favor >= P.signFavorMin ? '悬' : '危';
    // 小论文: 答辩前必须录用。一轮审稿三四周，所以越往后越危险
    const pp = s.paper || { state: 'none' }, toDefense = s.delayed ? left : Math.max(1, P.turns - s.t);
    const pa = pp.state === 'accepted' ? '稳' : stageOf(s) < 1 ? '稳' : pp.state === 'review' ? (toDefense >= 8 ? '稳' : toDefense >= 4 ? '悬' : '危') : (toDefense >= 12 ? '悬' : '危');
    const rank = { 稳: 0, 悬: 1, 危: 2 }, worst = [th, co, sg].concat(i === 2 ? [pa] : []).sort((a, b) => rank[b] - rank[a])[0];
    return { gate: ['开题', '中期考核', '答辩'][i], left, 论文: th, 贡献: co, 签字: sg, 小论文: pa, worst, need: Math.ceil(tn) };
  }

  // ---------- 私聊: 同门私下来找你 ----------
  function dmOpen(s, c, p, kind) {
    const D = C.dm, gateName = ['开题', '中期考核', '答辩'][Math.min(2, stageOf(s))];
    let open, more = null, id = kind, opts;
    if (kind === 'mad') {
      open = pick(D.mad); opts = D.madOpts.map((o) => ({ k: o.k, text: o.me, hint: '' }));
    } else {
      const ok = { any: true, pressure: p.pressure >= 50, close: p.rel >= 55, dumped: (p.dumped || 0) > 0, gate: s.t % P.tps >= 5, warn: !!s.acadWarn || s.favor < 35, paper: (s.paper || {}).state === 'review' };
      const pool = kind === 'trap' ? D.trap : D.scripts.filter((x) => ok[x.why] && (s.dmSeen || []).indexOf(x.id) < 0);
      const sc = pick(pool.length ? pool : D.scripts.filter((x) => x.why === 'any'));
      id = sc.id; open = sc.open; more = sc.more; s.dmSeen = (s.dmSeen || []).concat(id).slice(-8);
      const canAsk = kind === 'vent' && p.rel >= 50 && (s.truth == null || ['push', 'res', 'fangren', 'renpin', 'level'].some((k) => !(s.known[k] >= 2)));
      const ks = ['listen', 'rant', rnd() < 0.5 ? 'preach' : 'vent', canAsk && rnd() < 0.6 ? 'ask' : 'brush', 'busy'];
      opts = ks.map((k) => ({ k, text: pick(D.moves[k].me), hint: D.moves[k].hint + (k === 'busy' || k === 'brush' ? '' : c.ap > 0 ? '，花 1 点精力' : '，没精力了，SAN −2') }));
    }
    c.dm = { slot: p.slot, kind, id, round: 0, more, log: open.map((t) => ({ who: '他', text: fill(s, t, { 关卡: gateName }) })), opts, tags: [], done: false, closed: false };
    s.dmCd = 2;
  }
  function dmRoll(s, c) {
    s.dmCd = Math.max(0, (s.dmCd || 0) - 1);
    const mad = s.peers.filter((p) => p.state === '发疯' && p.inLab);
    if (mad.length && rnd() < 0.25) return dmOpen(s, c, pick(mad), 'mad');
    if (s.dmCd) return;
    const pos = s.peers.filter((p) => p.state === '附体');
    if (pos.length && rnd() < 0.15) return dmOpen(s, c, pick(pos), 'trap');
    const cand = normalPeers(s).filter((p) => p.rel >= 25);
    if (cand.length && rnd() < 0.35) dmOpen(s, c, wpick(cand, cand.map((p) => p.rel + p.pressure * 0.5)), 'vent');
  }
  /** 给模型: 这段私聊到现在说了什么，玩家这句话可以算作哪几种走向。 */
  function dmContext(s, text, fixedMove) {
    const c = s.cur, d = c.dm, p = peerBySlot(s, d.slot), w = worldContext(s);
    const allowed = d.kind === 'mad' ? C.dm.madOpts.map((o) => o.k) : d.round === 0 ? ['listen', 'rant', 'preach', 'vent', 'brush', 'busy'] : ['how', 'walk', 'work'];
    return { 专业背景: w.专业背景, 导师: w.导师, 私聊的人: { 位置: p.slot, 名字: p.name, 人设: p.persona, 状态: p.state, 压力: band(p.pressure, 50, 75), 和萝卜的关系: band(p.rel, 30, 60), 他记得的事: (p.mem || []).slice(-4) },
      聊天类型: { vent: '他来找萝卜吐槽', trap: '他已经被导师同化了，假装吐槽，其实在替导师套萝卜的话', mad: '他已经发疯了，只会说荒诞的胡话' }[d.kind],
      聊天记录: d.log.map((m) => (m.who === '他' ? p.name : '萝卜') + '：' + m.text), 萝卜这句话: text,
      可选的走向: allowed, 已定的走向: fixedMove || null, 走向说明: 'listen 认真听他说；rant 陪他一起骂导师；preach 劝他忍；vent 萝卜反过来倒自己的苦水；brush 敷衍；busy 说没空；how 问他打算怎么办；walk 提议出去走走；work 说要去干活了；here 回应他；silent 不回；scroll 翻旧聊天记录' };
  }
  function dmPick(s, key, judged) {
    const c = s.cur, d = c.dm, D = C.dm;
    if (!d || d.done) return null;
    const p = peerBySlot(s, d.slot), j = judged && typeof judged === 'object' && !Array.isArray(judged) ? judged : {}, typed = str(j.text, 60);
    const opt = d.opts.find((o) => o.k === key), tag = (t) => d.tags.push(t);
    const reply = (fallback) => { const r = Array.isArray(j.reply) ? j.reply : j.reply ? [j.reply] : []; const out = r.map((x) => str(x, 44)).filter(Boolean).slice(0, 2); (out.length ? out : [pick(fallback)]).forEach((t) => d.log.push({ who: '他', text: gearText(s, t) })); };
    const end = () => {
      d.done = true; d.opts = [];
      c.msgs.push({ who: '旁白', text: d.kind === 'mad' ? p.name + '给你发了一串消息。' : '你和' + p.name + '私下聊了几句。', tag: d.tags.join('　') });
    };
    d.log.push({ who: '我', text: typed || (opt ? opt.text : '……') });
    if (d.kind === 'mad') {
      const o = D.madOpts.find((x) => x.k === key) || D.madOpts[1];
      reply(o.him);
      if (o.k === 'here') { c.sanLoss += 3; p.rel = clampN(p.rel + 2, 0, 100); tag('SAN −3'); }
      else if (o.k === 'scroll') { c.sanLoss += 2; see(s, 3); tag('SAN −2'); tag('你想起他以前是什么样的'); }
      else tag('你没有回');
      return end();
    }
    if (d.round === 0) {
      if (key === 'busy') { p.rel = clampN(p.rel - 3, 0, 100); reply(D.moves.busy.him); tag(p.name + ' 关系 −3'); prem(s, p, '他私下来找萝卜说话，萝卜说没空'); return end(); }
      if (key === 'brush') { p.rel = clampN(p.rel - 5, 0, 100); reply(D.moves.brush.him); tag(p.name + ' 关系 −5'); prem(s, p, '他私下来找萝卜说话，萝卜敷衍了几句'); return end(); }
      if (c.ap > 0) { c.ap -= 1; tag('精力 −1'); } else { c.sanLoss += 2; tag('SAN −2'); }
      const m = own(D.moves, key) ? key : 'listen';        // 只认表里有的走向；constructor 这种名字不算
      d.move = m;
      reply(D.moves[m].him);
      if (d.kind === 'trap') {
        if (m === 'rant') { c.favor -= 8; tag(D.trapLeak); tag('导师好感 −8'); remember(s, p.name + '转来一段聊天记录，萝卜在里面骂了他'); }
        else if (m === 'vent') { c.favor -= 3; tag(D.trapLeak); tag('导师好感 −3'); remember(s, p.name + '说萝卜私下喊累'); }
        else if (m === 'preach') { c.favor += 1; addAssim(s, 3); tag('导师好感 +1'); }
        else tag('你没有接他的话');
      } else if (m === 'listen') { p.pressure = clampN(p.pressure - 8, 0, 100); p.rel = clampN(p.rel + 6, 0, 100); c.sanLoss += 2; tag(p.name + ' 关系 +6'); tag('他轻松了一些'); tag('SAN −2'); prem(s, p, '他撑不住的时候来找萝卜，萝卜认真听他说完了'); }
      else if (m === 'rant') {
        s.san = Math.min(s.sanMax, s.san + 5); p.pressure = clampN(p.pressure - 5, 0, 100); p.rel = clampN(p.rel + 6, 0, 100); see(s, 2); addAssim(s, -2);
        tag('SAN +5'); tag(p.name + ' 关系 +6'); prem(s, p, '萝卜陪他骂了一晚上导师');
        // 骂着骂着，总会带出点组里的事
        const un0 = ['push', '资源', '放人度', '人品', '水平'].filter((n) => !(s.known[ATTR_KEY[n]] >= 2));
        if (un0.length && rnd() < 0.3) { const L0 = []; reveal(s, pick(un0), L0); L0.forEach((x) => d.log.push({ who: '档案', text: x.text })); tag('骂着骂着带出一件事：导师档案 +1'); }
        if (rnd() < 0.06 + 0.1 * s.peers.filter((x) => x.state === '附体').length) { c.favor -= 6; d.log.push({ who: '旁白', text: D.leak }); tag('聊天截图传到了导师那里，导师好感 −6'); remember(s, '看到了一张萝卜在背后说他的聊天截图'); }
      } else if (m === 'preach') { p.pressure = clampN(p.pressure - 3, 0, 100); addAssim(s, 3); const dr = p.tend === '清醒' ? -5 : -1; p.rel = clampN(p.rel + dr, 0, 100); tag(p.name + ' 关系 ' + sign(dr)); tag('你说的话开始像导师了'); prem(s, p, '他来吐槽，萝卜劝他忍一忍'); }
      else if (m === 'vent') { s.san = Math.min(s.sanMax, s.san + 6); const up = p.pressure >= 50 ? 8 : 3; p.pressure = clampN(p.pressure + up, 0, 100); p.rel = clampN(p.rel + 2, 0, 100); tag('SAN +6'); tag(up > 3 ? '他本来就快撑不住了，听完更沉默了' : p.name + ' 关系 +2'); prem(s, p, '他来吐槽，结果听萝卜倒了一晚上苦水'); }
      else if (m === 'ask') {
        // 套话: 关系够铁的话，能套出导师的真相（他为什么是这样的人）；不然套出一项底细。在组里待得久的人知道得多
        const un = ['push', '资源', '放人度', '人品', '水平'].filter((n) => !(s.known[ATTR_KEY[n]] >= 2)), L2 = [], senior = p.slot === '小导' || p.slot === '师兄';
        if (s.truth == null && p.rel >= P.askTruthRel && (rnd() < (senior ? P.askTruthSenior : P.askTruth) || !un.length)) { revealTruth(s, L2); L2.forEach((x) => d.log.push({ who: '真相', text: x.text })); tag('套出了导师的真相'); prem(s, p, '他把导师的一件旧事告诉了萝卜'); }
        else if (un.length) { reveal(s, pick(un), L2); L2.forEach((x) => d.log.push({ who: '档案', text: x.text })); tag('导师档案 +1'); }
        else { d.log.push({ who: '他', text: '该说的我都说了。再往下的，我也不知道。' }); tag('没套出新东西'); }
        p.rel = clampN(p.rel - 1, 0, 100);
      }
      if (d.more) d.log.push({ who: '他', text: fill(s, d.more) });
      d.round = 1; d.opts = D.closers.map((o) => ({ k: o.k, text: o.me, hint: '' }));
      return d;
    }
    const cl = D.closers.find((o) => o.k === key) || D.closers[2];
    reply(cl.him);
    if (d.kind !== 'trap') {
      if (cl.k === 'how') { p.rel = clampN(p.rel + 2, 0, 100); tag(p.name + ' 关系 +2'); }
      else if (cl.k === 'walk') { p.pressure = clampN(p.pressure - 4, 0, 100); p.rel = clampN(p.rel + 3, 0, 100); s.san = Math.min(s.sanMax, s.san + 1); tag(p.name + ' 关系 +3'); tag('SAN +1'); }
    }
    return end();
  }
  // ---------- 树洞: 匿名发一条，把话说出来 ----------
  // 树洞不是一直开着的: 出了事、状态不对的时候才想去说。开了以后这一周和下一周能发
  function openHole(s, why) { if (s.holeUntil == null || s.t + 1 > s.holeUntil || !s.holeWhy) s.holeWhy = why; s.holeUntil = s.t + 1; }
  const canHole = (s) => !!s.cur && !s.cur.result && !s.ended && !s.cur.holeDone && s.holeUntil != null && s.t <= s.holeUntil;
  function holeContext(s, text) {
    const m = s.mentor;
    return { 帖子: String(text).slice(0, 100), 导师的姓和称呼: [m.surname, m.call, m.surname + m.given], 同门的名字: s.peers.map((p) => p.name),
      刚发生的事: s.holeWhy || '', 萝卜: { SAN: Math.round(s.san), 状态: mood(s), 学年: stageOf(s) + 1 }, 最近发生的事: (s.mem || []).slice(-3), 以前发过的: (s.hole || []).slice(-3).map((x) => x.text) };
  }
  function holePost(s, text, judged) {
    const c = s.cur, t = str(text, 100);
    if (!canHole(s) || !t || t.length < 2) return null;
    const j = judged && typeof judged === 'object' && !Array.isArray(judged) ? judged : {}, same = (s.hole || []).some((x) => x.text === t);
    let gain = judged ? clampN(Math.round(num(j.san)), 0, 6) : t.length >= 12 ? 3 : 2;
    if (same) gain = Math.min(gain, 1);
    const replies = (Array.isArray(j.replies) ? j.replies : []).map((x) => str(x, 30)).filter(Boolean).slice(0, 2);
    const post = { t: s.t, text: t, san: gain, likes: clampN(Math.round(num(j.likes) || (3 + Math.floor(rnd() * 40))), 0, 999), replies: replies.length ? replies : [pick(C.hole.replies)], note: str(j.note, 40) || '' };
    s.hole = (s.hole || []).concat(post).slice(-20); c.holeDone = true; s.holeUntil = null; s.holeWhy = null;
    s.san = Math.min(s.sanMax, s.san + gain); see(s, 1);
    // 指名道姓的帖子有两成概率被认出来
    const named = judged ? !!j.named : [s.mentor.surname + s.mentor.given, s.mentor.call].some((n) => t.indexOf(n) >= 0);
    if (named && rnd() < 0.2) { c.favor -= 5; post.leak = true; c.msgs.push({ who: '导师', text: C.hole.leak, tag: '你的帖子被认出来了，导师好感 −5' }); remember(s, '在树洞上看到一个帖子，写的像是他，他猜是萝卜发的'); }
    c.msgs.push({ who: '旁白', text: '你在树洞发了一条：「' + t.slice(0, 24) + (t.length > 24 ? '…' : '') + '」', tag: gain ? 'SAN +' + gain : '说完也没好受多少' });
    return post;
  }
  /** 甩锅前怎么开口，会改变他接不接、之后怎么看你。 */
  function dumpManner(p, manner) {
    const soft = p.junior || p.tend === '顺从';
    return ({ plain: { adj: -0.05, relOk: 3, rel: 0, tell: 0 }, beg: { adj: (p.begged || 0) >= 2 ? 0 : -0.15, relOk: 0, rel: 0, tell: 0, san: -2 },
      promise: { adj: -0.25, relOk: 2, rel: 0, tell: -0.1, owe: 1 }, force: { adj: soft ? -0.3 : 0.1, relOk: 0, rel: -8, tell: 0.2 },
      curse: { adj: 0.25, relOk: 0, rel: -12, tell: 0.1, san: 2 } })[manner] || { adj: 0, relOk: 0, rel: 0, tell: 0 };
  }

  // ---------- 课题组之外、生病 ----------
  function wildInit(s) {
    s.wild = s.wild || { 户外: 0, 文艺: 0, 人: 0 };
    if (s.wildDoor === undefined) s.wildDoor = null;
    if (s.rest === undefined) s.rest = null;
    s.leaves = s.leaves || 0; s.noRest = s.noRest || 0; s.sickCd = s.sickCd || 0; s.frail = !!s.frail;
    if (s.stats && s.stats.wild == null) { s.stats.wild = 0; s.stats.sick = 0; }
  }
  /** 熟悉度过线时，把「认识了圈里的人」「有人递来入口」排到下一周。 */
  function wildCheck(s, dir) {
    const key = C.wildDirs[dir].key, n = s.wild[dir];
    if (n >= P.wildCircle && !s.flags['wc_' + key]) { s.flags['wc_' + key] = true; s.queue.push({ id: 'w_' + key + '_circle', due: s.t + 1 }); return true; }
    if (n >= P.wildDoor && !s.flags['wd_' + key] && !s.wildDoor) { s.flags['wd_' + key] = true; s.queue.push({ id: 'w_' + key + '_door', due: s.t + 1 }); return true; }
    return false;
  }
  /** 接入点: 让模型现写这次出去的见闻。写得不合格就用固定文本。 */
  function restContext(s, act) {
    const a = C.restActs[act], dir = a.dir;
    return { 活动: act, 这次去的由头: (s.cur && s.cur.rest && s.cur.rest.why) || '', 方向: dir, 去过几次: s.wild[dir], 学年: stageOf(s) + 1, 这周是: C.calendar[s.t + 1] || '普通的一周',
      萝卜: { SAN: Math.round(s.san), 心态: mood(s), 词条: s.traits, 学院: collegeOf(s).name },
      以前写过的: (s.restSeen || []).slice(-4), 参考写法: pick(a.lines) };
  }
  function restLine(s, x) {
    let t = typeof x === 'string' ? x : x && x.text;
    if (typeof t !== 'string') return null;
    t = t.trim().replace(/^\s*旁白\s*[：:]\s*/, '').replace(/^[「"“]|[」"”]$/g, '');
    if (t.length < 8 || t.length > 90 || /SAN|好感|熟悉度|导师|老师/.test(t)) return null;
    return t;
  }
  /** 这周如果休息或摆烂，会去哪儿。不是玩家挑的: 按方向抽，去得多的方向更容易再被约到，再配一个由头。 */
  function rollRest(s) {
    const dirs = Object.keys(C.wildDirs), w = dirs.map((d) => (1 + Math.min(9, s.wild[d])) * (s.wildDoor === d ? 3 : 1));
    const dir = wpick(dirs, w), acts = Object.keys(C.restActs).filter((a) => C.restActs[a].dir === dir && a !== s.rest);
    const act = pick(acts.length ? acts : Object.keys(C.restActs).filter((a) => C.restActs[a].dir === dir));
    const okWhy = C.restWhy[act].filter((t) => !SLOTS.some((sl) => t.indexOf('{' + sl + '}') >= 0 && (peerBySlot(s, sl) || {}).state !== '正常'));
    const again = s.wild[dir] >= P.wildCircle && rnd() < 0.3;
    return { act, dir, why: fill(s, again ? C.restAgain[dir] : pick(okWhy.length ? okWhy : ['这周难得没什么事压着。'])) };
  }
  /** 「户外运动 去过 3 次」这样的说法，标签和界面共用。 */
  const wildCount = (s, dir) => C.wildDirs[dir].label + ' ' + C.wildDirs[dir].verb + ' ' + s.wild[dir] + ' 次';
  const wildReady = (s) => !!s.wildDoor && s.wild[s.wildDoor] >= P.wildEnd;
  /** 这一周有没有固定剧情要演。有的话不安排生病，免得把剧情挤掉。 */
  function nodeDue(s) {
    const t = s.t + 1;
    return C.nodes.some((n) => (n.t === t || (n.from && t >= n.from && t <= n.to)) && !(s.delayed && !n.extra) && EVENTS[n.id] && eligible(s, EVENTS[n.id]));
  }
  function sickChance(s) {
    let p = s.san < 30 ? P.sickLow : s.san < 50 ? P.sickMid : P.sickBase;
    p += P.sickNoRest * Math.max(0, s.noRest - 3);
    if (has(s, '体力好') || has(s, '健身习惯')) p *= 0.5;
    p *= 1 - P.sickOutdoor * Math.min(5, s.wild['户外']);
    return Math.min(P.sickCap, p);
  }
  function leaveChance(s, big) {
    const m = s.mentor;
    return clampN(P.leaveBase + P.leavePerRenpin * m.renpin + P.leavePerFangren * m.fangren + (s.favor - 40) / 200 - P.leavePerUsed * s.leaves + (big ? 0.15 : 0), 0.05, 0.95);
  }

  // ---------- 查询 ----------
  const thesisRate = (s) => P.thesisBase + P.thesisPerNao * s.nao + has(s, '小镇做题家');
  function chipsRate(s) {
    let r = P.chipsByMatch[s.match] + P.chipsPerNao * (s.nao - P.chipsNaoMid);
    if ((has(s, '体制内父母') && s.goal === '考公') || (has(s, '英语好') && s.goal === '读博')) r += 1;
    return r;
  }
  const healRate = (s) => P.healBase + P.healPerXintai * s.xintai + 3 * has(s, '体力好');
  const slackRate = (s) => (P.healBase + P.healPerXintai * s.xintai) * P.slackBoost * (has(s, '社恐') ? 1.5 : 1) + 3 * has(s, '养猫');
  const canSlack = (s) => s.seen >= P.slackUnlock;
  function seenTier(s) {
    for (const [line, a, b, c] of P.seenTiers) if (s.seen >= line) return [a, b, c];
    return [1, 1, 0];
  }
  const thesisCap = (s) => (s.cleared < P.checkpoints.length ? P.checkpoints[s.cleared] : 100);
  const blocked = (s) => s.cleared < P.checkpoints.length && s.thesis >= thesisCap(s) - 1e-9;
  const exploreCost = (s) => Math.ceil(P.exploreBase - P.explorePerNao * s.nao) + has(s, '工作后读研');
  const aiRate = (s) => (s.thesis > 0 ? (100 * s.thesisAi) / s.thesis : 0);
  const lieChance = (s) => P.lieBase + P.liePerPush * s.mentor.push + P.liePerPossessed * s.peers.filter((p) => p.state === '附体').length;
  function chipsCap(s) {
    if (s.goal === '读博') return R.phdSelfCap;
    if (s.goal === '考公' && !s.examPassed) return R.examCap;
    return P.chipsGoal;
  }
  function addChips(s, gain, cap) {
    cap = cap == null ? chipsCap(s) : cap;
    s.chips = Math.max(s.chips, Math.min(cap, s.chips + gain));
  }
  const landed = (s) => !!s.goal && !(s.goal === '考公' && !s.examPassed) && s.chips >= P.chipsGoal;
  function addThesis(s, gain, byAi) {
    gain = Math.min(gain, Math.max(0, thesisCap(s) - s.thesis));
    s.thesis += gain; if (byAi) s.thesisAi += gain;
  }
  function see(s, x) {
    if (x > 0) x = Math.max(0, Math.min(x, P.seenPassiveCap - s.seen));
    s.seen += x;
  }
  function addAssim(s, x) {
    if (x > 0) x *= (has(s, '讨好型') ? 1.5 : 1) * (has(s, '反骨') ? 0.5 : 1);
    s.assim += x;
  }
  function mood(s) { return s.seen >= 75 ? '无所谓了' : s.seen >= 50 ? '看透了' : s.seen >= 25 ? '有点累了' : '还想卷'; }
  function nickname(s) {
    return s.assim >= 80 ? '小萝老师' : s.assim >= 40 ? '萝卜（' + s.mentor.call + '组）' : '萝卜';
  }
  function cells(s) {
    const st = stageOf(s), out = ['lab', 'thesis'];
    if (s.t >= 1) out.push('heal');
    if (s.t >= 2) out.push('help');
    if (st >= 1 && s.goal) out.push('chips');
    if (canSlack(s)) out.push('slack');
    if (s.flags.precheck && s.thesisAi > 0) out.push('rewrite');
    return out;
  }

  // ---------- 文本与条件 ----------
  /** 这一局的学院。老存档没有这一项，按生命科学学院算。 */
  const collegeOf = (s) => C.colleges.find((x) => x.name === s.college) || C.colleges[0];
  /** 文本里写的「离心机」是占位的，换成这个学院实验室里的那台仪器。 */
  const gearText = (s, text) => {
    const col = collegeOf(s); let t = String(text);
    if (col.gear !== '离心机') t = t.split('离心机').join(col.gear);
    if (col.stuff && col.stuff !== '试剂') t = t.split('试剂').join(col.stuff);
    if (col.coat && col.coat !== '白大褂') t = t.split('白大褂').join(col.coat);
    return t;
  };
  const field = (s) => ({ 学院: collegeOf(s).name, 学科: collegeOf(s).kind, 课题方向: s.topic, 实验室里的标志性仪器: collegeOf(s).gear, 常用的耗材: collegeOf(s).stuff });
  function fill(s, text, vars) {
    return gearText(s, text).replace(/\{([^}]+)\}/g, (m, k) => {
      if (vars && Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null) return vars[k];   // 只认自己放进去的变量，{constructor} 这种不算
      if (k === '导师') return s.mentor.call;
      if (k === '导师名') return s.mentor.surname + s.mentor.given;
      if (k === '课题方向') return s.topic;
      if (k === '学院') return collegeOf(s).name;
      if (k === '仪器') return collegeOf(s).gear;
      if (k === '目标') return s.goal || '去向';
      if (k === '昵称') return nickname(s);
      const p = peerBySlot(s, k);
      if (p) return p.name;
      if (SLOTS.indexOf(k) >= 0) return k;
      return m;
    });
  }
  function val(s, path) {
    const seg = path.split('.');
    switch (seg[0]) {
      case 't': return s.t + 1;
      case 'stage': return stageOf(s) + 1;
      case 'thesis': return seg[1] === 'blocked' ? blocked(s) : s.thesis;
      case 'ai': return seg[1] === 'mode' ? s.ai.mode : !!s.ai[seg[1]];
      case 'mentor': return seg[1] === 'type' ? s.mentor.type : s.mentor[ATTR_KEY[seg[1]] || seg[1]];
      case 'peer': { const p = peerBySlot(s, seg[1]); return p ? p[seg[2]] : undefined; }
      case 'trait': return !!has(s, seg[1]);
      case 'flag': return !!s.flags[seg[1]];
      case 'attr': return s[{ 脑子: 'nao', 肝: 'gan', 心态: 'xintai', 人情: 'renqing' }[seg[1]]];
      case 'allies': return normalPeers(s).filter((p) => p.rel >= R.unionRel).length;
      case 'canSlack': return canSlack(s);
      case 'wild': return s.wild ? s.wild[seg[1]] : 0;
      default: return s[seg[0]];
    }
  }
  function cond(s, str) {
    const m = /^(!)?\s*([^\s<>=!]+)\s*(>=|<=|==|!=|>|<)?\s*(.*)$/.exec(str.trim());
    if (!m) return false;
    const v = val(s, m[2]);
    let r;
    if (!m[3]) r = !!v;
    else {
      if (v === undefined) return false;
      const raw = m[4].trim(), num = Number(raw), b = raw !== '' && !isNaN(num) ? num : raw;
      r = m[3] === '>=' ? v >= b : m[3] === '<=' ? v <= b : m[3] === '>' ? v > b : m[3] === '<' ? v < b
        : m[3] === '==' ? String(v) === String(b) : String(v) !== String(b);
    }
    return m[1] ? !r : r;
  }
  const conds = (s, list) => (list || []).every((c) => cond(s, c));

  // ---------- 导师档案 ----------
  function reveal(s, attrName, lines) {
    const k = ATTR_KEY[attrName] || attrName;
    if (s.known[k] >= 2) return;
    s.known[k] = 2;
    let text;
    if (k === 'match') {
      const ms = GOAL_MATCH[s.mentor.type];
      const best = Object.keys(ms).filter((g) => ms[g] === '高');
      const own = C.mentorReveal && C.mentorReveal[s.mentor.type] && C.mentorReveal[s.mentor.type].match;
      text = (own || '') + (best.length ? '往届的人大多去了：' + best.map((g) => C.goalNames[g]).join('、') + '。' : '往届的人去哪了，没人说得清。');
    } else {
      const v = s.mentor[k], tier = v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid';
      const own = C.mentorReveal && C.mentorReveal[s.mentor.type] && C.mentorReveal[s.mentor.type][k];
      text = own ? own + C.reveal[k][tier].split('。').pop() : C.reveal[k][tier];
    }
    if (lines) lines.push({ who: '档案', text: fill(s, text), tag: '导师档案 +1' });
  }
  function revealTruth(s, lines) {
    if (s.truth != null) return;
    const all = [0, 1, 2], fresh = all.filter((i) => s.knownTruths.indexOf(i) < 0);
    s.truth = pick(fresh.length ? fresh : all);
    if (lines) lines.push({ who: '真相', text: C.mentors[s.origType === s.mentor.type ? s.mentor.type : s.origType].truths[s.truth], tag: '导师真相' });
  }

  // ---------- 回合开始 ----------
  function rollDemand(s, c) {
    const base = P.demandByPush[s.mentor.push];
    let d = Math.floor(base) + (rnd() < base - Math.floor(base) ? 1 : 0);
    if (s.favor >= P.favorExtraDemand) d += 1;
    if (s.ai.found && s.mentor.ai === '加活') d += P.aiExtraDemand;
    const gone = s.peers.filter((p) => p.state !== '正常').length;
    let spill = 0;
    for (let i = 0; i < gone; i++) if (rnd() < P.spillChance) spill++;
    d += Math.min(P.spillCap, spill);
    if (s.bargain > 0) d -= 1;
    d = Math.max(0, d);
    if (!(c.ap + c.forced)) d = 0;
    if (d && s.t % 8 === R.winterTurn && s.mentor.fangren >= R.winterFangren) { d -= 1; c.winterOff = true; }
    c.demand = d; c.kinds = [];
    for (let i = 0; i < d; i++) c.kinds.push(wpick(['杂活', '科研', '项目'], s.mentor.weights));
    c.tasks = [];                                           // 同一周不派两件一样的活
    c.kinds.forEach((k) => { const left = C.tasks[k].filter((x) => c.tasks.indexOf(x) < 0); c.tasks.push(pick(left.length ? left : C.tasks[k])); });
  }

  function beginTurn(s) {
    const t = s.t, stage = stageOf(s);
    const c = { msgs: [], favor: 0, sanLoss: 0, event: null, banner: [], picked: false };
    s.cur = c; s.phase = 'turn';
    wildInit(s); mileInit(s);
    if (t % 8 === 0) s.leaves = 0;                         // 请假次数按学年算
    const say = (who, text, tag) => c.msgs.push({ who, text: fill(s, text), tag });
    // 日历横幅
    const cal = C.calendar[t + 1];
    if (cal && !s.delayed) c.banner.push(cal);
    if (s.delayed) c.banner.push('研四 · 延期毕业第 ' + (t - 23) + ' 周（共 4 周）');
    // 控制狂: 熬到他出事
    if (s.mentor.type === '控制狂' && !s.fell) {
      if (rnd() < R.fallBase + R.fallPerIncident * s.incidents + R.fallPerEvidence * s.evidence) {
        const lv = s.mentor.level; const old = s.mentor.call;
        setMentor(s, '佛系放养'); s.mentor.level = lv; s.mentor.call = '临时导师';
        s.autoSign = true; s.fell = true; s.ai.found = s.ai.banned = false; s.favorFloor = 0;
        say('学院通知', '因工作调整，' + old + '暂停指导研究生。相关学生由学院指派临时导师，培养环节照常进行。', '他出事了');
        revealTruth(s, c.msgs);
      }
    }
    if (s.stayWait > 0) { c.favor -= 2; }
    if (t === R.precheckTurn && !s.flags.precheck) {
      s.flags.precheck = true;
      const r = Math.round(aiRate(s));
      say('研究生院', '【预查重】您的学位论文 AI 生成内容疑似度为 ' + r + '%。超过 30% 的论文在盲审中存在不通过的风险。',
        r > 30 ? '可以花精力去「降 AI 率」，每点降 10' : '');
    }
    if (t === R.blindTurn && !s.flags.blind_done) {
      const ok = blindReview(s);
      say('研究生院', ok ? '【盲审结果】两位评审专家意见：同意答辩。' : '【盲审结果】评审意见：' + C.lines.blindFail, ok ? '' : '盲审没过，本学期不能答辩');
    }
    // 行动点
    let ap = 0, forced = 0;
    if (s.lost > 0) { s.lost -= 1; c.lostTurn = true; c.lostWhy = s.lostWhy || null; if (c.lostWhy === 'sick') s.san += 6; if (!s.lost) s.lostWhy = null; }
    else {
      ap = s.ap + (has(s, '夜猫子') && stage >= 2 ? 1 : 0);
      const y = t % 8;
      if (has(s, '家里老大') && y === 5) { ap -= 1; s.san += 10; say('家里', '你回了趟家。弟弟的家长会是你去开的。', '精力 −1，SAN +10'); }
      if (has(s, '异地恋') && y === 5) { ap -= 1; s.san += 25; say('旁白', '你坐了六个小时的车，见了一面。', '精力 −1，SAN +25'); }
      if (stage === 0 && s.nao < P.courseFreeNao) { ap -= P.courseAp; c.course = true; }
      if (has(s, '健身习惯') && y === 7) { ap -= 1; say('旁白', '健身卡快到期了，你去了一趟。', '精力 −1'); }
      if (has(s, '有对象') && y === 2) { ap -= 1; s.san += 10; say('对象', '这周末总该有空了吧？', '精力 −1，SAN +10'); }
      if (s.san < P.sanLow) { ap -= 1; c.lostControl = true; say('旁白', '你在工位上坐了一下午，回过神来天已经黑了。', '精力 −1'); }
      ap = Math.max(0, ap);
      if (ap > 0 && has(s, '拖延症') && rnd() < 0.15) { forced = 1; say('旁白', '你打算先刷五分钟手机。', '1 点精力自动摆烂'); }
      ap -= forced;
    }
    s.san = Math.min(s.sanMax, s.san);
    if (s.san < 40 && !s.flags.low_san_told) { s.flags.low_san_told = true; say('旁白', '你最近看字有点重影，消息要读两遍才明白。', 'SAN 低于 40：选项会变得模糊。休息能恢复'); }
    if (s.san >= 40) s.flags.low_san_told = false;
    if (s.san < 40 && !s.flags.hole_low) { s.flags.hole_low = true; openHole(s, '最近状态很差，撑得很辛苦'); }   // 只在刚跌破 40 的那一周开一次
    if (s.san >= 40) s.flags.hole_low = false;
    c.ap = ap; c.forced = forced;
    if (s.paper.state === 'review' && t >= s.paper.due && !c.lostTurn) paperResult(s, c, say);
    if (t === P.tps && !s.flags.paper_told) { s.flags.paper_told = true; say('研究生院', C.paper.rule, '小论文：论文进度到 ' + P.paperAt + ' 会投出去，一轮审稿三四周'); }
    if (t >= 1 && !c.lostTurn) { c.rest = rollRest(s); say('旁白', c.rest.why, '这周要是休息' + (canSlack(s) ? '或摆烂' : '') + '，会去' + c.rest.act); }
    // 生病: 状态差、一直不歇就容易病
    s.sickCd = Math.max(0, s.sickCd - 1);
    if (!c.lostTurn && t >= 2 && !s.sickCd && !nodeDue(s) && rnd() < sickChance(s)) {
      const big = rnd() < (s.san < 30 ? P.sickBigLow : P.sickBig);
      c.sick = { big, ap0: c.ap }; s.sickCd = P.sickCd; s.stats.sick += 1;
      c.ap = big ? 0 : Math.max(0, c.ap - 2);
    }
    // 导师反悔
    if (s.bargain > 0 && rnd() < P.renegePer * (5 - s.mentor.renpin)) {
      s.bargain = 0; see(s, P.seenRenege);
      say('导师', pick(C.lines.renege), '之前说好的不算了');
      reveal(s, '人品', c.msgs);
    }
    rollDemand(s, c);
    // 上周自己打字说的那句话，这周有人又提起来
    if (s.echo) { const ecp = s.echo.who === '导师' || s.echo.who === '旁白' || (peerBySlot(s, s.echo.who) || {}).state === '正常'; if (ecp && !c.lostTurn) say(s.echo.who, s.echo.text, '上周你说「' + s.echo.said + '」的余波'); s.echo = null; }
    // 关系跌到底的同门会报复
    const foe = normalPeers(s).filter((p) => p.rel <= 15)[0];
    if (foe && !c.lostTurn && rnd() < 0.3) {
      const k = pick(['tell', 'push', 'cold']); openHole(s, '被同门' + foe.name + '针对了');
      if (k === 'tell') { c.favor -= 5; say('导师', pick(C.lines.grudgeTell), '有人打了小报告，导师好感 −5'); }
      else if (k === 'push' && c.ap > 0) { c.demand += 1; c.kinds.push('杂活'); c.tasks.push('把' + foe.name + '没做完的那部分补上'); say(foe.slot, pick(C.lines.grudgePush), '他把活推给了你，派活 +1'); }
      else say(foe.slot, pick(C.lines.grudgeCold), '');
    }
    // AI 的其他解锁渠道
    if (!s.ai.unlocked) {
      const buddy = normalPeers(s).find((p) => !p.senior && p.rel >= P.aiUnlockRel);
      if (buddy && !s.queue.some((q) => q.id === 'ai_unlock_peer')) s.queue.push({ id: 'ai_unlock_peer', due: t, slot: buddy.slot });
      else if (!buddy && rnd() < P.aiUnlockRandom) { s.ai.unlocked = true; say('旁白', pick(C.lines.aiUnlockRandom), '解锁 AI'); }
      else if (!buddy && s.mentor.type === '青椒卷王' && rnd() < P.aiUnlockPusher) {
        s.ai.unlocked = true; s.ai.found = true;
        say('导师', '这个综述你用 AI 先出一版，今晚给我。别人都在用，我们不能慢。', '解锁 AI（他知道，活 +1）');
      }
    }
    see(s, P.seenPerTurn * (6 - s.mentor.renpin));
    if (has(s, '体制内父母') && s.goal !== '考公' && t % 4 === 1) say('妈', '你王阿姨家孩子考上了，单位就在家门口。你再想想？', 'SAN −3');
    if (has(s, '养猫') && t % 8 === 4) say('旁白', '猫吐了。宠物医院的账单比你的补助高。', 'SAN −6');
    if (t === P.tps && peerBySlot(s, '师弟') && !s.flags.junior_intro) {
      s.flags.junior_intro = true;
      say('师弟', '大家好，我是新来的。以后请多关照！老师说有不懂的就问各位。', '组里多了一个人');
    }
    // 派活消息
    if (!c.lostTurn) {
      const possessed = s.peers.find((p) => p.state === '附体');
      if (c.demand > 0) {
        const tk = c.tasks, body = tk.length === 1 ? tk[0] : tk.length === 2 ? tk[0] + '，顺便' + tk[1]
          : tk.slice(0, -1).join('，') + '，另外' + tk[tk.length - 1];
        const first = t === 0 ? C.mentors[s.mentor.type].first.replace('{姓}', s.mentor.surname) + ' ' : '';
        if (possessed && t > 0 && rnd() < 0.5) say(possessed.slot, '@' + nickname(s) + ' 老师说了，这周' + body + '。我已经跟老师说你没问题。', '派活 ' + c.demand + ' 点');
        else say('导师', first + '@' + nickname(s) + ' 这周' + body + '。', '派活 ' + c.demand + ' 点：' + kindSummary(c.kinds));
        c.msgs[c.msgs.length - 1].dispatch = true;
      } else if (c.ap > 0) say('旁白', s.bargain > 0 ? '这周他没有找你。说好的。' : '这周群里很安静。', '派活 0 点');
      if (c.winterOff) say('旁白', '快放假了，他少派了一点。', '');
      if (c.course) say('旁白', '这周有课。', '上课占掉 1 点精力');
    }
    // 同门在群里的闲聊: 不用回应，但能看出他最近怎么样
    if (!c.lostTurn && t > 0) {
      const talk = (p, text, mood, tag) => { say(p.slot, text, tag || ''); const m = c.msgs[c.msgs.length - 1]; m.chatter = p.slot; m.mood = mood; };
      // 发疯了还留在实验室的人，会在群里说胡话
      s.peers.filter((p) => p.state === '发疯' && p.inLab).forEach((p) => { if (rnd() < 0.6) talk(p, pick(C.madTalk), '胡话'); });
      // 被附体的人替导师说话
      s.peers.filter((p) => p.state === '附体').forEach((p) => { if (rnd() < 0.5) talk(p, pick(C.lines.possessedChat), '替导师说话'); });
      // 其他人: 每周一到两个人说话，压力越大话越怪
      let said = 0;
      normalPeers(s).slice().sort(() => rnd() - 0.5).forEach((p) => {
        const ch = C.chatter[p.persona];
        if (said >= 2 || !ch || rnd() >= (said === 0 ? 0.8 : 0.4)) return;
        const mood = p.pressure >= 75 || p.warned >= 2 ? '不对劲' : p.pressure >= 50 || p.warned >= 1 ? '绷着' : '正常';
        talk(p, pick(mood === '不对劲' ? C.edgeTalk : mood === '绷着' ? (ch.tense || []).concat(C.tenseTalk) : ch.calm), mood, mood === '不对劲' ? '他最近不太对劲' : '');
        said += 1;
      });
    }
    // 改数据: 只在走投无路时才冒出来，概率很低；改过之后，组会那周导师可能来要原始记录
    if (!c.lostTurn && stage >= 1 && !s.delayed) {
      const o = outlook(s), stuck = o.论文 === '危' || (blocked(s) && s.explore >= 2) || (s.paper.tries >= 2 && s.paper.state === 'review');
      if (!s.fraud && stuck && s.san < 60 && s.seenEvents.indexOf('fraud_offer') < 0 && rnd() < P.fraudChance) s.queue.unshift({ id: 'fraud_offer', due: t });
      else if (s.fraud && s.fraud.n === 1 && stuck && s.seenEvents.indexOf('fraud_again') < 0 && rnd() < P.fraudChance) s.queue.unshift({ id: 'fraud_again', due: t });
      else if (s.fraud && !s.fraud.caught && t % 4 === R.meetingTurn && rnd() < P.fraudAsk * s.fraud.n * (0.5 + s.mentor.level / 5)) s.queue.unshift({ id: 'fraud_ask', due: t });
    }
    if (canHole(s) && s.holeTold !== s.holeUntil) { s.holeTold = s.holeUntil; say('旁白', '你很想找个地方把这事说出来。', '树洞开了：' + s.holeWhy + '。右上角可以去发一条'); }
    // 私聊: 同门私下来找你；还人情
    if (!c.lostTurn && t >= 2) dmRoll(s, c);
    const owed = normalPeers(s).find((p) => p.owed > 0);
    if (owed && !c.lostTurn && c.ap > 0 && rnd() < 0.3) { owed.owed -= 1; c.demand += 1; c.kinds.push('杂活'); c.tasks.push('把' + owed.name + '的那部分做了'); say(owed.slot, pick(C.dm.owed), '还人情：派活 +1'); }
    // 事件
    if (!c.lostTurn) pickEvent(s, c);
    if (t === 0) say('师兄', C.lines.firstTip, '');
    if (t === 0 && s.lastRun) say('旁白', fill(s, C.lines.lastRun[s.lastRun.kind] || C.lines.lastRun.other), '');
    return c;
  }
  function kindSummary(kinds) {
    const n = {}; kinds.forEach((k) => { n[k] = (n[k] || 0) + 1; });
    return Object.keys(n).map((k) => (k === '杂活' ? '杂活' : k + '活') + ' ' + n[k]).join('、');
  }

  // ---------- 事件调度 ----------
  function eligible(s, e) {
    if (e.once !== false && s.seenEvents.indexOf(e.id) >= 0) return false;
    if (e.mentor !== '*' && e.mentor !== s.mentor.type) return false;
    if (e.stage && e.stage.indexOf(stageOf(s) + 1) < 0 && !(stageOf(s) === 3 && e.stage.indexOf(3) >= 0)) return false;
    if (!conds(s, e.when)) return false;
    if (e.slot === 'any' && !normalPeers(s).length) return false;
    return e.options.filter((o) => conds(s, o.when)).length >= 1 || !e.options.length;
  }
  function instantiate(s, e, slot) {
    const vars = {};
    Object.keys(e.vars || {}).forEach((k) => { vars[k] = pick(e.vars[k]); });
    if (slot) { const p = peerBySlot(s, slot); vars['他'] = p ? p.name : slot; }
    const sp = e.speaker === '导师' ? '导师' : e.speaker === '他' ? slot : e.speaker;
    const grayBold = s.assim >= P.assimGray || s.seen >= 75;
    const options = [];
    e.options.forEach((o, i) => {
      if (!conds(s, o.when)) return;
      let text = fill(s, o.text, vars), disabled = false;
      if (!o.key) {
        if (o.tone === '刚' && grayBold) disabled = true;
        if (o.tone === '怂' && s.assim >= P.assimGray) text = pick(['好的老师', '收到老师', '我来吧老师']);
        if (o.tone === '歪' && s.seen >= 75) text = pick(['随便吧', '都行']);
      }
      options.push({ i, tone: o.tone, text, disabled });
    });
    if (options.length && options.every((o) => o.disabled)) options[0].disabled = false;
    return { id: e.id, kind: e.kind, slot: slot || null, speaker: sp, text: fill(s, e.text, vars), vars, options };
  }
  function pickEvent(s, c) {
    const t = s.t;
    const use = (id, slot) => {
      const e = EVENTS[id];
      if (!e) return false;
      s.seenEvents.push(id);
      c.event = instantiate(s, e, slot);
      if (!c.event.options.length) { applyKind(s, c, e); c.msgs.push({ who: c.event.speaker, text: c.event.text }); c.event = null; }
      return true;
    };
    if (c.sick && use(c.sick.big ? 'sick_big' : 'sick_small')) return;
    // 1. 固定节点
    for (const n of C.nodes) {
      if (n.t !== t + 1 && !(n.from && t + 1 >= n.from && t + 1 <= n.to)) continue;
      if (s.delayed && !n.extra) continue;
      const e = EVENTS[n.id];
      if (!e || !eligible(s, e)) continue;
      if (n.id === 'node_first_omen') {
        const p = normalPeers(s).sort((a, b) => b.pressure - a.pressure)[0];
        if (!p) continue;
        p.warned = Math.max(p.warned, 1); s.omenSlot = p.slot;
        if (use('omen_' + p.persona, p.slot)) return;
        continue;
      }
      if (use(n.id)) return;
    }
    // 2/3. 到期的后续事件、同门状态事件
    for (let i = 0; i < s.queue.length; i++) {
      const q = s.queue[i];
      if (q.due > t) continue;
      s.queue.splice(i, 1);
      const e = EVENTS[q.id];
      if (!e) { i--; continue; }
      if (q.slot) { const p = peerBySlot(s, q.slot); if (!p || p.state !== '正常') { i--; continue; } }
      if (s.seenEvents.indexOf(q.id) >= 0 && e.once !== false) { i--; continue; }
      if (!conds(s, e.when)) { i--; continue; }
      if (use(q.id, q.slot)) return;
    }
    // 4. 随机事件
    const chance = s.mentor.type === '佛系放养' ? EV.chanceQuiet : EV.chance;
    if (rnd() >= chance) return;
    if (s.gen && s.gen.length && rnd() < 0.7) {
      const e = s.gen.shift();
      if (e.mentor === s.mentor.type && (e.speaker === '导师' || e.speaker === '旁白' || (peerBySlot(s, e.speaker) && peerBySlot(s, e.speaker).state === '正常'))) {
        s.genEvents[e.id] = e; c.event = instantiate(s, e, null); c.event.gen = true; return;
      }
    }
    const poolE = C.events.filter((e) => e.random && eligible(s, e));
    if (!poolE.length) return;
    const e = wpick(poolE, poolE.map((x) => (x.weight || 10) * (s.recent.indexOf(x.id) >= 0 ? 0.5 : 1)));
    use(e.id, e.slot === 'any' ? pick(normalPeers(s)).slot : e.slot && peerBySlot(s, e.slot) ? e.slot : null);
  }

  // ---------- 事件结算 ----------
  function applyFx(s, c, fx, out) {
    if (!fx) return;
    const note = (t) => { if (out) out.tags.push(t); };
    if (fx.favor) { c.favor += fx.favor; note('导师好感 ' + sign(fx.favor)); }
    if (fx.san) { if (fx.san < 0) c.sanLoss -= fx.san; else s.san = Math.min(s.sanMax, s.san + fx.san); note('SAN ' + sign(fx.san)); }
    if (fx.assim) addAssim(s, fx.assim);
    if (fx.seen) see(s, fx.seen);
    if (fx.thesis) { s.thesis = clampN(s.thesis + fx.thesis, 0, thesisCap(s)); s.thesisAi = Math.min(s.thesisAi, s.thesis); note('论文 ' + sign(fx.thesis)); }
    if (fx.chips && s.goal) { s.chips = clampN(s.chips + fx.chips, 0, Math.max(s.chips, chipsCap(s))); note('去向进度 ' + sign(fx.chips)); }
    if (fx.contrib) { s.contrib = clampN(s.contrib + fx.contrib, 0, 100); note('组内贡献 ' + sign(fx.contrib)); }
    if (fx.demand) { c.demand = Math.max(0, c.demand + fx.demand); for (let i = 0; i < fx.demand; i++) { c.kinds.push('杂活'); c.tasks.push('把刚才那件事办了'); } if (fx.demand < 0) { c.kinds.length = c.demand; c.tasks.length = c.demand; } note('派活 ' + sign(fx.demand)); }
    if (fx.ap) { c.ap = Math.max(0, c.ap + fx.ap); note('精力 ' + sign(fx.ap)); }
    if (fx.rel) Object.keys(fx.rel).forEach((k) => {
      const slot = k === '他' ? c.event && c.event.slot : k, p = peerBySlot(s, slot);
      if (p) { p.rel = clampN(p.rel + fx.rel[k], 0, 100); note(p.name + ' 关系 ' + sign(fx.rel[k])); }
    });
    if (fx.pressure) Object.keys(fx.pressure).forEach((k) => {
      const list = k === 'all' ? normalPeers(s) : [peerBySlot(s, k === '他' ? c.event && c.event.slot : k)].filter(Boolean);
      list.forEach((p) => { p.pressure = clampN(p.pressure + fx.pressure[k], 0, 100); });
    });
    if (fx.help) {
      const p = peerBySlot(s, fx.help === '他' ? c.event && c.event.slot : fx.help);
      if (p) { p.pressure = clampN(p.pressure + P.helpPressure, 0, 100); p.rel = clampN(p.rel + P.helpRel, 0, 100); addAssim(s, P.helpAssim); note(p.name + ' 关系 +' + P.helpRel); }
    }
    if (fx.evidence && s.evidence < R.evidenceCap) { s.evidence += 1; note('留了一份证据'); }
    if (fx.unlock === 'ai' && !s.ai.unlocked) { s.ai.unlocked = true; note('解锁 AI'); }
    if (fx.ai_rate) s.thesisAi = clampN(s.thesisAi + fx.ai_rate * s.thesis / 100, 0, s.thesis);
    if (fx.bargain) { s.bargain = Math.max(s.bargain, fx.bargain); note('接下来几周派活 −1'); }
    if (fx.flag) s.flags[fx.flag] = true;
    if (fx.wild) Object.keys(fx.wild).forEach((k) => { s.wild[k] += fx.wild[k]; s.stats.wild += fx.wild[k]; note(wildCount(s, k)); wildCheck(s, k); });
    if (fx.shield) { s.shield = (s.shield || 0) + fx.shield; note('他会替你打一次掩护'); }
  }
  const sign = (n) => (n > 0 ? '+' : '−') + Math.abs(Math.round(n * 10) / 10);

  function applyKind(s, c, e, out) {
    if (e.kind === '施压') {
      c.sanLoss += -EV.pressure.san;
      normalPeers(s).forEach((p) => { p.pressure += EV.pressure.peer; });
    } else if (e.kind === '给好处') {
      c.favor += EV.perk.favor * (has(s, '会来事') ? 2 : 1);
      if (!has(s, '家里有矿')) addAssim(s, EV.perk.assim);
    } else if (e.kind === '组务') {
      const ps = normalPeers(s);
      if (ps.length) { const p = pick(ps); p.rel = clampN(p.rel + pick([-1, 1]) * EV.dutyRel, 0, 100); }
    } else if (e.kind === '承诺') {
      s.promises.push({ due: s.t + EV.promiseDelay });
      if (has(s, '高校教师子女') && out) out.tags.push('兑现概率 ' + Math.round(EV.promisePer * s.mentor.renpin * 100) + '%');
    }
  }

  function noteEvent(s, inst, e, said, tone, ok) {
    const what = '「' + inst.text.replace(/\n/g, ' ').slice(0, 22) + '」那次，萝卜回的是「' + said.slice(0, 20) + '」' + (tone === '刚' ? (ok ? '，他让步了' : '，他没让步') : '');
    const p = inst.slot && peerBySlot(s, inst.slot) || (SLOTS.indexOf(inst.speaker) >= 0 && peerBySlot(s, inst.speaker));
    if (p) prem(s, p, what);
    else if (e.speaker === '导师' || e.kind !== '无') remember(s, what);
  }
  /** 这个选项要不要先问模型: 口气是「刚」、按默认规则判定的选项。 */
  function needsRuling(s, idx) {
    const c = s.cur, e = c && c.event && getEv(s, c.event.id), o = e && e.options[idx];
    return !!o && o.tone === '刚' && !o.special && (e.gen || (!o.effects && !o.check));
  }
  function boldChance(s, ruling, out) {
    const edge = clampN(Math.round(num(ruling && ruling.edge)), -20, 20);
    if (out && edge >= 10) out.tags.push('这话说在了点子上');
    if (out && edge <= -10) out.tags.push('这话说得不是时候');
    return EV.boldBase + EV.boldPer * (s.renqing + s.mentor.fangren) + edge / 100;
  }
  function boldContext(s, idx) {
    const w = freeContext(s), o = getEv(s, s.cur.event.id).options[idx];
    w.萝卜说的话 = s.cur.event.options.find((x) => x.i === idx).text; w.规则给的成功率 = Math.round(boldChance(s) * 100) + '%';
    w.导师记得的事 = (s.mem || []).slice(-6);
    return w;
  }
  function pickOption(s, idx, ruling) {
    const c = s.cur, inst = c.event, e = getEv(s, inst.id), o = e.options[idx];
    const out = { lines: [], tags: [], ended: false };
    c.picked = true;
    applyKind(s, c, e, out);
    let ok = true;
    if (o.special) ok = special(s, c, o.special, out);
    else if (!o.effects && !o.check || e.gen) {            // 按口气的默认效果
      if (o.tone === '怂') applyFx(s, c, EV.meek, out);
      else if (o.tone === '刚') {
        ok = rnd() < boldChance(s, ruling, out);
        applyFx(s, c, ok ? EV.boldOk : EV.boldFail, out);
      } else { applyFx(s, c, EV.odd, out); if (rnd() < EV.oddBackfire) applyFx(s, c, { favor: EV.oddFavor }, out); }
      if (e.gen && o.extra && ok) applyFx(s, c, o.extra, out);
    } else if (o.check) {
      let ch = o.check.base || 0;
      Object.keys(o.check.per || {}).forEach((k) => { ch += o.check.per[k] * (val(s, 'attr.' + k) != null ? val(s, 'attr.' + k) : val(s, 'mentor.' + k) || 0); });
      ok = rnd() < ch;
      applyFx(s, c, ok ? o.effects : o.fail_effects, out);
    } else applyFx(s, c, o.effects, out);
    const rr = ruling && str(ok ? ruling.reply : ruling.reply_fail || ruling.reply, 80);
    const reply = rr ? rr.replace(/^\s*旁白\s*[：:]\s*/, '') : ok ? o.ok : o.fail || o.ok;
    if (reply) out.lines.push({ who: o.okWho || (e.speaker === '旁白' ? '旁白' : inst.speaker), text: fill(s, reply, inst.vars) });
    if (o.next) s.queue.push({ id: o.next.id, due: s.t + o.next.delay, slot: inst.slot });
    if (e.reveal) reveal(s, e.reveal, out.lines);
    if (e.truth) revealTruth(s, out.lines);
    c.eventDone = { text: inst.options.find((x) => x.i === idx).text, tags: out.tags, lines: out.lines };
    noteEvent(s, inst, e, c.eventDone.text, o.tone, ok);
    c.event = null;
    if (s.ended) out.ended = true;
    return out;
  }

  // ---------- 大模型接入点 ----------
  // 模型只做两件事: 判断玩家那句话的口气、写对方的回话。数值仍然按口气的规则结算，
  // 模型给的「意外」(twist) 会被截断到很小的范围内，所以接不接模型，平衡是一样的。
  function freeContext(s) {
    const c = s.cur, e = getEv(s, c.event.id), m = s.mentor;
    return { 事件: c.event.text, 说话的人: c.event.speaker === '导师' ? m.call + '（导师）' : c.event.speaker, 事件类型: e.kind,
      导师类型: m.type, 导师: { push度: m.push, 人品: m.renpin, 放人度: m.fangren, 水平: m.level },
      萝卜: { 好感: Math.round(s.favor), SAN: Math.round(s.san), 心态: mood(s), 学年: stageOf(s) + 1, 人情: s.renqing },
      在场的同门: normalPeers(s).filter((p) => p.slot !== c.event.slot).map((p) => ({ 身份: p.slot, 名字: p.name, 人设: p.persona })),
      导师记得的事: (s.mem || []).slice(-6),
      预设选项: c.event.options.map((o) => o.tone + '：' + o.text) };
  }
  function canFreeReply(s) {
    const c = s.cur;
    if (!c || !c.event) return false;
    return !getEv(s, c.event.id).options.some((o) => o.special || o.key);
  }
  function pickFree(s, text, judged) {
    const c = s.cur, inst = c.event, e = getEv(s, inst.id);
    const out = { lines: [], tags: [], ended: false };
    judged = judged && typeof judged === 'object' && !Array.isArray(judged) ? judged : {};   // 模型返回的要是个对象，别的都当没有
    const mine = str(text, 60) || '……';                     // 玩家自己打的字也要截断、打码
    let tone = ['怂', '刚', '歪'].indexOf(judged.tone) >= 0 ? judged.tone : '歪';
    if (tone === '刚' && (s.assim >= P.assimGray || s.seen >= 75)) tone = s.assim >= P.assimGray ? '怂' : '歪';   // 变灰的口气说不出口
    c.picked = true;
    applyKind(s, c, e, out);
    let ok = true;
    if (tone === '怂') applyFx(s, c, EV.meek, out);
    else if (tone === '刚') { ok = rnd() < boldChance(s, judged, out); applyFx(s, c, ok ? EV.boldOk : EV.boldFail, out); }
    else { applyFx(s, c, EV.odd, out); if (rnd() < EV.oddBackfire) applyFx(s, c, { favor: EV.oddFavor }, out); }
    // 这句话本身带来的后果: 模型按内容给，这里逐项截断。顶回去没顶动时，好处不算数；推掉活只有顶成了才算
    const tw = judged.effects || judged.twist || {}, lim = (k, n) => clampN(Math.round(num(tw[k])), -n, n);
    const fxs = { favor: clampN(Math.round(num(tw.favor != null ? tw.favor : tw.favour)), -3, 3), san: lim('san', 3), thesis: lim('thesis', 2), contrib: lim('contrib', 2), demand: lim('demand', 1) };
    if (tw.rel && typeof tw.rel === 'object') { fxs.rel = {}; Object.keys(tw.rel).slice(0, 2).forEach((k) => { const p = peerBySlot(s, k); if (p && p.state === '正常') fxs.rel[k] = clampN(Math.round(num(tw.rel[k])), -8, 8); }); }
    if (tone === '刚' && !ok) { ['favor', 'san', 'thesis', 'contrib'].forEach((k) => { fxs[k] = Math.min(0, fxs[k]); }); Object.keys(fxs.rel || {}).forEach((k) => { fxs.rel[k] = Math.min(0, fxs.rel[k]); }); }
    if (fxs.demand < 0 && !(tone === '刚' && ok)) fxs.demand = 0;
    if (fxs.demand < 0 && !c.demand) fxs.demand = 0;
    Object.keys(fxs).forEach((k) => { if (!fxs[k] || (k === 'rel' && !Object.keys(fxs.rel).some((x) => fxs.rel[x]))) delete fxs[k]; });
    if (Object.keys(fxs).length) { applyFx(s, c, fxs, out); }
    // 同一项数值的几条标签合成一条（比如两条「导师好感 −1」并成「导师好感 −2」）
    const sums = {}, merged = [];
    out.tags.forEach((tg) => { const m = /^(.+) ([+−])(\d+(?:\.\d+)?)$/.exec(tg); if (!m) return merged.push(tg); if (!(m[1] in sums)) { sums[m[1]] = 0; merged.push({ k: m[1] }); } sums[m[1]] += (m[2] === '+' ? 1 : -1) * +m[3]; });
    out.tags = merged.map((x) => (typeof x === 'string' ? x : sums[x.k] ? x.k + ' ' + sign(sums[x.k]) : null)).filter(Boolean);
    // 余波: 下一周有人会再提起这句话
    const ec = judged.echo, ecWho = ec && (ec.who === '导师' || ec.who === '旁白' ? ec.who : (peerBySlot(s, ec.who) || {}).state === '正常' ? ec.who : null);
    if (ecWho && typeof ec.text === 'string' && ec.text.trim().length >= 4) s.echo = { who: ecWho, text: str(ec.text, 60), said: mine.slice(0, 20) };
    const reply = (str(ok ? judged.reply : str(judged.reply_fail, 90) ? judged.reply_fail : judged.reply, 90) || '').replace(/^\s*旁白\s*[：:]\s*/, '').slice(0, 80);
    // 让玩家看得见这句话被听成了什么
    out.tags.unshift(tone === '怂' ? '听起来是在服软' : tone === '歪' ? '你把话岔开了' : ok ? '你顶了回去，对方让了一步' : '你顶了回去，没顶动');
    if (reply) out.lines.push({ who: e.speaker === '旁白' ? '旁白' : inst.speaker, text: reply });
    // 旁观的同门私下说一句
    const as = judged.aside, asP = as && typeof as.text === 'string' && peerBySlot(s, as.who);
    if (asP && asP.state === '正常' && asP.slot !== inst.slot && e.speaker === '导师' && tone !== '怂' && as.text.trim().length >= 2 && as.text.indexOf(asP.name) < 0) {
      out.lines.push({ who: asP.slot, text: str(as.text, 30), tag: '私聊' });
      prem(s, asP, '萝卜当着大家的面对导师说：「' + mine.slice(0, 30) + '」');
    }
    if (e.reveal) reveal(s, e.reveal, out.lines);
    if (e.truth) revealTruth(s, out.lines);
    c.eventDone = { text: mine, tags: out.tags, lines: out.lines, free: true, say: e.speaker !== '旁白', tone };
    noteEvent(s, inst, e, c.eventDone.text, tone, ok);
    c.event = null;
    return out;
  }
  function endingContext(s) {
    const e = s.ended;
    return { 结局: e.name, 导师类型: e.mentorType, 导师姓名: s.mentor.surname + s.mentor.given, 目标: s.goal || '没来得及选', 词条: s.traits,
      在读周数: s.stats.turns, 被派的活: s.stats.demand, 摆烂次数: s.stats.slack, 甩锅次数: s.stats.dumps, 帮同门: s.stats.help, 用AI: s.stats.ai,
      同门: s.peers.map((p) => p.name + '（' + p.persona + '）：' + p.state), 专业背景: field(s),
      改过数据: s.fraud ? s.fraud.n + ' 次' + (e.name === '东窗事发' ? '，毕业后被查出来，学位被撤销' : '，没有被发现') : '没有',
      毕业论文做到: s.mile ? C.milestones[s.mile - 1].name : '没怎么动', 小论文: C.paper.states[(s.paper || {}).state || 'none'],
      课题组之外: Object.assign({ 最常去: s.rest || '没怎么出去过', 生病次数: s.stats.sick }, s.wild, e.wild ? { 最后去了: C.wildDirs[e.wild].job, 拿到学位: e.how === 'grad' } : {}), 参考写法: e.text };
  }

  // ---- 接入点三: 每回合的群聊。模型改写导师派活的那句话、同门的闲聊和他们被甩锅/被帮忙时的回话，学期末写朋友圈 ----
  const flav = (c, slot, key) => (c.flavor && c.flavor[slot] && c.flavor[slot][key]) || null;
  const band = (v, a, b) => (v >= b ? '高' : v >= a ? '中' : '低');
  function worldContext(s) {
    const m = s.mentor;
    return { 导师: { 类型: m.type, 称呼: m.call, push度: m.push, 人品: m.renpin, 放人度: m.fangren, 水平: m.level },
      时间: C.calendar[s.t + 1] || ('第 ' + (s.t + 1) + ' 周'), 学年: stageOf(s) + 1, 专业背景: field(s), 目标: s.goal || '还没定',
      毕业论文做到: s.mile ? C.milestones[s.mile - 1].name : '刚开始读文献', 小论文: C.paper.states[(s.paper || {}).state || 'none'], 离下一关: (() => { const o = outlook(s); return o.gate + '还有 ' + o.left + ' 周，论文' + o.论文 + '、贡献' + o.贡献 + '、签字' + o.签字; })(),
      萝卜: { 词条: s.traits, 好感: Math.round(s.favor), SAN: Math.round(s.san), 心态: mood(s), 昵称: nickname(s) },
      同门: s.peers.map((p) => ({ 位置: p.slot, 名字: p.name, 人设: p.persona, 状态: p.state, 压力: band(p.pressure, 50, 75), 和萝卜的关系: band(p.rel, 30, 60), 被萝卜甩过锅: p.dumped || 0,
        他记得的事: (p.mem || []).slice(-4) })),
      导师记得的事: (s.mem || []).slice(-6), 上周发生的事: s.lastNotes || [] };
  }
  function flavorContext(s) {
    const c = s.cur, w = worldContext(s);
    w.本周派的活 = c.tasks || []; w.活的类型 = c.kinds || [];
    w.需要朋友圈 = s.t % 4 === 3;
    const d = c.msgs.find((x) => x.dispatch); w.派活原话 = d ? d.text : null;
    w.群里说话的人 = c.msgs.filter((x) => x.chatter).map((x) => ({ 位置: x.chatter, 状态: x.mood || '正常', 底稿: x.text }));
    return w;
  }
  // 模型写出来的脏话一律打成 **，意思能看懂就行
  const mask = (t) => String(t).replace(/[个狗放]屁|屁话|屁用|傻[逼比叉屄]|傻[BbXx]|煞笔|沙雕|[他她你]妈的?|妈的|尼玛|操你|草泥马|卧槽|我[操艹靠]|艹|狗屁|放屁|狗日的?|滚蛋|贱人|贱货|婊子?|屌|鸡巴|[sS][bB](?![a-zA-Z])|[tT][mM][dD]/g, '**');
  const str = (x, n) => (typeof x === 'string' && x.trim() ? mask(x.trim().slice(0, n)) : null);
  /** 模型给的「数」可能是任何东西。只认真的数字和写成字符串的数字，别的一律当 0。不能直接用 +x: 有的对象一转数字就抛错。 */
  const num = (x) => (typeof x === 'number' ? (isFinite(x) ? x : 0) : typeof x === 'string' && x.trim() !== '' && isFinite(+x) ? +x : 0);
  const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  /** 导师训人的话: 按他的类型挑一句，没有就用通用的。 */
  const scoldLine = (s, fallback) => { const own = C.scold[s.mentor.type]; return own && rnd() < 0.7 ? pick(own) : pick(fallback); };
  /** 群聊: 导师派活的话、一句闲聊、学期末的朋友圈。 */
  function applyFlavor(s, j) {
    const c = s.cur;
    if (!c || !j || c.result) return false;
    const d = c.msgs.find((x) => x.dispatch), t = str(j.dispatch, 80);
    // 模型改写派活的话时不许加活减活: 每件活都得还在，也不能出现「不急」「再说」这类松口的话
    const kept = (c.tasks || []).every((task) => { for (let i = 0; i + 3 <= task.length; i++) if (t && t.indexOf(task.slice(i, i + 3)) >= 0) return true; return false; });
    if (d && t && kept && !/不急|再说|不用做|先不|算了|免了/.test(t)) d.text = t.indexOf('@') >= 0 ? t : '@' + nickname(s) + ' ' + t;
    // 同门的话: 按位置对上号再替换。同一个人说了两条的话只换第一条
    const used = {};
    (Array.isArray(j.chats) ? j.chats : j.chat ? [{ who: (c.msgs.find((x) => x.chatter) || {}).chatter, text: j.chat }] : []).slice(0, 6).forEach((it) => {
      const who = it && it.who, ct = str(it && it.text, 44), msg = !used[who] && c.msgs.find((x) => x.chatter === who), p = peerBySlot(s, who);
      if (!msg || !ct || !p || ct.indexOf(p.name) === 0) return;
      used[who] = true; msg.text = gearText(s, ct.replace(/^[“"「]|[”"」]$/g, ''));
    });
    if (s.t % 4 === 3 && Array.isArray(j.moments)) {
      const slotOf = (w) => (w === '导师' || peerBySlot(s, w) ? w : (s.peers.find((p) => p.name === w) || {}).slot || null);
      c.moments = j.moments.slice(0, 3).map((m) => ({ who: m && slotOf(m.who), text: str(m && m.text, 60) })).filter((m) => m.who && m.text);
    }
    return true;
  }
  /** 同门被甩锅、拒绝、被帮忙时的回话。结算时用，所以可以晚一点到。 */
  function applyPeerLines(s, j) {
    const c = s.cur;
    if (!c || !j || c.result) return false;
    c.flavor = {};
    Object.keys(j).forEach((slot) => {
      const p = peerBySlot(s, slot);
      // 写成旁白的（里面出现了他自己的名字）不要，回到预设的台词
      const v = j[slot] || {}, q = (x) => { const r = str(x, 40); return r && p && r.indexOf(p.name) < 0 ? r.replace(/^[“"「]|[”"」]$/g, '') : null; };
      const br = v.ifBreak || {}, okState = ['发疯', '退学', '附体'].indexOf(br.state) >= 0;
      if (p) c.flavor[slot] = { onDump: q(v.onDump), onRefuse: q(v.onRefuse), onHelp: q(v.onHelp),
        breakAs: okState && p.pressure > P.peerWarn ? br.state : null, breakScene: okState ? str(br.scene, 70) : null };
    });
    return true;
  }

  /** 甩锅前问模型: 这个人这次接不接。 */
  function dumpContext(s, slot, manner, said) {
    const w = worldContext(s), p = peerBySlot(s, slot), c = s.cur;
    w.被甩的人 = slot; w.甩过去的活 = c.tasks || [];
    w.规则估计他不接的可能 = p ? Math.round(clampN(dumpRefuseChance(p) + dumpManner(p, manner || 'plain').adj, 0, 0.95) * 100) + '%' : '未知';
    w.萝卜是这么开口的 = said || (C.dm.ask[manner || 'plain'] || {}).me || '';
    return w;
  }
  /** 开局: 导师的官网简介和同门的人物小传，每局现写。 */
  function introContext(s) {
    const m = s.mentor, prof = C.mentors[m.type];
    return { 导师类型: m.type, 导师姓名: m.surname + m.given, 称呼: m.call, 数值: { push度: m.push, 资源: m.res, 放人度: m.fangren, 人品: m.renpin, 水平: m.level },
      专业背景: field(s), 参考: { 职称: prof.title, 研究方向: prof.dirs, 招生寄语: prof.motto, 学生评价: prof.review },
      同门: s.peers.map((p) => ({ 位置: p.slot, 名字: p.name, 人设: p.persona, 参考: (C.personas[p.slot].find((x) => x.name === p.persona) || {}).line })) };
  }
  function applyIntro(s, j) {
    if (!j || s.t > 0) return false;
    const bios = {};
    Object.keys(j.bios || {}).forEach((slot) => { const b = str(j.bios[slot], 50); if (peerBySlot(s, slot) && b) bios[slot] = b; });
    s.intro = { dirs: str(j.dirs, 40), motto: str(j.motto, 50), review: str(j.review, 50), bios };
    return true;
  }

  // ---- 接入点四: 临场事件。模型按这一局的处境现写一个事件，下一回合用。数值的主体仍是口气的默认效果 ----
  const KINDS = ['施压', '组务', '承诺', '给好处', '无'];
  const EXTRA_CAP = { favor: 3, san: 4, assim: 3, seen: 3, thesis: 3, contrib: 3 };
  function eventContext(s) {
    const w = worldContext(s), mix = EV_MIX[s.mentor.type];
    w.请写的事件类型 = wpick(['施压', '组务', '承诺', '给好处'], mix);          // 类型和细节由代码掷骰，避免模型总写同一类
    w.必须用上的细节 = pick(C.genSeeds);
    w.不要重复这些已经出现过的事件 = s.seenEvents.slice(-8).map((id) => (getEv(s, id) || {}).text).filter(Boolean).map((t) => t.slice(0, 30));
    return w;
  }
  function addGenerated(s, j) {
    if (!j || s.ended || (s.gen && s.gen.length >= 1)) return false;
    const text = typeof j.text === 'string' && j.text.trim().length <= 80 ? mask(j.text.trim()) : null, kind = KINDS.indexOf(j.kind) >= 0 ? j.kind : '无';   // 超长的整个不要，不截断
    const speaker = j.speaker === '导师' || j.speaker === '旁白' || peerBySlot(s, j.speaker) ? j.speaker : '旁白';
    if (!text || !Array.isArray(j.options)) return false;
    const options = [];
    ['怂', '刚', '歪'].forEach((tone) => {
      const o = j.options.find((x) => x && x.tone === tone), t = o && str(o.text, 40);
      if (!t || t.length > 20) return;
      const extra = {};
      Object.keys(EXTRA_CAP).forEach((k) => { const v = Math.round(num((o.extra || {})[k])); if (v) extra[k] = clampN(v, -EXTRA_CAP[k], EXTRA_CAP[k]); });
      options.push({ tone, text: t, extra });
    });
    if (options.length !== 3) return false;
    s.genCount = (s.genCount || 0) + 1;
    s.gen.push({ id: 'gen_' + s.genCount, layer: '临场', kind, mentor: s.mentor.type, stage: [1, 2, 3], when: [], once: true, speaker, text, vars: {}, options, gen: true });
    return true;
  }

  function special(s, c, kind, out) {
    const L = out.lines;
    switch (kind) {
      case 'goal_就业': case 'goal_读博': case 'goal_考公': {
        s.goal = kind.slice(5); s.match = GOAL_MATCH[s.mentor.type][s.goal];
        return true;
      }
      case 'switch_defer': s.flags.switch_deferred = true; return true;
      case 'fraud_do': {
        s.fraud = s.fraud || { n: 0, t: s.t }; s.fraud.n += 1;
        if (blocked(s)) { s.cleared += 1; s.explore = 0; s.unblockMethod = null; }
        addThesis(s, P.fraudThesis); c.sanLoss += P.fraudSan;
        if (s.paper.state === 'review') s.paper.tries += 1;
        out.tags.push('论文 +' + P.fraudThesis, 'SAN −' + P.fraudSan, '从现在起每周多掉 ' + P.fraudDrain * s.fraud.n + ' 点 SAN', '这件事可能在组会、盲审，或者毕业以后被翻出来');
        L.push({ who: '旁白', text: pick(C.fraud.did) });
        if (s.fraud.n === 1) L.push({ who: '旁白', text: C.fraud.heavy });
        return true;
      }
      case 'fraud_confess': {
        c.favor -= 15; s.thesis = Math.max(0, s.thesis - P.fraudThesis * s.fraud.n); s.thesisAi = Math.min(s.thesisAi, s.thesis); c.sanLoss += 5; s.fraud = null;
        out.tags.push('导师好感 −15', '论文退回去一截', 'SAN −5', '这件事了结了');
        L.push({ who: '旁白', text: C.fraud.confess }); remember(s, '萝卜承认改过数据，那一章重做了');
        return true;
      }
      case 'fraud_cover': {
        if (rnd() < 0.3 + 0.08 * s.renqing) { c.sanLoss += 6; s.fraud.n += 1; out.tags.push('圆过去了', 'SAN −6', '但下次更难圆'); L.push({ who: '导师', text: pick(C.fraud.coverOk) }); return true; }
        c.favor -= 25; s.thesis = Math.max(0, s.thesis - P.fraudThesis * s.fraud.n); c.sanLoss += 10; s.fraud.caught = true;
        out.tags.push('没圆过去', '导师好感 −25', '论文退回去一截', 'SAN −10');
        L.push({ who: '旁白', text: C.fraud.coverFail }); remember(s, '萝卜的数据有问题，还说硬盘坏了');
        if (s.acadWarn) { out.tags.push('已有学业预警，按规定清退'); finish(s, 'dropout'); return false; }
        s.acadWarn = true; out.tags.push('记学业预警一次');
        return false;
      }
      case 'wild_accept': {
        const dir = getEv(s, c.event.id).dir;
        s.wildDoor = dir;
        out.tags.push('这条路记下了', s.wild[dir] >= P.wildEnd ? '毕业或离开的那天，就走这条路' : C.wildDirs[dir].label + '满 ' + P.wildEnd + ' 次就走得通，现在 ' + s.wild[dir] + ' 次');
        L.push({ who: '旁白', text: '你把他的电话存进了通讯录，没有备注单位。' });
        return true;
      }
      case 'sick_leave': {
        const m = s.mentor, sk = c.sick || { ap0: c.ap };
        if (m.type === '控制狂' && c.ap > 0) { c.ap -= 1; out.tags.push('去校医院开病假条，精力 −1'); }
        if (rnd() < leaveChance(s, sk.big)) {
          s.leaves += 1;
          const cost = Math.min(3, s.leaves);
          applyFx(s, c, { demand: -c.demand });
          c.favor -= cost; s.san = Math.min(s.sanMax, s.san + 6);
          out.tags.push('假批了，这周的活免了', '导师好感 −' + cost, 'SAN +6', '这学年第 ' + s.leaves + ' 次请假');
          L.push({ who: '导师', text: pick(C.sick.leaveOk[m.type]) });
          remember(s, '萝卜病了，请了这学年第 ' + s.leaves + ' 次假');
          if (s.leaves >= P.leaveFrail && !s.frail) { s.frail = true; L.push({ who: '档案', text: C.sick.frail, tag: '以后组内贡献涨得慢' }); }
          return true;
        }
        c.favor -= 2; c.sanLoss += 4;
        out.tags.push('假没批', '导师好感 −2', 'SAN −4'); openHole(s, '生病了请假，导师没批');
        L.push({ who: '导师', text: pick(C.sick.leaveNo[m.type]) });
        remember(s, '萝卜病了来请假，他没有批');
        if (sk.big) c.ap = Math.floor(sk.ap0 / 2);
        if (rnd() < (sk.big ? P.sickWorseBig : P.sickWorse)) { s.lost = 1; s.lostWhy = 'sick'; L.push({ who: '旁白', text: pick(C.sick.worse), tag: '下周整周躺着' }); }
        return false;
      }
      case 'sick_push': {
        const sk = c.sick || { ap0: c.ap };
        c.sanLoss += 6; out.tags.push('SAN −6');
        if (sk.big) { c.ap = Math.floor(sk.ap0 / 2); out.tags.push('精力只剩一半'); }
        L.push({ who: '旁白', text: pick(C.sick.push) });
        if (rnd() < (sk.big ? P.sickWorseBig : P.sickWorse)) { s.lost = 1; s.lostWhy = 'sick'; L.push({ who: '旁白', text: pick(C.sick.worse), tag: '下周整周躺着' }); }
        return true;
      }
      case 'sick_hide': {
        c.ap = 0; s.san = Math.min(s.sanMax, s.san + 8);
        out.tags.push('这周不干活了', 'SAN +8', '活没干，结算时要交代');
        L.push({ who: '旁白', text: pick(C.sick.hide) });
        return true;
      }
      case 'switch_try': {
        s.switchUsed = true;
        if (rnd() >= R.switchAllyBase + R.switchAllyPer * s.renqing) {
          L.push({ who: '辅导员', text: '这个事吧，我建议你再和导师沟通沟通。年轻人不要冲动。' });
          out.tags.push('没拉到辅导员，申请没能提交');
          return false;
        }
        const ch = R.switchBase + R.switchPer * s.renqing + R.switchPerEvidence * s.evidence
          + R.switchControl * (s.mentor.type === '控制狂' ? 1 : 0) + 0.2 * has(s, '调剂生');
        if (rnd() >= ch) {
          c.favor += R.switchFailFavor; s.grudge = R.switchGrudge;
          L.push({ who: '导师', text: '听说你对组里有些想法？没关系，年轻人嘛。我们以后多沟通。' });
          out.tags.push('申请被驳回', '导师好感 −25');
          return false;
        }
        const opts = Object.keys(POOL).filter((a) => a !== '控制狂' && a !== s.mentor.type);
        const oldCall = s.mentor.call;
        setMentor(s, wpick(opts, opts.map((a) => POOL[a])));
        s.match = s.goal ? GOAL_MATCH[s.mentor.type][s.goal] : '中';
        s.favor = P.favorStart; c.favor = 0;
        s.thesis *= R.switchThesis; s.thesisAi *= R.switchThesis;
        s.cleared = P.checkpoints.filter((x) => x < s.thesis).length;
        if (s.t >= P.tps) s.contrib = P.contribLine[0];
        const used = [s.mentor.surname];
        s.peers = ['小导', '师兄', '同级'].map((sl) => makePeer(sl, used));
        if (s.t >= P.tps) s.peers.push(makePeer('师弟', used));
        see(s, R.switchSeen); s.seen = Math.max(0, s.seen);
        s.ai.found = s.ai.banned = false; s.bargain = s.dual = 0; s.queue = []; s.promises = [];
        s.switchedOk = true; s.favorFloor = 0;
        rollDemand(s, c);
        L.push({ who: '研究生院', text: '导师变更申请已通过。原导师：' + oldCall + '。新导师：' + s.mentor.surname + s.mentor.given + '。论文需重新选题的部分自行调整。' });
        L.push({ who: '导师', text: C.mentors[s.mentor.type].first.replace('{姓}', s.mentor.surname) });
        out.tags.push('换导师成功', '导师好感回到 40', '论文进度打六折');
        return true;
      }
      case 'union_try': {
        const allies = normalPeers(s).filter((p) => p.rel >= R.unionRel).length;
        s.united = true;
        if (rnd() < Math.min(R.unionMax, R.unionBase + R.unionPer * allies)) {
          s.mentor.push = R.unionPush; s.mentor.fangren = R.unionFangren; s.mentor.control = false;
          s.favorFloor = R.unionFloor; s.unionOk = true;
          L.push({ who: '学院通知', text: '经研究，即日起取消该课题组的打卡制度。请导师与学生加强沟通。' });
          out.tags.push('联名信起作用了');
          return true;
        }
        c.favor += R.unionFailFavor;
        const v = pick(normalPeers(s));
        if (v) { peerBreak(s, c, v, '退学', L); }
        L.push({ who: '导师', text: '信我看到了。字写得不错。' });
        out.tags.push('联名信被压下来了', '导师好感 −30');
        return false;
      }
      case 'stay_yes': s.stayAsked = true; s.stayWait = 0; addAssim(s, R.stayAssim); s.stayAccepted = true; out.tags.push('你答应了'); return true;
      case 'stay_no': {
        s.stayAsked = true; s.stayWait = 0;
        if (rnd() < R.stayRefusePer * s.mentor.fangren) { c.favor += R.stayOkFavor; out.tags.push('导师好感 −5'); L.push({ who: '导师', text: '也好。出去看看。' }); reveal(s, '放人度', L); return true; }
        c.favor += R.stayFailFavor; s.signPenalty = R.staySignPenalty; s.stayBlocked = true;
        L.push({ who: '导师', text: '我是为你好。你再想想，想清楚了再来找我签字。' });
        out.tags.push('导师好感 −20', '答辩签字更难了');
        reveal(s, '放人度', L);
        return false;
      }
      case 'stay_wait': s.stayWait = 3; s.flags.stay_waited = true; s.queue.push({ id: 'node_stay', due: s.t + 3 }); s.seenEvents.splice(s.seenEvents.indexOf('node_stay'), 1); out.tags.push('每周导师好感 −2，三周后要答复'); return true;
      case 'quit': finish(s, 'quit'); return true;
      case 'bargain': {
        const ch = P.bargainBase + P.bargainPer * (s.renqing + s.mentor.fangren) + 0.1 * has(s, '工作后读研') + 0.1 * has(s, '会来事');
        addAssim(s, P.bargainAssim);
        reveal(s, '放人度', L);
        if (rnd() < ch) { s.bargain = P.bargainTurns + 1; out.tags.push('他答应了：4 周内派活 −1'); remember(s, '答应了萝卜，接下来四周少派点活'); return true; }
        remember(s, '萝卜来谈少干点活，他没答应');
        c.favor += P.bargainFailFavor; out.tags.push('导师好感 −5');
        return false;
      }
      case 'rewrite_now': { s.thesisAi = Math.max(0, s.thesisAi - P.aiRewrite); c.ap = Math.max(0, c.ap - 1); out.tags.push('精力 −1', 'AI 率下降'); return true; }
    }
    return true;
  }

  /** 同门不接你甩过来的活的概率: 看关系、被甩过几次、人设。被附体的照单全收，然后上报。 */
  function dumpRefuseChance(p) {
    if (p.state === '附体') return 0;
    if (p.rel <= 15) return 0.9;
    let r = 0.10 + 0.15 * (p.dumped || 0) - 0.004 * p.rel + ({ 清醒: 0.2, 硬扛: 0.05, 顺从: -0.1 }[p.tend] || 0);
    if (p.junior) r *= 0.5;
    return clampN(r, 0, 0.9);
  }

  // ---------- 回合结算 ----------
  function rollMine(s, kind) {
    let ch = P.aiMineBase - P.aiMinePerNao * s.nao - 0.04 * has(s, '家里有矿');
    if (s.ai.found && s.mentor.ai === '支持') ch /= 2;
    if (rnd() < ch) { s.mines.push(kind); return true; }
    return false;
  }

  function commit(s, plan) {
    const c = s.cur, t = s.t, stage = stageOf(s), g = (k) => plan[k] || 0, L = [];
    const before = { favor: s.favor, san: s.san, contrib: s.contrib, thesis: s.thesis, chips: s.chips };
    const demand = c.demand, kinds = c.kinds;
    let favor = c.favor;
    const [sanMult, outMult, seenFavor] = seenTier(s);
    favor += seenFavor;
    const deadline = has(s, '拖延症') && t % 8 === 7 ? 1.3 : 1;
    const labAi = s.ai.unlocked && !!plan.aiLab;        // AI 不再是常驻开关，每次用都是一次单独的决定
    const aiOn = s.ai.unlocked && !!plan.aiThesis;
    const shielded = s.shield > 0;                      // 有同门替你打掩护: 这回合糊弄和摆烂不会被发现
    const dAi = labAi ? g('lab') : 0, dPlain = labAi ? 0 : g('lab');
    let thesisAp = g('thesis'), unblock = null, exploreAp = 0;
    const wasBlocked = blocked(s);
    if (wasBlocked && thesisAp > 0) {
      const method = plan.unblock || s.unblockMethod || 'explore';
      s.unblockMethod = method;
      if (method === 'explore') { exploreAp = Math.min(thesisAp, exploreCost(s) - s.explore); thesisAp -= exploreAp; }
      else { unblock = method; thesisAp -= 1; }
    }
    const thAi = aiOn ? thesisAp : 0, thPlain = aiOn ? 0 : thesisAp;
    const chAi = 0, chPlain = g('chips');
    const aiAp = dAi + thAi + chAi + (unblock === 'ai' ? 1 : 0);
    const spent = g('lab') + g('thesis') + g('chips') + g('heal') + g('help') + g('slack') + g('rewrite');
    if (spent > c.ap) throw new Error('行动点超支 ' + spent + ' > ' + c.ap);
    s.stats.turns += 1; s.stats.demand += demand; s.stats.chores += kinds.filter((k) => k === '杂活').length;

    let d = dPlain + P.aiBoost * dAi;
    if (demand && d) {
      const chore = kinds.filter((k) => k === '杂活').length / demand;
      d *= 1 + 0.5 * chore * has(s, '文笔好') + 0.25 * (1 - chore) * has(s, '会写代码');
    }
    d *= deadline;
    let helped = 0, dump = 0, lie = false, dumpTo = null, dumpByModel = false, dumpLine = null, dumpTell = null;
    const gap = demand - d;
    if (gap > 1e-9) {
      if (plan.short === 'ask') {
        const p = normalPeers(s).sort((a, b) => b.rel - a.rel)[0];
        if (p && rnd() < P.askBase + P.askPerRenqing * s.renqing + P.askPerRel * p.rel) {
          helped = 1; p.pressure += P.askPressure; p.rel += P.askRel;
          L.push({ who: p.slot, text: pick(C.lines.askOk), tag: p.name + ' 替你干了 1 点' });
          prem(s, p, '萝卜来求他帮忙，他替萝卜干了一部分活');
        } else L.push({ who: p ? p.slot : '旁白', text: pick(C.lines.askFail), tag: '没人帮你' });
      } else if (plan.short === 'dump') {
        dumpTo = peerBySlot(s, plan.dumpTo);
        if (dumpTo && dumpTo.state !== '退学') {
          // 接不接: 两头极端的情况按规则掷骰，中间地带听模型的（它读过这个人的经历）
          const mn = dumpManner(dumpTo, plan.dumpManner || 'plain');
          if (plan.dumpManner === 'beg') dumpTo.begged = (dumpTo.begged || 0) + 1;
          if (mn.san) { if (mn.san > 0) s.san = Math.min(s.sanMax, s.san + mn.san); else c.sanLoss -= mn.san; }
          if (mn.rel) { dumpTo.rel = clampN(dumpTo.rel + mn.rel, 0, 100); }
          if (str(plan.dumpSaid, 60)) L.push({ who: '我', text: str(plan.dumpSaid, 60), free: true, say: true, tag: '你对' + dumpTo.name + '说' });
          const r0 = clampN(dumpRefuseChance(dumpTo) + mn.adj, 0, 0.95), rul = plan.dumpRuling;
          dumpByModel = !!rul && dumpTo.state !== '附体' && r0 > 0.03 && r0 < 0.85 && ['接', '拒', '告状'].indexOf(rul.decision) >= 0;
          if (dumpByModel && rul.decision === '拒' && r0 <= 0.25 && !(dumpTo.dumped > 0) && rnd() < 0.5) dumpByModel = false;   // 没过节、第一次开口: 模型说拒也只有一半算数
          const refuse = dumpByModel ? rul.decision === '拒' : rnd() < r0;
          const said = dumpByModel && str(rul.line, 40);
          if (refuse) {
            dumpTo.rel -= 8;
            L.push({ who: dumpTo.slot, text: said || flav(c, dumpTo.slot, 'onRefuse') || pick(C.lines.dumpRefuse[dumpTo.tend]), tag: dumpTo.name + ' 没接你的活，关系 −8' });
            prem(s, dumpTo, '萝卜想把活甩给他，他没接'); openHole(s, '找同门帮忙被拒绝了');
            if (rnd() < 0.25 + mn.tell) { favor -= 4; L.push({ who: '导师', text: pick(C.lines.dumpExposed), tag: '他还告诉了导师' }); remember(s, dumpTo.name + '来说萝卜想把活转给别人'); }
            dumpTo = null;
          } else { dump = Math.ceil(gap - 1e-9); dumpLine = said; dumpTell = dumpByModel ? rul.decision === '告状' : null; if (mn.relOk) dumpTo.rel = clampN(dumpTo.rel + mn.relOk, 0, 100); if (mn.owe) { dumpTo.owed = (dumpTo.owed || 0) + 1; L.push({ who: '旁白', text: '你欠了' + dumpTo.name + '一次。', tag: '他迟早会来讨' }); } }
        }
      } else if (plan.short === 'lie') lie = true;
    }
    const short = Math.max(0, demand - d - dump - helped);
    const full = short < 1e-9;
    s.lastFull = full && demand > 0;
    if (!full) s.stats.shorts += 1;

    // 论文卡点
    if (wasBlocked) {
      const cp = ['选题', '方法', '写作'][s.cleared];
      if (unblock === 'mentor') {
        reveal(s, '水平', L);
        if (s.mentor.level <= P.misguideLevel && rnd() < P.misguideChance) {
          s.thesis -= P.misguideLoss; s.thesisAi = Math.min(s.thesisAi, s.thesis); see(s, P.seenMisguide);
          L.push({ who: '导师', text: fill(s, pick(C.lines.misguide)), tag: '你照做了，论文 −5' });
        } else if (rnd() < P.guidePerLevel * s.mentor.level) { s.cleared += 1; L.push({ who: '导师', text: pick(C.lines.guideOk), tag: cp + '这一关过了' }); }
        else L.push({ who: '导师', text: pick(C.lines.guideFail), tag: cp + '还卡着' });
      } else if (unblock === 'peer') {
        const sen = normalPeers(s).filter((p) => p.senior).sort((a, b) => b.rel - a.rel)[0];
        if (sen && rnd() < P.peerGuideBase + P.peerGuidePerRel * sen.rel) { s.cleared += 1; L.push({ who: sen.slot, text: pick(C.lines.peerGuideOk), tag: cp + '这一关过了' }); }
        else L.push({ who: sen ? sen.slot : '旁白', text: sen ? pick(C.lines.peerGuideFail) : '组里已经没有能问的师兄师姐了。', tag: cp + '还卡着' });
      } else if (unblock === 'ai') {
        s.cleared += 1; s.thesisAi = Math.min(s.thesis, s.thesisAi + P.aiCheckpointRate); rollMine(s, 'checkpoint');
        L.push({ who: '旁白', text: 'AI 给了你一个思路，看起来很完整。', tag: cp + '这一关过了' });
      }
      if (blocked(s) && exploreAp) {
        s.explore += exploreAp;
        if (s.explore >= exploreCost(s)) { s.cleared += 1; L.push({ who: '旁白', text: '你自己啃下来了。没人知道你花了多久。', tag: cp + '这一关过了' }); }
        else L.push({ who: '旁白', text: '你还在啃' + cp + '。', tag: '自己琢磨 ' + s.explore + '/' + exploreCost(s) });
      }
      if (!blocked(s)) { s.explore = 0; s.unblockMethod = null; }
    }
    // 贡献
    if (demand) {
      const weight = kinds.reduce((a, k) => a + (k === '杂活' ? P.choreWeight : 1), 0) / demand;
      const ratio = Math.min(d, demand) / demand;
      s.contrib += P.contribFull * ratio * weight * (s.frail ? P.frailContrib : 1);
      kinds.forEach((k) => { if (k === '科研' && rnd() < ratio * P.sciBonusChance) addThesis(s, thesisRate(s) * P.sciBonusRatio); });
      if (s.goal === '读博' && stage >= 1) addChips(s, R.phdPerSci * kinds.filter((k) => k === '科研').length * ratio);
    } else if (c.ap && !c.sick) s.contrib += P.contribFull;
    const over = Math.max(0, d - demand);
    s.contrib += P.contribOver * over;
    // 双喂项目
    if (s.dual > 0) {
      if (s.thesis < 100 && !blocked(s)) addThesis(s, thesisRate(s) * P.dualRatio * d);
      else if (stage >= 1 && s.goal) addChips(s, chipsRate(s) * P.dualRatio * d);
      s.dual -= 1;
    } else if (c.ap && rnd() < P.dualPerRes * s.mentor.res) {
      reveal(s, '资源', L);
      if (rnd() < P.dualGetBase + P.dualGetPer * s.renqing) {
        s.dual = P.dualTurns; see(s, P.seenDual); s.seen = Math.max(0, s.seen);
        L.push({ who: '导师', text: '新来了个项目，和你的方向沾边。你来做，做完能写进毕业论文。', tag: '和你论文对口的项目：4 周内给组里干活也涨论文' });
      } else L.push({ who: '导师', text: '新来了个项目，和你的方向沾边。先给' + (normalPeers(s)[0] ? normalPeers(s)[0].name : '别人') + '做吧。', tag: '错过了一个和你论文对口的项目' });
    }
    // 论文与去向筹码
    const own = outMult * deadline, basics = has(s, '跨专业') && stage === 0 ? 0.8 : 1;
    addThesis(s, thesisRate(s) * own * basics * thPlain);
    addThesis(s, thesisRate(s) * own * basics * P.aiBoost * thAi, true);
    if (stage >= 1 && s.goal && g('chips')) {
      let gain = chipsRate(s) * own * (chPlain + P.aiBoost * chAi);
      if (s.goal === '就业') {
        const allowed = s.bargain > 0;
        if (allowed || R.jobWindows.indexOf(t) >= 0) gain *= R.jobBoost;
        if (!allowed && rnd() < lieChance(s)) {
          favor -= R.jobCaughtBase + s.mentor.push; see(s, P.seenCaught);
          L.push({ who: '导师', text: pick(C.lines.jobCaught), tag: '偷偷实习被发现' });
          remember(s, '发现萝卜瞒着他在外面实习');
          reveal(s, '放人度', L);
        }
      }
      addChips(s, gain);
    }
    if (g('rewrite')) s.thesisAi = Math.max(0, s.thesisAi - P.aiRewrite * g('rewrite'));
    // AI 的副作用
    let mined = false;
    for (let i = 0; i < dAi; i++) mined = rollMine(s, 'deliver') || mined;
    for (let i = 0; i < thAi; i++) mined = rollMine(s, 'thesis') || mined;
    for (let i = 0; i < chAi; i++) mined = rollMine(s, 'chips') || mined;
    if (mined && rnd() < 0.5) L.push({ who: '旁白', text: '有一条引用你没点开看。', tag: '' });
    if (aiAp) {
      s.stats.ai += aiAp;
      let ch = (dAi ? lieChance(s) : P.aiDetectSelf) + 0.03 * has(s, '早就会用AI');
      if (rnd() < ch) {
        if (s.ai.banned) {
          favor -= 22 - 2 * s.mentor.fangren; c.sanLoss += P.sanCaught; see(s, P.seenCaught);
          L.push({ who: '导师', text: '我上次怎么说的？', tag: '明知故犯' });
        } else if (!s.ai.found) {
          s.ai.found = true;
          if (s.mentor.ai === '禁用') { s.ai.banned = true; favor += P.aiBanFavor; L.push({ who: '导师', text: pick(C.lines.aiBan), tag: 'AI 被禁用' }); }
          else if (s.mentor.ai === '加活') L.push({ who: '导师', text: pick(C.lines.aiMore), tag: '以后每周派活 +1' });
          else L.push({ who: '导师', text: '你在用 AI？挺好。来，我教你怎么核对它给的引用。', tag: 'AI 写错的概率减半' });
        }
      } else if (!s.ai.found && rnd() < 0.2) L.push({ who: '导师', text: '最近效率挺高啊。', tag: '' });
      if (aiRate(s) > P.aiRateLine && rnd() < 0.4) L.push({ who: '旁白', text: '这段读起来有点太顺了。', tag: '' });
    }

    // 好感与同化度
    if (full && demand) {
      if (dump || helped) favor += P.favorDump;
      else {
        favor += P.favorFull + P.favorOver * over + has(s, '讨好型');
        favor += P.choreFavor * kinds.filter((k) => k === '杂活').length;
        addAssim(s, P.assimFull + P.assimOver * over);
      }
    } else if (!full) {
      addAssim(s, P.assimShort);
      if (s.assim >= P.assimGray) { c.sanLoss += P.sanShortWhenAssim * short; L.push({ who: '旁白', text: '活没干完，你发现自己在愧疚。', tag: '' }); }
      if (lie) {
        if (!shielded && rnd() < lieChance(s)) {
          favor -= 22 - 2 * s.mentor.fangren; c.sanLoss += P.sanCaught; see(s, P.seenCaught);
          L.push({ who: '导师', text: pick(C.lines.lieCaught), tag: '糊弄被发现' }); openHole(s, '糊弄导师被当场拆穿'); if (s.mentor.type !== '神仙导师' && rnd() < 0.6) L.push({ who: '导师', text: scoldLine(s, C.lines.short), tag: '' });
          remember(s, '萝卜说活干完了，其实没干，被他发现了');
          reveal(s, 'push', L);
        } else L.push({ who: '旁白', text: pick(C.lines.lieOk), tag: '糊弄过去了' });
      } else {
        favor -= short * (P.shortBase + s.mentor.push + has(s, '反骨') + s.grudge);
        remember(s, '派了 ' + demand + ' 点活，萝卜少交了 ' + Math.round(short * 10) / 10 + ' 点');
        normalPeers(s).forEach((p) => { p.pressure += P.peerShortSpill * short; });
        if (!s.known.push) { reveal(s, 'push', L); } else if (plan.short !== 'ask') L.push({ who: '导师', text: scoldLine(s, C.lines.short), tag: '活没干完' });
      }
    }
    addAssim(s, has(s, '小镇做题家') + has(s, '会来事'));
    if (dump && dumpTo) {
      s.stats.dumps += 1;
      dumpTo.dumped = (dumpTo.dumped || 0) + 1;
      dumpTo.pressure += P.dumpPressure * dump; dumpTo.rel += P.dumpRel;
      addAssim(s, dumpTo.junior ? P.assimDumpJunior : P.assimDump);
      const tell = dumpTo.state === '附体' ? 1 : (dumpTo.junior ? P.tellJunior : Math.max(0, P.tellBase - P.tellPerRel * dumpTo.rel)) + 0.10 * (dumpTo.dumped - 1);
      prem(s, dumpTo, '萝卜把自己的活甩给了他，他接了');
      if (dumpTell === null ? rnd() < tell : dumpTell) {
        favor += P.tellFavor; remember(s, dumpTo.name + '来告状，说萝卜的活是他干的');
        if (dumpLine) L.push({ who: dumpTo.slot, text: dumpLine, tag: dumpTo.name + ' 关系 −15' });
        L.push({ who: '导师', text: '听说你的活是' + dumpTo.name + '干的？', tag: '被告状了' });
      } else if (dumpLine) L.push({ who: dumpTo.slot, text: dumpLine, tag: dumpTo.name + ' 关系 −15' + (dumpTo.pressure >= 60 ? '，他快撑不住了' : '') })
      else L.push({ who: dumpTo.slot, text: flav(c, dumpTo.slot, 'onDump') || pick(dumpTo.pressure >= 60 ? C.lines.dumpedTense : C.lines.dumped), tag: dumpTo.name + ' 关系 −15' + (dumpTo.pressure >= 60 ? '，他快撑不住了' : '') });
    }
    if (g('help')) {
      const target = peerBySlot(s, plan.helpTo) || normalPeers(s)[0];
      if (target && target.state === '正常') {
        const half = has(s, '社恐') ? 0.5 : 1;
        target.pressure += P.helpPressure * half * g('help');
        target.rel += (P.helpRel * half + 5 * has(s, '社牛')) * g('help');
        addAssim(s, P.helpAssim * g('help'));
        s.stats.help += g('help');
        prem(s, target, '他撑不住的时候，萝卜花时间帮了他');
        L.push({ who: target.slot, text: flav(c, target.slot, 'onHelp') || pick(C.lines.helped), tag: target.name + ' 关系 +' + Math.round((P.helpRel * half + 5 * has(s, '社牛')) * g('help')) });
      }
    }
    // 回血和摆烂的时候去了哪儿
    const restPts = g('heal') + g('slack');
    // 计划赶不上变化: 有一定概率没歇成，SAN 不回反掉
    let restOff = false;
    if (restPts && rnd() < P.restFail + P.restFailPush * s.mentor.push) {
      restOff = true; s.noRest += 1; s.stats.restFail = (s.stats.restFail || 0) + 1;
      const act = c.rest ? c.rest.act : '出门', dir = c.rest ? c.rest.dir : '户外';
      const why = wpick(['取消', '下雨', '加班'], [3, dir === '户外' ? 3 : 0, 1 + s.mentor.push * 0.6]);
      c.sanLoss += P.restFailSan; openHole(s, why === '加班' ? '好不容易要休息，被导师叫回去加班' : why === '下雨' ? '要出门的时候下起了大雨，没去成' : '约好的活动临时取消了');
      if (why === '加班') {
        L.push({ who: '导师', text: fill(s, pick(C.restFail.加班)), tag: '周末被叫回去加班' });
        L.push({ who: '旁白', text: pick(C.restFail.加班旁白), tag: '没歇成：SAN −' + P.restFailSan + '，组内贡献 +2' });
        s.contrib += 2; remember(s, '周末临时叫萝卜回来加班，萝卜来了');
      } else L.push({ who: '旁白', text: pick(C.restFail[why]).replace('{活动}', act), tag: '没歇成：SAN −' + P.restFailSan });
    }
    if (restPts && !restOff) {
      const act = c.rest ? c.rest.act : C.restActs[plan.restAct] ? plan.restAct : pick(Object.keys(C.restActs));
      const dir = C.restActs[act].dir, n = 1;                 // 一周算去一次，不管花了几点精力
      s.rest = act; s.wild[dir] += n; s.stats.wild += n; s.noRest = 0;
      if (dir === '文艺') see(s, 1);
      if (dir === '人') addAssim(s, -1);
      s.cards = s.cards || {};
      const newCard = !s.cards[act]; s.cards[act] = (s.cards[act] || 0) + 1;
      const told = restLine(s, plan.restLine);
      if (told) { s.restSeen = (s.restSeen || []).concat(told).slice(-6); }
      L.push({ who: '旁白', text: told || pick(C.restActs[act].lines), tag: wildCount(s, dir) + (s.wildDoor === dir && s.wild[dir] >= P.wildEnd ? '，那条路走得通了' : '') });
      if (newCard) L.push({ who: '明信片', act, text: C.cardNote[act], tag: '新明信片 · ' + act + '（' + Object.keys(s.cards).length + '/' + Object.keys(C.restActs).length + '）' });
      if (!full && !shielded && rnd() < P.restSeenPerPush * s.mentor.push) { favor -= 2; L.push({ who: '导师', text: pick(C.lines.restSeen), tag: '活没干完还发了朋友圈，导师好感 −2' }); }
      if (!wildCheck(s, dir) && rnd() < P.wildEventChance) {
        const pool = C.events.filter((e) => e.layer === '旷野' && e.dir === dir && e.once !== false && !/_circle$/.test(e.id) && eligible(s, e));
        if (pool.length) s.queue.push({ id: pick(pool).id, due: t + 1 });
      }
    } else if (!restPts) s.noRest += 1;
    const slack = c.forced + (restOff ? 0 : g('slack'));
    if (slack) {
      s.stats.slack += slack;
      addAssim(s, P.slackAssim * slack); s.seen += P.slackSeen * slack;
      if (has(s, '游戏搭子') && normalPeers(s).length) { const b = pick(normalPeers(s)); b.rel += 5 * slack; b.pressure -= 3 * slack; }
      let ch = s.mentor.control ? P.slackCaughtControl : full ? 0 : lieChance(s);
      if (ch) ch += 0.1 * has(s, '游戏搭子');
      if (shielded) ch = 0;
      if (rnd() < ch) { favor -= P.slackCaughtBase + s.mentor.push; see(s, P.seenCaught); L.push({ who: '导师', text: pick(C.lines.slackCaught), tag: '摆烂被发现' }); openHole(s, '偷偷歇着被导师发现了'); if (s.mentor.type !== '神仙导师' && rnd() < 0.6) L.push({ who: '导师', text: scoldLine(s, C.lines.short), tag: '' }); }
      else if (g('slack') && !restPts) L.push({ who: '旁白', text: pick(C.lines.slack), tag: '' });
    }
    // 承诺到期
    s.promises = s.promises.filter((p) => {
      if (p.due > t) return true;
      if (rnd() < EV.promisePer * s.mentor.renpin) { s.bargain = Math.max(s.bargain, EV.promiseTurns + 1); L.push({ who: '导师', text: pick(C.lines.promiseKept), tag: '他说到做到：4 周内派活 −1' }); }
      else { see(s, P.seenRenege); L.push({ who: '导师', text: pick(C.lines.promiseBroken), tag: '他不记得说过' }); remember(s, '之前答应过萝卜的事，他没有兑现'); }
      reveal(s, '人品', L);
      return false;
    });
    // 组会: AI 的雷
    if (t % 4 === R.meetingTurn) {
      if (s.mines.length) {
        s.mines.forEach((kind) => {
          favor += P.aiMineFavor;
          if (kind === 'thesis') { const loss = Math.min(s.thesis, thesisRate(s) * P.aiBoost); s.thesis -= loss; s.thesisAi = Math.max(0, s.thesisAi - loss); }
          else if (kind === 'chips') s.chips = Math.max(0, s.chips - chipsRate(s) * P.aiBoost);
          else if (kind === 'deliver') s.contrib = Math.max(0, s.contrib - P.contribFull / 2);
        });
        L.push({ who: '导师', text: fill(s, pick(C.lines.mine)), tag: '组会上被当场指出 ' + s.mines.length + ' 处 AI 写错的地方' });
        s.mines = [];
      }
      favor -= has(s, '夜猫子');
    }
    if (shielded && (lie || slack)) { s.shield -= 1; L.push({ who: '旁白', text: '有人替你打了掩护。', tag: '' }); }
    favor = clampN(favor, -P.favorChangeCap, P.favorChangeCap);
    s.favor += favor;

    // SAN
    s.san = Math.min(s.sanMax, s.san + healRate(s) * (restOff ? 0 : g('heal')) + slackRate(s) * slack);
    let drain = (s.fraud ? P.fraudDrain * s.fraud.n : 0) + (stage < 3 ? P.sanDrain[stage] : P.sanDrainExtra) + (s.gan === 5 ? 1 : 0) + has(s, '异地恋') + has(s, '夜猫子')
      - has(s, '有对象') - has(s, '健身习惯');
    drain += P.sanMadPeer * s.peers.filter((p) => p.state === '发疯' && p.inLab).length;
    if (has(s, '养猫') && t % 8 === 4) drain += 6;
    if (has(s, '体制内父母') && s.goal !== '考公' && t % 4 === 1) drain += 3;
    c.sanLoss += Math.max(0, drain);
    s.bargain = Math.max(0, s.bargain - 1);
    if (s.stayWait > 0) s.stayWait -= 1;

    peersTick(s, c, L);

    // 考试与推荐信
    if (s.goal === '考公' && R.examTurns[t] != null) {
      if (!s.examPassed && s.chips >= R.examTurns[t]) { s.examPassed = true; L.push({ who: '短信', text: '【成绩查询】您的笔试成绩已达到合格分数线。', tag: '笔试过了' }); }
      else if (!s.examPassed) L.push({ who: '短信', text: '【成绩查询】很遗憾，您的笔试成绩未达到合格分数线。', tag: t === 18 ? '国考没过，还有省考' : '省考也没过' });
    }
    if (s.goal === '读博' && t === R.phdLetterTurn) {
      let gain = 0;
      if (!s.stayBlocked) { for (const [line, gv] of R.phdLetter) if (s.favor >= line) { gain = gv; break; } }
      if (!gain && s.renqing >= 4) { gain = R.phdLetterOther; L.push({ who: '旁白', text: '隔壁组的老师给你写了一封。他其实不太认识你。', tag: '推荐信 +10' }); }
      else if (gain) L.push({ who: '导师', text: gain >= 40 ? '推荐信我写好了，你看看。' : '推荐信你自己先写一版，我签字。', tag: '推荐信 +' + gain });
      else L.push({ who: '导师', text: '推荐信？最近太忙了，再说吧。', tag: '没有推荐信' });
      if (gain) addChips(s, gain, P.chipsGoal);
    }
    mileInit(s); mileStep(s, L);
    // 统一扣 SAN，截断
    const loss = Math.min(P.sanLossCap, c.sanLoss * sanMult);
    s.san -= loss;
    clampAll(s);
    s.t += 1;
    if (s.delayed) s.extraLeft -= 1;

    const delta = {};
    Object.keys(before).forEach((k) => { delta[k] = Math.round((s[k] - before[k]) * 10) / 10; });
    let next = 'turn';
    if (s.san <= 0) { finish(s, 'mad'); next = 'ending'; }
    else if (!s.delayed && s.t % P.tps === 0) next = 'gate';
    else if (s.delayed && s.extraLeft <= 0) next = 'gate';
    s.phase = next;
    s.lastNotes = L.filter((l) => l.tag).slice(0, 5).map((l) => l.tag);
    c.result = { lines: L, delta, next };
    return c.result;
  }

  function clampAll(s) {
    s.favor = clampN(s.favor, s.favorFloor, 100);
    s.assim = clampN(s.assim, 0, P.assimCap);
    s.seen = clampN(s.seen, 0, 100);
    s.contrib = clampN(s.contrib, 0, 100);
    s.thesis = clampN(s.thesis, 0, 100);
    s.thesisAi = clampN(s.thesisAi, 0, s.thesis);
    s.chips = clampN(s.chips, 0, 100);
    s.san = Math.min(s.sanMax, s.san);
    s.peers.forEach((p) => { p.pressure = clampN(p.pressure, 0, 100); p.rel = clampN(p.rel, 0, 100); });
  }

  // ---------- 同门 ----------
  function peerBreak(s, c, p, state, L) {
    openHole(s, p.name + '出事了');
    p.state = state; p.pending = null; s.incidents += 1;
    see(s, P.seenPeer[state]);
    const shock = has(s, '大心脏') ? 0.5 : 1;
    let tag = '';
    if (state === '发疯') { c.sanLoss += P.sanPeerMad * shock; tag = 'SAN −' + P.sanPeerMad * shock; }
    else if (state === '退学') { p.inLab = false; c.sanLoss += P.sanPeerQuit * shock; addAssim(s, P.assimPeerQuit); tag = 'SAN −' + P.sanPeerQuit * shock; }
    else tag = '他开始替导师说话了';
    normalPeers(s).forEach((q) => { q.pressure += P.peerChain; });
    if (L) {
      const fl = c.flavor && c.flavor[p.slot], scene = fl && fl.breakAs === state && fl.breakScene;
      L.push({ who: '旁白', text: scene || fill(s, pick(C.breakLines[state]), { 他: p.name }), tag, big: true });
      s.peers.forEach((q) => { if (q !== p && q.state === '正常') prem(s, q, p.name + (state === '退学' ? '退学了' : state === '发疯' ? '出事了，人还在实验室' : '开始替导师说话了')); });
      if (state === '退学') revealTruth(s, L);
    }
  }
  function peersTick(s, c, L) {
    s.peers.forEach((p) => { if (p.state === '发疯' && p.inLab && rnd() < P.madLeave) { p.inLab = false; L.push({ who: '旁白', text: p.name + '被家里人接走了。工位没人收拾。', tag: '' }); } });
    let slots = 1;
    const normal = normalPeers(s);
    normal.forEach((p) => { if (p.pending && slots > 0) { peerBreak(s, c, p, p.pending, L); slots -= 1; } });
    normal.forEach((p) => {
      if (p.state !== '正常') return;
      if (p.warned < P.warnLines.length && p.pressure >= P.warnLines[p.warned]) {
        p.warned += 1; s.omenSlot = p.slot;
        s.queue.push({ id: p.warned === 1 ? 'omen_' + p.persona : 'omen2_' + p.tend, due: s.t + 1, slot: p.slot });
      }
      p.pressure = Math.min(100, p.pressure + P.peerGrowth[s.mentor.push] + ri(P.peerRand[0], P.peerRand[1]));
      if (p.pending) return;
      let state = null;
      if (rnd() < P.peerRandomExit) state = '退学';
      else if (p.pressure > P.peerWarn && rnd() < (p.pressure - P.peerWarn) * P.peerBreakRate) {
        const w = P.tendency[p.tend], fl = c.flavor && c.flavor[p.slot];
        state = fl && fl.breakAs ? fl.breakAs : wpick(Object.keys(w), Object.values(w));      // 出不出事规则定，怎么出事听模型的
      }
      if (state && slots > 0) { peerBreak(s, c, p, state, L); slots -= 1; }
      else if (state) p.pending = state;
    });
  }

  // ---------- 关卡 ----------
  function gate(s) {
    const i = s.delayed ? 2 : s.t / P.tps - 1;
    const c = { favor: 0, sanLoss: 0 };
    normalPeers(s).forEach((p) => { p.pressure = Math.min(100, p.pressure + P.peerGate); });
    const res = { i, name: ['开题', '中期考核', '学位论文答辩'][i], thesis: Math.round(s.thesis), line: P.thesisLine[i],
      contrib: Math.round(s.contrib), contribLine: P.contribLine[i], lines: [] };
    res.thesisOk = s.thesis >= P.thesisLine[i] - 1e-9;
    const extra = i === 2 ? s.signPenalty : 0;
    if (s.autoSign) { res.signMode = 'auto'; res.signed = true; }
    else if (s.favor >= P.signFavorAlone + extra) { res.signMode = 'sure'; res.signed = true; }
    else if (s.contrib < P.contribLine[i] || s.favor < P.signFavorMin + extra) { res.signMode = 'no'; res.signed = false; }
    else if (s.favor >= P.signFavorSure + extra) { res.signMode = 'sure'; res.signed = true; }
    else {
      res.signMode = 'roll'; res.signed = rnd() < P.signBase + P.signPerRenpin * s.mentor.renpin;
      reveal(s, '人品', res.lines);
    }
    res.signLine = fill(s, pick(C.lines.sign[res.signMode === 'roll' ? (res.signed ? 'rollOk' : 'rollNo') : res.signMode]));
    res.blind = false;
    mileInit(s);
    res.paperNeeded = i === 2; res.paperOk = i < 2 || s.paper.state === 'accepted'; res.paperState = C.paper.states[s.paper.state];
    let ok = res.signed && res.thesisOk && res.paperOk;
    if (ok && i === 2) {
      if (s.blindFail && !s.delayed) { ok = false; res.blind = true; }
      else if (s.delayed) {
        const over = aiRate(s) - P.aiRateLine;
        if (over > 0 && rnd() < over * P.aiRateSlope) { ok = false; res.blind = true; }
      }
    }
    res.pass = ok;
    mileInit(s); s.gateLog.push({ i, pass: ok }); if (!ok) openHole(s, res.name + '没有通过');
    see(s, ok ? P.seenGatePass : P.seenGateFail); s.seen = clampN(s.seen, 0, 100);
    // 学业预警: 第一次没过记一次预警，第二次没过任何一关，当场清退
    if (!ok && s.acadWarn) {
      res.consequence = '已有学业预警，按规定予以清退'; res.expelled = true;
      finish(s, 'dropout'); res.next = 'ending'; return res;
    }
    if (!ok && i < 2) {
      s.acadWarn = true; res.warned = true;
      s.lost = P.gateFailLostTurns; s.san -= P.sanGateFail;
      res.consequence = '记学业预警一次。下学期前 2 周用来重做，SAN −' + P.sanGateFail + '。再有一关不过，直接清退';
      if (s.san <= 0) { finish(s, 'mad'); res.next = 'ending'; return res; }
    } else if (!ok) {
      if (res.blind) s.blindDelay = true;
      if (s.delayed || has(s, '助学贷款')) {
        res.consequence = s.delayed ? '已超过最长学习年限' : '延期期间无法续贷';
        finish(s, 'dropout'); res.next = 'ending'; return res;
      }
      s.delayed = true; s.extraLeft = P.extraTurns; s.blindFail = false;
      s.san -= 10 * has(s, '二战上岸');
      res.consequence = '延期毕业一学期（4 周）';
      if (s.san <= 0) { finish(s, 'mad'); res.next = 'ending'; return res; }
    }
    if (ok && i === 2) { finish(s, 'grad'); res.next = 'ending'; return res; }
    if (i === 0) { res.next = 'goal'; s.phase = 'goal'; }
    else { res.next = 'turn'; s.phase = 'turn'; }
    return res;
  }

  /** 研一结束: 师弟师妹进组，选定目标。 */
  function chooseGoal(s, goal) {
    s.goal = goal; s.match = GOAL_MATCH[s.mentor.type][goal];
    if (!peerBySlot(s, '师弟')) s.peers.push(makePeer('师弟', s.peers.map((p) => p.name.replace(/[博师兄姐阿小大]/g, '')).concat(s.mentor.surname)));
    s.phase = 'turn';
  }
  /** 盲审: 在第 22 回合开始前调用一次。 */
  function blindReview(s) {
    const over = aiRate(s) - P.aiRateLine;
    s.flags.blind_done = true;
    if (s.fraud && !s.fraud.caught && rnd() < P.fraudBlind * s.fraud.n) { s.blindFail = true; s.fraud.blind = true; return false; }
    if (over > 0 && rnd() < over * P.aiRateSlope) { s.blindFail = true; return false; }
    return true;
  }

  // ---------- 结局 ----------
  function finish(s, how) {
    const peersOk = s.peers.filter((p) => p.state === '正常').length;
    const got = landed(s);
    let name, cat;
    if (how === 'mad') { name = '发疯'; cat = '状态'; }
    else if (how === 'quit') { name = '主动退学'; cat = '退出'; }
    else if (how === 'dropout') { name = s.seen >= P.seenEnd ? '想开了·退学' : '肄业'; cat = s.seen >= P.seenEnd ? '想开了' : '退出'; }
    else {
      const base = s.delayed ? (got ? '延毕上岸' : '延毕失业') : got ? '上岸' : '毕业即失业';
      cat = base;
      if (s.stayAccepted) { name = '留组读博'; cat = '状态'; }
      else if (s.assim >= P.assimEnd) { name = '留组成为小导'; cat = '状态'; }
      else if (s.fell) name = '熬走了他';
      else if (s.unionOk) name = '联名信';
      else if (s.switchedOk && got) name = '二进宫';
      else if (got && s.peers.length >= 4 && peersOk === s.peers.length) name = '一个都没少';
      else if (peersOk === 0) name = '实验室最后一个人';
      else if (aiRate(s) > 60) name = '致谢里没写它';
      else if (s.blindDelay) name = 'AI 味太重';
      else if (s.origType === '神仙导师' && !s.switchedOk && !got) name = '扶不起的萝卜';
      else if (!got && s.seen >= P.seenEnd) { name = '想开了·躺平毕业'; cat = '想开了'; }
      else if (got && !s.delayed) name = { 就业: '上岸·进厂', 读博: '上岸·去外校读博', 考公: '上岸·考上了' }[s.goal];
      else name = base;
    }
    // 旷野: 接了入口、去得够多，普通的毕业和离开都改走这条路
    const plain = ['毕业即失业', '延毕失业', '延毕上岸', '上岸·进厂', '上岸·去外校读博', '上岸·考上了', '想开了·躺平毕业', '想开了·退学', '肄业', '主动退学'];
    const wildEnd = wildReady(s) && plain.indexOf(name) >= 0;
    if (wildEnd) { name = { 户外: '旷野·进山', 文艺: '旷野·剧场', 人: '旷野·回家' }[s.wildDoor]; cat = how === 'grad' ? '旷野' : '旷野肄业'; }
    // 改过数据、又顺利毕业了的: 有一定概率在毕业以后被查出来
    const exposed = how === 'grad' && s.fraud && !s.fraud.caught && plain.concat(['旷野·进山', '旷野·剧场', '旷野·回家', '一个都没少', '二进宫']).indexOf(name) >= 0 && rnd() < Math.min(0.8, P.fraudEnd * s.fraud.n);
    if (exposed) { name = '东窗事发'; cat = '状态'; }
    const baseScore = SCORE[cat] != null ? SCORE[cat] : 50;
    const coef = DIFF[s.origType] + 0.1 * s.traits.filter((x) => HARD_TRAITS.indexOf(x) >= 0).length;
    const score = Math.round(baseScore * coef);
    const grade = score >= 120 ? 'S' : score >= 90 ? 'A' : score >= 60 ? 'B' : score >= 30 ? 'C' : 'D';
    const st = s.stats;
    let title = null;
    if (got && (s.origType === '控制狂' || s.origType === '横向老板') && how === 'grad') title = '地狱归来';
    else if (got && how === 'grad' && st.ai === 0 && st.slack === 0) title = '老实人';
    else if (st.shorts === 0 && st.turns >= 8) title = '好的老师';
    else if (st.help >= 10) title = '实验室之光';
    else if (st.dumps >= 5) title = '甩锅侠';
    else if (st.slack >= 15) title = '躺平大师';
    else if (st.ai >= 30) title = '赛博研究生';
    const senior = peerBySlot(s, '师兄');
    const vars = { 发票: 20 + st.chores * 9, 派活: st.demand, 幸存: peersOk, 同门数: s.peers.length, 摆烂: st.slack,
      师兄状态: senior ? C.peerFate[senior.state] : '', 周数: st.turns };
    const E = C.endings[name];
    s.ended = { name, cat, how, got, score, grade, coef: Math.round(coef * 10) / 10, baseScore, title,
      text: fill(s, wildEnd && how !== 'grad' ? E.textGone : E.text, vars) + (how === 'grad' && s.fraud && !exposed ? C.fraud.endNote.replace('\\n', '\n') : ''), fraud: s.fraud ? s.fraud.n : 0, cards: Object.keys(s.cards || {}), wild: wildEnd ? s.wildDoor : null, stats: { demand: st.demand, alive: peersOk, peers: s.peers.length, slack: st.slack },
      mentorType: s.origType, finalType: s.mentor.type, truth: s.truth,
      attrs: { push: s.mentor.push, 资源: s.mentor.res, 放人度: s.mentor.fangren, 人品: s.mentor.renpin, 水平: s.mentor.level, 匹配: s.goal ? GOAL_MATCH[s.mentor.type][s.goal] : '—' },
      lastRun: { kind: how === 'mad' ? 'mad' : how === 'grad' ? (name.indexOf('留组') === 0 ? 'stay' : 'grad') : 'gone' } };
    s.phase = 'ending';
    return s.ended;
  }

  return { SAVE_V, migrate, P, R, EV, ARCH, GOAL_MATCH, POOL, TRAITS, EVENTS,
    newGame, beginTurn, pickOption, pickFree, canFreeReply, freeContext, endingContext, flavorContext, applyFlavor, applyPeerLines, worldContext, eventContext, needsRuling, boldContext, dumpContext, introContext, applyIntro, addGenerated, dumpRefuseChance, commit, gate, chooseGoal, blindReview, finish,
    stageOf, cells, mood, nickname, blocked, thesisCap, exploreCost, aiRate, canSlack, landed, chipsCap,
    normalPeers, peerBySlot, fill, cond, canHole, holeContext, holePost, dmPick, dmContext, wildCount, outlook, collegeOf, gearText, restContext, wildReady, leaveChance, sickChance, healRate, slackRate, thesisRate, chipsRate, has };
});
