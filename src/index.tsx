import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  HF_TOKEN?: string
  ECHO_KV?: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ====================================================================
// 内存映射(开发环境兜底) —— 生产环境优先用 Cloudflare KV
// ====================================================================
const memoryStore = new Map<string, { art: string; text: string; createdAt: number }>()

// ====================================================================
// API: 调用 HuggingFace Flux.1-schnell 生成艺术图片
// ====================================================================
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json<{ image?: string; text?: string }>()
    const { image: userImage, text: memoryText } = body

    if (!memoryText) {
      return c.json({ error: '请输入记忆文字' }, 400)
    }

    const HF_TOKEN = c.env.HF_TOKEN || ''

    // 高度优化的艺术化 Prompt（双重曝光 + 水彩 + 极简构图）
    const artPrompt = `aesthetic digital art, ${memoryText}, double exposure effect, blend of grainy film texture and soft watercolor gradients, dreamlike surrealism, minimalist composition, muted pastel color palette with gold leaf accents, ethereal lighting, 4k resolution, artistic masterpiece, no distorted features`

    let base64Image: string

    if (HF_TOKEN) {
      // 调用 HuggingFace Flux.1-schnell（免费推理端点）
      const hfResponse = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: artPrompt,
            parameters: {
              num_inference_steps: 4,
              guidance_scale: 0.0,
              width: 768,
              height: 1024,
            },
          }),
        }
      )

      if (!hfResponse.ok) {
        const errText = await hfResponse.text()
        return c.json({
          error: 'HuggingFace API 调用失败',
          detail: errText,
          hint: '若是冷启动 503,请 20 秒后重试'
        }, 502)
      }

      const arrayBuffer = await hfResponse.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      base64Image = `data:image/png;base64,${btoa(binary)}`
    } else {
      // 无 token 时使用占位图(SVG 渐变 + 文字),让前端流程仍能跑通
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6B46C1"/>
            <stop offset="50%" stop-color="#9F7AEA"/>
            <stop offset="100%" stop-color="#E9D8FD"/>
          </linearGradient>
          <radialGradient id="r" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="#FFD700" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#FFD700" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="768" height="1024" fill="url(#g)"/>
        <rect width="768" height="1024" fill="url(#r)"/>
        <text x="384" y="500" font-family="serif" font-size="48" fill="white" text-anchor="middle" opacity="0.85">Echo Memory</text>
        <text x="384" y="560" font-family="serif" font-size="24" fill="white" text-anchor="middle" opacity="0.6">(Demo · Set HF_TOKEN to enable AI)</text>
      </svg>`
      base64Image = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`
    }

    // 生成唯一 ID 并存储映射
    const id = crypto.randomUUID().slice(0, 8)
    const record = { art: base64Image, text: memoryText, createdAt: Date.now() }

    if (c.env.ECHO_KV) {
      await c.env.ECHO_KV.put(`echo:${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 7 })
    } else {
      memoryStore.set(id, record)
    }

    return c.json({ id, art: base64Image, text: memoryText })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Internal error' }, 500)
  }
})

// 取回某条 echo 记录(供 AR 场景动态加载)
app.get('/api/echo/:id', async (c) => {
  const id = c.req.param('id')
  let record: { art: string; text: string; createdAt: number } | null = null

  if (c.env.ECHO_KV) {
    const raw = await c.env.ECHO_KV.get(`echo:${id}`)
    if (raw) record = JSON.parse(raw)
  } else {
    record = memoryStore.get(id) || null
  }

  if (!record) return c.json({ error: 'Not found' }, 404)
  return c.json(record)
})

// ====================================================================
// 主入口页：NFC 触发后落地的"创作 + 扫描"中心
// ====================================================================
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>ARise · EchoCards</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
<style>
  :root { --arise-purple: #6B46C1; --arise-violet: #9F7AEA; --arise-gold: #D4AF7A; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0f; color: #fff; min-height: 100vh; }
  .serif { font-family: 'Playfair Display', serif; }
  .gradient-bg {
    background:
      radial-gradient(circle at 20% 10%, rgba(107,70,193,0.55) 0%, transparent 45%),
      radial-gradient(circle at 80% 80%, rgba(159,122,234,0.45) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(212,175,122,0.15) 0%, transparent 60%),
      #0a0a0f;
  }
  .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.08); }
  .btn-primary {
    background: linear-gradient(135deg, var(--arise-purple), var(--arise-violet));
    transition: all .3s ease;
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(107,70,193,0.5); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .logo-mark {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, var(--arise-purple), var(--arise-violet));
    -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L85 88 L70 88 L62 70 L38 70 L30 88 L15 88 Z M44 56 L56 56 L50 32 Z" fill="black"/></svg>') center/contain no-repeat;
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L85 88 L70 88 L62 70 L38 70 L30 88 L15 88 Z M44 56 L56 56 L50 32 Z" fill="black"/></svg>') center/contain no-repeat;
  }
  .pulse-glow { animation: pulse 2.5s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(159,122,234,0.6); }
    50% { box-shadow: 0 0 0 24px rgba(159,122,234,0); }
  }
  .step-line { background: linear-gradient(180deg, var(--arise-violet), transparent); }
  textarea, input[type=file] { color-scheme: dark; }
  #photoPreview { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px); }
  .loader-ring {
    width: 64px; height: 64px;
    border: 3px solid rgba(159,122,234,0.2);
    border-top-color: var(--arise-violet);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body class="gradient-bg">
<main class="max-w-md mx-auto px-5 py-8">

  <!-- HEADER -->
  <header class="flex items-center justify-between mb-10">
    <div class="flex items-center gap-3">
      <div class="logo-mark"></div>
      <div>
        <h1 class="serif text-2xl font-bold leading-none">ARise</h1>
        <p class="text-xs text-white/50 mt-1 tracking-widest uppercase">Echo Cards</p>
      </div>
    </div>
    <a href="/scan" class="glass px-3 py-2 rounded-full text-xs flex items-center gap-2">
      <i class="fas fa-camera"></i> Scan
    </a>
  </header>

  <!-- HERO -->
  <section id="hero-section" class="text-center mb-10">
    <h2 class="serif italic text-3xl leading-tight mb-3">
      Your memory,<br/>reborn as art.
    </h2>
    <p class="text-white/60 text-sm leading-relaxed px-2">
      上传一张照片,写下属于它的一句话 ——<br/>AI 将把它转化为一幅悬浮于卡片之上的艺术画。
    </p>
  </section>

  <!-- CREATE FLOW -->
  <section id="create-section" class="glass rounded-3xl p-6 mb-6">
    <div class="flex items-center gap-3 mb-5">
      <span class="serif text-3xl text-white/30">01</span>
      <h3 class="text-lg font-semibold">Capture a moment</h3>
    </div>

    <label for="photoInput" class="block cursor-pointer">
      <div id="photoPreview" class="w-full aspect-[3/4] rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-white/50 overflow-hidden mb-4 relative">
        <i class="fas fa-image text-4xl mb-3 opacity-60"></i>
        <span class="text-sm">Tap to upload photo</span>
        <span class="text-xs opacity-50 mt-1">JPG / PNG · &lt; 5MB</span>
      </div>
    </label>
    <input id="photoInput" type="file" accept="image/*" class="hidden"/>

    <div class="flex items-center gap-3 mb-5 mt-8">
      <span class="serif text-3xl text-white/30">02</span>
      <h3 class="text-lg font-semibold">Speak its echo</h3>
    </div>
    <textarea id="memoryText" rows="3" maxlength="120" placeholder="The summer she taught me to swim..."
      class="w-full glass rounded-2xl p-4 text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 serif italic"></textarea>
    <div class="text-right text-xs text-white/30 mt-1"><span id="charCount">0</span> / 120</div>

    <button id="generateBtn" class="btn-primary w-full mt-6 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 pulse-glow">
      <i class="fas fa-wand-magic-sparkles"></i>
      <span>Transmute into Art</span>
    </button>
  </section>

  <!-- LOADING -->
  <section id="loading-section" class="hidden glass rounded-3xl p-10 text-center mb-6">
    <div class="loader-ring mx-auto mb-6"></div>
    <p class="serif italic text-lg mb-2">Listening to your memory...</p>
    <p class="text-xs text-white/50" id="loadingHint">Flux.1 正在描绘你的故事 (5–15s)</p>
  </section>

  <!-- RESULT -->
  <section id="result-section" class="hidden">
    <div class="glass rounded-3xl p-5 mb-4">
      <div class="flex items-center gap-3 mb-4">
        <span class="serif text-3xl text-white/30">03</span>
        <h3 class="text-lg font-semibold">Your Echo Card</h3>
      </div>
      <div class="rounded-2xl overflow-hidden bg-black">
        <canvas id="finalCanvas" class="w-full block"></canvas>
      </div>
      <p class="text-xs text-white/40 mt-3 text-center">
        Echo ID: <span id="echoId" class="font-mono text-white/70">—</span>
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <a id="scanLink" href="/scan" class="btn-primary py-4 rounded-2xl text-center font-semibold flex items-center justify-center gap-2">
        <i class="fas fa-cube"></i> View in AR
      </a>
      <button id="downloadBtn" class="glass py-4 rounded-2xl font-semibold flex items-center justify-center gap-2">
        <i class="fas fa-download"></i> Save
      </button>
    </div>
    <button id="retryBtn" class="w-full mt-3 py-3 text-sm text-white/50 hover:text-white">
      <i class="fas fa-rotate-left mr-2"></i>Create another
    </button>
  </section>

  <!-- FOOTER -->
  <footer class="mt-12 text-center text-xs text-white/30 pb-8">
    <p>ARise · Bringing AR Memory Experiences Without APPs</p>
    <p class="mt-1 opacity-60">NFC · WebAR · Flux.1-schnell</p>
  </footer>
</main>

<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const photoInput = $('photoInput');
  const photoPreview = $('photoPreview');
  const memoryText = $('memoryText');
  const charCount = $('charCount');
  const generateBtn = $('generateBtn');
  const createSection = $('create-section');
  const loadingSection = $('loading-section');
  const resultSection = $('result-section');
  const finalCanvas = $('finalCanvas');
  const echoIdEl = $('echoId');
  const scanLink = $('scanLink');
  const downloadBtn = $('downloadBtn');
  const retryBtn = $('retryBtn');
  const loadingHint = $('loadingHint');

  let userPhotoDataURL = null;

  memoryText.addEventListener('input', () => {
    charCount.textContent = memoryText.value.length;
  });

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('图片需小于 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      userPhotoDataURL = ev.target.result;
      photoPreview.innerHTML = '<img src="' + userPhotoDataURL + '" class="w-full h-full object-cover"/>';
    };
    reader.readAsDataURL(file);
  });

  // ============ Canvas 排版函数 ============
  // 在 AI 生成图底部 20% 区域叠加半透明黑色遮罩 + Playfair Display 文字
  async function composeFinalCard(artBase64, memoryStr) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const W = img.naturalWidth || 768;
        const H = img.naturalHeight || 1024;
        finalCanvas.width = W;
        finalCanvas.height = H;
        const ctx = finalCanvas.getContext('2d');

        // 1) 绘制底图
        ctx.drawImage(img, 0, 0, W, H);

        // 2) 底部 20% 半透明遮罩(从透明渐变到 0.65 黑)
        const maskTop = H * 0.78;
        const maskHeight = H - maskTop;
        const grad = ctx.createLinearGradient(0, maskTop, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.3, 'rgba(0,0,0,0.55)');
        grad.addColorStop(1, 'rgba(0,0,0,0.78)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, maskTop, W, maskHeight);

        // 3) 金色细线装饰
        ctx.strokeStyle = 'rgba(212,175,122,0.6)';
        ctx.lineWidth = Math.max(1, W / 600);
        ctx.beginPath();
        ctx.moveTo(W * 0.3, H * 0.86);
        ctx.lineTo(W * 0.7, H * 0.86);
        ctx.stroke();

        // 4) Playfair Display 文字(居中,白色,opacity 0.9)
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.floor(W / 22);
        ctx.font = 'italic 400 ' + fontSize + 'px "Playfair Display", serif';

        // 自动换行
        const maxWidth = W * 0.82;
        const words = memoryStr.split(/(\\s+)/);
        const lines = [];
        let line = '';
        for (const w of words) {
          const test = line + w;
          if (ctx.measureText(test).width > maxWidth && line.trim()) {
            lines.push(line.trim());
            line = w;
          } else { line = test; }
        }
        if (line.trim()) lines.push(line.trim());
        if (lines.length > 3) {
          lines.length = 3;
          lines[2] = lines[2].slice(0, -1) + '…';
        }

        const lineHeight = fontSize * 1.35;
        const startY = H * 0.91 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((ln, i) => {
          ctx.fillText(ln, W / 2, startY + i * lineHeight);
        });

        // 5) ARise 小标识(右下角)
        ctx.fillStyle = 'rgba(212,175,122,0.7)';
        ctx.font = '600 ' + Math.floor(W/55) + 'px "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('ARise · Echo', W - W*0.05, H - H*0.025);

        resolve(finalCanvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = artBase64;
    });
  }

  // ============ 生成流程 ============
  generateBtn.addEventListener('click', async () => {
    const text = memoryText.value.trim();
    if (!text) { alert('请写下你的记忆文字'); return; }

    createSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    // 渐进式提示
    const hints = [
      'Flux.1 正在描绘你的故事…',
      '混合双重曝光与水彩纹理…',
      '撒上一抹金箔光…',
      '即将完成,请稍候…'
    ];
    let hi = 0;
    const hintTimer = setInterval(() => {
      hi = (hi + 1) % hints.length;
      loadingHint.textContent = hints[hi];
    }, 3500);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: userPhotoDataURL, text }),
      });
      const data = await resp.json();
      clearInterval(hintTimer);

      if (!resp.ok) {
        alert('生成失败: ' + (data.error || resp.status) + '\\n' + (data.hint || ''));
        loadingSection.classList.add('hidden');
        createSection.classList.remove('hidden');
        return;
      }

      // Canvas 排版
      await composeFinalCard(data.art, data.text);
      echoIdEl.textContent = data.id;
      scanLink.href = '/scan?id=' + data.id;

      loadingSection.classList.add('hidden');
      resultSection.classList.remove('hidden');
    } catch (err) {
      clearInterval(hintTimer);
      alert('网络错误: ' + err.message);
      loadingSection.classList.add('hidden');
      createSection.classList.remove('hidden');
    }
  });

  downloadBtn.addEventListener('click', () => {
    const url = finalCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARise-Echo-' + echoIdEl.textContent + '.png';
    a.click();
  });

  retryBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    createSection.classList.remove('hidden');
    memoryText.value = '';
    charCount.textContent = '0';
    userPhotoDataURL = null;
    photoPreview.innerHTML = '<i class="fas fa-image text-4xl mb-3 opacity-60"></i><span class="text-sm">Tap to upload photo</span><span class="text-xs opacity-50 mt-1">JPG / PNG · &lt; 5MB</span>';
  });
})();
</script>
</body>
</html>`)
})

