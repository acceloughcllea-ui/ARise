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

  /* === 编辑 / 删除 操作条 === */
  .archive-card .actions {
    display: flex; gap: 10px; padding: 12px 4px 0;
    opacity: 0; transform: translateY(-4px);
    transition: opacity .3s, transform .3s;
  }
  .archive-card:hover .actions { opacity: 1; transform: translateY(0); }
  .archive-card .actions button {
    flex: 1; padding: 7px 0; font-size: 9.5px; letter-spacing: 0.28em; text-transform: uppercase;
    background: transparent; color: var(--ink-soft); border: 1px solid var(--line);
    cursor: pointer; transition: all .25s; font-family: 'Inter', sans-serif;
  }
  .archive-card .actions button:hover { color: var(--gold); border-color: var(--gold); background: rgba(212,175,122,0.08); }
  .archive-card .actions button.del:hover { color: #e8a8a8; border-color: #a85a5a; background: rgba(168,90,90,0.1); }

  /* === 模态框 === */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(5,3,9,0.85); backdrop-filter: blur(8px);
    z-index: 100; display: none; align-items: center; justify-content: center; padding: 24px;
  }
  .modal-backdrop.open { display: flex; }
  .modal {
    background: #0e0a1a; border: 1px solid var(--line); max-width: 520px; width: 100%;
    padding: 36px 32px; position: relative; box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  }
  .modal h2 { font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 300; font-size: 28px; margin: 0 0 6px; }
  .modal .sub { font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); margin-bottom: 24px; }
  .modal label { display: block; font-size: 10.5px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-faint); margin: 18px 0 8px; }
  .modal input, .modal textarea, .modal select {
    width: 100%; background: rgba(245,237,224,0.03); border: 1px solid var(--line);
    color: var(--ink); padding: 12px 14px; font-size: 14px; font-family: inherit;
    transition: border-color .2s;
  }
  .modal textarea { resize: vertical; min-height: 100px; font-family: 'Cormorant Garamond', serif; font-size: 16px; line-height: 1.6; }
  .modal input:focus, .modal textarea:focus, .modal select:focus { outline: none; border-color: var(--gold); }
  .modal .row { display: flex; gap: 12px; margin-top: 28px; }
  .modal .row button {
    flex: 1; padding: 13px 0; font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase;
    background: transparent; color: var(--ink); border: 1px solid var(--line);
    cursor: pointer; transition: all .25s; font-family: 'Inter', sans-serif;
  }
  .modal .row button.primary { background: var(--gold); color: #0a0612; border-color: var(--gold); }
  .modal .row button.primary:hover { background: #e6c290; }
  .modal .row button.ghost:hover { color: var(--gold); border-color: var(--gold); }
  .modal .row button.danger { color: #e8a8a8; border-color: #a85a5a; }
  .modal .row button.danger:hover { background: #a85a5a; color: #fff; }
  .modal .close { position: absolute; top: 14px; right: 18px; background: transparent; border: none; color: var(--ink-faint); font-size: 20px; cursor: pointer; }
  .modal .close:hover { color: var(--gold); }
  .modal .preview-mini { display: flex; gap: 14px; align-items: center; margin-bottom: 8px; }
  .modal .preview-mini img { width: 60px; height: 80px; object-fit: cover; box-shadow: 0 0 0 2px var(--gold); }
  .modal .preview-mini .num { font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); }

  /* toast */
  .toast {
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(20px);
    background: #0e0a1a; border: 1px solid var(--gold); color: var(--ink);
    padding: 12px 24px; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase;
    opacity: 0; transition: opacity .3s, transform .3s; z-index: 200; pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
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

<!-- 编辑模态框 -->
<div class="modal-backdrop" id="editModal">
  <div class="modal">
    <button class="close" id="editClose" aria-label="Close">&times;</button>
    <div class="sub">Curate</div>
    <h2 id="editHeadline">Edit this echo</h2>
    <div class="preview-mini">
      <img id="editPreview" alt=""/>
      <div><div class="num" id="editNumber"></div></div>
    </div>
    <label for="editTitle">Title</label>
    <input type="text" id="editTitle" maxlength="120"/>
    <label for="editVoice">Voice</label>
    <select id="editVoice">
      <option value="velvet-midnight">Velvet midnight</option>
      <option value="sun-bleached">Sun-bleached memory</option>
      <option value="underwater">Underwater dream</option>
      <option value="pressed-flower">Pressed flower</option>
    </select>
    <label for="editNote">Curator's Note</label>
    <textarea id="editNote" maxlength="600"></textarea>
    <div class="row">
      <button class="ghost" id="editCancel">Cancel</button>
      <button class="primary" id="editSave">Save changes</button>
    </div>
  </div>
</div>

<!-- 删除确认模态框 -->
<div class="modal-backdrop" id="delModal">
  <div class="modal">
    <button class="close" id="delClose" aria-label="Close">&times;</button>
    <div class="sub">Remove from collection</div>
    <h2>Delete this echo?</h2>
    <p style="color:var(--ink-soft);font-size:13px;line-height:1.7;margin:18px 0 6px;">
      This action is permanent. The artwork, title, and curator's note will be<br>
      removed from both <em>The Archive</em> and <em>The Exhibit</em>.
    </p>
    <div class="preview-mini" style="margin-top:18px;">
      <img id="delPreview" alt=""/>
      <div><div class="num" id="delNumber"></div><div id="delTitle" style="font-family:'Cormorant Garamond',serif;font-size:16px;margin-top:4px;"></div></div>
    </div>
    <div class="row">
      <button class="ghost" id="delCancel">Keep it</button>
      <button class="danger" id="delConfirm">Delete forever</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
(function(){
  const grid = document.getElementById('grid');
  const editModal = document.getElementById('editModal');
  const delModal = document.getElementById('delModal');
  const toast = document.getElementById('toast');
  let currentEditId = null;
  let currentDelId = null;

  function showToast(msg, ms){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toast.classList.remove('show'), ms||2400);
  }

  async function loadList(){
    grid.innerHTML = '<div class="archive-empty" style="grid-column:1/-1;">Loading the collection…</div>';
    try{
      const r = await fetch('/api/archive?t='+Date.now(), { cache:'no-store' });
      const data = await r.json();
      if (!data.count){
        grid.innerHTML = '<div class="archive-empty" style="grid-column:1/-1;">The collection is silent. <a href="/create">Be the first →</a></div>';
        return;
      }
      grid.innerHTML = '';
      for (const item of data.items){
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.dataset.id = item.id;
        card.innerHTML = \`
          <a href="/gallery/\${item.id}" style="display:block;">
            <div class="frame-mini"><img loading="lazy" src="\${item.art}" alt=""/></div>
          </a>
          <div class="meta">
            <div class="num">\${item.number}</div>
            <div class="title">\${escapeHtml(item.title)}</div>
            <div class="voice"><span class="swatch" style="background:\${item.palette};box-shadow:0 0 6px \${item.palette};"></span>\${item.voiceLabel}</div>
            <div class="actions">
              <button data-act="edit">Edit</button>
              <button class="del" data-act="del">Delete</button>
            </div>
          </div>\`;
        // 把 item 数据挂到卡片上, 方便编辑/删除时不再请求
        card._item = item;
        grid.appendChild(card);
      }
    } catch(e){
      grid.innerHTML = '<div class="archive-empty" style="grid-column:1/-1;">Could not load the collection.</div>';
    }
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const card = btn.closest('.archive-card');
    const item = card._item;
    if (btn.dataset.act === 'edit') openEdit(item);
    if (btn.dataset.act === 'del') openDel(item);
  });

  function openEdit(item){
    currentEditId = item.id;
    document.getElementById('editPreview').src = item.art;
    document.getElementById('editNumber').textContent = item.number;
    document.getElementById('editTitle').value = item.title || '';
    document.getElementById('editNote').value = item.curatorNote || '';
    document.getElementById('editVoice').value = item.voice || 'velvet-midnight';
    editModal.classList.add('open');
  }
  function closeEdit(){ editModal.classList.remove('open'); currentEditId = null; }

  function openDel(item){
    currentDelId = item.id;
    document.getElementById('delPreview').src = item.art;
    document.getElementById('delNumber').textContent = item.number;
    document.getElementById('delTitle').textContent = item.title;
    delModal.classList.add('open');
  }
  function closeDel(){ delModal.classList.remove('open'); currentDelId = null; }

  document.getElementById('editClose').onclick = closeEdit;
  document.getElementById('editCancel').onclick = closeEdit;
  document.getElementById('delClose').onclick = closeDel;
  document.getElementById('delCancel').onclick = closeDel;
  // 点击背景关闭
  editModal.addEventListener('click', (e)=>{ if(e.target===editModal) closeEdit(); });
  delModal.addEventListener('click', (e)=>{ if(e.target===delModal) closeDel(); });
  // ESC 关闭
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeEdit(); closeDel(); } });

  document.getElementById('editSave').onclick = async () => {
    if (!currentEditId) return;
    const btn = document.getElementById('editSave');
    btn.disabled = true; btn.textContent = 'Saving…';
    try{
      const r = await fetch('/api/echo/' + encodeURIComponent(currentEditId), {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          title: document.getElementById('editTitle').value,
          curatorNote: document.getElementById('editNote').value,
          voice: document.getElementById('editVoice').value,
        }),
      });
      if (!r.ok) throw new Error('HTTP '+r.status);
      closeEdit();
      showToast('Saved · refreshing collection');
      await loadList();
    } catch(e){
      showToast('Save failed — try again');
    } finally {
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  };

  document.getElementById('delConfirm').onclick = async () => {
    if (!currentDelId) return;
    const btn = document.getElementById('delConfirm');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try{
      const r = await fetch('/api/echo/' + encodeURIComponent(currentDelId), { method:'DELETE' });
      if (!r.ok) throw new Error('HTTP '+r.status);
      closeDel();
      showToast('Removed · refreshing');
      await loadList();
    } catch(e){
      showToast('Delete failed — try again');
    } finally {
      btn.disabled = false; btn.textContent = 'Delete forever';
    }
  };

  // 初次加载 + 页面重新可见时自动刷新 (跨页面同步: 从 exhibit 回来会自动更新)
  loadList();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadList();
  });
})();
</script>
</body>
</html>`;
