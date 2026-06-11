// Auto-generated from live snapshot of https://arise-echo-gallery-7nz.pages.dev/
// 您可以直接编辑下方反引号内的 HTML 字符串来修改首页。
export const indexHtml = `<!DOCTYPE html>
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

<title>ARise · An Echo Gallery</title>
<style>
  body { background: var(--bg-deep); }
  .threshold {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; padding: 40px 24px;
    background:
      radial-gradient(circle at 50% 45%, rgba(159,122,234,0.22) 0%, transparent 38%),
      radial-gradient(circle at 50% 45%, rgba(212,175,122,0.12) 0%, transparent 28%),
      var(--bg-deep);
    overflow: hidden;
  }
  /* 呼吸光晕 */
  .halo {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 900px; height: 900px; max-width: 140vw; max-height: 140vw;
    border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle, rgba(159,122,234,0.18) 0%, transparent 60%);
    animation: breathe 7s ease-in-out infinite;
    filter: blur(20px);
  }
  @keyframes breathe {
    0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.6; }
    50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
  }
  /* 缓慢旋转的金圈装饰 */
  .ring {
    position: absolute; top: 50%; left: 50%; pointer-events: none;
    border: 1px solid rgba(212,175,122,0.18); border-radius: 50%;
    transform: translate(-50%,-50%);
    animation: rotate 80s linear infinite;
  }
  .ring.r1 { width: 520px; height: 520px; }
  .ring.r2 { width: 720px; height: 720px; border-color: rgba(212,175,122,0.1); animation-duration: 140s; animation-direction: reverse; }
  @keyframes rotate { to { transform: translate(-50%,-50%) rotate(360deg); } }

  .top-mark {
    position: absolute; top: 36px; left: 50%; transform: translateX(-50%);
    text-align: center; opacity: 0; animation: fade-in 1.6s 0.2s forwards;
  }
  .top-mark .brand { font-family: 'Cormorant Garamond', serif; font-size: 22px; letter-spacing: 0.04em; }
  .top-mark .sub { font-size: 10px; letter-spacing: 0.4em; color: var(--ink-faint); margin-top: 4px; text-transform: uppercase; }

  .core {
    position: relative; z-index: 2; text-align: center; max-width: 640px;
    opacity: 0; animation: fade-up 1.8s 0.6s forwards;
  }
  .core .eyebrow {
    color: var(--gold); font-size: 10.5px; letter-spacing: 0.5em;
    text-transform: uppercase; margin-bottom: 32px;
  }
  .core h1 {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300;
    font-size: clamp(36px, 7vw, 64px); line-height: 1.18; margin: 0 0 28px;
    color: var(--ink);
  }
  .core h1 .accent { color: var(--gold); }
  .core .lede {
    font-size: 14px; line-height: 1.85; color: var(--ink-soft);
    max-width: 440px; margin: 0 auto 48px; font-weight: 300;
  }

  .enter-btn {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 16px 34px; border: 1px solid rgba(212,175,122,0.5);
    background: transparent; color: var(--gold);
    font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase;
    cursor: pointer; transition: all .8s cubic-bezier(0.2, 0.8, 0.2, 1);
    border-radius: 0; font-family: inherit;
  }
  .enter-btn:hover { background: rgba(212,175,122,0.08); border-color: var(--gold); padding-left: 44px; padding-right: 44px; }
  .enter-btn .arrow { transition: transform .6s ease; }
  .enter-btn:hover .arrow { transform: translateX(6px); }

  .scroll-cue {
    position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
    text-align: center; opacity: 0; animation: fade-in 2s 2s forwards;
  }
  .scroll-cue .line {
    width: 1px; height: 40px; background: linear-gradient(180deg, transparent, var(--gold));
    margin: 0 auto 10px; animation: drop 2.4s ease-in-out infinite;
  }
  @keyframes drop { 0%,100%{transform:scaleY(0.4);transform-origin:top} 50%{transform:scaleY(1);transform-origin:top} }
  .scroll-cue .label { font-size: 9.5px; letter-spacing: 0.4em; color: var(--ink-faint); text-transform: uppercase; }

  /* 第二屏:介绍三幕 */
  .acts {
    background: var(--bg-deep);
    padding: 140px 24px 120px;
    border-top: 1px solid var(--line);
  }
  .acts-inner { max-width: 720px; margin: 0 auto; }
  .acts h2 {
    font-family: 'Cormorant Garamond', serif; font-style: italic;
    font-size: clamp(28px, 4.5vw, 38px); font-weight: 300;
    text-align: center; margin: 0 0 80px;
  }
  .act-row {
    display: grid; grid-template-columns: 60px 1fr; gap: 28px;
    padding: 36px 0; border-top: 1px solid var(--line);
    align-items: start;
  }
  .act-row:last-child { border-bottom: 1px solid var(--line); }
  .act-num { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 36px; color: var(--gold); line-height: 1; }
  .act-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; margin: 0 0 10px; color: var(--ink); }
  .act-title .en { color: var(--ink-faint); font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; margin-left: 14px;}
  .act-desc { font-size: 13.5px; line-height: 1.85; color: var(--ink-soft); margin: 0; }

  .closing {
    text-align: center; padding: 90px 24px 100px;
    border-top: 1px solid var(--line);
  }
  .closing p { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; color: var(--ink-soft); margin: 0 0 8px; }
  .closing .sig { font-size: 10px; letter-spacing: 0.4em; color: var(--ink-faint); text-transform: uppercase; }

  @keyframes fade-in { to { opacity: 1; } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
</head>
<body>

<section class="threshold">
  <div class="halo"></div>
  <div class="ring r1"></div>
  <div class="ring r2"></div>

  <div class="top-mark">
    <div class="brand">ARise</div>
    <div class="sub">An Echo Gallery</div>
  </div>

  <div class="core">
    <div class="eyebrow">Volume I &nbsp;·&nbsp; MMXXVI</div>
    <h1>
      Whisper a memory.<br/>
      We'll turn it<br/>
      into <span class="accent serif-italic">light.</span>
    </h1>
    <p class="lede">
      A small, quiet ritual: a sentence becomes a painting,
      a painting becomes a room,
      a room becomes yours alone — and yet, shareable.
    </p>
    <a href="/create" class="enter-btn">
      <span>Enter the Gallery</span>
      <span class="arrow">→</span>
    </a>
  </div>

  <div class="scroll-cue">
    <div class="line"></div>
    <div class="label">Scroll</div>
  </div>
</section>

<section class="acts">
  <div class="acts-inner">
    <h2>Three quiet acts.</h2>

    <div class="act-row">
      <div class="act-num">i</div>
      <div>
        <h3 class="act-title">The Whisper <span class="en">Act One</span></h3>
        <p class="act-desc">
          You offer a fragment — a photograph, a sentence, the color of an hour.
          Nothing is asked of you that you wouldn't already say to a window.
        </p>
      </div>
    </div>

    <div class="act-row">
      <div class="act-num">ii</div>
      <div>
        <h3 class="act-title">The Reveal <span class="en">Act Two</span></h3>
        <p class="act-desc">
          A light descends. The wall warms. Your memory steps forward —
          framed, named, lit — as if it had always belonged to a museum
          you didn't know you were building.
        </p>
      </div>
    </div>

    <div class="act-row">
      <div class="act-num">iii</div>
      <div>
        <h3 class="act-title">The Trace <span class="en">Act Three</span></h3>
        <p class="act-desc">
          A ticket. A signature. A link you can press into someone's palm.
          They open it and stand, briefly, in the same soft weather as you.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="closing">
  <p>"Memory is not stored. It is whispered."</p>
  <div class="sig">— ARise, curator's foreword</div>
  <div style="margin-top: 56px;">
    <a href="/create" class="enter-btn">
      <span>Begin</span>
      <span class="arrow">→</span>
    </a>
  </div>
</section>

</body>
</html>`;