// ====================================================================
// AR 扫描页：A-Frame + AR.js,识别 ARise Logo Marker
// ====================================================================
app.get('/scan', (c) => {
  const echoId = c.req.query('id') || ''
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>ARise · Scan</title>
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
  body, html { margin:0; padding:0; overflow:hidden; background:#000; color:#fff; font-family: system-ui, sans-serif; }
  .a-enter-vr, .a-orientation-modal { display:none !important; }
  #ui-overlay {
    position: fixed; inset: 0; pointer-events: none; z-index: 10;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  #top-bar {
    pointer-events: auto;
    background: linear-gradient(180deg, rgba(0,0,0,0.8), transparent);
    padding: 16px 18px; display: flex; align-items: center; justify-content: space-between;
  }
  #top-bar a { color:#fff; text-decoration:none; font-size:14px; opacity:0.85; }
  #status {
    margin: 0 auto; padding: 10px 18px;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(10px);
    border-radius: 999px; font-size: 13px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  #status .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#9F7AEA; margin-right:8px; animation: blink 1.2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  #hint {
    pointer-events: none;
    text-align: center; padding: 24px;
    background: linear-gradient(0deg, rgba(0,0,0,0.85), transparent);
  }
  #hint h3 { font-family:'Playfair Display', serif; font-style:italic; font-size:22px; margin-bottom:6px; }
  #hint p { font-size:13px; opacity:0.7; }
  #scanFrame {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width: 70vw; max-width: 320px; aspect-ratio: 1;
    border: 2px solid rgba(159,122,234,0.7);
    border-radius: 18px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
    pointer-events: none;
  }
  #scanFrame::before, #scanFrame::after,
  #scanFrame > span::before, #scanFrame > span::after {
    content:''; position:absolute; width: 28px; height: 28px;
    border: 3px solid #D4AF7A;
  }
  #scanFrame::before { top:-2px; left:-2px; border-right:0; border-bottom:0; border-radius:18px 0 0 0; }
  #scanFrame::after { top:-2px; right:-2px; border-left:0; border-bottom:0; border-radius:0 18px 0 0; }
  #scanFrame > span::before { content:''; position:absolute; bottom:-30px; left:-30px; border-right:0; border-top:0; border-radius:0 0 0 18px; }
  #scanFrame > span::after { content:''; position:absolute; bottom:-30px; right:-30px; border-left:0; border-top:0; border-radius:0 0 18px 0; }
