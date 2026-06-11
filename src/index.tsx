import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { indexHtml } from './pages/index'
import { exhibitHtml } from './pages/exhibit'
import { archiveHtml } from './pages/archive'

type Bindings = {
  HF_TOKEN?: string
  ECHO_KV?: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// ===================================================================
// /exhibit  · Live Exhibit (从 arise-echo-gallery-7nz.pages.dev 复刻)
// ===================================================================
app.get('/exhibit', (c) => c.html(exhibitHtml))

// ===================================================================
// /archive  · The Archive (从 arise-echo-gallery-7nz.pages.dev 复刻)
// ===================================================================
app.get('/archive', (c) => c.html(archiveHtml))

// ========== 内存兜底 ==========
const memoryStore = new Map<string, EchoRecord>()

type EchoRecord = {
  art: string         // data URL of generated image
  text: string        // user's whisper
  voice: string       // style key
  title: string       // generated poetic title
  curatorNote: string // generated curator's note
  createdAt: number
}

// ========== 风格定义 ==========
const VOICES: Record<string, { label: string; prompt: string; palette: string }> = {
  'sun-bleached': {
    label: 'Sun-bleached memory',
    prompt: 'sun-faded film photograph aesthetic, warm amber and gold leaf tones, hazy summer light, grainy texture, washed-out highlights, dreamlike nostalgia, soft golden hour glow',
    palette: '#D4AF7A',
  },
  'underwater': {
    label: 'Underwater dream',
    prompt: 'underwater dream aesthetic, refracted teal and sapphire light, soft caustic patterns, weightless suspension, blurred edges as if seen through deep water, ethereal aquatic surrealism',
    palette: '#7AB8D4',
  },
  'velvet-midnight': {
    label: 'Velvet midnight',
    prompt: 'velvet midnight aesthetic, deep indigo and violet tones, scattered stardust, soft moonlit glow, cosmic surrealism, gentle bokeh, intimate nocturnal quietude',
    palette: '#9F7AEA',
  },
  'pressed-flower': {
    label: 'Pressed flower',
    prompt: 'pressed flower aesthetic, faded sepia and dusty rose tones, aged paper texture, botanical illustration sensibility, delicate translucent petals, vintage herbarium specimen quality',
    palette: '#C9A4A4',
  },
}

// ========== 标题与策展人评语生成 ==========
function generateTitle(text: string): string {
  const cleaned = text.trim().replace(/[.,;:!?…—-]+$/g, '')
  const words = cleaned.split(/\s+/).slice(0, 4).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const NOTE_FRAGMENTS = [
  'a study in fading light',
  'on the architecture of remembering',
  'where silence becomes a color',
  'a small monument to a soft hour',
  'translation of a private weather',
  'an essay in the language of dust',
  'the texture of an almost-forgotten room',
  'cartography of an inner season',
  'a quiet refusal to be summarized',
  'notes on the gravity of small things',
  'an inventory of what was nearly said',
]
function generateCuratorNote(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return NOTE_FRAGMENTS[h % NOTE_FRAGMENTS.length]
}

function formatEchoNumber(id: string, createdAt: number): string {
  const d = new Date(createdAt)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `№ A-${yyyy}.${mm}.${dd} / ${id}`
}

// ========== AI 生成 ==========
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json<{ text?: string; voice?: string }>()
    const memoryText = (body.text || '').trim()
    const voiceKey = body.voice && VOICES[body.voice] ? body.voice : 'velvet-midnight'

    if (!memoryText) return c.json({ error: 'Whisper cannot be empty' }, 400)

    const voice = VOICES[voiceKey]

    const artPrompt = `${voice.prompt}, inspired by the memory: "${memoryText}", abstract figurative art, double exposure, museum-quality fine art, painterly, no human faces, no text, no letters, no signature, vertical composition, evocative atmosphere, masterful composition`

    let base64Image: string

    // ============================================================
    // Pollinations.ai —— 完全免费、无需 token、无需注册
    // 直接 GET 请求 image.pollinations.ai/prompt/<encoded>?...
    // 返回真正的 JPEG 图片
    // ============================================================
    try {
      const seed = Math.floor(Math.random() * 1_000_000)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(artPrompt)}?width=768&height=1024&nologo=true&enhance=true&seed=${seed}&model=flux`

      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'image/jpeg,image/png,image/*' },
      })

      if (!resp.ok) {
        console.warn('[Pollinations] non-OK:', resp.status)
        // 失败就回退占位艺术,流程不中断
        base64Image = makePlaceholderArt(voice.palette, voiceKey)
      } else {
        const ct = resp.headers.get('content-type') || 'image/jpeg'
        const arrayBuffer = await resp.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        // 兜底:返回的不是图,也回退占位
        if (bytes.length < 1024) {
          base64Image = makePlaceholderArt(voice.palette, voiceKey)
        } else {
          let binary = ''
          const CHUNK = 0x8000
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any)
          }
          base64Image = `data:${ct};base64,${btoa(binary)}`
        }
      }
    } catch (e) {
      console.warn('[Pollinations] fetch error:', e)
      base64Image = makePlaceholderArt(voice.palette, voiceKey)
    }

    const id = crypto.randomUUID().slice(0, 8)
    const record: EchoRecord = {
      art: base64Image,
      text: memoryText,
      voice: voiceKey,
      title: generateTitle(memoryText),
      curatorNote: generateCuratorNote(memoryText + voiceKey),
      createdAt: Date.now(),
    }

    if (c.env.ECHO_KV) {
      await c.env.ECHO_KV.put(`echo:${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 })
    } else {
      memoryStore.set(id, record)
    }

    return c.json({ id, ...record, number: formatEchoNumber(id, record.createdAt), voiceLabel: voice.label })
  } catch (e: any) {
    return c.json({ error: e?.message || 'Internal error' }, 500)
  }
})

