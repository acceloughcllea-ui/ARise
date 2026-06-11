// Auto-generated from live snapshot of https://arise-echo-gallery-7nz.pages.dev/archive
// 您可以直接编辑下方反引号内的 HTML 字符串来修改页面。
export const archiveHtml = `<!DOCTYPE html>
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

<title>ARise · The Archive</title>
<style>
  body { background: #050309; min-height: 100vh; }
  .top-bar-a {
    position: fixed; top: 22px; left: 0; right: 0; z-index: 50;
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 28px; pointer-events: none;
  }
  .top-bar-a a, .top-bar-a span { pointer-events: auto; font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink-faint); }
  .top-bar-a a:hover { color: var(--gold); }
  .archive-head { text-align: center; padding: 130px 24px 40px; }
  .archive-head .eyebrow { color: var(--gold); font-size: 10.5px; letter-spacing: 0.5em; text-transform: uppercase; margin-bottom: 18px; }
  .archive-head h1 { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: clamp(34px,6vw,56px); margin: 0 0 14px; }
  .archive-head p { color: var(--ink-soft); font-size: 13px; max-width: 460px; margin: 0 auto; line-height: 1.8; }
  .archive-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 28px; padding: 40px 28px 80px; max-width: 1280px; margin: 0 auto;
  }
  .archive-card {
    position: relative; cursor: pointer;
    transition: transform .6s cubic-bezier(0.2,0.8,0.2,1);
  }
  .archive-card:hover { transform: translateY(-6px); }
  .archive-card .frame-mini {
    aspect-ratio: 3/4; background: #0a0612;
    box-shadow: 0 0 0 6px #1a1208, 0 0 0 7px var(--gold), 0 20px 40px rgba(0,0,0,0.6);
    overflow: hidden;
  }
  .archive-card .frame-mini img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 4s ease; }
  .archive-card:hover .frame-mini img { transform: scale(1.05); }
  .archive-card .meta { padding: 16px 4px 0; }
  .archive-card .num { font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
  .archive-card .title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; line-height: 1.25; }
  .archive-card .voice { font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-faint); margin-top: 6px; }
  .archive-card .voice .swatch { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .archive-empty { text-align: center; padding: 80px 24px; color: var(--ink-soft); font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 18px; }
  .archive-empty a { color: var(--gold); border-bottom: 1px solid var(--gold); padding-bottom: 3px; font-style: normal; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; margin-left: 8px; }
</style>
</head>
<body>
<div class="top-bar-a">
  <a href="/">← ARise</a>
  <span class="serif-italic" style="text-transform:none;letter-spacing:0.05em;">The Archive</span>
  <a href="/create">+ New Echo</a>
</div>
<header class="archive-head">
  <div class="eyebrow">Permanent Collection</div>
  <h1>Every echo, remembered.</h1>
  <p>A growing archive of every whisper transmuted into art.</p>
</header>
<main class="archive-grid" id="grid"><div class="archive-empty">Loading the collection…</div></main>

<script>
(async () => {
  const grid = document.getElementById('grid');
  try {
    const r = await fetch('/api/archive');
    const data = await r.json();
    if (!data.count) {
      grid.innerHTML = '<div class="archive-empty" style="grid-column:1/-1;">The collection is silent. <a href="/create">Be the first →</a></div>';
      return;
    }
    grid.innerHTML = '';
    for (const item of data.items) {
      const a = document.createElement('a');
      a.className = 'archive-card';
      a.href = '/gallery/' + item.id;
      a.innerHTML = \`
        <div class="frame-mini"><img loading="lazy" src="\${item.art}" alt="\${item.title}"/></div>
        <div class="meta">
          <div class="num">\${item.number}</div>
          <div class="title">\${item.title}</div>
          <div class="voice"><span class="swatch" style="background:\${item.palette};box-shadow:0 0 6px \${item.palette};"></span>\${item.voiceLabel}</div>
        </div>\`;
      grid.appendChild(a);
    }
  } catch (e) {
    grid.innerHTML = '<div class="archive-empty" style="grid-column:1/-1;">Could not load the collection.</div>';
  }
})();
</script>
</body>
</html>`;
