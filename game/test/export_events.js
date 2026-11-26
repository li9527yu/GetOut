// 把 content.js 里的事件导出成设计文档 10.4 的 JSON 格式。用法: node test/export_events.js
const C = require('../js/content.js'), fs = require('fs'), path = require('path');
const events = C.events.filter((e) => e.id !== 'node_first_omen').map((e) => { const o = Object.assign({}, e); delete o.random; return o; });
fs.writeFileSync(path.join(__dirname, '../events.json'), JSON.stringify({ _说明: '由 js/content.js 导出，格式见设计文档 10.4。改事件请改 content.js 再重新导出。', events }, null, 1));
const by = {}; events.forEach((e) => { by[e.layer] = (by[e.layer] || 0) + 1; });
console.log(events.length, JSON.stringify(by));