</style>
</head>
<body>

<div id="ui-overlay">
  <header id="top-bar">
    <a href="/"><i>←</i> Back</a>
    <div id="status"><span class="dot"></span><span id="statusText">Searching for ARise marker…</span></div>
    <span style="width:40px"></span>
  </header>

  <div id="scanFrame"><span></span></div>

  <div id="hint">
    <h3 id="hintTitle">Point at your Echo Card</h3>
    <p id="hintText">将摄像头对准卡片正面的 ARise 标识</p>
  </div>
</div>

<a-scene
  embedded
  vr-mode-ui="enabled: false"
  arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
  renderer="logarithmicDepthBuffer: true; precision: medium; antialias: true; alpha: true"
  loading-screen="enabled: false"
>
  <a-assets>
    <img id="placeholder-art" crossorigin="anonymous"
      src="data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="700" viewBox="0 0 512 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6B46C1"/><stop offset="100%" stop-color="#9F7AEA"/></linearGradient></defs><rect width="512" height="700" rx="24" fill="url(#g)"/><text x="256" y="350" font-family="serif" font-size="36" font-style="italic" fill="white" text-anchor="middle" opacity="0.9">Your Echo</text><text x="256" y="400" font-family="sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.55">awaits</text></svg>')}" />
  </a-assets>

  <!-- Marker: 使用 AR.js 预设 hiro 占位,生产可换为 type='pattern' url='/static/arise.patt' -->
  <a-marker preset="hiro" id="ariseMarker" emitevents="true">
    <a-image
      id="output-art"
      src="#placeholder-art"
      position="0 0.05 0"
      rotation="-90 0 0"
      width="1.4"
      height="2"
      opacity="0.95"
      animation="property: position; to: 0 0.4 0; dur: 1200; easing: easeOutCubic"
    ></a-image>

    <a-text
      id="echo-text"
      value=""
      align="center"
      color="#FFFFFF"
      width="2.4"
      position="0 0.06 1.2"
      rotation="-90 0 0"
      font="https://cdn.aframe.io/fonts/Roboto-msdf.json"
      negate="false"
    ></a-text>
  </a-marker>

  <a-entity camera></a-entity>
