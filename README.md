# ARise · EchoCards

> Bringing AR Memory Experiences Without APPs · 把照片与一句话, 转化为悬浮于卡片之上的艺术画作

## 项目概览

- **名称**: ARise EchoCards
- **目标**: 用户通过 NFC 一贴打开网页 → 上传照片+写下记忆 → AI 把它转化为艺术画 → 摄像头对准卡片即可看到画作"浮"在卡片上方
- **核心特性**:
  - 🎨 **零成本 AI 艺术化** — 使用 HuggingFace 免费推理端点调用 Flux.1-schnell
  - 📱 **无需 App** — 纯 WebAR (A-Frame + AR.js), iOS/Android 通用
  - 🎴 **NFC 一贴即开** — 物理卡片背面 NFC 标签直接打开页面
  - ✍️ **艺术排版** — Canvas 在 AI 图底部自动叠加 Playfair Display 衬线字体, 双重曝光美学
  - 🔒 **Token 安全** — HF token 仅存于后端, 永不暴露至前端

## 公网 URL

- **开发预览 (沙箱)**: https://3000-imc5w9fqnpojwo69l9mx3-0e616f0a.sandbox.novita.ai
  - 主入口 (NFC 跳转目标): `/`
  - AR 扫描页: `/scan?id=<echo_id>`
  - 健康检查: `/api/health`
- **生产部署目标**: Cloudflare Pages (尚未部署)

## 已完成功能