function makePlaceholderArt(palette: string, voiceKey: string): string {
  // 给四种风格各一种独特的 SVG 占位艺术
  const variants: Record<string, string> = {
    'sun-bleached': `<defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#F5DEB3"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#3a2818"/></radialGradient></defs><rect width="768" height="1024" fill="url(#g)"/><circle cx="384" cy="360" r="220" fill="#FFE9C4" opacity="0.18"/><circle cx="384" cy="360" r="140" fill="#FFE9C4" opacity="0.12"/>`,
    'underwater': `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a4d6b"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#0a1a2a"/></linearGradient></defs><rect width="768" height="1024" fill="url(#g)"/><path d="M 0 300 Q 200 250 400 320 T 800 300" stroke="#fff" stroke-width="1" fill="none" opacity="0.15"/><path d="M 0 500 Q 200 450 400 520 T 800 500" stroke="#fff" stroke-width="1" fill="none" opacity="0.12"/><path d="M 0 700 Q 200 650 400 720 T 800 700" stroke="#fff" stroke-width="1" fill="none" opacity="0.1"/>`,
    'velvet-midnight': `<defs><radialGradient id="g" cx="50%" cy="40%" r="80%"><stop offset="0%" stop-color="#5a3a8a"/><stop offset="50%" stop-color="${palette}"/><stop offset="100%" stop-color="#0a0420"/></radialGradient></defs><rect width="768" height="1024" fill="url(#g)"/><g fill="#fff"><circle cx="120" cy="180" r="1.2" opacity="0.7"/><circle cx="280" cy="90" r="0.8" opacity="0.5"/><circle cx="480" cy="220" r="1" opacity="0.6"/><circle cx="620" cy="120" r="1.4" opacity="0.8"/><circle cx="180" cy="320" r="0.6" opacity="0.4"/><circle cx="540" cy="380" r="0.9" opacity="0.5"/><circle cx="700" cy="260" r="1" opacity="0.6"/><circle cx="80" cy="450" r="0.7" opacity="0.4"/></g>`,
    'pressed-flower': `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8d8c8"/><stop offset="100%" stop-color="${palette}"/></linearGradient></defs><rect width="768" height="1024" fill="url(#g)"/><g stroke="#7a5050" stroke-width="0.8" fill="none" opacity="0.35"><path d="M 384 700 Q 380 500 384 350"/><path d="M 384 450 Q 320 420 280 380"/><path d="M 384 480 Q 450 450 490 410"/><circle cx="280" cy="380" r="22" fill="#a06870" opacity="0.5"/><circle cx="490" cy="410" r="18" fill="#a06870" opacity="0.5"/><circle cx="384" cy="350" r="26" fill="#9a5060" opacity="0.55"/></g>`,
  }
  const inner = variants[voiceKey] || variants['velvet-midnight']
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">${inner}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

app.get('/api/echo/:id', async (c) => {
  const id = c.req.param('id')
  let record: EchoRecord | null = null
  if (c.env.ECHO_KV) {
    const raw = await c.env.ECHO_KV.get(`echo:${id}`)
    if (raw) record = JSON.parse(raw)
  } else {
    record = memoryStore.get(id) || null
  }
  if (!record) return c.json({ error: 'Not found' }, 404)
  const voice = VOICES[record.voice] || VOICES['velvet-midnight']
  return c.json({ id, ...record, number: formatEchoNumber(id, record.createdAt), voiceLabel: voice.label, palette: voice.palette })
})

// ===================================================================
// 共用 head:字体 + 全站基调样式
// ===================================================================
const sharedHead = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<style>
  :root {
    --bg: #0a0612;
    --bg-deep: #050309;
    --ink: #f5ede0;
    --ink-soft: rgba(245,237,224,0.6);
    --ink-faint: rgba(245,237,224,0.3);
    --violet: #9F7AEA;
    --gold: #D4AF7A;
    --line: rgba(245,237,224,0.12);
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background: var(--bg); color: var(--ink); }
  body { font-family: 'Inter', system-ui, sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .serif { font-family: 'Cormorant Garamond', 'Times New Roman', serif; font-weight: 300; }
  .serif-italic { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; }
  .uppercase-tracked { text-transform: uppercase; letter-spacing: 0.28em; font-size: 11px; font-weight: 400; }
  a { color: inherit; text-decoration: none; }
  .gold { color: var(--gold); }
  .violet { color: var(--violet); }
  .ink-soft { color: var(--ink-soft); }
  .ink-faint { color: var(--ink-faint); }
  /* 通用细金线分隔 */
  .hairline { display:block; height:1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0.5; }
  .hairline-short { width: 40px; height: 1px; background: var(--gold); opacity: 0.7; }
  /* 滚动条隐藏 */
  ::-webkit-scrollbar { width: 0; height: 0; }
</style>
`

// ===================================================================
// /  · The Threshold 入境页
// ===================================================================
app.get('/', (c) => c.html(indexHtml))

// ===================================================================
// /create  · The Whisper 创作页(三屏 scroll-driven)
// ===================================================================
app.get('/create', (c) => {
  const voicesJson = JSON.stringify(
    Object.entries(VOICES).map(([k, v]) => ({ key: k, label: v.label, palette: v.palette }))
  )
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · The Whisper</title>
<style>
  body { background: var(--bg-deep); overflow-y: scroll; scroll-behavior: smooth; }

  /* 顶部进度 */
  .progress-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 1px;
    background: var(--line); z-index: 100;
  }
  .progress-fill {
    height: 100%; background: var(--gold); width: 0%;
    transition: width .8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .top-nav {
    position: fixed; top: 22px; left: 0; right: 0; z-index: 99;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 28px; pointer-events: none;
  }
  .top-nav a, .top-nav span { pointer-events: auto; font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink-faint); }
  .top-nav a:hover { color: var(--gold); }

  /* 每个 chapter 全屏 */
  .chapter {
    min-height: 100vh; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 80px 24px; position: relative;
  }
  .chapter-inner { width: 100%; max-width: 600px; text-align: center; }
  .chapter-num {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 14px; color: var(--gold); letter-spacing: 0.3em;
    margin-bottom: 14px;
  }
  .chapter-title {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: clamp(32px, 6vw, 48px); margin: 0 0 18px; line-height: 1.2;
  }
  .chapter-sub {
    font-size: 13px; color: var(--ink-soft); line-height: 1.85;
    max-width: 380px; margin: 0 auto 50px;
  }

  /* Chapter I — Fragment 上传 */
  .fragment-zone {
    position: relative; width: 220px; height: 280px; margin: 0 auto;
    border: 1px dashed rgba(212,175,122,0.3);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: all .6s ease; overflow: hidden;
  }
  .fragment-zone:hover { border-color: var(--gold); }
  .fragment-zone .plus {
    font-family: 'Cormorant Garamond', serif; font-size: 56px; font-weight: 300;
    color: var(--gold); opacity: 0.8;
  }
  .fragment-zone .hint {
    position: absolute; bottom: 16px; left: 0; right: 0;
    font-size: 9.5px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-faint);
  }
  .fragment-zone.has-image .plus, .fragment-zone.has-image .hint { display: none; }
  .fragment-orb {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    filter: blur(14px) saturate(1.2);
    transform: scale(1.2);
    opacity: 0;
    transition: opacity 1s ease;
  }
  .fragment-zone.has-image .fragment-orb { opacity: 0.85; }
  .fragment-zone.has-image::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 30%, rgba(10,6,18,0.9) 80%);
  }
  .fragment-status {
    margin-top: 24px; font-size: 11.5px; letter-spacing: 0.2em;
    color: var(--ink-faint); text-transform: uppercase; min-height: 14px;
  }
  .fragment-zone.has-image ~ .fragment-status { color: var(--gold); }
  .skip-link {
    display: inline-block; margin-top: 36px;
    font-size: 10.5px; letter-spacing: 0.3em; color: var(--ink-faint);
    text-transform: uppercase; cursor: pointer;
    border-bottom: 1px solid var(--line); padding-bottom: 4px;
  }
  .skip-link:hover { color: var(--gold); border-color: var(--gold); }

  /* Chapter II — Echo 文字 */
  .echo-input-wrap {
    position: relative; max-width: 480px; margin: 0 auto;
    border-bottom: 1px solid var(--line);
    padding: 16px 0 12px;
    transition: border-color .6s ease;
  }
  .echo-input-wrap:focus-within { border-color: var(--gold); }
  .echo-input {
    width: 100%; background: transparent; border: 0; outline: 0;
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: 22px; color: var(--ink); text-align: center;
    line-height: 1.5; resize: none;
    min-height: 80px;
  }
  .echo-input::placeholder { color: var(--ink-faint); font-style: italic; }
  .echo-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 0 4px; }
  .echo-counter { font-size: 10px; letter-spacing: 0.25em; color: var(--ink-faint); text-transform: uppercase; }

  /* Chapter III — Voice 风格选择 */
  .voices {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
    max-width: 480px; margin: 0 auto 36px;
  }
  .voice {
    position: relative; padding: 22px 16px 20px;
    border: 1px solid var(--line); cursor: pointer;
    transition: all .5s ease; text-align: left;
    background: rgba(255,255,255,0.01);
  }
  .voice:hover { border-color: rgba(212,175,122,0.5); transform: translateY(-2px); }
  .voice.active { border-color: var(--gold); background: rgba(212,175,122,0.05); }
  .voice .swatch {
    width: 28px; height: 28px; border-radius: 50%;
    margin-bottom: 12px; box-shadow: 0 0 16px var(--swatch-color);
  }
  .voice .name {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 17px; color: var(--ink); margin: 0;
  }
  .voice .key {
    font-size: 9px; letter-spacing: 0.3em; color: var(--ink-faint);
    text-transform: uppercase; margin-top: 6px;
  }
  .voice.active .key { color: var(--gold); }

  /* 召唤按钮(沿用入境页风格) */
  .summon-btn {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 16px 38px; border: 1px solid rgba(212,175,122,0.5);
    background: transparent; color: var(--gold);
    font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase;
    cursor: pointer; transition: all .8s cubic-bezier(0.2, 0.8, 0.2, 1);
    font-family: inherit;
  }
  .summon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .summon-btn:not(:disabled):hover { background: rgba(212,175,122,0.08); padding-left: 48px; padding-right: 48px; }

  /* 加载遮罩 */
  .loader-veil {
    position: fixed; inset: 0; background: rgba(5,3,9,0.95);
    z-index: 200; display: none; align-items: center; justify-content: center; flex-direction: column;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .loader-veil.on { display: flex; }
  .loader-orb {
    width: 80px; height: 80px; border-radius: 50%; margin-bottom: 36px;
    background: radial-gradient(circle, var(--violet) 0%, transparent 70%);
    animation: orb-pulse 2.4s ease-in-out infinite;
  }
  @keyframes orb-pulse {
    0%,100% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.15); opacity: 1; }
  }
  .loader-text {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 22px; color: var(--ink); transition: opacity 1s ease;
  }
  .loader-sub { margin-top: 16px; font-size: 10px; letter-spacing: 0.4em; color: var(--ink-faint); text-transform: uppercase; }
</style>
</head>
<body>

<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

<nav class="top-nav">
  <a href="/">ARise</a>
  <span class="serif-italic" style="text-transform:none; letter-spacing:0.05em;">The Whisper</span>
  <span style="opacity:0.6;">i &middot; ii &middot; iii</span>
</nav>

<!-- Chapter I: Fragment -->
<section class="chapter" id="ch1">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">i. Fragment</div>
    <h2 class="chapter-title">Choose a fragment.</h2>
    <p class="chapter-sub">A photograph — anything. It will not be shown. It will be felt, blurred into color, dissolved into atmosphere.</p>

    <label class="fragment-zone" id="fragmentZone" for="photoInput">
      <div class="fragment-orb" id="fragmentOrb"></div>
      <span class="plus">+</span>
      <span class="hint">Tap to offer</span>
    </label>
    <input type="file" id="photoInput" accept="image/*" style="display:none"/>
    <div class="fragment-status" id="fragmentStatus">&nbsp;</div>

    <div>
      <a class="skip-link" id="skipFragment">Or whisper without one →</a>
    </div>
  </div>
</section>

<!-- Chapter II: Echo -->
<section class="chapter" id="ch2">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">ii. Echo</div>
    <h2 class="chapter-title">Speak its echo.</h2>
    <p class="chapter-sub">One sentence. The shorter, the truer.</p>

    <div class="echo-input-wrap">
      <textarea id="echoInput" class="echo-input" rows="2" maxlength="140" placeholder="The summer she taught me to swim…"></textarea>
    </div>
    <div class="echo-meta">
      <span class="echo-counter"><span id="echoCount">0</span> / 140</span>
      <span class="echo-counter ink-faint" id="echoState">unwhispered</span>
    </div>
  </div>
</section>

<!-- Chapter III: Voice -->
<section class="chapter" id="ch3">
  <div class="chapter-inner">
    <div class="chapter-num serif-italic">iii. Voice</div>
    <h2 class="chapter-title">Choose its voice.</h2>
    <p class="chapter-sub">Every memory has a weather. Pick the one this one wears.</p>

    <div class="voices" id="voices"></div>

    <button id="summonBtn" class="summon-btn" disabled>
      <span>Summon the Echo</span>
      <span>→</span>
    </button>
  </div>
</section>

<div class="loader-veil" id="loaderVeil">
  <div class="loader-orb"></div>
  <div class="loader-text" id="loaderText">A light is descending…</div>
  <div class="loader-sub">Please remain still</div>
</div>

<script>
(() => {
  const VOICES = ${voicesJson};
  const $ = (id) => document.getElementById(id);

  // 状态
  const state = { fragment: null, text: '', voice: null };

  // ---- progress ----
  const progressFill = $('progressFill');
  function updateProgress() {
    const sections = ['ch1','ch2','ch3'].map(id => $(id));
    const winH = window.innerHeight;
    let active = 0;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < winH * 0.5) active = i + 1;
    });
    progressFill.style.width = (active / 3 * 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ---- Chapter I: fragment ----
  const photoInput = $('photoInput');
  const fragmentZone = $('fragmentZone');
  const fragmentOrb = $('fragmentOrb');
  const fragmentStatus = $('fragmentStatus');
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.fragment = ev.target.result;
      fragmentOrb.style.backgroundImage = 'url("' + ev.target.result + '")';
      fragmentZone.classList.add('has-image');
      fragmentStatus.textContent = 'Offered';
      // 自动滚到下一章
      setTimeout(() => $('ch2').scrollIntoView({ behavior: 'smooth' }), 700);
    };
    reader.readAsDataURL(file);
  });
  $('skipFragment').addEventListener('click', (e) => {
    e.preventDefault();
    fragmentStatus.textContent = 'Without form';
    $('ch2').scrollIntoView({ behavior: 'smooth' });
  });

  // ---- Chapter II: echo ----
  const echoInput = $('echoInput');
  const echoCount = $('echoCount');
  const echoState = $('echoState');
  echoInput.addEventListener('input', () => {
    state.text = echoInput.value;
    echoCount.textContent = state.text.length;
    echoState.textContent = state.text.trim() ? 'whispered' : 'unwhispered';
    if (state.text.trim()) echoState.classList.remove('ink-faint'); else echoState.classList.add('ink-faint');
    refreshSummon();
  });

  // ---- Chapter III: voice ----
  const voicesEl = $('voices');
  voicesEl.innerHTML = VOICES.map(v => \`
    <div class="voice" data-key="\${v.key}" style="--swatch-color: \${v.palette}33;">
      <div class="swatch" style="background: \${v.palette};"></div>
      <p class="name">\${v.label}</p>
      <p class="key">\${v.key.replace('-', ' · ')}</p>
    </div>
  \`).join('');
  voicesEl.querySelectorAll('.voice').forEach(el => {
    el.addEventListener('click', () => {
      voicesEl.querySelectorAll('.voice').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      state.voice = el.dataset.key;
      refreshSummon();
    });
  });

  // ---- Summon ----
  const summonBtn = $('summonBtn');
  function refreshSummon() {
    summonBtn.disabled = !(state.text.trim() && state.voice);
  }

  const loaderVeil = $('loaderVeil');
  const loaderText = $('loaderText');
  const LOADER_LINES = [
    'A light is descending…',
    'The wall is warming…',
    'Threads of color are gathering…',
    'A frame is being made…',
    'Almost finished. Stay quiet.',
  ];

  summonBtn.addEventListener('click', async () => {
    if (summonBtn.disabled) return;
    loaderVeil.classList.add('on');
    let li = 0;
    const lt = setInterval(() => {
      li = (li + 1) % LOADER_LINES.length;
      loaderText.style.opacity = '0';
      setTimeout(() => { loaderText.textContent = LOADER_LINES[li]; loaderText.style.opacity = '1'; }, 400);
    }, 3500);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: state.text.trim(), voice: state.voice }),
      });
      const data = await resp.json();
      clearInterval(lt);
      if (!resp.ok) {
        loaderText.textContent = (data.error || 'Something went quiet.') + ' ' + (data.hint || '');
        setTimeout(() => loaderVeil.classList.remove('on'), 3000);
        return;
      }
      // 跳转画廊
      window.location.href = '/gallery/' + data.id;
    } catch (e) {
      clearInterval(lt);
      loaderText.textContent = 'A network silence. Try again.';
      setTimeout(() => loaderVeil.classList.remove('on'), 2500);
    }
  });
})();
</script>

</body>
</html>`)
})

