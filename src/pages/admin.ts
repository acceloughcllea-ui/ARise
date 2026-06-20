// ===================================================================
// /admin · 管理面板
//   - 列出所有作品 (缩略图 + 元数据)
//   - 单条删除 / 单条编辑标题、馆员说明、风格
//   - 多选批量删除
//   - 一键清理 SVG 占位废品
//   - 健康状态 / D1 计数 / AI 链路诊断
// ===================================================================
export const adminHtml = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ARise · 管理面板</title>
<link rel="icon" href="/favicon.ico">
<style>
  :root {
    --bg-deep: #050309;
    --bg-card: #0c0716;
    --bg-row: #110a1f;
    --ink: #e8def0;
    --ink-dim: #9c8fb0;
    --ink-mute: #6c5f80;
    --gold: #d4af7a;
    --gold-bright: #f0d091;
    --purple: #9f7aea;
    --purple-deep: #6b46c1;
    --danger: #e53e3e;
    --danger-bright: #fc8181;
    --ok: #48bb78;
    --warn: #f6ad55;
    --line: rgba(212, 175, 122, 0.18);
    --line-strong: rgba(212, 175, 122, 0.4);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg-deep);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    min-height: 100vh;
  }
  body {
    background:
      radial-gradient(ellipse at top, rgba(107, 70, 193, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at bottom, rgba(212, 175, 122, 0.06) 0%, transparent 50%),
      var(--bg-deep);
  }
  a { color: var(--gold); text-decoration: none; }
  a:hover { color: var(--gold-bright); }

  header {
    padding: 24px 32px;
    border-bottom: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }
  header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 0.3em;
    color: var(--gold);
    text-transform: uppercase;
  }
  header h1 .sub {
    color: var(--ink-dim);
    letter-spacing: 0.15em;
    margin-left: 16px;
    font-size: 13px;
  }
  header nav { display: flex; gap: 20px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-dim); }
  header nav a { color: var(--ink-dim); }
  header nav a:hover { color: var(--gold); }

  .stat-bar {
    padding: 16px 32px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .stat-bar .stat { display: flex; gap: 8px; align-items: baseline; }
  .stat-bar .label { color: var(--ink-mute); letter-spacing: 0.15em; text-transform: uppercase; font-size: 10px; }
  .stat-bar .value { color: var(--gold); font-weight: 600; font-size: 16px; }
  .stat-bar .value.ok { color: var(--ok); }
  .stat-bar .value.warn { color: var(--warn); }
  .stat-bar .value.danger { color: var(--danger-bright); }

  .toolbar {
    padding: 16px 32px;
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--line);
    background: rgba(12, 7, 22, 0.6);
  }
  .toolbar .group { display: flex; gap: 8px; align-items: center; }
  .toolbar input[type=text] {
    background: var(--bg-row);
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 8px 14px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    min-width: 240px;
    font-family: inherit;
  }
  .toolbar input[type=text]:focus { border-color: var(--line-strong); }
  .toolbar select {
    background: var(--bg-row);
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }
  .toolbar .count { color: var(--ink-dim); font-size: 12px; margin-left: 8px; }

  .btn {
    background: transparent;
    border: 1px solid var(--line-strong);
    color: var(--gold);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: inherit;
    transition: all 0.15s ease;
  }
  .btn:hover { background: rgba(212, 175, 122, 0.08); border-color: var(--gold); color: var(--gold-bright); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.primary { background: var(--gold); color: var(--bg-deep); border-color: var(--gold); }
  .btn.primary:hover { background: var(--gold-bright); }
  .btn.danger { color: var(--danger-bright); border-color: rgba(229, 62, 62, 0.5); }
  .btn.danger:hover { background: rgba(229, 62, 62, 0.12); border-color: var(--danger); color: #fff; }
  .btn.subtle { color: var(--ink-dim); border-color: var(--line); }
  .btn.subtle:hover { color: var(--ink); border-color: var(--line-strong); }

  .grid {
    padding: 24px 32px 80px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--line);
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s ease;
    position: relative;
  }
  .card:hover { border-color: var(--line-strong); transform: translateY(-2px); }
  .card.selected { border-color: var(--gold); box-shadow: 0 0 0 2px rgba(212, 175, 122, 0.25); }
  .card.placeholder { opacity: 0.55; }
  .card .checkbox {
    position: absolute;
    top: 10px; left: 10px;
    z-index: 2;
    width: 22px; height: 22px;
    cursor: pointer;
    accent-color: var(--gold);
  }
  .card .thumb {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: linear-gradient(135deg, #1a0f2e 0%, #050309 100%);
    object-fit: cover;
    display: block;
    cursor: pointer;
  }
  .card .body { padding: 14px 16px 12px; }
  .card .title {
    font-size: 13px;
    color: var(--ink);
    margin: 0 0 6px;
    font-style: italic;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .card .meta {
    font-size: 10px;
    color: var(--ink-mute);
    letter-spacing: 0.08em;
    font-family: 'SF Mono', Menlo, monospace;
    text-transform: uppercase;
    line-height: 1.6;
  }
  .card .meta .pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(159, 122, 234, 0.15);
    color: var(--purple);
    margin-right: 4px;
    font-size: 9px;
    letter-spacing: 0.1em;
  }
  .card .meta .pill.bad { background: rgba(229, 62, 62, 0.18); color: var(--danger-bright); }
  .card .meta .pill.ok { background: rgba(72, 187, 120, 0.15); color: var(--ok); }
  .card .actions {
    display: flex;
    gap: 6px;
    padding: 10px 16px 14px;
    border-top: 1px solid var(--line);
  }
  .card .actions button {
    flex: 1;
    background: transparent;
    border: 1px solid var(--line);
    color: var(--ink-dim);
    padding: 6px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: inherit;
    transition: all 0.15s;
  }
  .card .actions button:hover { color: var(--gold); border-color: var(--line-strong); }
  .card .actions button.del:hover { color: var(--danger-bright); border-color: rgba(229, 62, 62, 0.5); }

  /* === Modal (编辑 + lightbox) === */
  .modal-mask {
    position: fixed; inset: 0;
    background: rgba(5, 3, 9, 0.88);
    backdrop-filter: blur(6px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 24px;
  }
  .modal-mask.open { display: flex; }
  .modal {
    background: var(--bg-card);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 28px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
  }
  .modal h2 {
    margin: 0 0 8px;
    font-size: 14px;
    letter-spacing: 0.25em;
    color: var(--gold);
    text-transform: uppercase;
    font-weight: 400;
  }
  .modal .echo-id { font-size: 11px; color: var(--ink-mute); font-family: 'SF Mono', monospace; margin-bottom: 20px; }
  .modal .field { margin-bottom: 16px; }
  .modal label {
    display: block;
    font-size: 11px;
    color: var(--ink-dim);
    margin-bottom: 6px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
  .modal input[type=text], .modal textarea, .modal select {
    width: 100%;
    background: var(--bg-row);
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }
  .modal textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  .modal input:focus, .modal textarea:focus, .modal select:focus { border-color: var(--line-strong); }
  .modal .row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }

  /* === Lightbox === */
  .lightbox-mask {
    position: fixed; inset: 0;
    background: rgba(5, 3, 9, 0.95);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 90;
    cursor: zoom-out;
  }
  .lightbox-mask.open { display: flex; }
  .lightbox-mask img { max-width: 90vw; max-height: 90vh; border: 1px solid var(--line-strong); border-radius: 4px; }

  /* === Toast === */
  .toast {
    position: fixed;
    bottom: 24px; left: 50%;
    transform: translateX(-50%);
    background: var(--bg-card);
    border: 1px solid var(--line-strong);
    color: var(--ink);
    padding: 12px 22px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    display: none;
  }
  .toast.show { display: block; animation: toastIn 0.25s ease; }
  .toast.ok { border-color: var(--ok); color: var(--ok); }
  .toast.danger { border-color: var(--danger); color: var(--danger-bright); }
  @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

  .empty {
    padding: 80px 32px;
    text-align: center;
    color: var(--ink-mute);
    font-style: italic;
  }
  .loading { padding: 40px 32px; text-align: center; color: var(--ink-dim); }
</style>
</head>
<body>

<header>
  <h1>ARISE · ADMIN <span class="sub">回响管理面板</span></h1>
  <nav>
    <a href="/" target="_blank">/</a>
    <a href="/exhibit" target="_blank">/exhibit</a>
    <a href="/archive" target="_blank">/archive</a>
    <a href="/create" target="_blank">/create</a>
  </nav>
</header>

<div class="stat-bar" id="stat-bar">
  <div class="stat"><span class="label">Total</span><span class="value" id="s-total">—</span></div>
  <div class="stat"><span class="label">Real AI</span><span class="value ok" id="s-real">—</span></div>
  <div class="stat"><span class="label">Placeholder</span><span class="value warn" id="s-placeholder">—</span></div>
  <div class="stat"><span class="label">Selected</span><span class="value" id="s-selected">0</span></div>
  <div class="stat"><span class="label">Version</span><span class="value" id="s-version" style="font-size:12px">—</span></div>
  <div class="stat"><span class="label">AI Binding</span><span class="value" id="s-ai" style="font-size:12px">—</span></div>
</div>

<div class="toolbar">
  <div class="group">
    <input type="text" id="search" placeholder="Search title / id / voice / note…">
    <select id="filter">
      <option value="all">All pieces</option>
      <option value="real">Real AI only</option>
      <option value="placeholder">Placeholder only</option>
    </select>
  </div>
  <div class="group" style="margin-left:auto">
    <button class="btn subtle" id="btn-refresh">↻ Refresh</button>
    <button class="btn subtle" id="btn-select-all">Select all visible</button>
    <button class="btn subtle" id="btn-clear-sel">Clear selection</button>
    <button class="btn danger" id="btn-bulk-del" disabled>Delete selected (<span id="bulk-count">0</span>)</button>
    <button class="btn danger" id="btn-cleanup">⚡ Cleanup placeholders</button>
  </div>
  <div class="count" id="visible-count"></div>
</div>

<div id="grid" class="grid"></div>

<!-- Edit Modal -->
<div class="modal-mask" id="edit-mask">
  <div class="modal">
    <h2>Edit Echo</h2>
    <div class="echo-id" id="edit-id">—</div>
    <div class="field">
      <label>Title</label>
      <input type="text" id="edit-title" maxlength="120">
    </div>
    <div class="field">
      <label>Curator Note</label>
      <textarea id="edit-note" maxlength="600" rows="4"></textarea>
    </div>
    <div class="field">
      <label>Voice (style)</label>
      <select id="edit-voice"></select>
    </div>
    <div class="row">
      <button class="btn subtle" id="edit-cancel">Cancel</button>
      <button class="btn primary" id="edit-save">Save</button>
    </div>
  </div>
</div>

<!-- Lightbox -->
<div class="lightbox-mask" id="lightbox-mask"><img id="lightbox-img" alt=""></div>

<div class="toast" id="toast"></div>

<script>
const VOICES = [
  ['velvet-midnight', 'Velvet Midnight'],
  ['pressed-flower', 'Pressed Flower'],
  ['ocean-static', 'Ocean Static'],
  ['lantern-room', 'Lantern Room'],
  ['paper-storm', 'Paper Storm'],
  ['underwater', 'Underwater'],
  ['ash-and-honey', 'Ash and Honey'],
  ['glass-cathedral', 'Glass Cathedral'],
  ['rain-window', 'Rain Window'],
  ['amber-room', 'Amber Room'],
];

const state = {
  items: [],
  selected: new Set(),
  filter: 'all',
  search: '',
  editing: null,
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function toast(msg, kind='') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  setTimeout(() => t.className = 'toast', 2400);
}

function isPlaceholder(art) {
  return typeof art === 'string' && art.startsWith('data:image/svg');
}

function mimeOf(art) {
  if (!art) return '?';
  const m = /^data:(image\\/[a-z+]+)/.exec(art);
  return m ? m[1].replace('image/', '') : 'other';
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toISOString().slice(0,10) + ' ' + d.toISOString().slice(11,16);
}

function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function refreshSelectBar() {
  $('#s-selected').textContent = state.selected.size;
  $('#bulk-count').textContent = state.selected.size;
  $('#btn-bulk-del').disabled = state.selected.size === 0;
}

function applyFilter() {
  const q = state.search.toLowerCase().trim();
  return state.items.filter(it => {
    if (state.filter === 'real' && isPlaceholder(it.art)) return false;
    if (state.filter === 'placeholder' && !isPlaceholder(it.art)) return false;
    if (q) {
      const hay = (it.id + ' ' + (it.title||'') + ' ' + (it.voice||'') + ' ' + (it.voiceLabel||'') + ' ' + (it.curatorNote||'')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function render() {
  const grid = $('#grid');
  const filtered = applyFilter();
  $('#visible-count').textContent = filtered.length + ' / ' + state.items.length + ' visible';

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty">No echoes match the current filter.</div>';
    return;
  }

  grid.innerHTML = filtered.map(it => {
    const ph = isPlaceholder(it.art);
    const sel = state.selected.has(it.id);
    const mime = mimeOf(it.art);
    return \`
    <div class="card \${ph?'placeholder':''} \${sel?'selected':''}" data-id="\${it.id}">
      <input type="checkbox" class="checkbox" data-id="\${it.id}" \${sel?'checked':''}>
      <img class="thumb" src="\${it.art}" alt="\${escHtml(it.title)}" data-id="\${it.id}" loading="lazy">
      <div class="body">
        <div class="title">"\${escHtml(it.title || 'Untitled')}"</div>
        <div class="meta">
          <span class="pill \${ph?'bad':'ok'}">\${ph?'placeholder':mime}</span>
          <span class="pill">\${escHtml(it.voiceLabel || it.voice || '?')}</span><br>
          \${escHtml(it.id)} · \${fmtDate(it.createdAt)}
        </div>
      </div>
      <div class="actions">
        <button class="edit" data-id="\${it.id}">Edit</button>
        <button class="del" data-id="\${it.id}">Delete</button>
      </div>
    </div>\`;
  }).join('');

  // Bind events
  $$('#grid .checkbox').forEach(cb => cb.addEventListener('change', e => {
    const id = e.target.getAttribute('data-id');
    if (e.target.checked) state.selected.add(id); else state.selected.delete(id);
    e.target.closest('.card').classList.toggle('selected', e.target.checked);
    refreshSelectBar();
  }));
  $$('#grid .thumb').forEach(img => img.addEventListener('click', e => openLightbox(e.target.src)));
  $$('#grid .edit').forEach(b => b.addEventListener('click', e => openEdit(e.target.getAttribute('data-id'))));
  $$('#grid .del').forEach(b => b.addEventListener('click', e => deleteOne(e.target.getAttribute('data-id'))));
}

function recomputeStats() {
  const total = state.items.length;
  const ph = state.items.filter(it => isPlaceholder(it.art)).length;
  $('#s-total').textContent = total;
  $('#s-real').textContent = total - ph;
  $('#s-placeholder').textContent = ph;
  $('#s-placeholder').className = 'value ' + (ph > 0 ? 'warn' : 'ok');
}

async function loadAll() {
  $('#grid').innerHTML = '<div class="loading">Loading echoes…</div>';
  try {
    const [list, health] = await Promise.all([
      fetch('/api/exhibit', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/health', { cache: 'no-store' }).then(r => r.json()),
    ]);
    state.items = list.items || [];
    state.selected.clear();
    $('#s-version').textContent = health.version || '—';
    $('#s-ai').textContent = health.ai_binding ? 'bound ✓' : 'none';
    $('#s-ai').className = 'value ' + (health.ai_binding ? 'ok' : 'warn');
    recomputeStats();
    refreshSelectBar();
    render();
  } catch (e) {
    $('#grid').innerHTML = '<div class="empty">Failed to load: ' + (e.message || e) + '</div>';
    toast('Failed to load: ' + (e.message || e), 'danger');
  }
}

async function deleteOne(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;
  if (!confirm('Delete "' + (it.title || 'Untitled') + '" (' + id + ') ?\\nThis cannot be undone.')) return;
  try {
    const r = await fetch('/api/echo/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    state.items = state.items.filter(x => x.id !== id);
    state.selected.delete(id);
    recomputeStats();
    refreshSelectBar();
    render();
    toast('Deleted ' + id, 'ok');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'danger');
  }
}

async function bulkDelete() {
  const ids = Array.from(state.selected);
  if (ids.length === 0) return;
  if (!confirm('Delete ' + ids.length + ' selected echoes?\\nThis cannot be undone.')) return;
  let okCount = 0, failCount = 0;
  for (const id of ids) {
    try {
      const r = await fetch('/api/echo/' + encodeURIComponent(id), { method: 'DELETE' });
      if (r.ok) okCount++; else failCount++;
    } catch { failCount++; }
  }
  toast('Deleted ' + okCount + (failCount ? (' · failed ' + failCount) : ''), failCount ? 'danger' : 'ok');
  await loadAll();
}

async function cleanupPlaceholders() {
  // Step 1: dry-run
  let dry;
  try {
    dry = await fetch('/api/admin/cleanup-placeholders').then(r => r.json());
  } catch (e) {
    return toast('Preview failed: ' + e.message, 'danger');
  }
  const count = dry.scanned || 0;
  if (count === 0) return toast('No placeholders found ✨', 'ok');
  if (!confirm('Found ' + count + ' SVG-placeholder echoes.\\nDelete them all from D1 + KV + memory?\\nThis cannot be undone.')) return;
  try {
    const r = await fetch('/api/admin/cleanup-placeholders?execute=1', { method: 'POST' }).then(r => r.json());
    toast('Cleaned ' + (r.d1?.deleted || 0) + ' placeholders', 'ok');
    await loadAll();
  } catch (e) {
    toast('Cleanup failed: ' + e.message, 'danger');
  }
}

function openLightbox(src) {
  $('#lightbox-img').src = src;
  $('#lightbox-mask').classList.add('open');
}
$('#lightbox-mask').addEventListener('click', () => $('#lightbox-mask').classList.remove('open'));

function openEdit(id) {
  const it = state.items.find(x => x.id === id);
  if (!it) return;
  state.editing = id;
  $('#edit-id').textContent = id + ' · ' + fmtDate(it.createdAt);
  $('#edit-title').value = it.title || '';
  $('#edit-note').value = it.curatorNote || '';
  const sel = $('#edit-voice');
  sel.innerHTML = VOICES.map(([k, lbl]) => '<option value="' + k + '"' + (k === it.voice ? ' selected' : '') + '>' + lbl + '</option>').join('');
  $('#edit-mask').classList.add('open');
}
$('#edit-cancel').addEventListener('click', () => $('#edit-mask').classList.remove('open'));
$('#edit-mask').addEventListener('click', e => { if (e.target === $('#edit-mask')) $('#edit-mask').classList.remove('open'); });
$('#edit-save').addEventListener('click', async () => {
  const id = state.editing;
  if (!id) return;
  const body = {
    title: $('#edit-title').value.trim(),
    curatorNote: $('#edit-note').value.trim(),
    voice: $('#edit-voice').value,
  };
  try {
    const r = await fetch('/api/echo/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const updated = await r.json();
    const idx = state.items.findIndex(x => x.id === id);
    if (idx >= 0) state.items[idx] = { ...state.items[idx], ...updated };
    render();
    $('#edit-mask').classList.remove('open');
    toast('Saved ' + id, 'ok');
  } catch (e) {
    toast('Save failed: ' + e.message, 'danger');
  }
});

// === Wire toolbar ===
$('#search').addEventListener('input', e => { state.search = e.target.value; render(); });
$('#filter').addEventListener('change', e => { state.filter = e.target.value; render(); });
$('#btn-refresh').addEventListener('click', loadAll);
$('#btn-select-all').addEventListener('click', () => {
  applyFilter().forEach(it => state.selected.add(it.id));
  refreshSelectBar();
  render();
});
$('#btn-clear-sel').addEventListener('click', () => {
  state.selected.clear();
  refreshSelectBar();
  render();
});
$('#btn-bulk-del').addEventListener('click', bulkDelete);
$('#btn-cleanup').addEventListener('click', cleanupPlaceholders);

// === Boot ===
loadAll();
</script>

</body>
</html>`;