| 模块 | 状态 | 说明 |
|------|------|------|
| **主入口页 `/`** | ✅ | 玻璃拟态 UI, 三步式创作流 (上传 → 写文字 → 生成) |
| **AI 生成 API `/api/generate`** | ✅ | 后端代理 HuggingFace Flux.1-schnell, 含艺术化 Prompt 模板 |
| **占位降级方案** | ✅ | 未配置 HF_TOKEN 时返回紫色渐变 SVG 占位图, 流程仍可跑通 |
| **Echo 取回 `/api/echo/:id`** | ✅ | KV (生产) / Memory Map (开发) 双适配存储 |
| **Canvas 排版引擎** | ✅ | 自动换行 + 金色分隔线 + Playfair Display 斜体 + ARise 水印 |
| **AR 扫描页 `/scan`** | ✅ | A-Frame + AR.js, 监听 markerFound/markerLost 切换 UI |
| **AR Marker 识别** | ✅ (开发用 hiro) | 生产替换为 `/static/arise.patt` (训练步骤见 public/static/README.md) |
| **响应式品牌设计** | ✅ | ARise 紫色 (#6B46C1 → #9F7AEA) + 金箔色 (#D4AF7A) + 渐变光晕 |
| **Favicon** | ✅ | 内嵌 SVG 紫色 A 字标 |

## 功能入口 URI 清单

### 页面路由
| 路径 | 方法 | 用途 |
|------|------|------|
| `/` | GET | 主入口 — 创作 EchoCard (NFC 落地页) |
| `/scan` | GET | AR 扫描页 (可带 `?id=xxx` 参数加载指定 echo) |
| `/favicon.ico` | GET | 站点 icon (内嵌 SVG) |

### API 端点
| 路径 | 方法 | 入参 | 返回 |
|------|------|------|------|
| `/api/generate` | POST | `{ image?: string(base64), text: string }` | `{ id, art(base64), text }` |
| `/api/echo/:id` | GET | URL 参数 `id` | `{ art, text, createdAt }` 或 404 |
| `/api/health` | GET | — | `{ ok, service, hf_configured, storage }` |

## 数据架构

- **数据模型**:
  ```ts
  type EchoRecord = {
    art: string       // data:image/png;base64,... (AI 生成的艺术图)
    text: string      // 用户输入的记忆文字 (≤120 字)
    createdAt: number // Unix timestamp (ms)
  }
  // key: `echo:${id}` (id 为 8 位 UUID 前缀)
  ```
- **存储服务**:
  - **生产**: Cloudflare KV (`ECHO_KV` binding, TTL 7 天)
  - **开发**: 内存 Map (兜底, 进程重启即清空)
- **数据流**:
  ```
  浏览器
    ├─[POST /api/generate]──▶ Hono Worker
    │                           ├─▶ HuggingFace Flux.1-schnell API
    │                           └─▶ KV/Memory 写入 echo:<id>
    │  ◀──{ id, art base64 }────┘
    ├─ Canvas 合成最终卡片 (排版 + 水印)
    └─[跳转 /scan?id=xxx]──▶ Hono Worker
                                └─[GET /api/echo/:id]─▶ KV/Memory
                                                          │
        ◀───[a-image src=art]─── A-Frame/AR.js Marker 命中
  ```

## 用户使用指南

### 终端用户视角
1. 拿到一张 ARise 物理卡片 (5cm×7cm, 正面 ARise Logo, 背面 NFC 标签)
2. **手机一贴** NFC → 自动打开 EchoCards 网页
3. 在主页:
   - 点击虚线框 → 选择一张回忆照片 (JPG/PNG, <5MB)
   - 在文本框里写下属于这张照片的一句话 (≤120 字, 推荐英文/诗意短句)
   - 点击 **「Transmute into Art」** → AI 渲染 5–15 秒
4. 看到合成后的 Echo 卡片 (艺术图 + 衬线字 + 金线分隔)
   - **「View in AR」**: 跳转扫描页, 摄像头对准卡片正面, AR 画作浮现
   - **「Save」**: 把卡片下载到本地相册
5. 把 echo 链接 (`/scan?id=xxx`) 分享给朋友, 朋友扫描同一张卡片也能看到

### 开发者视角
```bash
# 1. 安装 (项目已预初始化, 通常无需此步)
cd /home/user/webapp && npm install

# 2. 本地开发
npm run build                                    # 构建 Cloudflare Workers bundle
pm2 start ecosystem.config.cjs                   # 启动 wrangler pages dev (port 3000)
curl http://localhost:3000/api/health            # 验证

# 3. 配置 HuggingFace Token (可选, 不配置走占位图)
# 编辑 .dev.vars 写入: HF_TOKEN=hf_xxx
# 申请: https://huggingface.co/settings/tokens (Read 权限)
pm2 restart arise-echocards

# 4. 训练自定义 Marker (生产环境)
# 见 public/static/README.md
# 训练完成后, 把 src/index.tsx 里 <a-marker preset="hiro"> 改为
# <a-marker type='pattern' url='/static/arise.patt'>
```

## 部署状态

- **平台**: Cloudflare Pages (Workers Runtime)
- **状态**: 🟡 沙箱运行中, 尚未推 GitHub / 部署生产
- **技术栈**:
  - Backend: Hono 4.x + TypeScript
  - Frontend: Tailwind CDN + Playfair Display (Google Fonts) + Font Awesome
  - WebAR: A-Frame 1.5.0 + AR.js 3.4.5
  - AI: HuggingFace Inference API (Flux.1-schnell, 4 步推理, 768×1024)
  - Storage: Cloudflare KV (生产) / In-memory Map (开发)
- **构建产物**: `dist/_worker.js` ~48 KB
- **最近更新**: 2026-04-29

## 待实施功能 (Not Yet Implemented)

- [ ] **GitHub 仓库初始化 + Push** — 等待 `setup_github_environment`
- [ ] **Cloudflare Pages 生产部署** — 等待 `setup_cloudflare_api_key` + KV 命名空间创建
- [ ] **自训练的 ARise Logo `.patt` Marker** — 当前用 AR.js 自带 hiro marker 占位 (打印测试用)
- [ ] **真实人像照片 img2img 风格化** — 当前 Flux 仅用文字 prompt, 后续可切到 SDXL Refiner / IP-Adapter 实现 face preservation
- [ ] **AR 场景中"双重曝光"3D 粒子效果** — 仅在 marker 命中时叠加金箔粒子
- [ ] **WeChat / Email 分享卡片** — 生成 OG image meta 让链接预览即视觉化
- [ ] **NFC 写入工具页** — 给品牌方批量写卡的小工具

## 推荐下一步开发

按优先级排序:

1. **🎯 (P0) 申请 HuggingFace Token + 实测真实 Flux 出图** — 验证艺术 prompt 是否符合预期, 不行就微调 prompt 模板
2. **🎯 (P0) 印一张物理测试卡** — 5cm×5cm 黑边白底 ARise Logo, 用 AR.js Marker Generator 训练 `.patt`, 替换 hiro
3. **🟡 (P1) 接 Cloudflare KV** — `npx wrangler kv:namespace create ECHO_KV`, 把 ID 写入 `wrangler.jsonc`
4. **🟡 (P1) 部署到 Cloudflare Pages** — 拿到 `*.pages.dev` 公开域名后写入 NFC 标签
5. **🟢 (P2) 加 IP-Adapter 让 AI 真正用上用户上传的人脸** — 当前只用文字, 后续支持 image-to-image
6. **🟢 (P2) 为长链接做短链 (`/e/<6位>` → `/scan?id=<完整>`)** — 卡片背面手抄链接更友好

## 项目结构

```
webapp/
├── src/
│   ├── index.tsx        # 主应用 (Hono routes + 主页 HTML + AR 扫描页 HTML + API)
│   └── renderer.tsx     # JSX renderer (保留模板, 本项目主要 c.html 直出)
├── public/
│   └── static/
│       ├── style.css    # (预留)
│       └── README.md    # AR Marker 训练指南 + 印刷规格说明
├── dist/                # vite build 产物 (_worker.js)
├── ecosystem.config.cjs # PM2 配置 (wrangler pages dev port 3000)
├── wrangler.jsonc       # Cloudflare Pages 配置
├── vite.config.ts       # Vite + Hono Cloudflare Pages plugin
├── .dev.vars            # 本地环境变量 (HF_TOKEN, 不入 git)
└── package.json
```

## License & Credits

- ARise 品牌与 logo: 项目方所有
- AR.js · A-Frame · Hono · Tailwind: 各自开源协议
- Flux.1-schnell: Apache 2.0 (Black Forest Labs)
- Playfair Display: SIL Open Font License
