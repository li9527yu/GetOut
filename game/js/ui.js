/* 逃出绝命课题组 · 界面。规则全部在 engine.js，这里只负责显示和收集选择。 */
(function () {
  'use strict';
  const Eng = window.Engine, C = window.CONTENT, LLM = window.LLM, Art = window.Art, app = document.getElementById('app');
  const KEY = 'escape-lab-v1';
  let S = null, META = { endings: {}, mentors: {}, titles: [], cards: {}, last: null, recent: [], runs: 0, pts: 0, streak: 0, grudge: null };
  let V = { name: 'title' };          // 当前画面
  let A = null;                       // 本回合的精力分配
  let introReady = null;              // 开局的导师主页还在生成时，这里是那个请求

  // ---------- 存档 ----------
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) return;
      const m = d.META && typeof d.META === 'object' ? d.META : {}, obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
      META = { endings: obj(m.endings), mentors: obj(m.mentors), titles: Array.isArray(m.titles) ? m.titles : [], cards: obj(m.cards), last: m.last || null, recent: Array.isArray(m.recent) ? m.recent : [], runs: +m.runs || 0,
        pts: Math.max(0, Math.min(999, Math.floor(+m.pts || 0))), streak: Math.max(0, Math.floor(+m.streak || 0)), grudge: typeof m.grudge === 'string' && C.mentors[m.grudge] ? m.grudge : null };
      // 这一局的进度交给引擎认: 老版本的补齐字段，认不出来的另存一份（万一还想找回来），然后当作没有进行中的局
      S = d.S ? Eng.migrate(d.S) : null;
      if (d.S && !S) { try { localStorage.setItem(KEY + '-bad', JSON.stringify(d.S)); } catch (e) { /* 存不下就算了 */ } }
    } catch (e) { /* 读不到存档就从头开始 */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ S, META })); } catch (e) { /* 存不了不影响玩 */ } }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const face = (pic, cls) => '<div class="av pic' + (cls ? ' ' + cls : '') + '">' + pic + '</div>';
  // 头像只画一次，存进页面角落的一张图集，聊天里每个头像只是对它的一次引用。原来每条消息都带一整幅头像，页面大部分体积是它
  const SPR = {}; let sprHolder = null, sprAll = '';
  function sprite(key, make) {
    if (!(key in SPR)) {
      SPR[key] = null;
      if (typeof document.createElement === 'function' && document.body) {
        const full = make(), id = 'fc' + Object.keys(SPR).length;
        sprAll += '<symbol id="' + id + '" viewBox="36 8 136 136">' + full.slice(full.indexOf('>') + 1, full.lastIndexOf('</svg>')) + '</symbol>';
        if (!sprHolder) { sprHolder = document.createElement('div'); sprHolder.setAttribute('aria-hidden', 'true'); sprHolder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(sprHolder); }
        sprHolder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><defs>' + sprAll + '</defs></svg>';
        SPR[key] = id;
      }
    }
    return SPR[key] ? '<svg class="art face" viewBox="0 0 136 136" aria-hidden="true"><use href="#' + SPR[key] + '"/></svg>' : make();
  }
  const fMentor = (t) => sprite('m' + t, () => Art.mentors[t](true)), fMe = () => sprite('me', () => Art.me(true)), fUnknown = () => sprite('unknown', () => Art.unknown(true));
  const fPeer = (p) => { const k = /师姐$/.test(p.name) ? '师姐' : p.slot; return sprite('p' + k, () => Art.peers[k](true)); };
  const peerArt = (p, crop) => (/师姐$/.test(p.name) ? Art.peers['师姐'] : Art.peers[p.slot])(crop);
  const pips = (n) => '<span class="pips">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';
  const GOAL_CELL = { 就业: '实习', 读博: '发表', 考公: '备考' };
  const ATTRS = [['push', 'push 度'], ['res', '资源'], ['fangren', '放人'], ['renpin', '人品'], ['level', '学术水平']];

  // 时间一律按学期说: 研一上 · 第 2 周。一学期 4 周，一共 6 个学期
  const semName = (t) => (t >= 24 ? '研四' : (['研一', '研二', '研三'][Math.floor(t / 8)] || '研三') + (t % 8 < 4 ? '上' : '下'));
  const wkName = (t) => (t >= 24 ? '研四 · 延期第 ' + (t - 23) + ' 周' : semName(t) + ' · 第 ' + ((t % 4) + 1) + ' 周');
  function termLabel() { return S.delayed ? wkName(Math.max(24, S.t)) : wkName(S.t) + '（共 4 周）'; }
  function sysTop(crumb) {
    return '<div class="sys-top">研究生教育管理信息系统<small>Graduate Management Information System · 建议使用 IE 8 浏览</small></div>'
      + '<div class="crumb"><span>当前位置：' + crumb + '</span><button data-act="home">返回首页</button></div>';
  }

  // ---------- 标题 ----------
  // 封面：凌晨 2:47 的锁屏，导师发来「在吗」。下面一条标题党，每次打开换一句
  const HOOKS = [['震惊', '这个课题组进去四个人，三年后只出来一个'], ['99% 的人回错了', '导师凌晨 2:47 发来「在吗」，你敢不回吗'], ['读研三年', '他只学会了一件事：秒回'], ['不转不是研究生', '你能活着拿到学位证吗'],
    ['导师不想让你知道', '每周只有四点精力，他已经替你花掉了三点'], ['警惕', '你身边那个说「收到」最快的同门，可能已经不是他了']];
  const hook = HOOKS[Math.floor(Math.random() * HOOKS.length)];
  const NOTES3 = [['妈妈', '导师对你好不好？', '2 小时前'], ['研究生院', '【通知】您的学位论文查重结果已出', '昨天'], ['师兄', '（撤回了一条消息）', '23:58'], ['期刊编辑部', 'Decision on your manuscript', '昨天']];
  const note3 = NOTES3[Math.floor(Math.random() * NOTES3.length)];
  function vTitle() {
    const can = S && !S.ended;                              // 没读完的局都能接着读，包括刚看完录取通知书的
    const nt = (cls, who, text, when, wx) => '<div class="nt ' + cls + '"><i class="ic' + (wx ? ' wx' : '') + '"></i><div><b>' + who + '</b><p>' + text + '</p></div><time>' + when + '</time></div>';
    return '<div class="cover"><div class="cover-in"><div class="lock"><b>02:47</b><span>周六凌晨 · 读研的第 ' + (META.runs + 1) + ' 次</span></div>'
      + '<div class="notes">' + nt('n1', '导师', '在吗', '现在', 1) + nt('n2', '导师', '明早组会你第一个讲。PPT 我还没看。', '现在', 1) + nt('n3', note3[0], note3[1], note3[2], note3[0] !== '研究生院' && note3[0] !== '期刊编辑部') + '</div>'
      + '<div class="hook"><em>' + hook[0] + '</em><span>' + hook[1] + '</span></div>'
      + '<h1>逃出<br>绝命课题组</h1>'
      + '<ul class="facts"><li><b>' + Eng.P.turns + '</b>周</li><li><b>' + Object.keys(C.mentors).length + '</b>种导师</li><li><b>' + C.endingOrder.length + '</b>种结局</li><li><b>1/4</b>的人上岸</li></ul>'
      + '<div class="pool">' + Object.keys(C.mentors).map((t) => '<span class="' + (META.mentors[t] ? '' : 'un') + '">' + fMentor(t) + '</span>').join('') + '</div>'
      + (can ? '<button class="btn" data-act="resume">接着读（' + esc(termLabelSafe()) + '）</button>' : '')
      + (S && S.ended ? '<button class="btn ghost" data-act="resume">回到上一局的结局：' + esc(S.ended.name) + '</button>' : '')
      + '<button class="btn' + (can ? ' ghost' : '') + '" data-act="new">' + (can ? '重新抽一个导师' : '回他：「在的老师」<small>' + (META.runs ? '再抽一次导师' : '开始读研') + (META.runs === 0 ? ' · 第一次是教学局' : pity() ? ' · 保底：这一局可免费换好导师' : ' · 重生点 ' + (META.pts || 0)) + '</small>') + '</button>'
      + '<button class="btn ghost" data-act="book">图鉴 ' + Object.keys(META.endings).length + '/' + C.endingOrder.length + '</button>'
      + '</div></div>';
  }
  // 封面要一屏放完，不出滚动条: 差得不多就整体缩小一点；要缩到八五折以下时，先收起第三条通知，再收起导师头像
  function fitCover() {
    const c = app.querySelector && app.querySelector('.cover'), inn = c && c.firstElementChild;
    if (!inn || typeof getComputedStyle !== 'function') return;
    inn.style.zoom = ''; c.classList.remove('fit1', 'fit2');
    const cs = getComputedStyle(c), avail = () => c.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = () => avail() / inn.offsetHeight;             // 要缩到多少才放得下
    if (k() < 0.85) c.classList.add('fit1');                // 缩得太小字就看不清了，这时才开始收东西
    if (k() < 0.85) c.classList.add('fit2');
    if (k() < 1) inn.style.zoom = Math.max(0.6, k() - 0.005).toFixed(3);
  }
  function termLabelSafe() { try { return termLabel(); } catch (e) { return ''; } }

  // ---------- 报到: 重生点、重新随机、加强 ----------
  // 第一次读研是教学局（天龙人 + 好导师）。之后每局开局前都在这一页: 看随到了什么，不满意可以重新随机，也可以拿重生点加强自己和导师
  const RB = C.rebirth;
  const pity = () => (META.streak || 0) >= RB.pity;
  const PRICE = { attr: 2, mentor: 2, swap: 1, roll: 1 }, FREE_ROLLS = 3;
  const ATTR4 = [['nao', '脑子'], ['gan', '肝'], ['xintai', '抗压'], ['renqing', '情商']];
  const MBOOST = { fangren: ['更肯放人', '导师的「放人」+1：请假、实习、签字都好说一点'], renpin: ['人品好一点', '导师的「人品」+1：说话更算数，少翻脸'] };
  function newDraft() {
    const tut = META.runs === 0;
    return { rollC: FREE_ROLLS, rollM: FREE_ROLLS, perks: {}, mode: null, bo: {}, char: null, mentor: null, stash: null, tut, done: false,
      tl: tut ? 'B' + (1 + Math.floor(Math.random() * 3)) : null,
      nat: !tut && Math.random() < 0.04 ? 'B' + (1 + Math.floor(Math.random() * 6)) : null,      // 很小的概率天生就是天龙人（包括假的）
      legacy: META.runs >= 2 && Math.random() < 0.4 };
  }
  function draftCost(d) {
    if (!d || d.mode === 'hard' || d.tut) return 0;
    return Object.keys(d.perks).reduce((n, k) => n + (d.perks[k] && RB.perks[k] ? RB.perks[k].cost : 0), 0)
      + PRICE.attr * ATTR4.reduce((n, a) => n + (d.bo[a[0]] || 0), 0) + PRICE.mentor * ((d.bo.fangren ? 1 : 0) + (d.bo.renpin ? 1 : 0))
      + (d.mode === 'tl' ? RB.tl.cost : d.mode === 'good' && !pity() ? RB.good.cost : 0);
  }
  let introTimer = 0, introFor = null;
  function askIntro() {
    if (!(LLM && LLM.enabled()) || introFor === S) return;
    const run = S; introFor = S;                                             // 导师主页和同门小传在后台现写
    introReady = LLM.ask('intro', Eng.introContext(S)).then((j) => { if (run === S && j && Eng.applyIntro(S, j)) save(); });
  }
  /** 按报到页上现在的选择，把这一局重新生成一遍。随出来的角色和导师原样留住，只有点了「重新随机」的那一半会变。 */
  function build(d) {
    const hard = d.mode === 'hard', tl = d.tut ? d.tl : d.mode === 'tl' ? d.tl : !d.mode ? d.nat : null;
    const kind = d.tut ? '新手教学局：这一次你是天龙人，导师也好说话。先过一遍，下一局开始才是真的读研。' : d.mode === 'good' ? (pity() ? '保底：连着几局没上岸，这一局必是好导师。' : '这一局必是好导师。') : '';
    const met = Object.keys(META.mentors).reduce((o, k) => { o[k] = true; return o; }, {});
    S = Eng.newGame({ truths: Object.keys(META.mentors).reduce((o, k) => { o[k] = META.mentors[k].truths; return o; }, {}), recent: [].concat.apply([], META.recent || []),
      met, grudge: META.grudge || null, legacy: d.legacy && !hard,
      opts: { tl, good: d.tut || d.mode === 'good', hard, tut: d.tut, perks: hard ? {} : d.perks, boost: hard ? {} : d.bo, pin: { char: d.char, mentor: d.mentor }, kind } });
    d.char = S.pinOut.char; d.mentor = S.pinOut.mentor; delete S.pinOut;
    S.lastRun = META.last; S.startKind = kind; S.draft = d; save();
    introReady = null; introFor = null;
    if (typeof clearTimeout === 'function') clearTimeout(introTimer);
    const run = S;                                                          // 停手两秒多再去写导师主页，免得每随一次都白写一份
    if (LLM && LLM.enabled() && typeof setTimeout === 'function') introTimer = setTimeout(() => { if (run === S && V.name === 'admit') askIntro(); }, 2500);
  }
  const rbRow = (act, key, on, name, desc, price, dis) => '<button class="rb' + (on ? ' on' : '') + '"' + (dis && !on ? ' disabled' : '') + ' data-act="' + act + '" data-k="' + key + '"><i></i><span><b>' + esc(name) + '</b><small>' + esc(desc) + '</small></span><em>' + price + '</em></button>';
  function ptBar(d) {
    const pts = META.pts || 0, cost = draftCost(d);
    return '<div class="ptbar"><b>重生点 ' + pts + '</b><span>' + (cost ? '这次用 ' + cost + '，剩 ' + (pts - cost) : d && d.tut ? '读完这一局就有了' : '这次还没用') + '</span>'
      + '<small>每读完一局都给 2 点，不管结局好坏。攒下来可以加强下一局。</small></div>';
  }

  // ---------- 开局 ----------
  function startNote() {
    const tl = S.tl ? '这一局你是天龙人（' + RB.tls[S.tl].name + '）。' : '';
    const text = S.tut ? '这一次你是天龙人（' + RB.tls[S.tl].name + '），导师也好说话。先过一遍，下一局开始才是真的读研。'
      : tl + (S.startKind || '') + (S.hard ? '什么都没带，读完这一局重生点翻倍。' : '');
    return { text, title: S.tut ? '新手教学局' : S.hard ? '受苦模式' : S.tl ? '天龙人开局' : '好导师开局' };
  }
  function vAdmit() {
    const a = S.baseAttrs, d = S.draft && !S.draft.done ? S.draft : null, hard = S.hard, edit = !!d && !d.tut && !hard;
    const pts = META.pts || 0, left = pts - draftCost(d), base = C.mentors[S.mentor.type], m = S.mentor;
    const nBo = d ? ATTR4.reduce((n, x) => n + (d.bo[x[0]] || 0), 0) : 0;
    const rollBtn = (k, n, what) => '<button class="mini" data-act="dRoll" data-k="' + k + '"' + (n <= 0 && left < PRICE.roll ? ' disabled' : '') + '>重新随机' + what + '<small>' + (n > 0 ? '免费还剩 ' + n + ' 次' : PRICE.roll + ' 点一次') + '</small></button>';
    const attrRow = (x) => { const k = x[0], b = d ? d.bo[k] || 0 : 0;
      return '<tr><th>' + x[1] + '</th><td>' + pips(a[k]) + (edit ? (b ? '<button class="mini on" data-act="dAttr" data-k="' + k + '" data-d="-1">已 +' + b + ' · 撤销</button>' : '')
        + (a[k] < 5 && nBo < 2 ? '<button class="mini" data-act="dAttr" data-k="' + k + '" data-d="1"' + (left < PRICE.attr ? ' disabled' : '') + '>+1<small>' + PRICE.attr + ' 点</small></button>' : '') : '') + '</td></tr>'; };
    let h = '<div class="scroll"><div class="sys">' + sysTop('首页 &gt; 录取查询 &gt; 新生报到') + ptBar(d)
      + '<div class="panel"><h2>硕士研究生录取通知书</h2><div class="body">'
      + '<p style="margin:0 0 10px;font-family:var(--song)">萝卜 同学：<br>　　经审核，你已被我校<b>' + esc(Eng.collegeOf(S).name) + '</b>录取为硕士研究生，研究方向：' + esc(S.topic) + '。请按期报到。</p>'
      + '<table class="form">' + ATTR4.map(attrRow).join('')
      + '<tr><th>个人情况</th><td>' + S.traits.map((t, i) => '<span class="tag">' + esc(t) + '<small>' + esc(C.traitDesc[t] || '') + '</small>' + (edit ? '<button class="mini in" data-act="dSwap" data-i="' + i + '"' + (pts < PRICE.swap || left < PRICE.swap ? ' disabled' : '') + '>换<small>' + PRICE.swap + ' 点</small></button>' : '') + '</span>').join('') + '</td></tr>'
      + (S.tl ? '<tr><th>备注</th><td><b style="color:var(--stamp)">' + esc(RB.tls[S.tl].note.replace('{姓}', '萝')) + '</b></td></tr>' : '') + '</table>'
      + (edit && nBo >= 2 ? '<p class="hint" style="margin:8px 0 0">属性每局最多加 2 次。</p>' : '')
      + (d ? rollBtn('c', d.rollC, '角色') : '') + '</div></div>'
      + '<p class="hint">脑子决定效率，肝决定每周有几点精力，抗压决定扛得住多久，情商决定求人和谈条件。</p>';
    // 导师: 只看得到名字和主页上那两句话。花一点可以提前打听
    h += '<div class="panel"><h2>分配的导师：' + esc(m.surname + m.given) + (S.flags.knowType ? '（' + esc(m.type) + '）' : '') + '</h2><div class="body">'
      + '<table class="form"><tr><th>招生寄语</th><td>' + esc(base.motto) + '</td></tr><tr><th>学生评价</th><td>' + esc(base.review) + '</td></tr></table>'
      + (edit ? '<div class="rbs" style="margin-top:10px">' + rbRow('dPerk', 'know', !!d.perks.know, RB.perks.know.name, RB.perks.know.desc, RB.perks.know.cost + ' 点', left < RB.perks.know.cost)
        + rbRow('dPerk', 'favor', !!d.perks.favor, RB.perks.favor.name, RB.perks.favor.desc, RB.perks.favor.cost + ' 点', left < RB.perks.favor.cost)
        + Object.keys(MBOOST).map((k) => rbRow('dMb', k, !!d.bo[k], MBOOST[k][0], MBOOST[k][1], PRICE.mentor + ' 点', left < PRICE.mentor)).join('') + '</div>' : '')
      + (d ? rollBtn('m', d.rollM, '导师') : '') + '</div></div>';
    if (edit || (d && !d.tut && hard)) {
      if (edit) h += '<div class="panel"><h2>再带点什么</h2><div class="body"><div class="rbs">' + ['senior', 'shield', 'paper'].map((k) => rbRow('dPerk', k, !!d.perks[k], RB.perks[k].name, RB.perks[k].desc, RB.perks[k].cost + ' 点', left < RB.perks[k].cost)).join('') + '</div></div></div>';
      h += '<div class="panel"><h2>这一局怎么读</h2><div class="body">'
        + (pity() ? '<p style="margin:0 0 10px;font-size:13px"><b style="color:var(--stamp)">你已经连着 ' + META.streak + ' 局没上岸了。这一局可以免费换一个好导师。</b></p>' : '')
        + '<div class="rbs">' + rbRow('dMode', 'good', d.mode === 'good', RB.good.name, RB.good.desc, pity() ? '保底 免费' : RB.good.cost + ' 点', !pity() && left < RB.good.cost - (d.mode === 'tl' ? RB.tl.cost : 0))
        + rbRow('dMode', 'tl', d.mode === 'tl', RB.tl.name, RB.tl.desc, RB.tl.cost + ' 点', left < RB.tl.cost - (d.mode === 'good' && !pity() ? RB.good.cost : 0))
        + rbRow('dMode', 'hard', hard, RB.hard.name, RB.hard.desc, '点数 ×2', false) + '</div></div></div>';
    }
    // 这一局有什么特别的，弹出来说一次；换了开局方式再弹
    const note = startNote();
    if (d && d.noteSeen !== note.text) { d.noteSeen = note.text; if (note.text) V.sheet = 'note'; }
    return h + '<button class="btn" data-act="toMentor">查看导师主页</button>' + (d ? '<button class="btn ghost" data-act="home">回首页</button>' : '') + '</div></div>' + vSheet();
  }
  function vMentor() {
    const m = S.mentor, base = C.mentors[m.type], it = S.intro || {};
    const open = !!(S.draft && !S.draft.done), cost = open ? draftCost(S.draft) : 0;
    const col = Eng.collegeOf(S), own = [S.topic].concat(col.topics.filter((x) => x !== S.topic).slice(0, 1)).concat(base.dirs.split('、')[0]).join('、');
    const prof = { title: base.title, stipend: base.stipend, dirs: it.dirs || own, motto: it.motto || base.motto, review: it.review || base.review };
    return '<div class="scroll"><div class="sys">' + sysTop('首页 &gt; 师资队伍 &gt; 导师信息')
      + '<div class="panel"><h2>' + esc(m.surname + m.given) + '</h2>' + (S.flags.knowType ? '<div class="portrait">' + Art.mentors[m.type]() + '<span class="lbl">' + esc(m.type) + '</span></div>' : '<div class="portrait sil">' + Art.unknown() + '<span class="lbl">' + esc(m.surname + m.given) + '</span></div>') + '<div class="body"><table class="form">'
      + '<tr><th>所在学院</th><td>' + esc(col.name) + '</td></tr>'
      + '<tr><th>职称</th><td>' + esc(prof.title) + '</td></tr>'
      + '<tr><th>研究方向</th><td>' + esc(prof.dirs) + '</td></tr>'
      + '<tr><th>招生寄语</th><td>' + esc(prof.motto) + '</td></tr>'
      + '<tr><th>学生评价</th><td>' + esc(prof.review) + '</td></tr>'
      + '<tr><th>补助</th><td>' + esc(prof.stipend) + '</td></tr>'
      + '<tr><th>其他</th><td class="pending" style="animation:none">进组后才知道</td></tr></table></div></div>'
      + (S.flags.knowType ? '<p class="hint">你提前打听过了：他是「' + esc(m.type) + '」。' + esc(base.review || '') + '</p>' : '')
      + '<p class="hint"' + (S.flags.knowType ? ' hidden' : '') + '>照片还没上传。他到底是什么样的导师，要靠你自己一点点试出来，毕业那天才看得清。试出来的会记在「导师档案」里。</p>'
      + '<button class="btn" data-act="enter">' + (cost ? '进组（用掉 ' + cost + ' 点重生点）' : '进组') + '</button>'
      + (open ? '<button class="btn ghost" data-act="back">返回报到页</button>' : '') + '</div></div>';
  }

  // ---------- 回合 ----------
  function bar(label, v, max, cls, mark, cps, k) {
    const pct = Math.max(0, Math.min(100, (v / max) * 100));
    return '<div class="bar" data-k="' + (k || '') + '" data-v="' + Math.round(v) + '" data-p="' + pct.toFixed(1) + '"><label>' + label + '</label><div class="track"><div class="fill ' + (cls || '') + '" style="width:' + pct + '%"></div>'
      + (cps || []).map((c) => '<div class="cp" style="left:' + c + '%"></div>').join('')
      + (mark != null ? '<div class="mark" style="left:' + mark + '%"></div>' : '') + '</div><span>' + Math.round(v) + '</span></div>';
  }
  function vStatus() {
    const st = Math.min(2, Eng.stageOf(S)), P = Eng.P;
    return '<div class="status"><div class="row"><button class="back" data-act="home" aria-label="返回首页">‹</button><div class="term">' + esc(termLabel()).replace(/（[^（）]*）$/, (m) => '<i>' + m + '</i>') + '</div>'
      + (S.acadWarn ? '<span class="acad">学业预警</span>' : '') + (Eng.canHole(S) ? '<button class="file hole" data-act="hole">树洞</button>' : '') + '<button class="file" data-act="file">档案</button></div><div class="bars">'
      + bar('SAN', S.san, S.sanMax, 'san' + (S.san < 40 ? ' low' : ''), null, null, 'san')
      + bar('导师好感', S.favor, 100, '', null, null, 'favor')
      + bar('组内贡献', S.contrib, 100, '', P.contribLine[st], null, 'contrib')
      + bar('论文', S.thesis, 100, '', P.thesisLine[st] === 100 ? null : P.thesisLine[st], P.checkpoints.slice(S.cleared), 'thesis')
      + (S.goal ? bar(GOAL_CELL[S.goal], S.chips, 100, '', null, null, 'chips') : '') + '</div>' + vLook() + '</div>';
  }
  // 状态栏最下面一行: 离下一关还有几周，论文、贡献、签字各自稳不稳
  function vLook() {
    const o = Eng.outlook(S), cls = { 稳: 'ok', 悬: 'mid', 危: 'bad' }, pp = S.paper || { state: 'none' };
    const it = (k, label) => label + ' <b class="' + cls[o[k]] + '">' + o[k] + '</b>';
    if (Eng.freeOn(S)) return '<div class="look"><span>距' + o.gate + ' ' + o.left + ' 周</span><span>毕业要求 <b class="ok">已全满</b></span><span>剩下的时间是你自己的</span></div>';
    return '<div class="look"><span>距' + o.gate + ' ' + o.left + ' 周</span>' + it('论文', '论文') + it('贡献', '贡献') + it('签字', '签字')
      + (!Eng.spiteOff(S) && (S.spiteStage || S.spiteOmen) ? '<span>导师态度 <b class="' + cls['危'] + '">' + (S.spiteStage ? Eng.spiteName(S) : '要出事') + '</b></span>' : '')
      + (Eng.stageOf(S) >= 1 ? '<span>小论文' + C.paper.states[pp.state] + ' <b class="' + cls[o.小论文] + '">' + o.小论文 + '</b></span>' : '') + '</div>';
  }
  // 微信里才有的几种消息: 语音条、撤回、拍一拍
  function bubble(text) {
    const v = /^(@\S+\s+)?〔语音\s*(\d+)\s*[″"秒]〕\s*(?:转文字[：:])?\s*([\s\S]*)$/.exec(text);
    if (!v) return '<div class="bub">' + esc(text) + '</div>';
    const sec = Math.max(2, Math.min(60, +v[2]));
    return '<div class="bub voice" style="width:' + (70 + sec * 2) + 'px"><i></i><i></i><i></i><span>' + sec + '″</span></div>' + (v[3] ? '<div class="trans"><small>转文字</small>' + esc((v[1] || '') + v[3]) + '</div>' : '');
  }
  function whoInfo(w) {
    if (w === '导师') return S.flags.knowType ? { name: S.mentor.call, av: face(fMentor(S.mentor.type)), cls: 'mentor' } : { name: S.mentor.call, av: face(fUnknown(), 'sil'), cls: 'mentor' };
    const p = Eng.peerBySlot(S, w);
    // 出了事的同门，名字后面标出来，不然只看头像看不出他已经不是原来那个人了
    if (p) return { name: p.name + (p.state === '附体' ? '（' + S.mentor.call + '组）' : p.state === '发疯' ? '（已发疯）' : p.state === '退学' ? '（已退学）' : ''), av: face(fPeer(p)), cls: p.warned >= 2 || p.state !== '正常' ? 'gone' : '' };
    return { name: w, av: '<div class="av">' + esc(w.charAt(0)) + '</div>', cls: 'sysmsg' };
  }
  // 标签里的数值变化上色: 涨的绿，掉的红
  const fx = (tag) => esc(tag).split(/(?=[　，])/).map((x) => (/[+＋]\s?\d/.test(x) ? '<span class="up">' + x + '</span>' : /[−-]\s?\d/.test(x) ? '<span class="down">' + x + '</span>' : x)).join('');
  const BOND_CLS = { rival: 'b-rival', lead: 'b-lead', pal: 'b-pal' };
  /** 旁白分几种，各有各的样子: 眼前要你拿主意的事、课题组之外的事、规则上的小变化、要留意的坏消息、到手的好处、和谁是什么关系。 */
  function narr(m) {
    const k = m.kind || (!m.big && m.tag && /精力|派活/.test(m.tag) && m.text.length <= 22 ? 'rule' : '');
    const sub = m.tag ? '<em>' + fx(m.tag) + '</em>' : '';
    if (k === 'scene') return '<div class="scene"><small>眼前的事</small>' + esc(m.text) + '</div>';
    if (k === 'life') return '<div class="life"><small>课题组之外</small>' + esc(m.text) + sub + '</div>';
    // 一行放得下才做成系统提示条，长的还是按普通旁白排
    if (k === 'rule' && (m.text + (m.tag || '')).length <= 24) return '<div class="banner sysl"><span>' + esc(m.text.replace(/[。.]$/, '')) + (m.tag ? '<i>' + esc(m.tag) + '</i>' : '') + '</span></div>';
    if (k === 'warn') return '<div class="alert"><small>留意</small>' + esc(m.text) + sub + '</div>';
    if (k === 'gain') return '<div class="gain">' + esc(m.text) + sub + '</div>';
    if (k === 'bond') { const p = Eng.peerBySlot(S, m.slot), bits = String(m.tag || '').split('：');
      return '<div class="bondc ' + (BOND_CLS[m.bond] || '') + '">' + (p ? face(fPeer(p)) : '') + '<div><b>' + esc(p ? p.name : '') + '</b><i class="chip">' + esc(bits[0]) + '</i><p>' + esc(m.text) + '</p>' + (bits[1] ? '<small>' + esc(bits.slice(1).join('：')) + '</small>' : '') + '</div></div>'; }
    return '<div class="nar' + (m.big ? ' big' : '') + '">' + esc(m.text) + (m.tag ? '<span class="t">' + fx(m.tag) + '</span>' : '') + '</div>';
  }
  function line(m) {
    const bondBits = m.kind === 'bond' && m.who !== '旁白' ? String(m.tag || '').split('：') : null;
    const tag = bondBits ? '<div class="t ' + (BOND_CLS[m.bond] || '') + '"><i class="chip">' + esc(bondBits[0]) + '</i>' + esc(bondBits.slice(1).join('：')) + '</div>' : m.tag ? '<div class="t">' + fx(m.tag) + '</div>' : '';
    if (m.who === '旁白') return narr(m);
    if (m.who === '明信片') return '<div class="pcard"><div class="pc">' + Art.cards[m.act]() + '<p>' + esc(m.text) + '</p></div><small>' + esc(m.tag) + '</small></div>';
    if (m.who === '里程碑') return '<div class="mile"><small>' + esc(m.tag) + '</small>' + esc(m.text) + '</div>';
    if (m.who === '档案' || m.who === '真相') return '<div class="note"><small>' + (m.who === '档案' ? '导师档案 · 新批注' : '导师真相') + '</small>' + esc(m.text) + '</div>';
    // 自己打字的回复才是发出去的消息；点的预设选项只是一个选择，不装成聊天气泡
    if (m.who === '我' && !(m.free && m.say)) return '<div class="msg me pickrow">' + face(fMe()) + '<div class="pick"><small>' + (m.free ? '你写下的' : '你的选择') + '</small><b>' + esc(m.text) + '</b>' + tag + '</div></div>';
    if (m.who === '我') return '<div class="msg me">' + face(fMe()) + '<div><div class="bub">' + esc(m.text) + '</div>' + tag + '</div></div>';
    const w = whoInfo(m.who);
    if (m.typing || (V.waitFlavor && (m.dispatch || m.chatter || m.wait || Eng.peerBySlot(S, m.who)))) return '<div class="msg ' + w.cls + '">' + w.av + '<div><div class="who">' + esc(w.name) + '</div><div class="bub typing"><span class="busy-dots"><i></i><i></i><i></i></span></div>' + tag + '</div></div>';
    if (/^[（(]撤回了一条消息[）)]$/.test(m.text)) return '<div class="banner"><span>' + esc(w.name) + ' 撤回了一条消息</span></div>';
    if (/^〔拍一拍〕$/.test(m.text)) return '<div class="banner"><span>' + esc(w.name) + ' 拍了拍你</span></div>';
    return '<div class="msg ' + w.cls + (m.mood === '胡话' ? ' mad' : '') + '">' + w.av + '<div><div class="who">' + esc(w.name) + '</div>' + bubble(m.text) + tag + '</div></div>';
  }
  const warp = (text) => esc(text);
  // 这一周在聊天记录里的全部内容。结算完周数已经加了一，所以有结果时要减回去
  function chatHTML() {
    const c = S.cur;
    let chat = '<div class="wk"><span>' + wkName(c.result ? S.t - 1 : S.t) + '</span></div>' + c.banner.map((b) => '<div class="banner"><span>' + esc(b) + '</span></div>').join('');
    if (c.lostTurn) chat += line({ who: '旁白', text: c.lostWhy === 'sick' ? C.sick.lost : '这一周你都在重做上次没过的材料。别的什么也顾不上。', big: true });
    chat += c.msgs.map(line).join('');
    if (c.moments && c.moments.length) chat += '<div class="moments"><small>朋友圈 · 这学期</small>' + c.moments.map((m) => '<p><b>' + esc(whoInfo(m.who).name) + '</b>　' + esc(m.text) + '</p>').join('') + '</div>';
    const shown = c.eventShown || c.event;
    if (shown) chat += line({ who: shown.speaker, text: shown.text, big: true, kind: shown.speaker === '旁白' ? 'scene' : null, wait: !c.eventShown && Eng.eventRewritable(S) });
    if (c.eventDone) {
      chat += line({ who: '我', text: c.eventDone.text, tag: c.eventDone.tags.join('　'), free: !!c.eventDone.free, say: c.eventDone.say !== false });
      chat += c.eventDone.lines.map(line).join('');
    }
    if (c.result) {
      // 导师周末那几句在现写的时候，先显示「正在输入」
      chat += '<div class="resat"></div>' + c.result.lines.map((l) => line(V.waitSettle && l.who === '导师' ? { who: '导师', typing: true } : l)).join('') + (V.waitSettle && V.waitSettle.extra ? line({ who: '导师', typing: true }) : '');
      const d = c.result.delta, names = { favor: '导师好感', san: 'SAN', contrib: '组内贡献', thesis: '论文', chips: S.goal ? GOAL_CELL[S.goal] : '去向进度' };
      const parts = Object.keys(names).filter((k) => Math.abs(d[k]) >= 0.5).map((k) => '<span class="' + (d[k] > 0 ? 'up' : 'down') + '">' + names[k] + ' ' + (d[k] > 0 ? '+' : '−') + Math.abs(Math.round(d[k])) + '</span>');
      chat += '<div class="delta">' + (parts.join('') || '<span>这一周什么都没变</span>') + '</div>';
    }
    // 等对方回话: 你刚说的那句先出来，对方的气泡显示「正在输入」。聊天记录照常能翻
    const b = V.busy;
    if (b && b.inline && !(c.dm && !c.dm.closed)) {
      if (b.mine) chat += line({ who: '我', text: b.mine, free: !!b.free, say: b.say !== false });
      if (b.who) chat += line({ who: b.who, typing: true });
    }
    return chat;
  }
  // 同一个学期里，前几周的聊天记录留在上面，新的一周接在下面
  let hist = { ref: null, weeks: [] };
  const pastHTML = () => (hist.ref === S && hist.weeks.length ? '<div class="past">' + hist.weeks.map((w) => '<div class="pw">' + w + '</div>').join('') + '</div>' : '');
  function keepWeek() { if (hist.ref !== S) hist = { ref: S, weeks: [] }; hist.weeks.push(chatHTML()); if (hist.weeks.length > 3) hist.weeks.shift(); }
  let autoFlow = false;   // 结算完自动接了下一周: 画面要停在结算那几行上，不能直接滑到新的一周
  function vTurn() {
    const c = S.cur, chat = pastHTML() + chatHTML();
    let dock;
    // 群里的话还在生成的时候，先不亮出选项，免得上面在「正在输入」、下面已经让你选了
    if (V.waitFlavor) dock = '<div class="dockwait"><span class="busy-dots"><i></i><i></i><i></i></span>群里有人正在说话…</div>';
    else if (V.waitSettle) dock = '<div class="dockwait"><span class="busy-dots"><i></i><i></i><i></i></span>' + esc(S.mentor.call) + '正在输入…</div>';
    else if (V.busy && V.busy.inline) dock = waitDock();
    else if (c.event) {
      const free = LLM && LLM.enabled() && Eng.canFreeReply(S);
      dock = (S.san < 40 ? '<div class="lowsan">SAN 太低，你看字有点重影。休息或摆烂能恢复。</div>' : '') + c.event.options.map((o) => '<button class="opt' + (S.san < 40 ? ' warp' : '') + '" data-act="opt" data-i="' + o.i + '"' + (o.disabled ? ' disabled' : '') + '>' + warp(o.text) + '</button>').join('')
        + (free ? '<form class="free" data-form="free"><input name="t" maxlength="40" autocomplete="off" placeholder="' + (c.event.speaker === '旁白' ? '或者写下你想怎么做……' : '或者自己回一句……') + '"' + '><button' + '>发送</button></form>' : '');
    } else if (c.result) {
      const nx = c.result.next;
      dock = '<button class="go" data-act="next">' + (nx === 'gate' ? '去交材料' : nx === 'ending' ? '……' : nx === 'goal' ? '新学年' : S.t % 4 === 0 ? '下学期' : '下一周') + '</button>';
    } else if (c.lostTurn || c.ap <= 0) {
      dock = '<button class="go" data-act="confirm">' + (c.lostTurn ? '熬过这一周' : '这周没有精力了') + '</button>';
    } else dock = vAlloc();
    return vStatus() + '<div class="chat" id="chat">' + chat + '</div><div class="dock">' + dock + '</div>' + vSheet() + vDM();
  }

  const waitDock = () => '<div class="dockwait" role="status" aria-live="polite"><span class="busy-dots"><i></i><i></i><i></i></span><span id="busytext">' + esc(V.busy.lines[0]) + '</span></div>';
  // ---------- 私聊窗口 ----------
  function vDM() {
    const d = S.cur && S.cur.dm;
    if (!d || d.closed) return '';
    const p = Eng.peerBySlot(S, d.slot), name = p.name + (p.state === '附体' ? '（' + S.mentor.call + '组）' : p.state === '发疯' ? '（已发疯）' : '');
    const av = face(fPeer(p), p.state !== '正常' ? 'out' : '');
    let h = '<div class="dm" role="dialog" aria-modal="true"><div class="dm-top"><button class="back" data-act="home" aria-label="返回首页">‹</button>' + av + '<b>' + esc(name) + '</b><small>私聊</small></div><div class="dm-body" id="dmbody">';
    const typing = '<div class="msg' + (d.kind === 'mad' ? ' mad' : '') + '">' + av + '<div><div class="bub typing"><span class="busy-dots"><i></i><i></i><i></i></span></div></div></div>';
    const opening = V.waitFlavor && d.round === 0 && !d.done, bz = V.busy && V.busy.inline ? V.busy : null;
    (opening ? [] : d.log).forEach((m) => {
      if (m.who === '我') h += '<div class="msg me">' + face(fMe()) + '<div><div class="bub">' + esc(m.text) + '</div></div></div>';
      else if (m.who === '他') h += '<div class="msg' + (d.kind === 'mad' ? ' mad' : '') + '">' + av + '<div><div class="bub">' + esc(m.text) + '</div></div></div>';
      else if (m.who === '档案') h += '<div class="note"><small>导师档案 · 新批注</small>' + esc(m.text) + '</div>';
      else if (m.who === '真相') h += '<div class="note"><small>导师真相</small>' + esc(m.text) + '</div>';
      else h += '<div class="nar">' + esc(m.text) + '</div>';
    });
    if (opening) h += typing;
    if (bz) h += (bz.mine ? '<div class="msg me">' + face(fMe()) + '<div><div class="bub">' + esc(bz.mine) + '</div></div></div>' : '') + typing;
    if (d.done) h += '<div class="delta">' + (d.tags.length ? d.tags.map((t) => '<span>' + esc(t) + '</span>').join('') : '<span>什么都没变</span>') + '</div>';
    h += '</div><div class="dock">';
    if (d.done) h += '<button class="go" data-act="dmClose">回到群里</button>';
    else if (opening) h += '<div class="dockwait"><span class="busy-dots"><i></i><i></i><i></i></span>对方正在输入…</div>';
    else if (bz) h += waitDock();
    else {
      h += d.opts.map((o) => '<button class="opt" data-act="dm" data-k="' + o.k + '">' + esc(o.text) + (o.hint ? '<small>' + esc(o.hint) + '</small>' : '') + '</button>').join('');
      if (LLM && LLM.enabled()) h += '<form class="free" data-form="dm"><input name="t" maxlength="40" autocomplete="off" placeholder="或者自己回一句……"><button>发送</button></form>';
    }
    return h + '</div></div>';
  }
  // 出去的见闻让模型现写。知道去哪儿就在后台先问，确认时写好了就用，没写好用固定文本，不让玩家等
  let restCache = { ref: null, t: -1, got: {} };
  function restAsk() {
    if (!(LLM && LLM.enabled()) || !A || A.heal + A.slack <= 0) return;
    if (restCache.ref !== S || restCache.t !== S.t) restCache = { ref: S, t: S.t, got: {} };
    const act = A.restAct, cache = restCache;
    if (act in cache.got) return;
    cache.got[act] = null;
    LLM.ask('rest', Eng.restContext(S, act)).then((j) => { if (j && j.text) cache.got[act] = j.text; });
  }
  const restGot = () => (restCache.ref === S && restCache.t === S.t && restCache.got[A.restAct]) || null;
  function initAlloc() {
    const c = S.cur, cells = Eng.cells(S);
    A = { lab: Math.min(c.ap, c.demand), thesis: 0, chips: 0, heal: 0, help: 0, slack: 0, rewrite: 0, fun: 0, funPick: [] };
    A.thesis = c.ap - A.lab;
    // 毕业要求满了: 默认不干活也不写论文，精力全放到自由活动上，派的活打算推掉
    if (cells.indexOf('fun') >= 0) { A.lab = 0; A.thesis = 0; A.fun = c.ap; }
    const np = Eng.normalPeers(S), omen = np.find((p) => p.slot === S.omenSlot);
    A.helpTo = (omen || np[0] || {}).slot || null;
    A.cells = cells;
    A.restAct = c.rest ? c.rest.act : Object.keys(C.restActs)[0];
  }
  function vAlloc() {
    const c = S.cur;
    if (!A) initAlloc();
    const used = A.cells.reduce((n, k) => n + A[k], 0), free = c.ap - used;
    const lazyHeal = Math.round(Eng.healRate(S)), lazySlack = Math.round(Eng.slackRate(S));
    const labels = {
      lab: ['干活', A.lab + '/' + c.demand + (A.lab < c.demand ? ' 没干完' : A.lab > c.demand ? ' 超额' : '')],
      thesis: ['论文', Eng.blocked(S) ? '卡在' + ['选题', '方法', '写作'][S.cleared] : '每点 +' + Math.round(Eng.thesisRate(S))],
      chips: [GOAL_CELL[S.goal] || '去向', S.chips >= Eng.chipsCap(S) && S.chips < 100 ? (S.goal === '读博' ? '剩下看推荐信' : '先过笔试') : '每点 +' + Math.round(Eng.chipsRate(S))],
      help: ['帮同门', A.helpTo ? Eng.peerBySlot(S, A.helpTo).name : '没人可帮'],
      fun: ['自由活动', '想干什么都行'],
      heal: ['休息', '每点 SAN +' + lazyHeal], slack: ['摆烂', '每点 SAN +' + lazySlack], rewrite: ['降 AI 率', 'AI 率 ' + Math.round(Eng.aiRate(S)) + '%'],
    };
    let h = '<div class="aphead"><span>本周精力</span><span class="dots">';
    for (let i = 0; i < c.ap; i++) h += '<i class="' + (i < used ? 'on' : '') + '"></i>';
    h += '</span><span class="free">' + (free ? '还有 ' + free + ' 点没安排' : c.course ? '上课占掉 1 点' : '') + '</span></div><div class="cells">';
    A.cells.forEach((k) => {
      const dis = k === 'help' && !A.helpTo;
      h += '<div class="cell' + (A[k] ? ' has' : '') + '"><div class="nm">' + labels[k][0] + '</div><div class="sub">' + esc(labels[k][1]) + '</div><div class="pm">'
        + '<button data-act="dec" data-k="' + k + '" aria-label="' + labels[k][0] + '减一点"' + (A[k] ? '' : ' disabled') + '>−</button><b>' + A[k] + '</b>'
        + '<button data-act="inc" data-k="' + k + '" aria-label="' + labels[k][0] + '加一点"' + (free && !dis ? '' : ' disabled') + '>+</button></div></div>';
    });
    h += '</div>';
    if (A.help > 0) {
      h += '<div class="who-row"><span>帮谁：</span>' + Eng.normalPeers(S).map((p) => '<button data-act="helpTo" data-slot="' + p.slot + '" class="' + (p.slot === A.helpTo ? 'on' : '') + '">' + esc(p.name) + (p.slot === S.omenSlot ? ' !' : '') + '</button>').join('') + '</div>';
    }
    if (A.fun > 0) {
      const F = C.free.acts, room = A.fun - A.funPick.reduce((n, k) => n + (F[k].cost || 1), 0), cnt = {};
      A.funPick.forEach((k) => { cnt[k] = (cnt[k] || 0) + 1; });
      h += '<div class="funpick"><div class="fh">这周干点什么<small>' + (room > 0 ? '还能选 ' + room + ' 点，没选的随便安排' : '选满了，点已选的可以去掉') + '</small></div><div class="who-row">'
        + Eng.funActs(S).map((k) => { const a = F[k], n = cnt[k] || 0, mine = (S.fun || {})[k] || 0;
          return '<button data-act="funPick" data-k="' + k + '" class="' + (n ? 'on' : '') + '"' + (!n && (a.cost || 1) > room ? ' disabled' : '') + ' title="' + esc(a.desc) + '">' + esc(a.name) + (n > 1 ? ' ×' + n : '') + (a.goal && mine < a.goal ? '<small> ' + mine + '/' + a.goal + '</small>' : '') + '</button>'; }).join('')
        + '</div>' + (A.funPick.length ? '<div class="ainote">' + A.funPick.filter((k, i, a) => a.indexOf(k) === i).map((k) => esc(F[k].name) + '：' + esc(F[k].desc)).join('；') + '</div>' : '') + '</div>';
    }
    if (A.heal + A.slack > 0) {
      const act = A.restAct, dir = C.restActs[act].dir;
      h += '<div class="ainote">这周会去<b style="color:#c8641c">' + esc(act) + '</b>（' + Eng.wildCount(S, dir) + '）。去哪儿看这周碰上了什么。</div>';
    }
    if (S.ai.unlocked) h += '<div class="ainote">AI 已解锁' + (S.ai.banned ? '（导师禁止使用）' : '') + '。活干不完、论文落后或卡住的时候，会问你用不用。</div>';
    h += '<button class="go" data-act="confirm">' + (free ? '把剩下的 ' + free + ' 点用完再确认' : '就这样') + '</button>';
    return h;
  }

  // ---------- 弹层 ----------
  /** 弹层里的选择也留一个自己打字的口子: 写的话会被归到上面某一个选项上。 */
  const freePick = (hint) => (LLM && LLM.enabled() ? '<form class="free" data-form="pick"><input name="t" maxlength="40" autocomplete="off" placeholder="' + hint + '"><button>发送</button></form>' : '');
  function vSheet() {
    if (!V.sheet) return '';
    let h = '';
    if (V.sheet === 'hole') {
      const mine = (S.hole || []).slice().reverse(), can = Eng.canHole(S), seed = S.t;
      const others = [0, 1, 2].map((i) => Eng.gearText(S, C.hole.feed[(seed * 5 + i * 7) % C.hole.feed.length]));
      const post = (who, text, meta, extra) => '<div class="hpost"><div class="hw"><b>' + who + '</b><span>' + meta + '</span></div><p>' + esc(text) + '</p>' + (extra || '') + '</div>';
      h = '<h3>树洞</h3><p class="q">学校的匿名树洞。没人知道你是谁。' + (can && S.holeWhy ? '<b>' + esc(S.holeWhy) + '。</b>' : '') + '说得越具体越管用；指名道姓有可能被认出来。</p>'
        + (can ? '<form class="hform" data-form="hole"><textarea name="t" maxlength="100" rows="3" placeholder="想说什么就说吧……"></textarea><button>发出去</button></form>' : '<p class="hint" style="margin:0 0 10px">' + (S.cur && S.cur.holeDone ? '这周已经发过了。' : '现在没什么特别想说的。出了事、撑不住的时候，这里会再打开。') + '</p>')
        + mine.slice(0, 3).map((x, i) => post('匿名（你）', x.text, wkName(x.t) + ' · ' + x.likes + ' 赞', x.replies.map((r) => '<div class="hr">匿名同学：' + esc(r) + '</div>').join('') + (i === 0 && x.t === S.t ? '<div class="hr ok">' + (x.note ? esc(x.note) + '　' : '') + (x.san ? 'SAN +' + x.san : '没好受多少') + (x.leak ? '　<span class="fail">好像被认出来了</span>' : '') + '</div>' : ''))).join('')
        + others.map((t, i) => post('匿名', t, ((seed * 13 + i * 29) % 180 + 6) + ' 赞')).join('')
        + '<button class="btn ghost" style="width:100%;margin:12px 0 0" data-act="closeSheet">关上</button>';
    } else if (V.sheet === 'note') {
      const n = startNote();
      if (!n.text) { V.sheet = null; return ''; }
      h = '<h3>' + n.title + '</h3><p class="q" style="color:var(--ink);font-size:14px">' + esc(n.text) + '</p><button class="btn" style="width:100%;margin:4px 0 0" data-act="closeSheet">知道了</button>';
    } else if (V.sheet === 'dumpAsk') {
      const p = A && Eng.peerBySlot(S, A.dumpTo), K = C.dm.ask;
      if (!p) { V.sheet = null; return ''; }                 // 中途改了安排，开口的对象没了
      h = '<h3>怎么跟' + esc(p.name) + '开口？</h3><p class="q">你们的关系 ' + Math.round(p.rel) + (p.dumped ? '。你已经甩给过他 ' + p.dumped + ' 次' : '。这是你第一次找他') + (p.owed ? '。你还欠他 ' + p.owed + ' 次' : '') + '</p>'
        + Object.keys(K).map((k) => '<button class="opt" data-act="dumpAsk" data-m="' + k + '"><b>' + K[k].label + '</b>　' + esc(K[k].me) + '<small>' + K[k].hint + '</small></button>').join('')
        + (LLM && LLM.enabled() ? '<form class="free" data-form="dumpAsk"><input name="t" maxlength="40" autocomplete="off" placeholder="或者自己写怎么开口……"><button>发送</button></form>' : '');
    } else if (V.sheet === 'short') {
      const gap = S.cur.demand - A.lab;
      const dc = Eng.freeOn(S) ? Math.round(Eng.doneChance(S) * 100) : 0;
      h = '<h3>活没干完，怎么交代？</h3><p class="q">这周派了 ' + S.cur.demand + ' 点，你只打算干 ' + A.lab + ' 点。</p>'
        + (Eng.freeOn(S) ? '<button class="opt" data-act="short" data-m="done">说我都做完了<small>毕业要求已经全满。' + (dc >= 100 ? '他不会拦你' : '他认的可能大约 ' + dc + '%，不认的话好感 −2') + '；认了就不扣好感、不记仇</small></button>' : '')
        + (S.ai.unlocked && A.lab > 0 && !A.aiLab ? '<button class="opt" data-act="short" data-m="ai">让 AI 帮你赶<small>这周干的 ' + A.lab + ' 点顶 ' + (A.lab * 1.5) + ' 点用。可能被导师发现，也可能写错了你没发现，组会上被当场指出' + (S.ai.banned ? '。他明令禁止过，被抓很惨' : '') + '</small></button>' : '')
        + '<button class="opt" data-act="short" data-m="plain">直说<small>导师好感会掉，掉多少看他的脾气。活会分摊给同门</small></button>'
        + Eng.normalPeers(S).concat(S.peers.filter((p) => p.state === '附体')).map((p) => '<button class="opt" data-act="short" data-m="dump" data-slot="' + p.slot + '">甩给' + esc(p.name) + '<small>导师好感不掉。他的压力大涨，和你的关系变差' + (p.junior ? '。甩给后辈最容易' : '') + '</small></button>').join('')
        + '<button class="opt" data-act="short" data-m="lie">糊弄过去<small>说「差不多了」。被发现的话比直说惨得多</small></button>'
        + '<button class="opt" data-act="short" data-m="ask">找人帮忙<small>看情商和关系。成了他替你干 1 点' + (gap > 1 ? '，剩下的照样算没干完' : '') + '</small></button>' + freePick('或者自己说打算怎么办……');
    } else if (V.sheet === 'unblock') {
      const cp = ['选题', '方法', '写作'][S.cleared], need = Eng.exploreCost(S) - S.explore;
      h = '<h3>论文卡在' + cp + '了，怎么办？</h3><p class="q">过了这一关，论文才能接着往下写。选一次，之后会记住。</p>'
        + '<button class="opt" data-act="unblock" data-m="mentor">找导师<small>花 1 点。成不成看他的学术水平</small></button>'
        + '<button class="opt" data-act="unblock" data-m="peer">找师兄师姐<small>花 1 点。关系越好越可能帮上</small></button>'
        + '<button class="opt" data-act="unblock" data-m="explore">自己啃<small>一定能过，还要啃 ' + need + ' 点，可以分几周</small></button>'
        + (S.ai.unlocked ? '<button class="opt" data-act="unblock" data-m="ai">问 AI<small>花 1 点，一定能过。论文里会多一点 AI 的痕迹</small></button>' : '') + freePick('或者自己说打算怎么办……');
    } else if (V.sheet === 'aiThesis') {
      h = '<h3>论文进度落后了</h3><p class="q">照现在的速度，到关卡那周够不着线。这周写论文要不要让 AI 帮忙？</p>'
        + '<button class="opt" data-act="aiThesis" data-m="no">自己写<small>慢，但每个字都是你的</small></button>'
        + '<button class="opt" data-act="aiThesis" data-m="yes">让 AI 帮着写<small>这周的论文产出 × 1.5。论文里 AI 的痕迹会变多，答辩前要查；也可能埋下错误' + (S.ai.banned ? '。导师明令禁止过' : '') + '</small></button>' + freePick('或者自己说打算怎么办……');
    } else if (V.sheet === 'file') {
      const m = S.mentor, prof = C.mentors[m.type], k = S.known, P = Eng.P;
      const fold = (title, sum, body, open) => '<details class="fold"' + (open ? ' open' : '') + '><summary><span>' + title + '</span><small>' + sum + '</small></summary><div class="in">' + body + '</div></details>';
      const dim = (t) => '<span class="pending" style="animation:none">' + t + '</span>';
      // —— 我 ——
      const lk = Eng.outlook(S), gl = S.gateLog || [], pp = S.paper || { state: 'none' }, ML = C.milestones, mk = (ok) => (ok ? '<span class="pass">✓</span>' : '<span style="color:var(--mute)">○</span>');
      let me = '<table class="form"><tr><th>脑子</th><td>' + pips(S.nao) + '</td></tr><tr><th>肝</th><td>' + pips(S.gan) + '</td></tr><tr><th>抗压</th><td>' + pips(S.xintai) + '</td></tr><tr><th>情商</th><td>' + pips(S.renqing) + '</td></tr>'
        + '<tr><th>个人情况</th><td>' + S.traits.map((t) => '<span class="tag">' + esc(t) + '<small>' + esc(C.traitDesc[t] || '') + '</small></span>').join('') + '</td></tr>'
        + '<tr><th>心态</th><td>' + Eng.mood(S) + '<small style="color:var(--mute)">　' + esc(C.lines.moodFx[S.seen >= 75 ? 3 : S.seen >= 50 ? 2 : S.seen >= 25 ? 1 : 0]) + '</small></td></tr><tr><th>群昵称</th><td>' + '' + esc(Eng.nickname(S)) + '</td></tr>'
        + (S.acadWarn ? '<tr><th>学业预警</th><td><span class="fail">有。再有一关不过，直接清退</span></td></tr>' : '')
        + (S.leaves || S.frail ? '<tr><th>病假</th><td>这学年请过 ' + S.leaves + ' 次' + (S.frail ? '。导师觉得你「身体不太行」，组内贡献涨得慢' : '') + '</td></tr>' : '')
        + (S.ai.unlocked ? '<tr><th>AI</th><td>' + (S.ai.banned ? '导师明令禁止' : '能用') + '。论文里的 AI 率 ' + Math.round(Eng.aiRate(S)) + '%</td></tr>' : '')
        + (S.fraud ? '<tr><th>心里的事</th><td><span class="fail">改过 ' + S.fraud.n + ' 次数据</span>。每周多掉 ' + (P.fraudDrain * S.fraud.n) + ' 点 SAN，随时可能被翻出来</td></tr>' : '')
        + (S.evidence ? '<tr><th>留存的证据</th><td>' + S.evidence + ' 份</td></tr>' : '')
        + (S.tl ? '<tr><th>身份</th><td><b>天龙人</b>：' + esc(RB.tls[S.tl].name) + (S.tl === 'B6' && !S.fake ? '（已穿帮）' : '') + '</td></tr>' : '') + (S.hard ? '<tr><th>身份</th><td>受苦模式</td></tr>' : '') + (S.revenge ? '<tr><th>旧账</th><td>上一次就栽在这种导师手里。顶回去更容易成</td></tr>' : '')
        + (S.rich ? '<tr><th>那个有钱人</th><td>' + (S.rich.ctrl >= 2 ? '他什么都要你报备' : S.rich.ctrl ? '他开始问你每天去了哪' : '出手很大方') + '</td></tr>' : '')
        + (!Eng.spiteOff(S) ? '<tr><th>导师的态度</th><td>' + (S.spiteStage ? '<span class="fail">' + Eng.spiteName(S) + '</span>' : '正常') + (S.spiteOmen ? '　<span class="fail">再这样下去：' + Eng.SPITE.names[S.spiteOmen] + '</span>' : '')
          + '<br><span style="font-size:12px;color:var(--mute)">顶撞没成、活没干完、摆烂被抓都会被记上。四档：冷处理、穿小鞋、学院约谈、劝退。把活干完能慢慢缓下来</span></td></tr>' : '')
        + (S.mentor.type !== '神仙导师' && S.mhp < 100 ? '<tr><th>导师的气色</th><td>' + (S.mhp >= 70 ? '还行' : S.mhp >= 35 ? '发青' : '<span class="fail">很差，再气一下就要请病假</span>') + '</td></tr>' : '') + '</table>';
      h = '<h3>萝卜的档案</h3><p class="q">' + esc(Eng.collegeOf(S).name) + ' · ' + esc(S.topic) + '</p>' + fold('我', Eng.mood(S) + (S.acadWarn ? ' · 学业预警' : ''), me, true);
      // —— 毕业进度 ——
      const prog = '<table class="form">'
        + ['开题', '中期考核', '答辩'].map((n, i) => { const g = gl.filter((x) => x.i === i).pop(); return '<tr><th>' + n + '</th><td>' + (g ? (g.pass ? '<span class="pass">已通过</span>' : '<span class="fail">未通过</span>') : ['研一下', '研二下', '研三下'][i] + '期末' + (lk.gate === n ? '，还有 ' + lk.left + ' 周。论文' + lk.论文 + '、贡献' + lk.贡献 + '、签字' + lk.签字 : '')) + '</td></tr>'; }).join('')
        + '<tr><th>小论文</th><td>' + C.paper.states[pp.state] + (pp.state === 'review' && pp.tries ? '（第 ' + (pp.tries + 1) + ' 次）' : '') + '<br><span style="font-size:12px;color:var(--mute)">答辩前必须录用，否则没有答辩资格。论文进度到 ' + P.paperAt + ' 会投出去，一轮审稿三四周</span></td></tr>'
        + '<tr><th>毕业论文</th><td>' + ML.map((x, i) => '<div>' + mk(i < S.mile) + ' ' + x.name + '</div>').join('') + '</td></tr></table>';
      const gl4 = Eng.gradList(S), gn = gl4.filter((x) => x.ok).length;
      h += fold('毕业要求', gn === 4 ? '全满了，剩下的时间是你自己的' : gn + '/4 · 四样都齐了就能提前答辩', '<table class="form">' + gl4.map((x) => '<tr><th>' + mk(x.ok) + ' ' + x.name + '</th><td>' + esc(x.now) + '</td></tr>').join('')
        + '</table><p class="hint" style="margin:8px 0 0">' + (gn === 4 ? '派的活可以说「我都做完了」推掉；精力多了一格「自由活动」；研究生院会问你要不要提前答辩。' : '四样全齐之后：派的活可以推掉，精力想干什么都行，还能申请提前答辩。') + '</p>', true);
      h += fold('毕业进度', '距' + lk.gate + ' ' + lk.left + ' 周 · 毕业论文 ' + S.mile + '/' + ML.length, prog, false);
      // —— 课题组之外 ——
      const wild = '<p class="q" style="margin:0 0 8px">休息和摆烂的时候去的地方。同一类去多了，会认识那边的人，多出一条毕业之外的路。</p><table class="form">' + Object.keys(C.wildDirs).map((d) => {
        const w = C.wildDirs[d], n = S.wild[d], door = S.wildDoor === d;
        const next = door ? (n >= P.wildEnd ? '<span class="pass">这条路走得通了：' + w.job + '</span>' : '接了' + w.who + '给的位置，还差 ' + (P.wildEnd - n) + ' 次就走得通')
          : n >= P.wildDoor ? '认识了' + w.who + (S.wildDoor ? '' : '，他提过一个位置') : n >= P.wildCircle ? '认识了' + w.who : '再' + w.verb.charAt(0) + ' ' + (P.wildCircle - n) + ' 次，会认识那边的人';
        return '<tr><th>' + w.label + '</th><td>' + w.verb + ' ' + n + ' 次<br><span style="font-size:12px;color:var(--mute)">' + w.acts + '。' + next + '</span></td></tr>';
      }).join('') + '</table>';
      const got = Object.keys(S.cards || {}), allActs = Object.keys(C.restActs);
      const wall = '<p class="q" style="margin:12px 0 8px">明信片 ' + got.length + '/' + allActs.length + '。第一次去一个地方会留下一张。</p><div class="cards">'
        + allActs.map((a) => (S.cards && S.cards[a] ? '<figure>' + Art.cards[a]() + '<figcaption>' + a + (S.cards[a] > 1 ? ' ×' + S.cards[a] : '') + '</figcaption></figure>' : '<figure class="no"><div></div><figcaption>' + a + '</figcaption></figure>')).join('') + '</div>';
      h += fold('课题组之外', Object.keys(C.wildDirs).map((d) => C.wildDirs[d].short + ' ' + S.wild[d]).join(' · ') + ' 次 · 明信片 ' + got.length + '/' + allActs.length, wild + wall, false);
      // —— 导师 ——
      let mt = '<p class="q" style="margin:0 0 8px">' + esc((S.intro && S.intro.motto) || prof.motto) + '</p><table class="form">', knownN = 0;
      ATTRS.forEach(([key, name]) => {
        const v = m[key], tier = v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid';
        if (k[key] >= 2) knownN += 1;
        mt += '<tr><th>' + name + '</th><td>' + (k[key] >= 2 ? esc(C.reveal[key][tier].split('。')[0] + '。') : k[key] === 1 ? '听说' + (v >= 3 ? '偏高' : '偏低') : dim('还不知道')) + '</td></tr>';
      });
      const ms = Eng.GOAL_MATCH[m.type], best = Object.keys(ms).filter((g) => ms[g] === '高');
      if (k.match >= 2) knownN += 1;
      mt += '<tr><th>往届去向</th><td>' + (k.match >= 2 ? (best.length ? best.map((g) => C.goalNames[g]).join('、') + '居多' : '没人说得清') : dim('还不知道')) + '</td></tr>';
      if (S.truth != null) mt += '<tr><th>真相</th><td>' + esc(C.mentors[S.origType].truths[S.truth]) + '</td></tr>';
      const eyes = (S.recap || []).map((r) => '<tr><th>' + esc(r.sem) + '</th><td>' + esc(r.mentor) + '</td></tr>').join('');
      h += fold('导师 · ' + esc(m.surname + m.given), '摸清了 ' + knownN + '/6 项 · 好感 ' + Math.round(S.favor), mt + '</table>'
        + '<div class="eyes"><b>他眼里的你</b>' + (eyes ? '<table class="form">' + eyes + '</table>' : '<p class="hint" style="margin:4px 0 0">每个学期末记一笔。第一个学期还没过完。</p>') + '</div>', false);
      // —— 同门 ——
      let ps = '';
      S.peers.forEach((p) => {
        const per = C.personas[p.slot].find((x) => x.name === p.persona);
        const sig = p.state === '发疯' ? (p.inLab ? '在实验室里，但已经不是他了' : '被家里人接走了') : p.state === '退学' ? '已退学' : p.state === '附体' ? '开始替导师说话了'
          : p.warned >= 2 ? '头像灰了，很久没在群里说话' : p.warned === 1 ? '最近话变少了' : (S.intro && S.intro.bios[p.slot]) || per.line;
        ps += '<div class="peer' + (p.state !== '正常' ? ' out' : '') + '">' + face(fPeer(p)) + '<div class="info">' + esc(p.name) + ' · ' + esc(Eng.gearText(S, p.persona)) + (p.bond && C.bond.names[p.bond] && S.t >= 1 ? ' <b style="font-weight:400;color:var(--sys)">' + C.bond.names[p.bond] + '</b>' : '') + (p.state !== '正常' ? ' <b style="font-weight:400;color:var(--stamp)">' + (p.state === '附体' ? '被同化' : '已' + p.state) + '</b>' : '') + '<small>' + esc(sig) + '</small></div><div class="rel">关系 ' + Math.round(p.rel) + '</div></div>';
      });
      h += fold('同门', Eng.normalPeers(S).length + '/' + S.peers.length + ' 人还在', ps, false);
      h += '<button class="btn ghost" style="width:100%;margin:12px 0 0" data-act="closeSheet">关上档案</button><button class="btn ghost" style="width:100%;margin:8px 0 0;border-color:#c9cdd3;color:var(--mute)" data-act="home">返回首页（进度已保存）</button>';
    }
    return '<div class="mask" data-act="maskClose"><div class="sheet" role="dialog" aria-modal="true">' + h + '</div></div>';
  }

  // ---------- 关卡 ----------
  function vGate() {
    const g = V.g, beat = V.beat;
    let sign = '<span class="pending">审核中</span>';
    if (beat >= 1) sign = '<span class="' + (g.signed ? 'pass' : 'fail') + '">' + (g.signed ? '同意' : '不同意') + '</span><br><span style="font-size:13px;color:var(--mute)">' + esc(g.signLine) + '</span>';
    let h = '<div class="scroll"><div class="sys">' + sysTop('首页 &gt; 培养环节 &gt; ' + g.name + '申请')
      + '<div class="panel"><h2>' + g.name + '申请表</h2><div class="body"><table class="form">'
      + '<tr><th>申请人</th><td>萝卜</td></tr>'
      + '<tr><th>论文进度</th><td>' + g.thesis + ' / ' + g.line + '　<span class="' + (g.thesisOk ? 'pass' : 'fail') + '">' + (g.thesisOk ? '达标' : '未达标') + '</span></td></tr>'
      + '<tr><th>组内贡献</th><td>' + g.contrib + '（导师参考线 ' + g.contribLine + '）</td></tr>'
      + (g.paperNeeded ? '<tr><th>小论文</th><td>' + esc(g.paperState) + '　<span class="' + (g.paperOk ? 'pass' : 'fail') + '">' + (g.paperOk ? '符合要求' : esc(C.paper.gateNo)) + '</span></td></tr>' : '')
      + '<tr><th>导师意见</th><td>' + sign + '</td></tr>'
      + (beat >= 2 && g.blind ? '<tr><th>盲审</th><td><span class="fail">未通过</span>　评审意见：' + esc(C.lines.blindFail) + '</td></tr>' : '')
      + (beat >= 2 ? '<tr><th>结论</th><td>' + (g.pass ? '<span class="pass">通过</span>' + (g.waived ? '　<span style="font-size:13px;color:var(--mute)">条件未达标。经学院研究，特批通过。</span>' : '') : '<span class="fail">不通过</span>' + (g.consequence ? '　' + esc(g.consequence) : '')) + '</td></tr>' : '')
      + '</table>' + (beat >= 2 ? '<div class="stampbox"><div class="stamp' + (g.pass ? ' okc' : '') + '">' + (g.pass ? '通　过' : '不通过') + '</div></div>' : '') + '</div></div>';
    if (beat >= 1) h += (g.lines || []).map((l) => '<div style="margin-top:12px">' + line(l) + '</div>').join('');
    h += '<button class="btn" data-act="gateNext"' + (V.gateWait ? ' disabled' : '') + '>' + (V.gateWait ? '导师正在写意见…' : beat === 0 ? '查看导师意见' : beat === 1 ? '查看审核结论' : g.next === 'ending' ? '查看学籍状态' : g.next === 'goal' ? '进入研二' : g.i === 2 ? '办理延期毕业' : '继续') + '</button></div></div>';
    return h;
  }

  function vGoal() {
    const ms = Eng.GOAL_MATCH[S.mentor.type], known = S.known.match >= 2;
    const info = {
      就业: ['找工作', '去向进度靠实习来攒。实习的时候人不在组里，被发现要掉导师好感。谈下来「获准实习」就没风险。要瞒，要谈。'],
      读博: ['去外校读博', '给导师干科研活也算数，但自己最多攒到 60，剩下 40 看他' + (S.easy ? '研二下第 7 周' : '研三下第 3 周') + '给不给写推荐信。要哄。'],
      考公: ['考公', '和导师无关，不能用 AI。' + (S.easy ? '研二下第 7 周选调生笔试，去向进度到 70 才算过；没过的话研三上第 3 周还有国考，线是 80。' : '研三上第 3 周国考，去向进度到 70 才算过笔试；没过的话研三下第 1 周还有省考，线是 80。') + '要抢时间。'],
    };
    return '<div class="scroll"><div class="sys">' + sysTop('首页 &gt; 培养计划 &gt; 毕业去向意向登记')
      + '<div class="panel"><h2>毕业去向意向登记（研二学年）</h2><div class="body"><p style="margin:0 0 10px;font-size:13px">一年过去了，这个组是什么样，你大概有数了。登记后不可修改。</p>'
      + Object.keys(info).map((g) => '<button class="opt" data-act="goal" data-g="' + g + '"><b>' + info[g][0] + '</b>' + (known && ms[g] === '高' ? '　<span class="pass" style="font-size:12px">往届多数去了这条路</span>' : '') + '<small style="display:block;color:var(--mute);font-size:12.5px">' + info[g][1] + '</small></button>').join('')
      + '</div></div><p class="hint">' + (known ? '你打听过往届的人都去了哪，这是你研一攒下的信息。' : '你没打听到往届的人都去了哪。只能凭感觉选。') + '</p></div></div>';
  }

  // ---------- 结局 ----------
  const STATE_WORD = { 发疯: '休学（因病）', 留组读博: '硕博连读', 留组成为小导: '毕业（留校）', 主动退学: '退学（本人申请）', 肄业: '肄业', '想开了·退学': '退学（本人申请）', 被劝退: '退学（导师不再指导）' };
  function vEnding() {
    const e = S.ended, step = V.step || 0, m = S.mentor;
    let h = '<div class="scroll"><div class="sys">';
    if (step === 0) {
      h += sysTop('首页 &gt; 学籍管理 &gt; 学籍状态变更')
        + '<div class="plate reveal">' + Art.endings[e.name]() + '</div>'
        + '<div class="panel"><h2>学籍状态变更通知</h2><div class="body"><table class="form"><tr><th>姓名</th><td>萝卜</td></tr>'
        + '<tr><th>在读时长</th><td>' + S.stats.turns + ' 周</td></tr><tr><th>学籍状态</th><td>' + esc(STATE_WORD[e.name] || (e.how === 'grad' ? '毕业' : '肄业')) + '</td></tr></table>'
        + '<div class="stampbox"><div class="stamp round' + (e.got ? ' okc' : '') + '">' + esc(e.name.replace('·', '<br>')).replace('&lt;br&gt;', '<br>') + '</div></div></div></div>'
        + ((e.hl || []).length ? '<div class="panel"><h2>这三年最解气的几件事</h2><div class="body"><ul class="hl">' + e.hl.map((x) => '<li><small>' + wkName(x.t).replace(' · ', '') + '</small>' + esc(x.text) + '</li>').join('') + '</ul></div></div>' : '')
        + (e.how === 'grad' && !e.hand ? '<div class="panel"><h2>毕业典礼</h2><div class="body"><p style="margin:0 0 10px">拨穗之后，导师朝你伸出了手。</p><div class="two"><button class="btn ghost" data-act="hand" data-k="yes">握一下</button><button class="btn ghost" data-act="hand" data-k="no">把手揣回兜里</button></div></div></div>'
          : e.hand ? '<p class="hint" style="font-size:13.5px;color:var(--ink)">' + esc(RB.hand[e.hand]) + '</p>' : '')
        + '<button class="btn" data-act="endNext">翻到论文最后一页</button>';
    } else if (step === 1) {
      h += sysTop('首页 &gt; 学位论文 &gt; 致谢')
        + '<div class="thesis-page"><h2>致谢</h2><p>' + esc(e.text) + '</p><div class="pn">— ' + (60 + S.stats.turns) + ' —</div></div>'
        + '<button class="btn" data-act="endNext">查看成绩单</button>';
    } else if (step === 2) {
      const a = e.attrs;
      h += sysTop('首页 &gt; 成绩管理 &gt; 研究生阶段总评')
        + '<div class="panel"><h2>研究生阶段总评</h2><div class="body"><table class="form">'
        + '<tr><th>结局</th><td>' + esc(e.name) + '</td></tr>'
        + '<tr><th>评级</th><td><b style="font:700 26px var(--song)">' + e.grade + '</b>　' + e.baseScore + ' × 难度 ' + e.coef + ' = ' + e.score + '</td></tr>'
        + '<tr><th>称号</th><td>' + (e.title ? '<span class="minis">' + Art.titles[e.title]() + '</span>' + esc(e.title) + '<br><span style="font-size:12.5px;color:var(--mute)">' + esc(C.titles[e.title]) + '</span>' : '无') + '</td></tr>'
        + '<tr><th>被派的活</th><td>' + e.stats.demand + ' 点</td></tr><tr><th>同门幸存</th><td>' + e.stats.alive + ' / ' + e.stats.peers + '</td></tr><tr><th>摆烂</th><td>' + e.stats.slack + ' 次</td></tr></table></div></div>'
        + '<div class="panel"><h2>导师档案（已解密）</h2><div class="portrait reveal">' + Art.mentors[e.mentorType]() + '<span class="lbl">' + esc(e.mentorType) + '</span></div><div class="body"><table class="form">'
        + '<tr><th>姓名</th><td>' + esc(m.surname + m.given) + '</td></tr><tr><th>类型</th><td><b>' + esc(e.mentorType) + '</b>' + (e.finalType !== e.mentorType ? '（后来换成了' + esc(e.finalType) + '）' : '') + '</td></tr>'
        + '<tr><th>push 度</th><td>' + pips(a.push) + '</td></tr><tr><th>资源</th><td>' + pips(a['资源']) + '</td></tr><tr><th>放人</th><td>' + pips(a['放人度']) + '</td></tr>'
        + '<tr><th>人品</th><td>' + pips(a['人品']) + '</td></tr><tr><th>学术水平</th><td>' + pips(a['水平']) + '</td></tr><tr><th>和你去向的匹配</th><td>' + esc(a['匹配']) + '</td></tr>'
        + (e.truth != null ? '<tr><th>真相</th><td>' + esc(C.mentors[e.mentorType].truths[e.truth]) + '</td></tr>' : '') + '</table></div></div>'
        + '<button class="btn" data-act="endNext">查看图鉴更新</button>';
    } else if (step === 3) {
      const n = V.news || {};
      h += sysTop('首页 &gt; 档案室 &gt; 新增归档')
        + '<div class="panel"><h2>本次新增归档</h2><div class="body">'
        + (n.ending ? '<p style="margin:0 0 6px">结局图鉴：<b>' + esc(e.name) + '</b>（' + Object.keys(META.endings).length + '/' + C.endingOrder.length + '）</p>' : '<p style="margin:0 0 6px;color:var(--mute)">结局「' + esc(e.name) + '」之前已经归档过。</p>')
        + (n.mentor ? '<p style="margin:0 0 6px">导师图鉴：<b>' + esc(e.mentorType) + '</b></p>' : '')
        + (n.truth ? '<p style="margin:0 0 6px">导师真相：' + esc(C.mentors[e.mentorType].truths[e.truth]) + '</p>' : '')
        + (n.title ? '<p style="margin:0 0 6px">称号：<b>' + esc(e.title) + '</b></p>' : '')
        + (n.pts ? '<p style="margin:0 0 6px">重生点：<b>+' + n.pts + '</b>（现在有 ' + META.pts + ' 点' + (pity() ? '；连着 ' + META.streak + ' 局没上岸，下一局保底好导师' : '') + '）<br><span style="font-size:12px;color:var(--mute)">下一局报到时能用：多随机几次（1 点）、属性 +1（2 点）、让导师好说话一点（2 点）、好导师（' + RB.good.cost + ' 点）、天龙人开局（' + RB.tl.cost + ' 点）。</span></p>' : '')
        + ((e.cards || []).length ? '<p style="margin:10px 0 6px">这三年留下的明信片：' + e.cards.length + ' 张' + ((n.cards || []).length ? '，其中 ' + n.cards.length + ' 张是第一次收进图鉴' : '') + '</p><div class="cards">' + e.cards.map((a) => '<figure>' + Art.cards[a]() + '<figcaption>' + a + '</figcaption></figure>').join('') + '</div>' : '')
        + (n.mentor || n.title ? '<div class="got">' + (n.mentor ? '<div>' + Art.mentors[e.mentorType]() + '</div>' : '') + (n.title ? '<div>' + Art.titles[e.title]() + '</div>' : '') + '</div>' : '') + '</div></div>'
        + '<div class="card-wrap"><div class="card">' + Art.endings[e.name]() + '<div class="k">逃出绝命课题组 · 第 ' + META.runs + ' 次抽卡</div><h2>' + esc(e.name) + '</h2>'
        + '<div class="tx">' + esc(e.text) + '</div><div class="ft"><span>导师：' + esc(e.mentorType) + '</span><span>派活 ' + e.stats.demand + ' · 幸存 ' + e.stats.alive + '/' + e.stats.peers + ' · 摆烂 ' + e.stats.slack + '</span></div></div>'
        + '<div class="stamp grade" style="font-size:24px;padding:8px 14px;animation:none">' + e.grade + '</div></div>'
        + '<p class="hint">截图这张卡就能分享。' + esc(nextHint(e)) + '</p>'
        + (typeof location !== 'undefined' && /^https?:/.test(location.protocol) ? '<div class="panel"><h2>投一句原话</h2><div class="body">'
          + (V.quoted ? '<p style="margin:0">收到了。谢谢你把它说出来。' + (V.quoted < 3 ? '<br><button class="btn ghost" style="width:100%;margin:10px 0 0" data-act="quoteMore">再投一句</button>' : '') + '</p>'
            : '<p style="margin:0 0 8px;font-size:13px">你的导师或者同门，说过哪句让你一直记得的话？写下来，以后游戏里的人会说得更像真的。</p>'
              + '<form data-form="quote"><div class="who-row" style="margin:0 0 8px"><span>谁说的：</span>' + ['导师', '同门', '我自己'].map((w, i) => '<label><input type="radio" name="who" value="' + w + '"' + (i ? '' : ' checked') + '> ' + w + '</label>').join('') + '</div>'
              + '<div class="free"><input name="t" maxlength="80" autocomplete="off" placeholder="原话，80 字以内"><button>投稿</button></div></form>'
              + '<p class="hint" style="margin:8px 0 0">' + (V.quoteFail ? '<span class="fail">没发出去，可能是发得太快或者网络不通，过一会儿再试。</span>' : '匿名。请不要写真实的姓名、学校和课题组。') + '</p>') + '</div></div>' : '')
        + '<button class="btn" data-act="new">再抽一次</button><button class="btn ghost" data-act="book">打开图鉴</button>';
    }
    return h + '</div></div>';
  }
  function nextHint(e) {
    return { grad: '下一局，这个萝卜会以「已毕业的师兄」的身份在群里留一句话。', mad: '下一局，实验室角落会多一个不说话的人。', stay: '下一局，带你的小导会有点眼熟。', gone: '下一局，你的抽屉里会有一张别人的校园卡。' }[e.lastRun.kind] || '';
  }
  function settleMeta() {
    if (S.metaDone) return;
    const e = S.ended, news = {};
    META.runs += 1;
    if (!META.endings[e.name]) { META.endings[e.name] = { text: e.text }; news.ending = true; }
    const mm = (META.mentors[e.mentorType] = META.mentors[e.mentorType] || { truths: [], attrs: null });
    if (!mm.attrs) news.mentor = true;
    mm.attrs = e.attrs;
    if (e.truth != null && mm.truths.indexOf(e.truth) < 0) { mm.truths.push(e.truth); news.truth = true; }
    if (e.title && META.titles.indexOf(e.title) < 0) { META.titles.push(e.title); news.title = true; }
    META.cards = META.cards || {}; news.cards = (e.cards || []).filter((a) => !META.cards[a]); (e.cards || []).forEach((a) => { META.cards[a] = true; });
    META.last = e.lastRun;
    // 重生点: 每局一样多。连着没上岸的局数用来算保底；栽在谁手里，下次遇到就是复仇局
    const fine = e.got || e.joy || e.cat === '天龙人' || e.cat === '旷野';
    news.pts = 2 * (e.hard ? 2 : 1);                      // 每读完一局都是 2 点，结局好坏不影响；受苦模式翻倍
    META.pts = Math.min(999, (META.pts || 0) + news.pts); META.streak = fine ? 0 : (META.streak || 0) + 1; META.grudge = fine ? null : e.mentorType;
    META.recent = [S.seenEvents.slice()].concat(META.recent || []).slice(0, 2);
    S.metaDone = true; V.news = news;
    save();
    if (LLM && LLM.enabled()) {                                             // 让模型按这一局的经历重写致谢，失败就用模板
      const run = S;
      LLM.ask('ending', Eng.endingContext(S)).then((j) => {
        if (!j || !j.text || run !== S) return;
        run.ended.text = String(j.text).slice(0, 240);
        META.endings[e.name] = { text: run.ended.text };
        save(); if (V.name === 'ending' && (V.step === 1 || V.step === 3)) render();   // 只有显示致谢的两页需要重画，别的页重画会把盖章动画再放一遍
      });
    }
  }

  // ---------- 图鉴 ----------
  function radar(a) {
    const ks = [['push', 'push'], ['资源', '资源'], ['放人度', '放人'], ['人品', '人品'], ['水平', '学术']], cx = 75, cy = 64, r = 32;
    const pt = (i, v) => { const g = -Math.PI / 2 + i * 2 * Math.PI / 5; return (cx + Math.cos(g) * r * v / 5).toFixed(1) + ',' + (cy + Math.sin(g) * r * v / 5).toFixed(1); };
    return '<svg class="radar" viewBox="0 0 150 128" aria-hidden="true">' + [5, 3, 1].map((v) => '<polygon points="' + ks.map((_, i) => pt(i, v)).join(' ') + '" fill="none" stroke="#5a5d63"/>').join('')
      + '<polygon points="' + ks.map((k, i) => pt(i, a[k[0]])).join(' ') + '" fill="#7db7e8" fill-opacity=".45" stroke="#7db7e8" stroke-width="1.5"/>'
      // 标签放在顶点外侧: 左边的右对齐、右边的左对齐，免得压到图形上
      + ks.map((k, i) => { const p = pt(i, 5.9).split(','), dx = +p[0] - cx, anchor = dx < -4 ? 'end' : dx > 4 ? 'start' : 'middle', dy = +p[1] < cy - 20 ? -3 : +p[1] > cy + 10 ? 11 : 3.5; return '<text x="' + (+p[0] + (dx < -4 ? -3 : dx > 4 ? 3 : 0)).toFixed(1) + '" y="' + (+p[1] + dy).toFixed(1) + '" text-anchor="' + anchor + '" font-size="10" fill="#c9cdd3">' + k[1] + ' ' + a[k[0]] + '</text>'; }).join('') + '</svg>';
  }
  function vBook() {
    const tab = V.tab || 0, ne = Object.keys(META.endings).length, nm = Object.keys(META.mentors).length, nt = META.titles.length, acts4 = Object.keys(C.restActs), nc = acts4.filter((a) => (META.cards || {})[a]).length;
    let h = '<div class="scroll"><div class="board"><div class="board-head"><div class="board-top"><button class="back" data-act="home" aria-label="返回首页">‹</button><b>档案室</b><span>已归档 ' + (ne + nm + nt + nc) + ' / ' + (C.endingOrder.length + Object.keys(C.mentors).length + Object.keys(C.titles).length + acts4.length) + '</span></div>'
      + '<div class="book">' + ['结局 ' + ne + '/' + C.endingOrder.length, '导师 ' + nm + '/' + Object.keys(C.mentors).length, '称号 ' + nt + '/' + Object.keys(C.titles).length, '明信片 ' + nc + '/' + acts4.length].map((t, i) => '<button data-act="tab" data-i="' + i + '" class="' + (i === tab ? 'on' : '') + '">' + t + '</button>').join('') + '</div></div>';
    if (tab === 0) {
      C.endingOrder.forEach((n) => {
        const got = META.endings[n], E = C.endings[n];
        h += '<div class="plate' + (got ? '' : ' locked') + '">' + Art.endings[n]() + '<span class="lbl">' + (got ? esc(n) : '未归档') + '</span><p>' + esc(got ? got.text : E.hint) + '</p></div>';
      });
    } else if (tab === 1) {
      Object.keys(C.mentors).forEach((t) => {
        const got = META.mentors[t], prof = C.mentors[t];
        h += '<div class="plate mcard' + (got ? '' : ' locked') + '"><div class="pic"><div class="ph">' + Art.mentors[t]() + '<i></i></div><span class="lbl">' + (got ? esc(t) : '未遇到') + '</span></div>'
          + '<dl><dt>招生寄语</dt><dd>' + esc(prof.motto) + '</dd><dt>学生评价</dt><dd>' + esc(prof.review) + '</dd></dl>';
        if (got) {
          const a5 = got.attrs;
          h += '<details class="mfold"><summary><span>他的底细</span><small>真相 ' + got.truths.length + '/' + prof.truths.length + (got.truths.length < prof.truths.length ? '，每局最多一条：私聊时向关系好的同门套话' : '，全部揭开了') + '</small></summary><div class="mdetail">' + radar(a5)
            + '<div>' + prof.truths.map((tr, i) => (got.truths.indexOf(i) >= 0 ? '<p class="redpen">真相 ' + (i + 1) + '：' + esc(tr) + '</p>' : '<p class="unk">真相 ' + (i + 1) + '：还没揭开</p>')).join('') + '</div></div></details>';
        }
        h += '</div>';
      });
    } else if (tab === 3) {
      acts4.forEach((a) => {
        const got = (META.cards || {})[a];
        h += '<div class="plate' + (got ? '' : ' locked') + '">' + Art.cards[a]() + '<span class="lbl">' + (got ? a : '没去过') + '</span><p>' + esc(got ? C.cardNote[a] : C.restActs[a].dir === '人' ? '有人一直在等你回个消息' : '休息的时候，碰巧去一次就有了') + '</p></div>';
      });
    } else {
      h += '<div class="seals">' + Object.keys(C.titles).map((t) => {
        const got = META.titles.indexOf(t) >= 0;
        return '<div class="' + (got ? '' : 'locked') + '">' + Art.titles[t]() + '<span class="lbl">' + (got ? esc(t) : '？？？') + '</span><small>' + (got ? esc(C.titles[t]) : '还没拿到') + '</small></div>';
      }).join('') + '</div>';
    }
    return h + '</div></div>';
  }

  // ---------- 等模型的时候 ----------
  // 盖一层半透明的「对方正在输入」，文字每 0.9 秒换一句，让人知道没卡住。超过时限就不等了，按规则走。
  let busyTimer = null;
  function vBusy() {
    if (!V.busy || V.busy.inline) return '';
    return '<div class="busy" role="status" aria-live="polite"><div class="busy-card"><div class="busy-dots"><i></i><i></i><i></i></div><div id="busytext">' + esc(V.busy.lines[0]) + '</div><div class="busy-bar"><i></i></div></div></div>';
  }
  /** inline: 在聊天里等（群聊或私聊）。不盖遮罩，对方的气泡显示「正在输入」，可以带上自己刚说的那句。 */
  function withBusy(lines, promise, capMs, inline) {
    V.busy = Object.assign({ lines }, inline && V.name === 'turn' && !V.sheet ? Object.assign({ inline: true }, inline) : null); render();
    let i = 0;
    clearInterval(busyTimer);
    busyTimer = setInterval(() => { i = Math.min(i + 1, lines.length - 1); const el = document.getElementById('busytext'); if (el) el.textContent = lines[i]; }, 900);
    const cap = new Promise((r) => setTimeout(() => r(null), capMs || 7000));
    return Promise.race([promise, cap]).catch(() => null).then((v) => { clearInterval(busyTimer); V.busy = null; return v; });
  }
  const QUIET = ['……', '过了一会儿……', '……'];             // 眼前没有人在跟你说话（旁白、通知）时的等待
  const TYPING0 = ['对方正在输入…', '对方正在输入…', '对方停止了输入', '对方正在输入…', '对方还在输入…'];
  /** 眼前这件事是谁在等你回话。旁白和学院的通知没有人在输入。 */
  const TYPING = TYPING0;
  const replier = () => { const sp = S.cur && S.cur.event && S.cur.event.speaker; return sp === '导师' || (sp && Eng.peerBySlot(S, sp)) ? sp : null; };

  // ---------- 渲染与操作 ----------
  function render() {
    const views = { title: vTitle, admit: vAdmit, mentor: vMentor, turn: vTurn, gate: vGate, goal: vGoal, ending: vEnding, book: vBook };
    const was = document.getElementById('chat'), keepTop = was ? was.scrollTop : null;
    // 后台的模型结果回来会重画页面。重画前记下输入框里已经打的字和光标，画完放回去
    const typed = [];
    if (app.querySelectorAll && typeof document.activeElement !== 'undefined') app.querySelectorAll('form[data-form] input[name=t],form[data-form] textarea[name=t]').forEach((el) => { if (el.value || el === document.activeElement) typed.push({ form: el.closest('form').dataset.form, value: el.value, focus: el === document.activeElement, a: el.selectionStart, b: el.selectionEnd }); });
    app.innerHTML = views[V.name]() + vBusy() + vWeekCard();
    // 进场动画、面板滑入、SAN 低时的褪色
    if (app.classList) {
      if (V.enter && app.firstElementChild && canAnim()) app.firstElementChild.classList.add(V.enter);
      V.enter = null;
      // 私聊窗口只在刚打开的那一下滑进来；之后每次重画（模型的话回来了、你回了一句）都不再重播
      const dmEl = app.querySelector('.dm'), dmKey = dmEl && S ? S.t + ':' + S.cur.dm.slot : null;
      if (dmEl && dmShown !== dmKey && canAnim()) dmEl.classList.add('in');
      dmShown = dmKey;
      const mk = app.querySelector('.mask');
      if (mk && sheetShown !== V.sheet && canAnim()) mk.classList.add('in');
      sheetShown = mk ? V.sheet : null;
      app.dataset.san = V.name === 'turn' && S ? (S.san < 12 ? '3' : S.san < 25 ? '2' : S.san < 40 ? '1' : '') : '';
    }
    const chat = document.getElementById('chat');
    let first = null;
    try { first = motion(chat); } catch (e) { /* 动效出错不影响玩 */ }
    const dmb = document.getElementById('dmbody'); if (dmb) dmb.scrollTop = dmb.scrollHeight;
    typed.forEach((t) => { const el = app.querySelector('form[data-form="' + t.form + '"] [name=t]'); if (!el) return; el.value = t.value; if (t.focus) { el.focus({ preventScroll: true }); try { el.setSelectionRange(t.a, t.b); } catch (e) { /* 有的输入框不支持设光标 */ } } });
    if (V.name === 'title') { try { fitCover(); } catch (e) { /* 量不了尺寸就按原样显示 */ } }
    // 有新消息就停在第一条新消息上，让人从头往下读；没有新消息（比如只是调了精力）就留在原地
    // 上面留着前几周的记录时，给底下垫够空，保证这一周的周标题能滑到最上面
    try { padWeek(chat); } catch (e) { /* 量不了就不垫 */ }
    if (chat) {
      const max = Math.max(0, chat.scrollHeight - chat.clientHeight), fit = (v) => Math.min(max, Math.max(0, v));
      const gliding = glideTo && glideTo.cur === S.cur && Date.now() - glideTo.at < 700;
      if (first) {
        // 从刚才看的位置滑到第一条新消息，不再整屏跳。新的一周: 上一周往上走，新的一周从底下接上来
        let goal = fit(first.offsetTop - 6), flowed = false;
        if (autoFlow && freshWeek && chat.querySelectorAll) { const rs = chat.querySelectorAll('.past .resat'), r = rs[rs.length - 1]; if (r) { goal = fit(r.offsetTop - 6); flowed = true; } }
        // 先停在上一周的结算上让人看完，等新一周的消息开始出来，再滑到新一周的周标题
        if (flowed) flowToWeek(S.cur, 1500);
        autoFlow = false;
        const from = flowed && keepTop != null ? fit(keepTop) : weekCard ? goal : freshWeek && chat.querySelector('.past') ? fit(first.offsetTop - chat.clientHeight + 48) : keepTop != null ? fit(keepTop) : goal;
        glide(chat, from, goal);
      } else if (gliding && keepTop != null) glide(chat, fit(keepTop), fit(glideTo.top), true);   // 滑到一半画面被重画了，接着滑完
      else chat.scrollTop = keepTop != null ? fit(keepTop) : max;
      try { moreHint(chat); } catch (e) { /* 提示出不来不影响玩 */ }
    }
    else { const sc = app.querySelector('.scroll'); if (sc && V.name !== 'book') sc.scrollTop = V.name === 'gate' ? sc.scrollHeight : 0; }
  }
  // 数值变了就在条旁边飘一个 +3 / −2；群聊里新来的消息一条条出现
  let prevBars = null, shown = { cur: null, n: 0 }, freshWeek = false, glideTo = null;
  const thisWeek = (chat) => { const ks = chat ? chat.children : [], k = ks.length > 1 && ks[0].classList && ks[0].classList.contains('past') ? ks[1] : null; return k && k.classList.contains('wk') ? k : null; };
  function padWeek(chat) {
    const wk = thisWeek(chat); if (!wk || typeof getComputedStyle !== 'function') return;
    chat.style.paddingBottom = '';
    const need = chat.clientHeight - (chat.scrollHeight - wk.offsetTop) + 6;
    if (need > 0) chat.style.paddingBottom = (parseFloat(getComputedStyle(chat).paddingBottom) || 0) + need + 'px';
  }
  let flowTimer = 0;
  function flowToWeek(cur, ms) {
    if (typeof setTimeout !== 'function') return;
    clearTimeout(flowTimer);
    flowTimer = setTimeout(() => {
      const chat = document.getElementById('chat'), wk = S && S.cur === cur && V.name === 'turn' ? thisWeek(chat) : null;
      if (!wk) return;
      glide(chat, chat.scrollTop, Math.max(0, Math.min(chat.scrollHeight - chat.clientHeight, wk.offsetTop - 6)));
    }, ms);
  }
  function glide(chat, from, to, keep) {
    chat.scrollTop = from;
    if (!keep) glideTo = { cur: S.cur, top: to, at: Date.now() };
    if (from === to) return;
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (canAnim() && typeof chat.scrollTo === 'function' && !calm) chat.scrollTo({ top: to, behavior: 'smooth' }); else chat.scrollTop = to;
  }
  function motion(chat) {
    if (V.name !== 'turn' || !app.querySelectorAll) { prevBars = null; return; }
    const now = { ref: S };
    app.querySelectorAll('.bar[data-k]').forEach((el) => {
      const k = el.dataset.k, v = +el.dataset.v, p = +el.dataset.p; now[k] = { v, p };
      const old = prevBars && prevBars.ref === S && prevBars[k];
      if (!old || old.v === v) return;
      const fill = el.querySelector('.fill'), d = v - old.v;
      fill.style.transition = 'none'; fill.style.width = old.p + '%'; void fill.offsetWidth; fill.style.transition = ''; fill.style.width = p + '%';
      el.insertAdjacentHTML('beforeend', '<em class="fl ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + '</em>');
      el.querySelector('span').classList.add('bump');
    });
    prevBars = now;
    if (!chat) return;
    // 认「这一周」要看 S.cur 是不是同一个，不能看周数: 结算时周数会先加一，那时候还是同一周的聊天
    freshWeek = shown.cur !== S.cur;
    const kids = chat.children;
    if (freshWeek) shown = { cur: S.cur, n: kids.length && kids[0].classList && kids[0].classList.contains('past') ? 1 : 0 };
    // 自动接上的下一周晚一点再出来，先让人把上一周的结算看完
    const base = weekCard ? 0.75 : autoFlow && freshWeek ? 1.5 : 0;
    for (let i = shown.n; i < kids.length; i++) { const dl = base + Math.min(1.8, (i - shown.n) * 0.26); kids[i].classList.add('in'); kids[i].style.animationDelay = dl + 's'; kids[i].style.setProperty('--d', dl + 's'); }
    const first = kids[shown.n] || null, fresh = kids.length - shown.n;
    // 新消息一条条出来，底下的选项等最后一条出来了再亮
    const dockEl = app.querySelector('#app > .dock') || app.querySelector('.dock');
    if (dockEl && fresh >= 2 && !V.waitFlavor && !(S.cur && S.cur.dm && !S.cur.dm.closed)) { dockEl.style.animation = 'msgin .3s ease-out ' + (base + Math.min(1.8, (fresh - 1) * 0.26) + 0.2).toFixed(2) + 's both'; }
    // 学业预警第一次出现时砸下来
    const ac = app.querySelector('.acad'), wasWarn = warnSeen.ref === S && warnSeen.v;
    if (ac && !wasWarn && warnSeen.ref === S && canAnim()) { ac.classList.add('slam'); const st = app.querySelector('.status'); if (st) st.classList.add('flash'); }
    warnSeen = { ref: S, v: !!S.acadWarn };
    shown.n = kids.length;
    return first;
  }
  // 下面还有没读到的内容时，在聊天区底部挂一个「下面还有」，点一下往下翻
  function moreHint(chat) {
    chat.insertAdjacentHTML('beforeend', '<div class="more"><button type="button">↓ 下面还有</button></div>');
    const el = chat.lastChild, btn = el.firstChild;
    const sync = () => { el.style.visibility = chat.scrollHeight - chat.scrollTop - chat.clientHeight > 28 ? 'visible' : 'hidden'; };
    chat.addEventListener('scroll', sync, { passive: true });
    btn.addEventListener('click', (ev) => { ev.stopPropagation(); chat.scrollBy({ top: chat.clientHeight * 0.75, behavior: 'smooth' }); });
    sync();
  }
  function go(name, extra) { V = Object.assign({ name }, extra || {}); render(); }
  /** 调精力只动底部那一块，不用把整个聊天区重画一遍。 */
  function redock() {
    const d = app.querySelector && app.querySelector('#app > .dock'), c = S && S.cur;
    if (!d || !c || c.event || c.result || c.lostTurn || c.ap <= 0 || V.waitFlavor || V.sheet || V.busy) return render();
    d.style.animation = 'none'; d.innerHTML = vAlloc();
  }
  // ---------- 过渡 ----------
  // 换场前先让旧画面退场（加一个 class，等动画放完再换）。测试环境里没有定时器，直接换
  let leaving = false, cardNext = false, weekCard = null, sheetShown = null, dmShown = null, warnSeen = { ref: null, v: false };
  const canAnim = () => typeof setTimeout === 'function' && !!app.classList && !window.__noAnim;
  function leave(cls, ms, fn) {
    if (!canAnim()) return fn();
    if (leaving) return;
    leaving = true; app.classList.add(cls);
    setTimeout(() => { app.classList.remove(cls); leaving = false; fn(); }, ms);
  }
  function vWeekCard() {
    if (!weekCard || V.name !== 'turn' || typeof Date === 'undefined') return '';
    const el = Date.now() - weekCard.at;
    if (el > 1100) { weekCard = null; return ''; }
    // 日历只在学期开头翻一页: 第几学期、哪个学期、这学期开头是什么事
    const t = S.t, late = t >= 24, what = late ? '多出来的一个学期' : ((C.calendar[t + 1] || '').split(' · ')[1] || '开学');
    return '<div class="weekcard" style="animation-delay:-' + el + 'ms"><div style="animation-delay:-' + el + 'ms"><small>' + (late ? '延期' : '第 ' + (Math.floor(t / 4) + 1) + ' 学期 / 共 6 学期') + '</small><b>' + semName(t) + '</b><span>' + esc(what) + '</span></div></div>';
  }
  const turnLat = [];
  function turnWait() {
    if (!turnLat.length) return 6000;
    const mid = turnLat.slice().sort((a, b) => a - b)[Math.floor(turnLat.length / 2)];
    return mid > 6500 ? 2000 : Math.max(2000, Math.min(6500, Math.round(mid * 1.4)));
  }
  function startTurn() {
    A = null; Eng.beginTurn(S); save();
    // 学期开头翻日历、清掉上学期的聊天记录；学期中间直接接着往下聊
    const semStart = S.t % 4 === 0;
    if (cardNext && semStart) hist = { ref: S, weeks: [] };
    if (cardNext && semStart && canAnim()) weekCard = { at: Date.now() };
    cardNext = false;
    const run = S, c = S.cur;
    if (LLM && LLM.enabled() && !c.lostTurn) {
      // 这一周的群聊交给模型改写。等多久看它最近有多快: 平时比它的耗时多等一点，上限 6.5 秒；它最近总是超过 6.5 秒，就只等 2 秒，直接用规则写好的底稿
      const cap = turnWait(), t0 = Date.now(), asking = LLM.ask('turn', Eng.flavorContext(S));
      asking.then((j) => { turnLat.push(j ? Date.now() - t0 : 9999); if (turnLat.length > 3) turnLat.shift(); });
      const wait = new Promise((r) => setTimeout(() => r(null), cap));
      V = { name: 'turn', waitFlavor: true };
      Promise.race([asking, wait]).then((j) => {
        if (run !== S || S.cur !== c) return;
        if (j) Eng.applyFlavor(S, j);
        V.waitFlavor = false; save(); if (V.name === 'turn') render();
      });
      // 同门的回话到结算时才用，不用等
      LLM.ask('peers', Eng.worldContext(S)).then((j) => { if (run === S && S.cur === c && j && Eng.applyPeerLines(S, j)) save(); });
      // 顺手让模型备好一个下一周用的临场事件，玩家不用等
      if (!S.gen.length) LLM.ask('event', Eng.eventContext(S)).then((j) => { if (run === S && j && Eng.addGenerated(S, j)) save(); });
      return render();
    }
    go('turn');
  }
  function resume() {
    if (!S) return go('title');
    if (S.ended) { settleMeta(); return go('ending', { step: 0, news: V.news }); }
    if (S.phase === 'intro') return go(S.draft && !S.draft.done ? 'admit' : 'mentor');
    if (S.phase === 'goal') return go('goal');
    if (!S.cur) return startTurn();
    A = null; go('turn');
  }
  function doCommit() {
    const plan = { fun: A.fun || 0, funPick: (A.funPick || []).slice(), lab: A.lab, thesis: A.thesis, chips: A.chips, heal: A.heal, help: A.help, slack: A.slack, rewrite: A.rewrite,
      helpTo: A.helpTo, restAct: A.restAct, restLine: restGot(), short: A.short || 'plain', dumpTo: A.dumpTo, dumpManner: A.dumpManner || 'plain', dumpSaid: A.dumpSaid || null, unblock: A.unblock, aiLab: !!A.aiLab, aiThesis: !!A.aiThesis, dumpRuling: A.dumpRuling || null };
    Eng.commit(S, plan); A = null; V.sheet = null; save();
    // 学期末: 在后台让模型把这学期压成一段总结，不让玩家等
    if (S.recapAsk && LLM && LLM.enabled()) { const run = S, ctx = S.recapAsk; S.recapAsk = null; LLM.ask('recap', ctx).then((j) => { if (run === S && j && Eng.applyRecap(S, ctx.学期, j)) save(); }); }
    // 学期中间结算完不用再点「下一周」: 结果留在上面，下一周直接接在后面。学期末、关卡、结局还是停下来等人点
    const after = () => {
      const r = S.cur.result;
      if (r && r.next === 'turn' && !S.ended && S.t % 4 !== 0) { keepWeek(); autoFlow = true; return startTurn(); }
      render();
    };
    // 导师周末的话按这周实际干了什么现写。最多等 3.5 秒，等不到就用写好的
    const ctx = LLM && LLM.enabled() && typeof setTimeout === 'function' ? Eng.settleContext(S, plan) : null;
    if (!ctx) return after();
    const run = S, c = S.cur;
    V.waitSettle = { extra: !!ctx.可以补一句 }; render();
    Promise.race([LLM.ask('settle', ctx), new Promise((r) => setTimeout(() => r(null), 3500))]).catch(() => null).then((j) => {
      if (run !== S || S.cur !== c) return;
      if (j) Eng.applySettle(S, j);
      V.waitSettle = null; save();
      if (V.name !== 'turn') return;          // 等的时候退回了首页: 不把人拽回来，回来再点「下一周」
      after();
    });
  }
  /** 照这周的写法写到关卡那周，论文够不够线。不够才会问要不要用 AI。 */
  function thesisBehind() {
    if (S.delayed) return S.thesis < 100;
    const line = Eng.P.thesisLine[Math.min(2, Eng.stageOf(S))], weeksLeft = 8 - (S.t % 8);
    return S.thesis + A.thesis * Eng.thesisRate(S) * weeksLeft < line;
  }
  function confirm() {
    const c = S.cur;
    if (c.dm && !c.dm.closed) return;
    if (c.lostTurn || c.ap <= 0) { A = { lab: 0, thesis: 0, chips: 0, heal: 0, help: 0, slack: 0, rewrite: 0, fun: 0, funPick: [] }; return doCommit(); }
    const used = A.cells.reduce((n, k) => n + A[k], 0);
    if (used < c.ap) return;
    const eff = A.lab * (A.aiLab ? 1.5 : 1);
    // 毕业要求满了、上次也是说「做完了」推掉的: 这次不再问，照旧推掉。他一定会认的也不用问
    if (eff < c.demand && !A.short && Eng.freeOn(S) && (S.doneHabit || Eng.doneChance(S) >= 1)) A.short = 'done';
    if (eff < c.demand && !A.short) { V.sheet = 'short'; return render(); }
    if (S.ai.unlocked && A.thesis > 0 && !Eng.blocked(S) && A.aiThesis == null && thesisBehind()) { V.sheet = 'aiThesis'; return render(); }
    if (A.thesis > 0 && Eng.blocked(S) && !S.unblockMethod && !A.unblock) { V.sheet = 'unblock'; return render(); }
    // 甩锅: 确认之后先问他接不接
    const target = A.short === 'dump' && Eng.peerBySlot(S, A.dumpTo);
    if (target && target.state === '正常' && eff < c.demand && !A.dumpManner) { V.sheet = 'dumpAsk'; return render(); }   // 先想好怎么开口
    if (LLM && LLM.enabled() && target && target.state === '正常' && eff < c.demand) {
      const run = S;
      V.sheet = null;
      return withBusy(['你把文件拖进了和' + target.name + '的对话框', '消息已发出', '对方正在输入…', '对方停止了输入', '对方正在输入…'], LLM.ask('dump', Eng.dumpContext(S, A.dumpTo, A.dumpManner, A.dumpSaid)), 0, { who: target.slot, mine: A.dumpSaid || '', free: true })
        .then((r) => { if (run !== S || S.cur !== c || c.result) return; A.dumpRuling = r; doCommit(); });
    }
    doCommit();
  }
  /** 选了一个选项。said 是玩家自己打的字被归到这个选项上时的原话。 */
  function pickOpt(i, said) {
    const c = S.cur, run = S, o = c.event && c.event.options.find((x) => x.i === i);
    if (!o || o.disabled) return render();
    const finish = (ruling) => {
      if (run !== S || S.cur !== c || !c.event) return;
      c.eventShown = { speaker: c.event.speaker, text: c.event.text };
      Eng.pickOption(S, i, ruling, said); A = null; save();
      if (S.ended) { settleMeta(); return go('ending', { step: 0, news: V.news }); }
      render();
    };
    const mine = { who: replier(), mine: said || o.text, free: !!said, say: c.event.speaker !== '旁白' };
    const TYPING = replier() ? TYPING0 : QUIET;
    // 硬气的话成不成，先让模型看看这话说得是不是时候
    if (LLM && LLM.enabled() && Eng.needsRuling(S, i)) return withBusy(TYPING, LLM.ask('bold', Eng.boldContext(S, i)), 0, mine).then(finish);
    // 其余的选项: 对方的回应按现在的处境现写，等不到就用写好的那句
    if (LLM && LLM.enabled() && Eng.canReact(S, i)) return withBusy(TYPING, LLM.ask('react', Eng.reactContext(S, i, said)), 3500, mine).then(finish);
    return finish(null);
  }
  /** 弹出来的几种选择（活没干完怎么交代、论文卡住找谁、要不要用 AI）: 各有哪几条路，自己打字时归到其中一条上。 */
  function sheetChoices() {
    const c = S.cur;
    if (V.sheet === 'short') return { ask: '这周导师派的活没干完，萝卜要给个交代。', safe: Eng.freeOn(S) ? 'done' : 'plain', list: (Eng.freeOn(S) ? [{ k: 'done', t: '说毕业要求都满了，这活不干了' }] : []).concat(S.ai.unlocked && A.lab > 0 && !A.aiLab ? [{ k: 'ai', t: '让 AI 帮忙把活赶完' }] : [])
      .concat([{ k: 'plain', t: '跟导师直说没干完' }]).concat(Eng.normalPeers(S).concat(S.peers.filter((p) => p.state === '附体')).map((p) => ({ k: 'dump', slot: p.slot, t: '把活甩给' + p.name + '（' + p.slot + '）' })))
      .concat([{ k: 'lie', t: '糊弄过去，说差不多了' }, { k: 'ask', t: '找同门帮忙干一点' }]), run: (x, text) => { if (x.k === 'dump') { A.dumpManner = 'plain'; A.dumpSaid = text.slice(0, 40); } acts.short({ m: x.k, slot: x.slot }); } };
    if (V.sheet === 'unblock') return { ask: '萝卜的论文卡住了，要想办法过这一关。', safe: 'explore', list: [{ k: 'mentor', t: '去找导师问' }, { k: 'peer', t: '去找师兄师姐问' }, { k: 'explore', t: '自己慢慢啃' }].concat(S.ai.unlocked ? [{ k: 'ai', t: '问 AI' }] : []), run: (x) => acts.unblock({ m: x.k }) };
    if (V.sheet === 'aiThesis') return { ask: '论文进度落后了，这周写论文要不要让 AI 帮忙。', safe: 'no', list: [{ k: 'no', t: '自己写，不用 AI' }, { k: 'yes', t: '让 AI 帮着写' }], run: (x) => acts.aiThesis({ m: x.k }) };
    return c && null;
  }
  const acts = {
    new() {
      const fromTitle = V.name === 'title';
      // 报到页还没点完就退出去的，回来接着点: 不然退出再进就能白嫖重新随机
      if (!(S && !S.ended && S.phase === 'intro' && S.draft && !S.draft.done)) build(newDraft());
      if (fromTitle) return leave('lv-unlock', 380, () => go('admit', { enter: 'en-up' }));   // 像解锁手机一样划开
      go('admit');
    },
    dRoll(x) {
      const d = S.draft, c = x.k === 'c'; if (!d || d.done) return;
      if ((c ? d.rollC : d.rollM) > 0) { if (c) d.rollC -= 1; else d.rollM -= 1; }
      else if ((META.pts || 0) - draftCost(d) >= PRICE.roll) META.pts -= PRICE.roll;      // 免费次数用完了，一点换一次
      else return;
      if (c) { d.char = null; ATTR4.forEach((a) => { delete d.bo[a[0]]; }); } else { d.mentor = null; delete d.bo.fangren; delete d.bo.renpin; }
      build(d); render();
    },
    dSwap(x) {
      const d = S.draft, i = +x.i; if (!d || d.done || d.tut || d.mode === 'hard' || !d.char || !(i >= 0 && i < d.char.traits.length)) return;
      if ((META.pts || 0) - draftCost(d) < PRICE.swap) return;
      META.pts -= PRICE.swap; d.char.traits = Eng.rollTrait(d.char.traits, i); build(d); render();
    },
    dAttr(x) {
      const d = S.draft, k = x.k, dir = +x.d; if (!d || d.done || d.tut || d.mode === 'hard' || !ATTR4.some((a) => a[0] === k)) return;
      const n = ATTR4.reduce((t, a) => t + (d.bo[a[0]] || 0), 0);
      if (dir > 0) { if (n >= 2 || S.baseAttrs[k] >= 5 || (META.pts || 0) - draftCost(d) < PRICE.attr) return; d.bo[k] = (d.bo[k] || 0) + 1; }
      else { if (!d.bo[k]) return; d.bo[k] -= 1; }
      build(d); render();
    },
    dMb(x) {
      const d = S.draft, k = x.k; if (!d || d.done || d.tut || d.mode === 'hard' || !MBOOST[k]) return;
      if (d.bo[k]) delete d.bo[k]; else { if ((META.pts || 0) - draftCost(d) < PRICE.mentor) return; d.bo[k] = 1; }
      build(d); render();
    },
    dPerk(x) {
      const d = S.draft, k = x.k; if (!d || d.done || d.tut || d.mode === 'hard' || !RB.perks[k]) return;
      if (d.perks[k]) d.perks[k] = false; else { if ((META.pts || 0) - draftCost(d) < RB.perks[k].cost) return; d.perks[k] = true; }
      build(d); render();
    },
    dMode(x) {
      const d = S.draft, k = x.k, old = d && d.mode; if (!d || d.done || d.tut || ['good', 'tl', 'hard'].indexOf(k) < 0) return;
      const lim = (m) => m === 'good' || m === 'tl';        // 这两种会限定导师是谁
      d.mode = old === k ? null : k;
      if (draftCost(d) > (META.pts || 0)) { d.mode = old; return; }
      if (d.mode === 'tl') d.tl = 'B' + (1 + Math.floor(Math.random() * 5));
      // 换成好导师或天龙人时导师要重新分；退回来时把原来那位还回去，不然来回点就能白换导师
      if (lim(d.mode) && !lim(old)) { d.stash = d.mentor; d.mentor = null; }
      else if (!lim(d.mode) && lim(old)) { d.mentor = d.stash || null; d.stash = null; }
      else if (lim(d.mode) && lim(old)) d.mentor = null;
      delete d.bo.fangren; delete d.bo.renpin;
      build(d); render();
    },
    hand(d) { if (S && S.ended && RB.hand[d.k]) { S.ended.hand = d.k; save(); render(); } },
    resume, home() { V.sheet = null; save(); go('title', { enter: 'en-up' }); },   // 进度每一步都存了，随时可以退出去
    book() { go('book', { tab: 0 }); }, tab(d) { V.tab = +d.i; render(); },
    toMentor() {
      const d = S.draft;
      if (typeof clearTimeout === 'function') clearTimeout(introTimer);
      askIntro();
      if (!introReady || S.intro) return go('mentor');
      withBusy(['正在查询导师分配结果', '正在连接学院官网…', '该页面访问人数较多…', '正在加载导师主页…'], introReady, 9000).then(() => go('mentor'));
    },
    back() { if (S && S.phase === 'intro' && S.draft && !S.draft.done) go('admit'); },   // 看完导师主页还能回报到页接着改
    enter() {
      const d = S.draft;
      if (d && !d.done) { META.pts = Math.max(0, (META.pts || 0) - draftCost(d)); d.done = true; save(); }   // 点数到进组这一步才真的花出去
      cardNext = true; startTurn();
    },
    opt(d) { pickOpt(+d.i, null); },
    inc(d) { A[d.k] += 1; A.short = A.unblock = A.aiThesis = A.dumpManner = A.dumpSaid = null; A.aiLab = false; restAsk(); redock(); },
    funPick(d) {
      const F = C.free.acts, a = F[d.k]; if (!a || !A) return;
      const used = A.funPick.reduce((n, k) => n + (F[k].cost || 1), 0), i = A.funPick.lastIndexOf(d.k);
      if (used + (a.cost || 1) <= A.fun) A.funPick.push(d.k); else if (i >= 0) A.funPick.splice(i, 1);
      redock();
    },
    dec(d) { if (d.k === 'fun') { const F = C.free.acts; while (A.funPick.length && A.funPick.reduce((n, k) => n + (F[k].cost || 1), 0) > A.fun - 1) A.funPick.pop(); } A[d.k] = Math.max(0, A[d.k] - 1); A.short = A.unblock = A.aiThesis = A.dumpManner = A.dumpSaid = null; A.aiLab = false; redock(); },
    helpTo(d) { A.helpTo = d.slot; redock(); },
    dumpAsk(d) { A.dumpManner = d.m; A.dumpSaid = C.dm.ask[d.m].me; V.sheet = null; confirm(); },
    dm(d) {
      const c = S.cur, dmS = c.dm, run = S, o = dmS && dmS.opts.find((x) => x.k === d.k);
      if (!dmS || dmS.done || !o) return;
      const done = (j) => { if (run !== S || S.cur !== c || c.dm !== dmS || dmS.done) return; Eng.dmPick(S, d.k, j ? { reply: j.reply } : null); A = null; save(); render(); };
      // 敷衍、说没空不用等模型；其他的让模型按他的人设回一句
      if (LLM && LLM.enabled() && d.k !== 'busy' && d.k !== 'brush') return withBusy(TYPING, LLM.ask('dm', Eng.dmContext(S, o.text, d.k)), 6000, { mine: o.text }).then(done);
      done(null);
    },
    quoteMore() { V.quoted = V.quoted || 1; const n = V.quoted; V.quoted = 0; V.quotedN = n; render(); },
    dmClose() { if (S.cur && S.cur.dm) { S.cur.dm.closed = true; A = null; save(); } render(); },

    aiThesis(d) { A.aiThesis = d.m === 'yes'; V.sheet = null; confirm(); },
    confirm,
    short(d) { if (d.m === 'ai') A.aiLab = true; else { A.short = d.m; A.dumpTo = d.slot || null; S.doneHabit = d.m === 'done'; } V.sheet = null; confirm(); },
    unblock(d) { A.unblock = d.m; V.sheet = null; confirm(); },
    file() { V.sheet = 'file'; render(); },
    hole() { V.sheet = 'hole'; render(); },
    closeSheet() {
      const mk = canAnim() && app.querySelector('.mask');
      if (!mk) { V.sheet = null; return render(); }
      if (leaving) return;
      leaving = true; mk.classList.remove('in'); mk.classList.add('out');
      setTimeout(() => { leaving = false; V.sheet = null; render(); }, 180);
    },
    next() {
      const nx = S.cur.result.next;
      if (nx === 'ending') return leave('lv-wash', 900, () => { settleMeta(); go('ending', { step: 0, news: V.news, enter: 'en-up' }); });
      if (nx === 'goal') return go('goal', { enter: 'en-up' });
      if (nx === 'gate') return leave('lv-gate', 260, () => {
        const g = Eng.gate(S); S.cur.result.next = g.next; save();
        // 导师的签字意见按这三年现写。「审核中」的时候在后台写，最多等 4 秒
        const ctx = LLM && LLM.enabled() && typeof setTimeout === 'function' ? Eng.gateContext(S, g) : null;
        if (ctx) {
          let over = false; g.asking = true;
          const end = (j) => { if (over) return; over = true; g.asking = false; if (V.name !== 'gate' || V.g !== g) return; if (j && V.beat === 0) Eng.applyGate(S, g, j); if (V.gateWait) { V.gateWait = false; V.beat = 1; render(); } };
          LLM.ask('gate', ctx).then(end, () => end(null)); setTimeout(() => end(null), 4000);
        }
        go('gate', { g, beat: 0, enter: 'en-rise' });
      });
      if (S.t % 4 === 0) return leave('lv-week', 240, () => { cardNext = true; startTurn(); });
      // 学期中间: 不换场，把这一周收进记录，下一周接在后面
      keepWeek(); startTurn();
    },
    gateNext() {
      if (V.gateWait) return;
      if (V.beat === 0 && V.g.asking) { V.gateWait = true; return render(); }      // 意见还在写，等它一下
      if (V.beat < 2) { V.beat += 1; return render(); }
      const g = V.g;
      if (g.next === 'ending') return leave(g.pass ? 'lv-gate' : 'lv-wash', g.pass ? 260 : 900, () => { settleMeta(); go('ending', { step: 0, news: V.news, enter: 'en-up' }); });
      if (g.next === 'goal') return go('goal', { enter: 'en-up' });
      cardNext = true; startTurn();
    },
    goal(d) { Eng.chooseGoal(S, d.g); S.cur = null; save(); cardNext = true; startTurn(); },
    endNext() { V.step = (V.step || 0) + 1; render(); },
  };
  if (typeof window.addEventListener === 'function') { let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (V.name === 'title') { try { fitCover(); } catch (e) { /* 同上 */ } } }, 120); }); }
  app.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = (new FormData(ev.target).get('t') || '').trim(), kind = ev.target.dataset.form;
    if (!text || V.busy || !S || (!S.cur && kind !== 'quote')) return;
    const c = S.cur, turn = S.t;
    if (kind === 'hole') {
      if (!Eng.canHole(S)) return;
      const run = S, c0 = S.cur, done = (j) => { if (run !== S || S.cur !== c0) return; Eng.holePost(S, text, j); save(); render(); };
      if (LLM && LLM.enabled()) return withBusy(['帖子发出去了', '有人在看…', '有人点了赞', '有人在回复…'], LLM.ask('hole', Eng.holeContext(S, text)), 7000).then(done);
      return done(null);
    }
    if (kind === 'quote') {
      const e = S.ended || {}, who = new FormData(ev.target).get('who') || '导师';
      fetch('/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ who, text, college: S.college, mentor: e.mentorType, ending: e.name }) })
        .then((r) => r.json()).catch(() => ({ ok: false })).then((j) => { if (j && j.ok) { V.quoted = (V.quoted || 0) + 1; V.quoteFail = false; } else V.quoteFail = true; render(); });
      return;
    }
    if (kind === 'dumpAsk') { A.dumpManner = 'plain'; A.dumpSaid = text.slice(0, 40); V.sheet = null; return confirm(); }
    if (kind === 'dm') {
      const dmS = c.dm; if (!dmS || dmS.done) return;
      return withBusy(TYPING, LLM.ask('dm', Eng.dmContext(S, text, null)), 7000, { mine: text }).then((j) => {
        if (S.cur !== c || c.dm !== dmS || dmS.done) return;
        const fallback = dmS.kind === 'mad' ? 'here' : dmS.round === 0 ? 'listen' : 'how';
        Eng.dmPick(S, (j && dmS.opts.concat([{ k: 'vent' }, { k: 'preach' }, { k: 'brush' }]).some((o) => o.k === j.move) && j.move) || fallback, { reply: j && j.reply, text });
        A = null; save(); render();
      });
    }
    if (kind === 'pick') {
      const sc = sheetChoices(); if (!sc) return;
      return withBusy(['正在想这话算哪一种…', '正在想这话算哪一种…'], LLM.ask('choose', { 情境: sc.ask, 萝卜写的: text.slice(0, 60), 选项: sc.list.map((x, i) => ({ 编号: i + 1, 文字: x.t })) }), 5000).then((j) => {
        if (S.cur !== c || !sheetChoices()) return render();
        sc.run(sc.list[Math.round(+(j && j.pick)) - 1] || sc.list.find((x) => x.k === sc.safe), text);
      });
    }
    if (!c.event) return;
    const mine = { who: replier(), mine: text, free: true, say: c.event.speaker !== '旁白' };
    // 选项后面连着专门剧情的事件: 先看这句话算哪个选项，再照那个选项走
    if (Eng.freeMapped(S)) {
      return withBusy(mine.who ? TYPING : QUIET, LLM.ask('choose', Eng.chooseContext(S, text)), 5000, mine).then((j) => {
        if (!S.cur || S.cur !== c || !c.event || S.t !== turn) return;
        const i = Eng.freePickIndex(S, j); if (i == null) return render();
        pickOpt(i, text);
      });
    }
    withBusy(mine.who ? TYPING : QUIET, LLM.ask('free_reply', { context: Eng.freeContext(S), text }), 0, mine).then((j) => {
      if (!S.cur || S.cur !== c || !c.event || S.t !== turn) return;      // 等回复的时候局面已经变了
      c.eventShown = { speaker: c.event.speaker, text: c.event.text };
      Eng.pickFree(S, text, j);
      if (!j) c.eventDone.tags.push('模型没连上，按「歪」处理');
      A = null; save(); render();
    });
  });
  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled || V.busy || leaving) return;
    // 私聊窗口开着的时候，底下群聊里的按钮都不该能点
    if (V.name === 'turn' && S && S.cur && S.cur.dm && !S.cur.dm.closed && ['dm', 'dmClose', 'home'].indexOf(el.dataset.act) < 0) return;
    if (el.dataset.act === 'maskClose') { if (ev.target === el && (V.sheet === 'file' || V.sheet === 'hole')) acts.closeSheet(); return; }
    const f = acts[el.dataset.act];
    if (f) f(el.dataset);
  });

  load();
  go('title');
  if (LLM) LLM.ready.then(() => { if (V.name === 'title') render(); });
  // 兜底: 哪里出了没想到的错，至少把「正在输入」的遮罩和换场的锁撤掉、把画面重画一遍，不让人卡死在一块点不动的屏幕上
  if (typeof window.addEventListener === 'function') {
    const rescue = () => { if (!V.busy && !leaving) return; clearInterval(busyTimer); V.busy = null; leaving = false; try { render(); } catch (e) { /* 连重画都不行就只能刷新了 */ } };
    window.addEventListener('error', rescue); window.addEventListener('unhandledrejection', rescue);
  }
  window.__game = { get S() { return S; }, get META() { return META; }, acts, render };
})();
