// Auto-generated from live snapshot of https://arise-echo-gallery-7nz.pages.dev/exhibit
// 您可以直接编辑下方反引号内的 HTML 字符串来修改页面。
export const exhibitHtml = `<!DOCTYPE html>
<html lang="en">
<head>

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

<title>ARise · Echo Gallery — Live Exhibit</title>
<style>
  html, body {
    width: 100vw; height: 100vh;
    background: #050309; overflow: hidden;
    cursor: grab;
    touch-action: none;
    overscroll-behavior: none;
  }
  html.dragging, html.dragging body { cursor: grabbing; }
  body { user-select: none; -webkit-user-select: none; }

  /* === 舞台背景:深紫穹頂 + 微弱金塵 === */
  .stage {
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse at 50% 38%, #1d1431 0%, #0c0716 52%, #050309 100%);
    overflow: hidden;
    perspective: 2400px;
    perspective-origin: 50% 50%;
  }
  .stage::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      radial-gradient(1px 1px at 12% 20%, rgba(212,175,122,0.55), transparent 50%),
      radial-gradient(1px 1px at 78% 35%, rgba(212,175,122,0.45), transparent 50%),
      radial-gradient(1px 1px at 35% 70%, rgba(212,175,122,0.55), transparent 50%),
      radial-gradient(1.2px 1.2px at 88% 82%, rgba(212,175,122,0.35), transparent 50%),
      radial-gradient(1px 1px at 22% 88%, rgba(212,175,122,0.45), transparent 50%),
      radial-gradient(1px 1px at 60% 12%, rgba(212,175,122,0.4), transparent 50%);
    pointer-events: none; opacity: 0.7;
  }

  /* === 中央聚光（已淡化,不再放大邊緣） === */
  .spotlight {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 80vw; height: 50vh;
    background: radial-gradient(ellipse at center, rgba(212,175,122,0.05) 0%, transparent 70%);
    pointer-events: none; z-index: 1;
  }

  /* === 走馬燈軌道（純平面,匀速平移） === */
  .marquee {
    position: absolute;
    top: 54%; left: 0;
    height: 44vh;
    display: flex;
    align-items: center;
    gap: 3.6vh;
    will-change: transform;
  }
  /* 畫作軌道上下對稱位置(用於金線錨定):54% ± 22vh */

  /* === 單件作品（等大清晰,不縮放不模糊） === */
  .piece {
    flex: 0 0 auto;
    height: 100%;
    aspect-ratio: 3 / 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.6vh;
  }

  /* === 畫作金邊裱框 === */
  .artframe {
    position: relative;
    height: calc(100% - 6vh);
    aspect-ratio: 3 / 4;
    background: #0a0612;
    box-shadow:
      0 0 0 5px #1a1208,
      0 0 0 7px #D4AF7A,
      0 0 0 8px rgba(212,175,122,0.45),
      0 18px 48px rgba(0,0,0,0.85),
      0 0 100px var(--glow, rgba(159,122,234,0.16));
    overflow: hidden;
    transition: box-shadow 0.6s ease;
  }
  .artframe::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(160deg, rgba(255,235,200,0.10) 0%, transparent 35%, transparent 70%, rgba(0,0,0,0.30) 100%);
    pointer-events: none; z-index: 2;
  }
  .artframe img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }

  /* === 全屏按鈕 (每幅畫右上角) === */
  .artframe .fs-btn {
    position: absolute; top: 12px; right: 12px; z-index: 3;
    width: 36px; height: 36px;
    background: rgba(10,6,18,0.65); backdrop-filter: blur(6px);
    border: 1px solid rgba(212,175,122,0.6); border-radius: 50%;
    color: #f5ede0; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transform: scale(0.85);
    transition: opacity .3s, transform .3s, background .25s, border-color .25s, color .25s;
    -webkit-tap-highlight-color: transparent;
  }
  .artframe:hover .fs-btn,
  .artframe .fs-btn:focus { opacity: 1; transform: scale(1); }
  .artframe .fs-btn:hover { background: rgba(212,175,122,0.9); color: #0a0612; border-color: #D4AF7A; }
  .artframe .fs-btn svg { width: 16px; height: 16px; pointer-events:none; }
  /* 觸控設備也可見, 不依賴 hover */
  @media (hover: none) {
    .artframe .fs-btn { opacity: 1; transform: scale(1); }
  }

  /* === Lightbox 單圖全屏蒙層 === */
  .lightbox {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(5,3,9,0.96); backdrop-filter: blur(14px);
    display: none; align-items: center; justify-content: center;
    padding: 4vh 4vw; cursor: zoom-out;
    animation: lbFade .35s ease both;
  }
  .lightbox.open { display: flex; }
  @keyframes lbFade { from{opacity:0} to{opacity:1} }
  .lightbox-inner {
    position: relative; max-width: 100%; max-height: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 18px;
    cursor: default;
  }
  .lightbox-inner img {
    max-width: min(92vw, 1400px); max-height: 80vh; object-fit: contain;
    box-shadow: 0 0 0 6px #1a1208, 0 0 0 8px #D4AF7A,
                0 30px 100px rgba(0,0,0,0.85),
                0 0 120px rgba(212,175,122,0.18);
    user-select: none;
  }
  .lightbox-meta { text-align: center; color: #f5ede0; max-width: 760px; }
  .lightbox-meta .num { color: var(--gold); font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; margin-bottom: 8px; }
  .lightbox-meta .ttl { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: clamp(22px, 3.4vw, 36px); line-height: 1.2; }
  .lightbox-meta .voice { margin-top: 10px; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(245,237,224,0.55); }
  .lightbox-meta .voice .dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:8px; vertical-align: middle; box-shadow: 0 0 8px currentColor; }
  .lightbox-close {
    position: absolute; top: -52px; right: -4px;
    width: 44px; height: 44px; border-radius: 50%;
    background: transparent; border: 1px solid rgba(212,175,122,0.6); color: #f5ede0;
    cursor: pointer; font-size: 22px; line-height: 1;
    transition: background .25s, color .25s, border-color .25s;
  }
  .lightbox-close:hover { background: var(--gold); color: #0a0612; border-color: var(--gold); }
  .lightbox-hint { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center;
    color: rgba(245,237,224,0.35); font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; }

  /* === 銘牌（畫框下方,字號放大,手機可讀） === */
  .nameplate {
    text-align: center;
    color: #f5ede0;
    width: 100%;
    padding: 0 0.6vw;
  }
  .nameplate .num {
    color: var(--gold);
    font-size: clamp(10px, 0.75vw, 12px);
    letter-spacing: 0.32em; text-transform: uppercase;
    margin-bottom: 0.5vh;
    opacity: 0.95;
  }
  .nameplate .ttl {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic; font-weight: 400;
    font-size: clamp(15px, 1.3vw, 20px);
    line-height: 1.3;
    color: #f5ede0;
    max-width: 95%;
    margin: 0 auto;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .nameplate .voice {
    margin-top: 0.5vh;
    font-size: clamp(9px, 0.7vw, 11px);
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(245,237,224,0.7);
  }
  .nameplate .voice .dot {
    display: inline-block; width: 6px; height: 6px; border-radius: 50%;
    margin-right: 7px; vertical-align: middle;
    box-shadow: 0 0 10px currentColor;
  }

  /* === 兩側極淡羽化(只在最邊緣,不擋畫作) === */
  .stage::after {
    content: ''; position: absolute; inset: 0;
    background:
      linear-gradient(90deg, rgba(5,3,9,0.85) 0%, rgba(5,3,9,0.35) 3%, transparent 7%, transparent 93%, rgba(5,3,9,0.35) 97%, rgba(5,3,9,0.85) 100%);
    pointer-events: none;
    z-index: 5;
  }

  /* === 新設計:畫作軌道上下兩條金線(藝廊掛畫線軌感) === */
  .gold-line {
    position: absolute; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(212,175,122,0.55) 18%, rgba(245,220,170,0.85) 50%, rgba(212,175,122,0.55) 82%, transparent 100%);
    z-index: 4; pointer-events: none;
    box-shadow: 0 0 12px rgba(212,175,122,0.25);
  }
  .gold-line.top    { top: calc(54% - 22vh - 2vh); }
  .gold-line.bottom { top: calc(54% + 22vh + 2vh); }

  /* === 頂部標題條(緊貼畫作上沿) === */
  .header-bar {
    position: absolute; top: 2.5vh; left: 0; right: 0;
    text-align: center;
    z-index: 50; pointer-events: none;
  }
  .header-bar .eyebrow {
    color: var(--gold);
    font-family: 'Inter', sans-serif;
    font-size: clamp(11px, 1vw, 13px);
    letter-spacing: 0.18em; text-transform: uppercase;
    margin-bottom: 0.5vh;
    opacity: 0.9;
  }
  .header-bar .brand {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic; font-weight: 400;
    font-size: clamp(26px, 3vw, 44px);
    line-height: 1.1;
    color: #f5ede0;
    letter-spacing: 0.02em;
  }

  /* === 底部小字條(固定,字號放大,手機可讀) === */
  .footer-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    text-align: center; padding: 2vh 0 2.4vh;
    z-index: 50; pointer-events: none;
    background: linear-gradient(0deg, rgba(5,3,9,0.95) 0%, rgba(5,3,9,0.6) 60%, transparent 100%);
  }
  .footer-bar .meta {
    color: rgba(245,237,224,0.6);
    font-size: clamp(10px, 0.85vw, 12px);
    letter-spacing: 0.18em; text-transform: uppercase;
  }
  .footer-bar .div { display: inline-block; width: 24px; height: 1px; background: rgba(212,175,122,0.4); margin: 0 12px; vertical-align: middle; }

  /* === 角标(字號放大) === */
  .corner-r {
    position: fixed; top: 1.5vh; right: 1.6vw;
    font-size: clamp(10px, 0.8vw, 12px);
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(245,237,224,0.45);
    z-index: 100; pointer-events: none;
  }
  .corner-l {
    position: fixed; top: 1.5vh; left: 1.6vw;
    font-size: clamp(10px, 0.8vw, 12px);
    letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(245,237,224,0.45);
    z-index: 100; pointer-events: none;
  }

  /* === 手機端進一步加大字級 + 簡化 footer === */
  @media (max-width: 720px) {
    .header-bar { top: 1.6vh; }
    .header-bar .eyebrow { font-size: 11px; }
    .header-bar .brand   { font-size: 24px; }
    .nameplate .num   { font-size: 10px; letter-spacing: 0.22em; }
    .nameplate .ttl   { font-size: 14px; }
    .nameplate .voice { font-size: 10px; letter-spacing: 0.16em; }
    .footer-bar .meta { font-size: 10px; letter-spacing: 0.12em; }
    .footer-bar .div  { width: 14px; margin: 0 6px; }
    .corner-l, .corner-r { font-size: 10px; letter-spacing: 0.16em; }
    .marquee { height: 50vh; gap: 3vh; top: 52%; }
    .gold-line.top    { top: calc(52% - 25vh - 1.6vh); }
    .gold-line.bottom { top: calc(52% + 25vh + 1.6vh); }
  }

  /* === 空集態 === */
  .empty-state {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 0 40px;
    z-index: 10;
  }
  .empty-state .e-eye { color: var(--gold); font-size: 11px; letter-spacing: 0.5em; text-transform: uppercase; margin-bottom: 22px; }
  .empty-state h2 {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic; font-weight: 300;
    font-size: clamp(28px, 3.6vw, 52px);
    color: #f5ede0; margin: 0 0 18px;
  }
  .empty-state p { color: rgba(245,237,224,0.5); font-size: 14px; max-width: 420px; line-height: 1.8; }
</style>
</head>
<body>
  <div class="corner-l">ARise · Live</div>
  <div class="corner-r" id="cornerCount">— pieces</div>

  <div class="header-bar">
    <div class="eyebrow">ARise · Echo Gallery</div>
    <div class="brand">低語的回響 · A Quiet Invitation</div>
  </div>

  <div class="stage">
    <div class="spotlight"></div>
    <div class="gold-line top"></div>
    <div class="gold-line bottom"></div>
    <div class="marquee" id="marquee"></div>
    <div class="empty-state" id="emptyState" style="display:none;">
      <div class="e-eye">Awaiting first echo</div>
      <h2>The wall is silent.</h2>
      <p>The first whisper has not yet been transmuted into art. As soon as a visitor scans, this wall will rise into life.</p>
    </div>
  </div>

  <div class="footer-bar">
    <span class="meta">arise-echo-gallery.pages.dev<span class="div"></span>低語的回響</span>
  </div>

  <!-- Lightbox 單圖全屏蒙層 -->
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true">
    <div class="lightbox-inner" id="lbInner">
      <button class="lightbox-close" id="lbClose" aria-label="Close full screen">&times;</button>
      <img id="lbImg" alt=""/>
      <div class="lightbox-meta">
        <div class="num" id="lbNum"></div>
        <div class="ttl" id="lbTtl"></div>
        <div class="voice" id="lbVoice"></div>
      </div>
      <div class="lightbox-hint">Press ESC or click anywhere outside the artwork to close</div>
    </div>
  </div>

<script>
(() => {
  // ===== 走馬燈引擎(弧形透視 / 中央聚焦 / 拖拽滾輪 / 慣性) =====
  const AUTO_SPEED   = 22;             // ↓ 自動滾動 22 px/s(原 60),慢悠悠走馬燈節奏
  const REFRESH_MS   = 60 * 1000;      // 每 60 秒拉一次新作品
  const FRICTION     = 0.94;           // 拖拽放開後的慣性衰減
  const RESUME_DELAY = 2400;           // 用戶停手 2.4s 後恢復自動滾動
  const WHEEL_GAIN   = 0.7;            // 滾輪敏感度

  const marquee     = document.getElementById('marquee');
  const emptyEl     = document.getElementById('emptyState');
  const cornerCount = document.getElementById('cornerCount');
  const stage       = document.querySelector('.stage');

  // ===== Lightbox 單圖全屏 =====
  const lightbox = document.getElementById('lightbox');
  const lbInner  = document.getElementById('lbInner');
  const lbImg    = document.getElementById('lbImg');
  const lbNum    = document.getElementById('lbNum');
  const lbTtl    = document.getElementById('lbTtl');
  const lbVoice  = document.getElementById('lbVoice');
  const lbClose  = document.getElementById('lbClose');

  function openLightbox(item) {
    lbImg.src = item.art;
    lbImg.alt = item.title || '';
    lbNum.textContent = item.number || '';
    lbTtl.textContent = '"' + (item.title || '') + '"';
    lbVoice.innerHTML = '<span class="dot" style="background:' + (item.palette||'#9F7AEA') +
                       ';color:' + (item.palette||'#9F7AEA') + ';"></span>' + (item.voiceLabel || '');
    lightbox.classList.add('open');
    userActiveUntil = performance.now() + 999999999; // 暫停走馬燈
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lbImg.src = '';
    userActiveUntil = 0;
    document.body.style.overflow = '';
  }
  // 點背景關閉, 但點圖/卡片內容不關
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  // 阻止 inner 區點擊冒泡(以免 inner 內部點擊被視為點背景)
  lbInner.addEventListener('click', (e) => { e.stopPropagation(); });
  lbClose.addEventListener('click', closeLightbox);
  // 暴露給 buildPiece 用
  window.__openLightbox = openLightbox;

  let items       = [];
  let offset      = 0;          // 當前 X 偏移(像素,正向 = 向左移動)
  let lastT       = performance.now();
  let totalWidth  = 0;          // 一輪作品的總寬度
  let unitWidth   = 0;          // 單格寬度 + gap(用於弧形定位)
  let rafId       = null;

  // 交互狀態
  let dragging    = false;
  let dragStartX  = 0;
  let dragStartOffset = 0;
  let velocity    = 0;          // 拖拽釋放後的瞬時速度(px/sec)
  let lastMoveT   = 0;
  let lastMoveX   = 0;
  let userActiveUntil = 0;       // 用戶交互後抑制自動滾動到此時間戳

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function buildPiece(item) {
    const el = document.createElement('div');
    el.className = 'piece';
    el.style.setProperty('--glow', (item.palette || '#9F7AEA') + '55');
    el.innerHTML = \`
      <div class="artframe">
        <button class="fs-btn" type="button" aria-label="View full screen" title="Full screen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 9 4 4 9 4"></polyline>
            <polyline points="15 4 20 4 20 9"></polyline>
            <polyline points="4 15 4 20 9 20"></polyline>
            <polyline points="15 20 20 20 20 15"></polyline>
          </svg>
        </button>
        <img src="\${escapeHTML(item.art)}" alt="\${escapeHTML(item.title)}" loading="eager" draggable="false"/>
      </div>
      <div class="nameplate">
        <div class="num">\${escapeHTML(item.number || '')}</div>
        <div class="ttl">"\${escapeHTML(item.title)}"</div>
        <div class="voice"><span class="dot" style="background:\${item.palette};color:\${item.palette};"></span>\${escapeHTML(item.voiceLabel || '')}</div>
      </div>
    \`;
    // 把 item 掛到節點上, 全屏按鈕的事件處理器讀取
    el._item = item;
    const fsBtn = el.querySelector('.fs-btn');
    fsBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      openLightbox(item);
    });
    // 雙擊畫面也能全屏
    const img = el.querySelector('img');
    img.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      openLightbox(item);
    });
    return el;
  }

  function rebuildTrack() {
    marquee.innerHTML = '';
    if (!items.length) return;
    const frag = document.createDocumentFragment();
    // 串兩遍即可實現無縫(平面平移,不需要中段緩衝)
    for (let pass = 0; pass < 2; pass++) {
      for (const it of items) frag.appendChild(buildPiece(it));
    }
    marquee.appendChild(frag);

    requestAnimationFrame(() => {
      const children = marquee.children;
      const n = items.length;
      const gap = parseFloat(getComputedStyle(marquee).gap) || 0;
      if (!children.length) return;
      const w0 = children[0].getBoundingClientRect().width;
      unitWidth = w0 + gap;
      totalWidth = unitWidth * n;
      offset = 0;   // 從第一件開始平移
    });
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (totalWidth > 0) {
      const userActive = now < userActiveUntil || dragging;
      if (dragging) {
        // dragging 時 offset 由指針事件直接設定
      } else if (Math.abs(velocity) > 0.5) {
        // 慣性:來自拖拽釋放
        offset -= velocity * dt;
        velocity *= Math.pow(FRICTION, dt * 60);
      } else if (!userActive) {
        // 自動匀速平移(右→左)
        offset += AUTO_SPEED * dt;
      }

      // 無縫:把 offset 鎖定在 [0, totalWidth) 之間
      while (offset < 0)             offset += totalWidth;
      while (offset >= totalWidth)   offset -= totalWidth;

      // 純平面平移,所有作品等大清晰
      marquee.style.transform = \`translate3d(\${-offset}px, -50%, 0)\`;
    }
    rafId = requestAnimationFrame(tick);
  }

  async function fetchData() {
    try {
      const r = await fetch('/api/exhibit', { cache: 'no-store' });
      const data = await r.json();
      const newItems = data.items || [];

      const prevKey = items.map(x=>x.id).join('|');
      const newKey = newItems.map(x=>x.id).join('|');

      if (!newItems.length) {
        items = [];
        emptyEl.style.display = 'flex';
        marquee.innerHTML = '';
        cornerCount.textContent = '0 pieces';
        totalWidth = 0;
        return;
      }
      emptyEl.style.display = 'none';
      cornerCount.textContent = newItems.length + ' pieces';

      if (prevKey !== newKey) {
        items = newItems;
        rebuildTrack();
      }
    } catch (e) {
      console.warn('exhibit fetch failed', e);
    }
  }

  // ===== 拖拽 / 觸控 / 滾輪 =====
  function onPointerDown(e) {
    if (!totalWidth) return;
    dragging = true;
    document.documentElement.classList.add('dragging');
    dragStartX = e.clientX;
    dragStartOffset = offset;
    velocity = 0;
    lastMoveT = performance.now();
    lastMoveX = e.clientX;
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch(_) {}
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    offset = dragStartOffset - dx;             // 向右拖 → offset 減少 → 整體右移
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveT);
    velocity = -((e.clientX - lastMoveX) / dt) * 1000;   // px/sec(右移時 velocity 為負)
    lastMoveT = now;
    lastMoveX = e.clientX;
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    document.documentElement.classList.remove('dragging');
    userActiveUntil = performance.now() + RESUME_DELAY;
    // velocity 已在 move 中累計,讓 tick 走慣性
  }
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup',   onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // 滾輪:水平滾(垂直滾輪也映射為水平滑動)
  stage.addEventListener('wheel', (e) => {
    if (!totalWidth) return;
    e.preventDefault();
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * WHEEL_GAIN;
    offset += delta;
    velocity = delta * 6;        // 給一點慣性尾巴
    userActiveUntil = performance.now() + RESUME_DELAY;
  }, { passive: false });

  // 啟動
  fetchData();
  rafId = requestAnimationFrame(tick);
  setInterval(fetchData, REFRESH_MS);

  // 跨頁同步: 從 archive 回來 (visibility change) 立即刷新
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fetchData();
  });
  window.addEventListener('focus', fetchData);

  // 視窗大小變動
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (items.length) rebuildTrack();
    }, 250);
  });

  // 鍵盤(布展調試)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox.classList.contains('open')) { closeLightbox(); return; }
    }
    if (e.key === 'ArrowLeft')  { offset -= unitWidth || 200; userActiveUntil = performance.now() + RESUME_DELAY; }
    else if (e.key === 'ArrowRight') { offset += unitWidth || 200; userActiveUntil = performance.now() + RESUME_DELAY; }
    else if (e.key === ' ')     { e.preventDefault(); userActiveUntil = performance.now() + 999999999; }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });

  // 防 OLED 燒屏
  let antiBurn = 0;
  setInterval(() => {
    antiBurn = (antiBurn + 1) % 4;
    const dx = [0,1,0,-1][antiBurn], dy = [1,0,-1,0][antiBurn];
    document.body.style.marginLeft = dx + 'px';
    document.body.style.marginTop = dy + 'px';
  }, 30 * 60 * 1000);
})();
</script>
</body>
</html>`;
