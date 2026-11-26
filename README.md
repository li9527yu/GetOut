# GetOut · 逃出绝命课题组

一个网页文字游戏：扮演硕士研究生「萝卜」，三年二十四周，在导师和同门之间周旋，想办法拿到学位证走出去。

## 怎么跑

不接大模型，直接用浏览器打开 `game/index.html` 就能玩，全部按规则运行。

接大模型（导师和同门的话每局现写，可以自己打字回复）：

```bash
cd game
cp .env.example .env   # 填上自己的模型地址和密钥
npm start              # 打开 http://localhost:8787
```

服务端没有任何依赖，需要 Node 18 以上。模型走 OpenAI 兼容接口。

## 目录

| 路径 | 内容 |
|---|---|
| `game/index.html` | 页面和全部样式 |
| `game/js/engine.js` | 规则引擎 |
| `game/js/content.js` | 全部文本：事件、台词、学院、结局 |
| `game/js/ui.js` | 界面 |
| `game/js/art.js` | 代码画的人物、场景、明信片 |
| `game/js/llm.js`、`game/server.mjs` | 大模型接入 |
| `game/corpus.json` | 从公开网页采集的导师和学生原话，给模型当语感示范 |
| `game/test/` | 自动跑局和界面冒烟测试 |
| `逃出绝命课题组-设计文档.md` | 完整设计文档 |
| `balance_sim.py` | 早期的数值模拟脚本，已经落后于游戏里的规则 |

## 测试

```bash
cd game
node test/bot.js 2000        # 随机跑 2000 局，检查规则和文本
node test/ui_smoke.js 200    # 不开浏览器把界面从头点到结局
```
