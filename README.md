# ARise · An Echo Gallery

> *"Memory is not stored. It is whispered."*
> 一座纯 Web 的虚拟艺术馆 —— 一句话变成画作,画作变成房间,房间属于你独有,却可以悄悄递给一个人。

## 项目概览

- **名称**: ARise · An Echo Gallery (前身 EchoCards,已彻底转型为纯虚拟艺术体验)
- **目标**: 把"上传照片+写一句话+选一种气质"的极简动作,转化为一段电影感的三幕剧式 Web 艺术体验
- **核心特性**:
  - 🌌 **三幕剧体验流** — The Threshold(入境) → The Whisper(创作) → The Reveal(揭幕)
  - 🎨 **零成本 AI 艺术化** — HuggingFace Flux.1-schnell 免费推理端点
  - 🖼 **3D 倾斜画框 + 视差** — 鼠标/陀螺仪驱动,纯 CSS perspective
  - ✨ **粒子尘埃 + 射灯 + 揭幕动画** — 模拟美术馆开灯瞬间
  - 📜 **博物馆级排版** — Cormorant Garamond 衬线 + 铜质标牌 + 编号 + 策展人评语
  - 🎫 **展览门票分享** — 复制链接给朋友, 朋友打开会有"光降临你身上"的入境动画
  - 🎭 **四种声音(Voice)** — Sun-bleached / Underwater / Velvet midnight / Pressed flower

## 公网 URL

- **开发预览**: https://3000-imc5w9fqnpojwo69l9mx3-0e616f0a.sandbox.novita.ai
  - `/` — The Threshold(入境页)
  - `/create` — The Whisper(三屏滚动创作)
  - `/gallery/:id` — The Reveal(画廊揭幕)
  - `/echo/:id` — 分享落地页(3.5s 后自动跳画廊)

## 已完成功能

| 模块 | 状态 | 说明 |
|------|------|------|
| **The Threshold (`/`)** | ✅ | 呼吸光晕 + 旋转金圈 + 单句衬线诗 + 滚动展开三幕介绍 |
| **The Whisper (`/create`)** | ✅ | 三屏 scroll-driven 创作流, 顶部金线进度条, 自动滚到下一章 |
| **风格选择 (4 种 voice)** | ✅ | 色板 + 衬线名 + 选中态金色描边, 注入 Flux prompt |
| **AI 生成 + 占位降级** | ✅ | 没填 HF_TOKEN 时返回四种风格独立的艺术 SVG 占位 |
| **载入仪式 (Loader Veil)** | ✅ | 紫色脉动光球 + 五句诗意提示轮换淡入淡出 |
| **The Reveal (`/gallery/:id`)** | ✅ | 黑场幕布 + 顶光 + 地面反射 + 28 颗向上飘的金色尘埃 |
| **3D 画框 + 视差** | ✅ | 鼠标 mousemove + deviceorientation 双驱动 |
| **铜质标牌 (Plaque)** | ✅ | № 编号 + 标题 + 引文 + Voice 标签 + 策展人评语 |
| **展览门票 (Ticket)** | ✅ | 右下角抽屉式滑入, 复制链接 / 创建新 echo |
| **画作 Lightbox 放大** | ✅ | 点击画框全屏放大, 模糊背景 |
| **分享落地页 (`/echo/:id`)** | ✅ | "Someone left you an echo" 三段式入境后自动跳画廊 |
| **错误降级** | ✅ | echo 不存在 → "This echo has dissolved" 诗意空状态页 |

## 功能入口 URI 清单

### 页面路由
| 路径 | 用途 |
|---|---|
| `GET /` | The Threshold — 入境 |
| `GET /create` | The Whisper — 创作 |
| `GET /gallery/:id` | The Reveal — 揭幕画廊 |
| `GET /echo/:id` | 分享链接落地(meta refresh 跳转 `/gallery/:id`) |
| `GET /favicon.ico` | 紫金渐变 SVG 图标 |

### API
| 路径 | 方法 | 入参 | 返回 |
|---|---|---|---|
| `/api/generate` | POST | `{ text, voice }` (voice ∈ sun-bleached/underwater/velvet-midnight/pressed-flower) | `{ id, art, text, voice, voiceLabel, palette, title, curatorNote, number, createdAt }` |
| `/api/echo/:id` | GET | URL `id` | 同上结构;404 → `{error:'Not found'}` |
| `/api/health` | GET | — | `{ ok, service, hf_configured, storage }` |

## 数据架构

### 数据模型
```ts
type EchoRecord = {
  art: string         // data URL (PNG from Flux 或 SVG 占位)
  text: string        // 用户那句话 (≤140)
  voice: string       // 'sun-bleached' | 'underwater' | 'velvet-midnight' | 'pressed-flower'
  title: string       // 取 text 前 4 个词作为画作标题
  curatorNote: string // 从 11 条候选里按 hash 选取的"策展人短语"
  createdAt: number   // 时间戳, 用于生成 № A-YYYY.MM.DD / id
}
// key: `echo:${id}` (id 为 8 位 UUID 前缀)
```

### 存储
- **生产**: Cloudflare KV (`ECHO_KV` binding, TTL 30 天)
- **开发**: 内存 Map (服务重启即清空)

