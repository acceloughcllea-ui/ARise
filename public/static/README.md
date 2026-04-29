# ARise EchoCards · Static Assets

本目录用于存放 AR Marker 与品牌资源。

## 必备文件

### 1. `arise.patt` — AR.js 自定义 Marker
- 用 ARise Logo 训练而成的 pattern 文件
- 训练工具:https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html
- 训练步骤:
  1. 上传 `arise-logo-bw.png`(高对比度黑白版,边缘清晰)
  2. 下载 `pattern-arise.patt`
  3. 重命名为 `arise.patt` 放到本目录
  4. 在 `src/index.tsx` 的 `/scan` 路由中,把 `<a-marker preset="hiro">` 改为
     `<a-marker type='pattern' url='/static/arise.patt'>`

### 2. `arise-logo-bw.png` — Marker 印刷母版
- 5cm × 5cm,黑色 logo + 白色边框(粗黑边框是 AR.js 识别关键)
- 用于卡片正面印刷

## 当前状态
开发期间默认使用 AR.js 自带的 `hiro` marker(预置样张可在
https://stemkoski.github.io/AR-Examples/markers/hiro.png 下载打印用于测试),
确认流程跑通后再替换为自训练的 ARise marker。
