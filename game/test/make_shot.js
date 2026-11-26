// 生成 test/shot.html: 它就是 index.html 换了脚本路径、末尾接上 shot_driver.js。
// 以前 shot.html 是手工维护的一份副本，改了样式就容易两边不一致。现在它是生成物，不进仓库。
// 用法: node test/make_shot.js
const fs = require('fs'), path = require('path');
const dir = __dirname, html = fs.readFileSync(path.join(dir, '../index.html'), 'utf8'), drv = fs.readFileSync(path.join(dir, 'shot_driver.js'), 'utf8');
if (html.indexOf('</body>') < 0) throw new Error('index.html 里找不到 </body>');
fs.writeFileSync(path.join(dir, 'shot.html'), html.replace(/src="js\//g, 'src="../js/').replace('</body>', '<script>\n' + drv + '</script></body>'));
console.log('已生成 test/shot.html');
