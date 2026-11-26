// 截图用的驱动脚本: 按网址 # 后面的名字把游戏点到某个画面停住。由 make_shot.js 拼进 shot.html，不要直接打开这个文件。
// 用法: node test/make_shot.js   然后用无头浏览器打开 test/shot.html#event 之类的地址截图。
window.__noAnim=true;   // 截图脚本是同步连点的，不能等过渡动画
(function(){
  const want=location.hash.slice(1), g=window.__game; localStorage.clear();
  const stop={
    admit:()=>/录取通知书/.test(app.innerHTML), mentor:()=>/导师信息/.test(app.innerHTML),
    sick:()=>g.S&&g.S.cur&&g.S.cur.event&&/^sick/.test(g.S.cur.event.id), rest0:()=>g.S&&g.S.t>=4&&/本周精力/.test(app.innerHTML)&&g.S.cur.ap>=3, rest:()=>g.S&&g.S.t>=4&&/本周精力/.test(app.innerHTML)&&g.S.cur.ap>=3,
    picked:()=>g.S&&g.S.t>=3&&g.S.cur&&g.S.cur.eventDone&&g.S.cur.eventDone.tags.length>0,
    voice:()=>g.S&&g.S.t>=2&&g.S.cur&&g.S.cur.event&&g.S.cur.msgs.some(m=>m.dispatch), mile:()=>g.S&&g.S.cur&&g.S.cur.result&&g.S.cur.result.lines.some(l=>l.who==='里程碑'), file3:()=>g.S&&g.S.t>=13&&/本周精力/.test(app.innerHTML), file4:()=>g.S&&g.S.t>=13&&/本周精力/.test(app.innerHTML), file2:()=>g.S&&g.S.t>=13&&/本周精力/.test(app.innerHTML),
    restfail:()=>g.S&&g.S.cur&&g.S.cur.result&&g.S.cur.result.lines.some(l=>/没歇成/.test(l.tag||'')), gate3:()=>/stampbox/.test(app.innerHTML)&&/学位论文答辩申请表/.test(app.innerHTML),
    dmvent:()=>g.S&&g.S.cur&&g.S.cur.dm&&g.S.cur.dm.kind==='vent'&&!g.S.cur.dm.done&&g.S.cur.dm.round===1, dmmad:()=>g.S&&g.S.cur&&g.S.cur.dm&&g.S.cur.dm.kind==='mad'&&!g.S.cur.dm.done, dumpask:()=>/怎么跟/.test(app.innerHTML),
    pcard:()=>g.S&&g.S.cur&&g.S.cur.result&&g.S.cur.result.lines.some(l=>l.who==='明信片'), file5:()=>g.S&&g.S.t>=13&&/本周精力/.test(app.innerHTML)&&Object.keys(g.S.cards||{}).length>=3,
    holeshot:()=>g.S&&g.S.t>=6&&/本周精力/.test(app.innerHTML),
    event:()=>g.S&&g.S.cur&&g.S.cur.event&&g.S.t>=3, alloc:()=>g.S&&g.S.t>=10&&/本周精力/.test(app.innerHTML)&&g.S.ai.unlocked,
    result:()=>g.S&&g.S.t>=5&&g.S.cur&&g.S.cur.result&&g.S.cur.result.lines.length>=2,
    short:()=>/怎么交代/.test(app.innerHTML), gate:()=>/stampbox/.test(app.innerHTML)&&/申请表/.test(app.innerHTML), goal:()=>/去向意向/.test(app.innerHTML),
    end0:()=>/学籍状态变更通知/.test(app.innerHTML), end1:()=>/thesis-page/.test(app.innerHTML), end2:()=>/已解密/.test(app.innerHTML), end3:()=>/本次新增归档/.test(app.innerHTML),
    file:()=>false, title:()=>true, book:()=>false };
  const app=document.getElementById('app');
  function click0(){const bs=[...app.querySelectorAll('button[data-act]:not([disabled])')].filter(b=>!['file','hole','book','home','closeSheet','new','tab'].includes(b.dataset.act));const c=bs.find(b=>b.dataset.act==='confirm'&&/就这样|熬过|没有精力/.test(b.textContent));const b=(c&&Math.random()<.6)?c:bs[Math.floor(Math.random()*bs.length)];if(b)b.click();}
  if(want==='busydemo'){g.acts.new({});for(let i=0;i<6000&&!(g.S&&g.S.t>=6&&/本周精力/.test(app.innerHTML));i++)click0();app.insertAdjacentHTML('beforeend','<div class="busy"><div class="busy-card"><div class="busy-dots"><i></i><i></i><i></i></div><div>对方正在输入…</div><div class="busy-bar"><i></i></div></div></div>');return;}
  if(want==='title')return;
  if(want.slice(0,4)==='book'){for(let n=0;n<14;n++){g.acts.new({});for(let i=0;i<4000&&!/本次新增归档/.test(app.innerHTML);i++)click();}g.acts.book({});if(want.length>4)g.acts.tab({i:+want[4]});if(want[5]==='s'){const sc=app.querySelector('.scroll');sc.scrollTop=900;}if(want[5]==='o'){const d=app.querySelector('details.mfold');if(d)d.open=true;}return;}
  g.acts.new({});
  function click(){const bs=[...app.querySelectorAll('button[data-act]:not([disabled])')].filter(b=>!['file','hole','book','home','closeSheet','new','tab'].includes(b.dataset.act));
    const c=bs.find(b=>b.dataset.act==='confirm'&&/就这样|熬过|没有精力/.test(b.textContent));
    const b=(c&&Math.random()<.6)?c:bs[Math.floor(Math.random()*bs.length)]; if(b)b.click();}
  for(let i=0;i<6000;i++){ if(want==='file'&&g.S&&g.S.t>=12&&/本周精力/.test(app.innerHTML)){g.acts.file({});break;}
    if(stop[want]&&stop[want]())break; if(/本次新增归档/.test(app.innerHTML)){g.acts.new({});} click(); }
  if(want==='rest'||want==='rest0'){const q=(s)=>app.querySelector(s);for(let i=0;i<4&&q('[data-act=dec][data-k=lab]:not([disabled])');i++)q('[data-act=dec][data-k=lab]').click();for(let i=0;i<4&&q('[data-act=dec][data-k=thesis]:not([disabled])');i++)q('[data-act=dec][data-k=thesis]').click();q('[data-act=inc][data-k=heal]').click();if(want==='rest')g.acts.restPick({});}
  if(want==='voice'){const m=g.S.cur.msgs.find(m=>m.dispatch);m.text='@萝卜 〔语音 47″〕'+m.text.replace(/^@\S+\s*/,'');const p=g.S.cur.msgs.find(x=>x.chatter);if(p)p.text='（撤回了一条消息）';g.acts.file({});g.acts.closeSheet({});}
  if(want==='file3'||want==='file4'){g.acts.file({});const sh=app.querySelector('.sheet');const ds=[...sh.querySelectorAll('details')];if(want==='file3'){ds.forEach((d,i)=>d.open=i===2);}else{ds.forEach((d,i)=>d.open=i>=3);}sh.scrollTop=0;}
  if(want==='file5'){g.acts.file({});const sh=app.querySelector('.sheet');[...sh.querySelectorAll('details')].forEach((d,i)=>d.open=i===2);sh.scrollTop=260;}
  if(want==='book3'){}
  if(want==='holeshot'){window.Engine.holePost(g.S,'组会讲到第三页他开始看手机。讲完他说：重新讲一遍，我刚才没听。',{san:5,replies:['世另我。','我导是讲到第一页就开始看。'],likes:128,named:false,note:'你把这句话憋了三天。'});g.acts.hole({});}
  if(want==='file2'){g.acts.file({});const sh=app.querySelector('.sheet');if(sh)sh.scrollTop=330;}
})();