### 数据流
```
浏览器 (/create)
  ├─ 选 fragment / 写 echo / 挑 voice
  ├─ POST /api/generate {text, voice}
  │    └─▶ Flux.1-schnell (768×1024, 4 步)
  │    └─▶ 生成 title + curatorNote
  │    └─▶ 写入 KV / Memory
  ◀── { id, ...record } ──┘
  └─ window.location → /gallery/:id

浏览器 (/gallery/:id)
  ├─ GET /api/echo/:id
  ├─ 等图片解码 → 揭幕动画 (curtain lift + spot fade-in)
  ├─ 注入画框 + 标牌 + 票券
  ├─ 鼠标 mousemove → 画框 rotateY/X 视差
  └─ 点击 frame → Lightbox 全屏

朋友打开 /echo/:id
  ├─ "Someone left you an echo" 入境 (3 段动画)
  └─ meta refresh → /gallery/:id (同样揭幕)
```

## 用户体验流程(三幕剧)

### 第一幕 · 入境 (`/`)
1. 黑色背景, 中央紫色光晕缓慢呼吸 (7s 周期)
2. 两层金色细线圆圈反向旋转
3. 顶部 fade-in: **ARise · An Echo Gallery**
4. 中央 fade-up: *"Whisper a memory. We'll turn it into light."*
5. 滚动 → 三幕介绍 → 闭幕引言 → "Begin →"

### 第二幕 · 低语 (`/create`)
1. **i. Fragment** — 220×280 虚框, 上传照片后变成柔焦光斑(blur+saturate),0.7s 后自动滚到下一章
2. **ii. Echo** — 衬线斜体大输入框, 下方金线焦点态, 字符计数 + "whispered" 状态
3. **iii. Voice** — 4 个色块卡片, 选中后金边亮起, 召唤按钮才解禁
4. 点击 **Summon the Echo** → 全屏暗场 + 紫色脉动光球 + 5 句诗轮换 → 跳画廊

### 第三幕 · 揭幕 (`/gallery/:id`)
1. 进入即黑场, 中央显示 *"A light is descending —"* (1.6s)
2. 黑幕淡出 → 顶部射灯亮起 → 画作从下方浮入(2.4s)
3. 画作:14px 黑色画框 + 2px 金色边线 + 80px 紫色阴影
4. 标牌:№ 编号 / 标题 / 引文 / Voice 色点 / 策展人评语
5. 鼠标移动 → 画框 6° 视差倾斜
6. 3.5s 后右下角滑入展览门票, 提供"复制链接"和"创建新 echo"

## 部署状态

- **平台**: Cloudflare Pages (Workers Runtime)
- **状态**: 🟡 沙箱运行中
- **技术栈**:
  - Backend: Hono 4.x + TypeScript (single-file, ~1130 行)
  - Frontend: 纯原生 + Cormorant Garamond + Inter (Google Fonts)
  - AI: HuggingFace Inference API · Flux.1-schnell (768×1024, 4 步推理)
  - Storage: Cloudflare KV (生产) / In-memory Map (开发)
- **构建产物**: `dist/_worker.js` ~70 KB
- **最近更新**: 2026-05-02

## 待实施 (Not Yet Implemented)

- [ ] **HuggingFace Token 实测** — 当前用占位 SVG, 填入 `.dev.vars` HF_TOKEN 后立即升级为真 AI 出图
- [ ] **GitHub 仓库 + Cloudflare Pages 生产部署**
- [ ] **公开 Archive 瀑布流** (`/archive`) — 看所有人的公开 echoes
- [ ] **更精细的"策展人评语"生成** — 改用 LLM 而不是固定 11 条候选
- [ ] **iOS Safari 陀螺仪权限申请** (`DeviceOrientationEvent.requestPermission`)
- [ ] **Open Graph meta** — 分享链接预览图自动渲染画作 + 标题
- [ ] **更多 voice 色调** — 拓展到 8-10 种,加入 "Iron rain" / "Honey hour" 等

## 推荐下一步

1. **🎯 (P0) 申请 HF_TOKEN** — 立刻让 4 种 voice 出真实艺术图(目前只是占位 SVG)
2. **🎯 (P0) 在真实手机上跑一遍** — 验证陀螺仪视差、滚动节奏、loader 时长是否符合预期
3. **🟡 (P1) 接 Cloudflare KV** — 让 echo 不会因服务重启消失
4. **🟡 (P1) 部署到 Cloudflare Pages 拿真 URL** — 才能把分享链接给朋友
5. **🟢 (P2) 加 Open Graph 元数据** — 微信/Twitter 预览能看到画作

## 项目结构

```
webapp/
├── src/
│   ├── index.tsx        # 全部业务: 4 个页面 + 3 个 API + 风格定义 (~1130 行)
│   └── renderer.tsx     # JSX renderer (本项目主要 c.html 直出, 此文件保留未用)
├── public/static/
│   └── style.css        # (预留, 未使用)
├── ecosystem.config.cjs # PM2 (wrangler pages dev :3000)
├── wrangler.jsonc       # Cloudflare Pages 配置
├── vite.config.ts       # Vite + Hono Cloudflare Pages plugin
├── .dev.vars            # HF_TOKEN (gitignored)
└── package.json
```

## License & Credits

- ARise 品牌: 项目方所有
- Cormorant Garamond / Inter: Google Fonts (SIL OFL)
- Flux.1-schnell: Apache 2.0 (Black Forest Labs)
- Hono: MIT