</a-scene>

<script>
(async () => {
  const params = new URLSearchParams(location.search);
  const echoId = params.get('id') || '${echoId}';
  const statusText = document.getElementById('statusText');
  const hintTitle = document.getElementById('hintTitle');
  const hintText = document.getElementById('hintText');
  const outputArt = document.getElementById('output-art');
  const echoTextEl = document.getElementById('echo-text');

  // 1) 拉取 echo 内容
  if (echoId) {
    statusText.textContent = 'Loading echo ' + echoId + '…';
    try {
      const resp = await fetch('/api/echo/' + encodeURIComponent(echoId));
      if (resp.ok) {
        const data = await resp.json();
        // 替换 a-image 的 src 为 AI 艺术图
        outputArt.setAttribute('src', data.art);
        echoTextEl.setAttribute('value', data.text);
        statusText.textContent = 'Echo ready · point camera at marker';
      } else {
        statusText.textContent = 'Echo not found · using demo art';
      }
    } catch (e) {
      statusText.textContent = 'Network error · using demo art';
    }
  } else {
    statusText.textContent = 'Demo mode · point at marker';
  }

  // 2) 监听 marker 出现/消失
  const marker = document.getElementById('ariseMarker');
  marker.addEventListener('markerFound', () => {
    hintTitle.textContent = '✦ Memory revealed';
    hintText.textContent = '保持卡片在画面中,慢慢移动观察';
    document.getElementById('scanFrame').style.display = 'none';
    statusText.textContent = 'Tracking · ARise marker locked';
  });
  marker.addEventListener('markerLost', () => {
    hintTitle.textContent = 'Re-align the card';
    hintText.textContent = '将摄像头重新对准 ARise 标识';
    document.getElementById('scanFrame').style.display = 'block';
    statusText.textContent = 'Searching for ARise marker…';
  });
})();
</script>
</body>
</html>`)
})

// Favicon: 内嵌紫色 ARise "A" SVG,避免 404
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6B46C1"/><stop offset="100%" stop-color="#9F7AEA"/>
    </linearGradient></defs>
    <rect width="100" height="100" rx="22" fill="#0a0a0f"/>
    <path d="M50 18 L82 84 L68 84 L60 66 L40 66 L32 84 L18 84 Z M44 54 L56 54 L50 32 Z" fill="url(#g)"/>
  </svg>`
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }
  })
})

// 健康检查
app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'ARise EchoCards',
  hf_configured: !!c.env.HF_TOKEN,
  storage: c.env.ECHO_KV ? 'kv' : 'memory'
}))

export default app