// ===================================================================
// /gallery/:id  · The Reveal 画廊页
// ===================================================================
app.get('/gallery/:id', (c) => {
  const id = c.req.param('id')
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · The Reveal</title>
<style>
  body { background: #050309; }

  /* 揭幕黑场 */
  .curtain {
    position: fixed; inset: 0; background: #050309; z-index: 80;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 1.6s ease 1.6s;
  }
  .curtain.lift { opacity: 0; pointer-events: none; }
  .curtain-text {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 22px; color: var(--ink-soft);
    text-align: center; opacity: 0;
    animation: ct 4s ease forwards;
  }
  @keyframes ct { 0%,100%{opacity:0} 30%,70%{opacity:1} }

  /* 画廊房间 */
  .gallery-room {
    min-height: 100vh; min-height: 100dvh;
    position: relative; overflow: hidden;
    perspective: 1400px;
    display: flex; align-items: center; justify-content: center;
    padding: 120px 24px 60px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(212,175,122,0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(159,122,234,0.12) 0%, transparent 50%),
      #050309;
  }
  /* 顶部射灯光束 */
  .spot {
    position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 800px; max-width: 90vw;
    background: radial-gradient(ellipse at 50% 0%, rgba(245,237,224,0.16) 0%, transparent 60%);
    pointer-events: none; opacity: 0; transition: opacity 2s ease 1.4s;
  }
  .gallery-room.live .spot { opacity: 1; }

  /* 地面反射 */
  .floor {
    position: absolute; bottom: 0; left: 0; right: 0; height: 30vh;
    background: linear-gradient(180deg, transparent, rgba(159,122,234,0.04));
    pointer-events: none;
  }

  /* 粒子尘埃 */
  .dust { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .speck {
    position: absolute; width: 2px; height: 2px; border-radius: 50%;
    background: var(--gold); opacity: 0.5;
    animation: float 18s linear infinite;
  }
  @keyframes float {
    0% { transform: translate(0,0); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.4; }
    100% { transform: translate(40px, -120vh); opacity: 0; }
  }

  /* 顶部状态栏 */
  .top-bar-g {
    position: fixed; top: 22px; left: 0; right: 0; z-index: 50;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 28px; pointer-events: none;
  }
  .top-bar-g a, .top-bar-g span {
    pointer-events: auto;
    font-size: 10.5px; letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--ink-faint);
  }
  .top-bar-g a:hover { color: var(--gold); }

  /* 画框 + 画作 */
  .stage {
    position: relative; z-index: 5;
    display: flex; flex-direction: column; align-items: center;
    transform-style: preserve-3d;
    opacity: 0; transform: translateY(40px);
    transition: opacity 2s ease 2s, transform 2.4s cubic-bezier(0.2,0.8,0.2,1) 2s;
  }
  .gallery-room.live .stage { opacity: 1; transform: translateY(0); }

  .frame-wrap {
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .frame {
    position: relative;
    width: min(360px, 78vw);
    aspect-ratio: 3/4;
    background: #0a0612;
    box-shadow:
      0 0 0 14px #1a1208,
      0 0 0 16px var(--gold),
      0 40px 80px rgba(0,0,0,0.7),
      0 80px 120px rgba(159,122,234,0.18);
    overflow: hidden;
    cursor: zoom-in;
  }
  .frame img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 8s ease;
  }
  .frame:hover img { transform: scale(1.04); }
  /* 内框光泽 */
  .frame::after {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 50% -20%, rgba(245,237,224,0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.4) 0%, transparent 50%);
    pointer-events: none;
  }

  /* 铜质标牌 */
  .plaque {
    margin-top: 56px; max-width: 360px; width: 78vw;
    border: 1px solid rgba(212,175,122,0.4);
    background: linear-gradient(135deg, rgba(212,175,122,0.06), rgba(212,175,122,0.02));
    padding: 22px 24px 24px;
    text-align: left;
    position: relative;
  }
  .plaque::before {
    content: ''; position: absolute; top: -1px; left: 12px; right: 12px; height: 1px;
    background: var(--gold); opacity: 0.7;
  }
  .plaque .num {
    font-size: 9.5px; letter-spacing: 0.32em; text-transform: uppercase;
    color: var(--gold); margin-bottom: 12px;
  }
  .plaque .title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 26px; color: var(--ink); margin: 0 0 8px; line-height: 1.2;
  }
  .plaque .title em { color: var(--gold); font-style: italic; font-weight: 300; }
  .plaque .desc {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: 15px; line-height: 1.6; color: var(--ink-soft);
    margin: 0 0 18px;
    overflow: hidden;
    border-bottom: 1px solid var(--line); padding-bottom: 16px;
  }
  .plaque .meta-row { display: flex; justify-content: space-between; align-items: center; }
  .plaque .meta-row .voice-l {
    font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase;
    color: var(--ink-faint);
  }
  .plaque .meta-row .voice-l b { color: var(--ink-soft); font-weight: 400; }
  .plaque .meta-row .swatch-mini {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block;
    margin-right: 8px; vertical-align: middle;
  }

  /* 票券抽屉 */
  .ticket {
    position: fixed; right: 24px; bottom: 24px; z-index: 40;
    width: 280px; max-width: 80vw;
    background: linear-gradient(135deg, #1a0e2c 0%, #0a0612 100%);
    border: 1px solid rgba(212,175,122,0.35);
    padding: 18px 20px;
    transform: translateY(120%); opacity: 0;
    transition: transform 1s cubic-bezier(0.2,0.8,0.2,1) 3.5s, opacity 1s ease 3.5s;
  }
  .gallery-room.live .ticket { transform: translateY(0); opacity: 1; }
  .ticket .tnum { font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); }
  .ticket .ttitle { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 16px; margin: 6px 0 10px; }
  .ticket .tnote { font-size: 11px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed rgba(212,175,122,0.25); }
  .ticket .tactions { display: flex; gap: 8px; }
  .ticket button {
    flex: 1; padding: 9px 8px; background: transparent;
    border: 1px solid rgba(212,175,122,0.4);
    color: var(--gold); font-family: inherit;
    font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase;
    cursor: pointer; transition: all .4s ease;
  }
  .ticket button:hover { background: rgba(212,175,122,0.1); }
  .ticket .copied { color: #b6e3b6 !important; border-color: #b6e3b6 !important; }
  .ticket .close-x {
    position: absolute; top: 6px; right: 10px; font-size: 14px;
    color: var(--ink-faint); cursor: pointer; background: transparent; border: 0; padding: 4px;
  }

  /* 全屏放大 */
  .lightbox {
    position: fixed; inset: 0; background: rgba(5,3,9,0.95);
    backdrop-filter: blur(20px); z-index: 90;
    display: none; align-items: center; justify-content: center; padding: 40px;
  }
  .lightbox.on { display: flex; }
  .lightbox img { max-width: 90%; max-height: 90vh; box-shadow: 0 0 0 12px #1a1208, 0 0 0 14px var(--gold); }
  .lightbox-close {
    position: absolute; top: 24px; right: 28px;
    font-family: 'Cormorant Garamond', serif; font-size: 24px;
    color: var(--ink); cursor: pointer; background: transparent; border: 0;
  }

  /* 错误占位 */
  .error-veil {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 40px; text-align: center;
  }
  .error-veil h2 { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 32px; }
  .error-veil p { color: var(--ink-soft); margin: 12px 0 32px; }
  .error-veil a { color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 4px; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; }
</style>
</head>
<body>

<div class="curtain" id="curtain">
  <div class="curtain-text">A light is descending —</div>
</div>

<div class="top-bar-g">
  <a href="/">← ARise</a>
  <span class="serif-italic" style="text-transform:none; letter-spacing:0.05em;">The Reveal</span>
  <a href="/create">+ New Echo</a>
</div>

<main class="gallery-room" id="room">
  <div class="spot"></div>
  <div class="dust" id="dust"></div>
  <div class="floor"></div>

  <div class="stage" id="stage">
    <div class="frame-wrap" id="frameWrap">
      <div class="frame" id="frame">
        <img id="artImg" alt="Echo"/>
      </div>
    </div>

    <div class="plaque">
      <div class="num" id="plaqueNum">№ —</div>
      <h2 class="title" id="plaqueTitle">—</h2>
      <p class="desc" id="plaqueDesc">—</p>
      <div class="meta-row">
        <div class="voice-l">Voice &nbsp; <b id="plaqueVoice">—</b></div>
        <div class="voice-l"><span class="swatch-mini" id="plaqueSwatch"></span><span id="plaqueNote" class="serif-italic" style="text-transform:none; letter-spacing:0.04em; color:var(--ink-soft);">—</span></div>
      </div>
    </div>
  </div>

  <aside class="ticket" id="ticket">
    <button class="close-x" id="ticketClose" aria-label="Close">×</button>
    <div class="tnum">Admit one</div>
    <div class="ttitle" id="ticketTitle">—</div>
    <div class="tnote" id="ticketNote">—</div>
    <div class="tactions">
      <button id="copyBtn">Copy link</button>
      <button id="newBtn">New echo</button>
    </div>
  </aside>
</main>

<div class="lightbox" id="lightbox">
  <button class="lightbox-close" id="lightboxClose">close</button>
  <img id="lightboxImg" alt="Echo full"/>
</div>

<script>
(async () => {
  const $ = (id) => document.getElementById(id);
  const id = ${JSON.stringify(id)};
  const room = $('room');
  const curtain = $('curtain');

  // 粒子尘埃
  const dust = $('dust');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div');
    s.className = 'speck';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = (Math.random() * 50 + 70) + '%';
    s.style.animationDelay = (Math.random() * 18) + 's';
    s.style.animationDuration = (12 + Math.random() * 12) + 's';
    s.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
    dust.appendChild(s);
  }

  // 取数据
  let data = null;
  try {
    const r = await fetch('/api/echo/' + encodeURIComponent(id));
    if (!r.ok) throw new Error('not found');
    data = await r.json();
  } catch (e) {
    document.body.innerHTML = \`
      <div class="error-veil">
        <h2>This echo has dissolved.</h2>
        <p>It may have expired, or the link may be incomplete.</p>
        <a href="/create">Whisper a new one →</a>
      </div>\`;
    return;
  }

  // 注入内容
  $('artImg').src = data.art;
  $('plaqueNum').textContent = data.number;
  $('plaqueTitle').innerHTML = data.title + ' &nbsp; <em>— an Echo</em>';
  $('plaqueDesc').textContent = '"' + data.text + '"';
  $('plaqueVoice').textContent = data.voiceLabel;
  $('plaqueSwatch').style.background = data.palette;
  $('plaqueSwatch').style.boxShadow = '0 0 8px ' + data.palette;
  $('plaqueNote').textContent = data.curatorNote;

  $('ticketTitle').textContent = data.title;
  $('ticketNote').textContent = '— curator’s note: ' + data.curatorNote;

  // 揭幕动画(等图片解码)
  const img = $('artImg');
  const reveal = () => { curtain.classList.add('lift'); room.classList.add('live'); };
  if (img.complete) setTimeout(reveal, 900);
  else { img.addEventListener('load', () => setTimeout(reveal, 900)); img.addEventListener('error', () => setTimeout(reveal, 900)); }

  // 鼠标视差(只对画框)
  const frameWrap = $('frameWrap');
  const onMouse = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    frameWrap.style.transform = \`rotateY(\${x * 6}deg) rotateX(\${-y * 5}deg) translateZ(0)\`;
  };
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', onMouse);
  }
  // 移动端用陀螺仪(可选,不强制)
  window.addEventListener('deviceorientation', (e) => {
    if (!e.beta || !e.gamma) return;
    const x = Math.max(-1, Math.min(1, e.gamma / 30));
    const y = Math.max(-1, Math.min(1, (e.beta - 30) / 30));
    frameWrap.style.transform = \`rotateY(\${x * 6}deg) rotateX(\${-y * 5}deg) translateZ(0)\`;
  });

  // Lightbox
  const lightbox = $('lightbox');
  $('frame').addEventListener('click', () => {
    $('lightboxImg').src = data.art;
    lightbox.classList.add('on');
  });
  $('lightboxClose').addEventListener('click', () => lightbox.classList.remove('on'));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('on'); });

  // Ticket
  $('ticketClose').addEventListener('click', () => $('ticket').style.display = 'none');
  $('newBtn').addEventListener('click', () => location.href = '/create');
  $('copyBtn').addEventListener('click', async () => {
    const url = location.origin + '/echo/' + id;
    try {
      await navigator.clipboard.writeText(url);
      const b = $('copyBtn'); const old = b.textContent;
      b.textContent = '✓ Copied'; b.classList.add('copied');
      setTimeout(() => { b.textContent = old; b.classList.remove('copied'); }, 1800);
    } catch (e) { prompt('Copy this link:', url); }
  });
})();
</script>

</body>
</html>`)
})

// ===================================================================
// /echo/:id  · 分享落地页(走入境光晕,然后跳画廊)
// ===================================================================
app.get('/echo/:id', (c) => {
  const id = c.req.param('id')
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
${sharedHead}
<title>ARise · Someone left you an echo.</title>
<meta http-equiv="refresh" content="3.5;url=/gallery/${id}">
<style>
  body { background: #050309; overflow: hidden; }
  .arrival {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 40px 24px; position: relative;
    background: radial-gradient(circle at 50% 50%, rgba(159,122,234,0.18) 0%, transparent 55%), #050309;
  }
  .halo-s {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at 50% 50%, rgba(212,175,122,0.1) 0%, transparent 35%);
    animation: pulse 4s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
  .arrival h1 {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: clamp(28px, 5vw, 42px);
    margin: 0 0 22px; opacity: 0; animation: fade 1.2s 0.4s forwards;
    max-width: 540px;
  }
  .arrival p {
    color: var(--ink-soft); font-size: 13px; line-height: 1.8; max-width: 420px;
    opacity: 0; animation: fade 1.2s 1.2s forwards; margin: 0 0 36px;
  }
  .arrival .label {
    font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--gold);
    opacity: 0; animation: fade 1.2s 2s forwards;
  }
  @keyframes fade { to { opacity: 1; } }
  .arrival a { color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 2px; }
</style>
</head>
<body>
<section class="arrival">
  <div class="halo-s"></div>
  <h1>Someone left you an echo.</h1>
  <p>Stand still for a moment.<br/>The wall is being lit on your behalf.</p>
  <div class="label">Entering Gallery №<span style="color:var(--ink-soft);"> ${id}</span> …</div>
  <p style="margin-top:48px; font-size:11px; opacity:0;animation:fade 1.2s 3s forwards;">
    <a href="/gallery/${id}">enter now →</a>
  </p>
</section>
</body>
</html>`)
})

// ===================================================================
// favicon + health
// ===================================================================
app.get('/favicon.ico', (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9F7AEA"/><stop offset="100%" stop-color="#D4AF7A"/>
    </linearGradient></defs>
    <rect width="100" height="100" rx="22" fill="#050309"/>
    <path d="M50 18 L82 84 L68 84 L60 66 L40 66 L32 84 L18 84 Z M44 54 L56 54 L50 32 Z" fill="url(#g)"/>
  </svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } })
})

app.get('/api/health', (c) => c.json({
  ok: true,
  service: 'ARise · Echo Gallery',
  ai_provider: 'pollinations.ai (free, no token)',
  storage: c.env.ECHO_KV ? 'kv' : 'memory',
}))

export default app
