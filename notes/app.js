import { setupEditorLayout } from './editor-layout.mjs?v=20261027-editor2';
import { EMPTY, validateDocument, sameDocument, mergeDocuments, toBase64, fromBase64, searchNotes } from './core.mjs';
import { setupTableOfContents } from './toc.mjs';
import { setupSidebarTools } from './sidebar-tools.mjs';
import { directoryParts, directoryKey, listDirectories, inDirectory, moveNote, renameDirectory } from './directories.mjs';

const ROOT = new URL(`${document.body.dataset.root}/`, location.href);
const EDIT = document.body.dataset.mode === 'edit';
const REPO = 'bigbigyan/bigbigyan.github.io';
const BRANCH = 'master';
const FILE = 'notes/notebook.json';
const STORAGE = `yan-notebook:v1:${REPO}:${BRANCH}`;
const FONT_STORAGE = `${STORAGE}:font-size`;
const DEFAULT_FONT_SIZE = 16;
const CATALOG_VERSION = '2026-10-19-original-notes';
const $ = selector => document.querySelector(selector);
const clone = value => structuredClone(value);
const paths = {
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h4"/>',
  folder: '<path d="M3 6h7l2 3h9v11H3z"/>',
  edit: '<path d="m15 4 5 5-10 10-6 1 1-6zM12 7l5 5"/>',
  cloud: '<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11M12 12v9m-3-6 3-3 3 3"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  github: '<path d="M9 19c-4 1-4-2-6-2M15 22v-4c0-1 .5-2 1-2 4 0 6-2 6-6a5 5 0 0 0-1-3 5 5 0 0 0 0-4s-2 0-4 2a13 13 0 0 0-6 0C9 3 7 3 7 3a5 5 0 0 0 0 4 5 5 0 0 0-1 3c0 4 2 6 6 6-1 1-1 2-1 3v3" transform="translate(-2 0)"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5"/>',
  leaf: '<path d="M5 20c0-8 5-15 15-16 0 9-4 16-12 14M6 18l8-8"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
let state = { base: clone(EMPTY), document: clone(EMPTY), lastOpened: null };
let token = '', busy = false, storageFailed = false, rich = null, richBaseline = '', editorMounting = null, mode = 'rich';
let storageSnapshot = null, persistedDocument = clone(EMPTY);
let currentId = new URLSearchParams(location.search).get('note');
let pendingSave = false, conflictRemote = null, toastTimer;
let disposeToc = () => {};
let sidebarTools, sourceLayout;
const expandedCategories = new Set();
let channel;
try { channel = new BroadcastChannel(STORAGE); } catch { /* Cross-tab notices are optional. */ }

function readFontSize() {
  try { const value = Number(localStorage.getItem(FONT_STORAGE)); return Number.isInteger(value) && value >= 12 && value <= 24 ? value : DEFAULT_FONT_SIZE; }
  catch { return DEFAULT_FONT_SIZE; }
}
function applyFontSize(value, save = false) {
  const size = Math.max(12, Math.min(24, Math.round(Number(value) || DEFAULT_FONT_SIZE)));
  document.documentElement.style.setProperty('--note-font-size', `${size}px`);
  if ($('#font-size-range')) {
    $('#font-size-range').value = size;
    $('#font-size-value').value = `${size} px`;
    $('#font-smaller').disabled = size === 12;
    $('#font-larger').disabled = size === 24;
  }
  if (save) { try { localStorage.setItem(FONT_STORAGE, String(size)); } catch { toast('字号已调整，但当前浏览器无法记住此设置。'); } }
}
function fontButton() { return '<button class="text-button font-button" data-action="font-size" aria-haspopup="dialog"><span aria-hidden="true">Aa</span>字号</button>'; }

function readerURL(id = currentId) { const url = new URL(ROOT); if (id) url.searchParams.set('note', id); return url.href; }
function editorURL(id = currentId) { const url = new URL('edit/', ROOT); if (id) url.searchParams.set('note', id); return url.href; }
const current = () => state.document.notes.find(n => n.id === currentId);
function toast(message) { const box = $('#toast'); box.textContent = message; box.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 6500); }
function setStatus(message, error = false) { document.querySelectorAll('.status').forEach(el => { el.textContent = message; el.classList.toggle('error', error); }); }
function persist() {
  try {
    const disk = localStorage.getItem(STORAGE);
    if (disk !== storageSnapshot && disk) {
      const latest = JSON.parse(disk), merged = mergeDocuments(persistedDocument, state.document, validateDocument(latest.document));
      if (merged.conflicts.length) throw new Error('另一个页面修改了同一篇笔记');
      state.document = merged.document;
    }
    storageSnapshot = JSON.stringify(state); localStorage.setItem(STORAGE, storageSnapshot);
    persistedDocument = clone(state.document); storageFailed = false;
  }
  catch { storageFailed = true; }
  if ($('#storage-alert')) $('#storage-alert').hidden = !storageFailed;
  if (storageFailed) setStatus('草稿未能保存，请导出备份', true);
  return !storageFailed;
}
function draftStatus() {
  updateSaveVisibility();
  if (storageFailed) return setStatus('草稿未能保存，请导出备份', true);
  setStatus(sameDocument(state.base, state.document) ? '与最近读取的云端版本一致' : '草稿已保存到此浏览器');
}
function updateSaveVisibility() { if (!EDIT) document.querySelectorAll('[data-action=save]').forEach(b => { b.hidden = sameDocument(state.base, state.document); }); }
function download(name, text, mime = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function backup() { captureRich(); download(`学习笔记备份-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state.document, null, 2), 'application/json'); }
function exportNote() { captureRich(); const n = current(); if (!n) return; download(`${n.title.replace(/[<>:"/\\|?*]/g, '-') || '笔记'}.md`, `# ${n.title}\n\n${n.body}`); }

const TRASH_PREFIX = `${STORAGE}:trash:`;
function trashEntries() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i); if (!key?.startsWith(TRASH_PREFIX)) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      entries.push({ key, note: validateDocument({ version: 1, notes: [value.note] }).notes[0], deletedAt: value.deletedAt });
    } catch { /* Keep unreadable records untouched for recovery. */ }
  }
  return entries.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}
function openDelete() {
  if (busy || editorMounting || !current()) return;
  captureRich(); $('#delete-note-name').textContent = current().title;
  $('#delete-error').textContent = ''; $('#delete-dialog').showModal();
}
async function deleteNote() {
  if (busy || !current()) return;
  captureRich();
  const previous = clone(state.document), note = clone(current()), key = `${TRASH_PREFIX}${crypto.randomUUID()}`;
  try {
    localStorage.setItem(key, JSON.stringify({ note, deletedAt: new Date().toISOString() }));
  } catch { $('#delete-error').textContent = '无法创建可恢复的副本。请先导出笔记，或释放浏览器存储空间。'; return; }
  setBusy(true);
  try {
    if (rich) { await rich.destroy(); rich = null; }
    state.document.notes = state.document.notes.filter(n => n.id !== note.id);
    if (!persist()) {
      state.document = previous;
      $('#delete-error').textContent = '未能保存删除操作，笔记仍保留。请先导出备份。';
      if (EDIT && mode === 'rich') await mountRich();
      return;
    }
    currentId = state.document.notes[0]?.id || null; state.lastOpened = currentId; persist();
    $('#delete-dialog').close();
    if (EDIT) { location.href = readerURL(currentId); return; }
    history.replaceState(null, '', readerURL(currentId)); renderNote();
    toast('已移到本机回收站。点击“保存到 GitHub”同步删除。');
  } catch (e) { state.document = previous; $('#delete-error').textContent = `删除未完成：${e.message}`; }
  finally { setBusy(false); }
}
function openTrash() {
  if (busy) return;
  const host = $('#trash-list'); host.replaceChildren();
  try {
    const entries = trashEntries();
    if (!entries.length) { const p = document.createElement('p'); p.textContent = '回收站是空的。'; host.append(p); }
    for (const entry of entries) {
      const row = document.createElement('div'); row.className = 'trash-row';
      const text = document.createElement('div'), title = document.createElement('strong'), subtitle = document.createElement('small');
      title.textContent = entry.note.title; subtitle.textContent = entry.note.category; text.append(title, subtitle);
      const button = document.createElement('button'); button.className = 'secondary'; button.textContent = '恢复'; button.setAttribute('aria-label', `恢复 ${entry.note.title}`);
      button.onclick = () => restoreNote(entry); row.append(text, button); host.append(row);
    }
  } catch { const p = document.createElement('p'); p.textContent = '浏览器暂时无法读取回收站，请先导出已有笔记。'; host.append(p); }
  if (!$('#trash-dialog').open) $('#trash-dialog').showModal();
}
function restoreNote(entry) {
  if (busy) return;
  const previous = clone(state.document), note = clone(entry.note);
  if (state.document.notes.length >= 500) return toast('最多支持 500 篇笔记，请先整理后再恢复。');
  if (state.document.notes.some(n => n.id === note.id)) { note.id = crypto.randomUUID(); note.title = `${note.title.slice(0, 150)}（恢复）`; }
  note.updatedAt = new Date().toISOString(); state.document.notes.unshift(note);
  if (!persist()) { state.document = previous; return toast('恢复未能保存。回收站中的副本已保留。'); }
  try { localStorage.removeItem(entry.key); } catch { /* A duplicate recovery copy is safer than losing the note. */ }
  currentId = note.id; state.lastOpened = currentId; persist();
  $('#trash-dialog').close(); history.replaceState(null, '', readerURL(currentId)); renderNote();
  toast('笔记已恢复。点击“保存到 GitHub”同步恢复。');
}

function configureMarkdown() {
  const render = (text, displayMode) => window.katex.renderToString(text, { displayMode, throwOnError: false, trust: false, maxExpand: 1000, output: 'htmlAndMathml' });
  window.marked.use({ extensions: [
    { name: 'blockMath', level: 'block', start: src => src.search(/\$\$|\\\[/), tokenizer(src) {
      const match = /^(?:\$\$[ \t]*\n?([\s\S]+?)\n?\$\$|\\\[([\s\S]+?)\\\])(?:[ \t]*(?:\n|$))/.exec(src);
      if (match) return { type: 'blockMath', raw: match[0], text: match[1] || match[2] };
    }, renderer: t => render(t.text, true) },
    { name: 'inlineMath', level: 'inline', start: src => src.search(/\$|\\\(/), tokenizer(src) {
      const match = /^(?:\$(?!\$)((?:\\[^\n]|[^$\\\n])+?)\$(?!\$)|\\\(([\s\S]+?)\\\))/.exec(src);
      if (match) return { type: 'inlineMath', raw: match[0], text: match[1] || match[2] };
    }, renderer: t => render(t.text, false) },
  ] });
}
function renderBody(element, markdown) {
  try {
    element.innerHTML = window.DOMPurify.sanitize(window.marked.parse(markdown, { gfm: true }), { ADD_TAGS: ['annotation', 'semantics'], ADD_ATTR: ['encoding'], FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form'] });
    element.querySelectorAll('a').forEach(a => {
      if (a.getAttribute('href')?.startsWith('?note=')) a.href = readerURL(new URLSearchParams(a.getAttribute('href').slice(1)).get('note'));
      if (a.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    });
    element.querySelectorAll('input').forEach(el => { el.disabled = true; });
  } catch { element.textContent = markdown; toast('排版暂时不可用，已显示 Markdown 原文。'); }
}
function dialogs() {
  return `<div id="toast" class="toast" role="status" hidden></div>
  <dialog id="font-dialog" aria-labelledby="font-title">
    <button class="close-dialog" data-close="font-dialog" aria-label="关闭字号设置">×</button>
    <h2 id="font-title">调整字号</h2><p>阅读和编辑时使用同一字号，当前浏览器会记住你的选择。</p>
    <label for="font-size-range">正文字号 <output id="font-size-value" for="font-size-range" aria-live="polite">16 px</output></label>
    <div class="font-controls"><button class="secondary" id="font-smaller" aria-label="缩小字号">A−</button><input type="range" id="font-size-range" min="12" max="24" step="1" value="16"><button class="secondary" id="font-larger" aria-label="放大字号">A+</button></div>
    <div class="font-preview">记录、理解，再连接。<br>Write a little, learn a little.</div>
    <div class="dialog-actions"><button class="secondary" id="font-reset">恢复默认</button><button class="primary" data-close="font-dialog">完成</button></div>
  </dialog>
  <dialog id="connection-dialog" aria-labelledby="connection-title">
    <button class="close-dialog" data-close="connection-dialog" aria-label="关闭">×</button>
    <h2 id="connection-title">连接你的 GitHub</h2>
    <p>将笔记保存到仓库，保留每次修改的历史。此仓库中的笔记公开可读。</p>
    <div class="repo-label">${REPO}<br>分支：${BRANCH} · ${FILE}</div>
    <label for="github-token">Fine-grained access token</label>
    <input id="github-token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…">
    <p>选择此仓库，在 <strong>Add permissions</strong> 中添加 <strong>Contents</strong>，将 Access 设为 <strong>Read and write</strong>。新增、修改和删除笔记均使用此权限，无需另加删除权限。</p>
    <p>令牌仅用于本页会话，刷新页面后需重新输入；不会保存到草稿或仓库。</p>
    <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" class="text-button">前往 GitHub 创建令牌 ↗</a>
    <p id="connection-error" class="dialog-error" role="alert"></p>
    <div class="dialog-actions"><button class="secondary" id="disconnect">断开连接</button><button class="primary" id="connect">验证并连接</button></div>
  </dialog>
  <dialog id="new-dialog" aria-labelledby="new-title">
    <button class="close-dialog" data-close="new-dialog" aria-label="关闭">×</button><h2 id="new-title">记录一个新的想法</h2>
    <form id="new-form"><label for="new-note-title">笔记标题</label><input id="new-note-title" maxlength="160" required placeholder="今天想理解什么？">
    <label for="new-category">课程 / 分类</label><input id="new-category" maxlength="160" required list="categories" value="数学 / 微积分"><datalist id="categories"></datalist>
    <div class="dialog-actions"><button type="button" class="secondary" data-close="new-dialog">取消</button><button type="submit" class="primary">创建并开始写作</button></div></form>
  </dialog>
  <dialog id="move-dialog" aria-labelledby="move-title">
    <button class="close-dialog" data-close="move-dialog" aria-label="关闭移动笔记">×</button><h2 id="move-title">移动笔记</h2>
    <p id="move-note-name" class="organization-note"></p><p id="move-origin"></p>
    <form id="move-form"><label for="move-directory">目标目录</label><select id="move-directory"></select>
    <div id="move-new-fields" hidden><label for="move-new-path">新目录路径</label><input id="move-new-path" maxlength="160" placeholder="例如：数学 / 微积分 / 导数"><p>用 / 分隔层级，移动后会自动显示新目录。</p></div>
    <p>先保存到当前浏览器，点击“保存到 GitHub”后同步到其他设备。</p><p id="move-error" class="dialog-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="secondary" data-close="move-dialog">取消</button><button type="submit" class="primary" id="confirm-move">移动</button></div></form>
  </dialog>
  <dialog id="rename-dialog" aria-labelledby="rename-title">
    <button class="close-dialog" data-close="rename-dialog" aria-label="关闭重命名目录">×</button><h2 id="rename-title">重命名目录</h2>
    <form id="rename-form"><label for="rename-directory">选择目录</label><select id="rename-directory"></select>
    <label for="rename-name">新名称</label><input id="rename-name" maxlength="160" required placeholder="输入目录的新名称">
    <p id="rename-preview" class="organization-path"></p><p id="rename-impact"></p>
    <p>笔记正文不变；点击“保存到 GitHub”后同步目录名称。</p><p id="rename-error" class="dialog-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" class="secondary" data-close="rename-dialog">取消</button><button type="submit" class="primary" id="confirm-rename">重命名</button></div></form>
  </dialog>
  <dialog id="conflict-dialog" aria-labelledby="conflict-title"><h2 id="conflict-title">发现两个不同的版本</h2>
    <p id="conflict-text"></p><p>你的草稿已保留。可以下载云端副本比较，也可以备份本地笔记后采用云端版本。</p>
    <div class="dialog-actions"><button class="secondary" id="download-cloud">下载云端副本</button><button class="secondary" data-close="conflict-dialog">保留草稿</button><button class="primary" id="use-cloud">备份并采用云端</button></div>
  </dialog>
  <dialog id="delete-dialog" aria-labelledby="delete-title"><h2 id="delete-title">将笔记移到回收站？</h2>
    <p id="delete-note-name" class="delete-note-name"></p><p>笔记会从列表中移除，并保留在当前浏览器的回收站。点击“保存到 GitHub”后才会同步删除。</p>
    <p id="delete-error" class="dialog-error" role="alert"></p><div class="dialog-actions"><button class="secondary" data-close="delete-dialog">取消</button><button class="danger-button" id="confirm-delete">移到回收站</button></div>
  </dialog>
  <dialog id="trash-dialog" aria-labelledby="trash-title"><button class="close-dialog" data-close="trash-dialog" aria-label="关闭回收站">×</button><h2 id="trash-title">回收站</h2>
    <p>这里保存当前浏览器中删除的笔记，可随时恢复。回收站不会跨设备同步；清除浏览器数据也会清除这些副本。</p><div id="trash-list" class="trash-list"></div>
    <div class="dialog-actions"><button class="secondary" data-close="trash-dialog">关闭</button></div>
  </dialog>
  <input id="import-file" class="visually-hidden" type="file" accept=".md,.markdown,.json,text/markdown,application/json">`;
}
function sharedEvents() {
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => document.getElementById(b.dataset.close).close());
  applyFontSize(readFontSize());
  document.querySelectorAll('[data-action=font-size]').forEach(b => b.onclick = () => { $('#font-dialog').showModal(); $('#font-size-range').focus(); });
  $('#font-size-range').oninput = event => applyFontSize(event.target.value, true);
  $('#font-smaller').onclick = () => applyFontSize(Number($('#font-size-range').value) - 1, true);
  $('#font-larger').onclick = () => applyFontSize(Number($('#font-size-range').value) + 1, true);
  $('#font-reset').onclick = () => applyFontSize(DEFAULT_FONT_SIZE, true);
  window.addEventListener('storage', event => { if (event.key === FONT_STORAGE || event.key === null) applyFontSize(readFontSize()); });
  $('#connect').onclick = connect;
  $('#disconnect').onclick = () => { token = ''; $('#github-token').value = ''; updateConnection(); $('#connection-dialog').close(); toast('已断开 GitHub，草稿仍保存在此浏览器。'); };
  $('#new-form').onsubmit = event => {
    event.preventDefault();
    const title = $('#new-note-title').value.trim(), category = $('#new-category').value.trim();
    if (!title || !category) return;
    const n = { id: crypto.randomUUID(), title, category, body: '', updatedAt: new Date().toISOString() };
    state.document.notes.unshift(n); state.lastOpened = n.id;
    if (!persist()) return toast('浏览器存储不可用，创建未完成。请先导出备份。');
    location.href = editorURL(n.id);
  };
  $('#import-file').onchange = importFile;
  $('#download-cloud').onclick = () => download('云端笔记副本.json', JSON.stringify(conflictRemote, null, 2), 'application/json');
  $('#use-cloud').onclick = () => {
    backup(); state.document = clone(conflictRemote); state.base = clone(conflictRemote); persist(); location.href = readerURL(conflictRemote.notes[0]?.id || null);
  };
  document.querySelectorAll('[data-action=connect]').forEach(b => b.onclick = () => openConnection());
  document.querySelectorAll('[data-action=save]').forEach(b => b.onclick = () => saveCloud());
  document.querySelectorAll('[data-action=export]').forEach(b => b.onclick = exportNote);
  document.querySelectorAll('[data-action=delete]').forEach(b => b.onclick = openDelete);
  document.querySelectorAll('[data-action=move]').forEach(b => b.onclick = openMove);
  document.querySelectorAll('[data-action=rename-directory]').forEach(b => b.onclick = () => openRename());
  $('#move-directory').onchange = () => { $('#move-new-fields').hidden = $('#move-directory').value !== ''; $('#move-error').textContent = ''; if (!$('#move-new-fields').hidden) $('#move-new-path').focus(); };
  $('#move-form').onsubmit = event => {
    event.preventDefault(); if (busy || editorMounting || !current()) return;
    try {
      captureRich();
      const result = moveNote(state.document, currentId, $('#move-directory').value === '' ? $('#move-new-path').value : $('#move-directory').value);
      commitOrganization(result); expandDirectory(result.path); $('#move-dialog').close(); refreshOrganization();
      toast(result.changed ? '笔记已移动。点击“保存到 GitHub”同步。' : '笔记已在这个目录中。');
    } catch (error) { $('#move-error').textContent = error.message; }
  };
  $('#rename-directory').onchange = () => { $('#rename-name').value = directoryParts($('#rename-directory').value).at(-1); updateRenamePreview(); $('#rename-error').textContent = ''; };
  $('#rename-name').oninput = updateRenamePreview;
  $('#rename-form').onsubmit = event => {
    event.preventDefault(); if (busy || editorMounting) return;
    try {
      captureRich(); const source = $('#rename-directory').value;
      const result = renameDirectory(state.document, source, $('#rename-name').value);
      commitOrganization(result);
      for (const path of [...expandedCategories]) if (inDirectory(path, source)) { expandedCategories.delete(path); expandedCategories.add(result.path + path.slice(source.length)); }
      expandDirectory(result.path); $('#rename-dialog').close(); refreshOrganization();
      toast(result.changed ? `目录已重命名，涉及 ${result.changed} 篇笔记。点击“保存到 GitHub”同步。` : '目录名称没有变化。');
    } catch (error) { $('#rename-error').textContent = error.message; }
  };
  $('#confirm-delete').onclick = deleteNote;
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveCloud(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && $('#search')) { event.preventDefault(); $('.sidebar').classList.add('open'); sidebarTools.openSearch(); }
    if (event.key === 'Escape') $('.sidebar')?.classList.remove('open');
  });
  channel?.addEventListener('message', () => { toast('另一个页面更新了笔记。请先导出本页草稿，再刷新查看，避免覆盖。'); setStatus('其他页面已有更新', true); document.querySelectorAll('[data-action=save]').forEach(b => b.disabled = true); });
}
function tree(query = '') {
  const results = searchNotes(state.document.notes, query), roots = new Map();
  for (const note of results) {
    const parts = directoryParts(directoryKey(note.category));
    let children = roots, node;
    parts.forEach((name, index) => {
      if (!children.has(name)) children.set(name, { name, path: parts.slice(0, index + 1).join(' / '), children: new Map(), notes: [], count: 0 });
      node = children.get(name); node.count++; children = node.children;
    });
    node.notes.push(note);
  }
  const host = $('#tree'); host.replaceChildren();
  if (!results.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = '没有找到相关笔记'; host.append(p); }
  function renderDirectory(node, parent) {
    const details = document.createElement('details');
    details.open = Boolean(query.trim()) || expandedCategories.has(node.path);
    details.addEventListener('toggle', () => {
      if (query.trim() || !details.isConnected) return;
      if (details.open) expandedCategories.add(node.path); else expandedCategories.delete(node.path);
    });
    const summary = document.createElement('summary');
    summary.title = node.path;
    summary.innerHTML = `${icon('folder')}<span class="folder-name"></span><span class="count"></span>`;
    summary.querySelector('.folder-name').textContent = node.name;
    summary.querySelector('.count').textContent = node.count;
    const rename = document.createElement('button'); rename.type = 'button'; rename.className = 'directory-rename';
    rename.setAttribute('aria-label', `重命名目录：${node.path}`); rename.title = '重命名目录'; rename.dataset.action = 'rename-directory';
    rename.innerHTML = icon('edit'); rename.disabled = busy;
    rename.onclick = event => { event.preventDefault(); event.stopPropagation(); openRename(node.path); };
    summary.append(rename); details.append(summary);
    const contents = document.createElement('div'); contents.className = 'directory-children';
    node.children.forEach(child => renderDirectory(child, contents));
    node.notes.forEach(note => {
      const a = document.createElement('a'); a.href = readerURL(note.id); a.className = `note-link${note.id === currentId ? ' active' : ''}`;
      if (note.id === currentId) a.setAttribute('aria-current', 'page');
      a.innerHTML = `${icon('file')}<span class="note-label"></span>`; a.querySelector('span').textContent = note.title;
      a.onclick = event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return; event.preventDefault(); currentId = note.id; history.pushState(null, '', a.href); renderNote(); window.scrollTo({ top: 0, behavior: 'instant' }); $('.sidebar').classList.remove('open'); };
      contents.append(a);
    });
    details.append(contents); parent.append(details);
  }
  roots.forEach(node => renderDirectory(node, host));
  $('#note-count').textContent = `${state.document.notes.length} 篇笔记`;
}
function expandDirectory(path) {
  const parts = directoryParts(path);
  parts.forEach((_, i) => expandedCategories.add(parts.slice(0, i + 1).join(' / ')));
}
function directoryOptions(select) {
  select.replaceChildren(...listDirectories(state.document).map(path => { const option = document.createElement('option'); option.value = path; option.textContent = path; return option; }));
}
function openMove() {
  if (busy || editorMounting || !current()) return;
  captureRich(); const note = current();
  $('#move-note-name').textContent = note.title; $('#move-origin').textContent = `当前目录：${directoryKey(note.category)}`;
  directoryOptions($('#move-directory'));
  const option = document.createElement('option'); option.value = ''; option.textContent = '＋ 新建目录…'; $('#move-directory').append(option);
  $('#move-directory').value = directoryKey(note.category); $('#move-new-path').value = ''; $('#move-new-fields').hidden = true; $('#move-error').textContent = '';
  $('#move-dialog').showModal(); $('#move-directory').focus();
}
function openRename(path = current()?.category) {
  if (busy || editorMounting) return;
  captureRich(); directoryOptions($('#rename-directory'));
  if (!$('#rename-directory').options.length) return toast('还没有目录，请先新建一篇笔记。');
  if (path && listDirectories(state.document).includes(directoryKey(path))) $('#rename-directory').value = directoryKey(path);
  $('#rename-name').value = directoryParts($('#rename-directory').value).at(-1); $('#rename-error').textContent = ''; updateRenamePreview();
  $('#rename-dialog').showModal(); $('#rename-name').focus(); $('#rename-name').select();
}
function updateRenamePreview() {
  const source = $('#rename-directory').value, parent = directoryParts(source).slice(0, -1);
  $('#rename-preview').textContent = `新路径：${[...parent, $('#rename-name').value.trim() || '…'].join(' / ')}`;
  $('#rename-impact').textContent = `将更新此目录及所有子目录中的 ${state.document.notes.filter(note => inDirectory(note.category, source)).length} 篇笔记。`;
}
function commitOrganization(result) {
  if (!result.changed) return;
  const previous = state.document; state.document = result.document;
  if (!persist()) { state.document = previous; throw new Error('目录调整未能保存，原笔记仍保留。请先导出备份或处理其他页面的修改。'); }
}
function refreshOrganization() {
  if (EDIT) { $('#edit-category').value = current().category; draftStatus(); }
  else renderNote();
}
function openNew() {
  $('#new-note-title').value = '';
  $('#new-category').value = current()?.category || '未分类';
  $('#categories').replaceChildren(...[...new Set(state.document.notes.map(n => n.category))].map(value => { const o = document.createElement('option'); o.value = value; return o; }));
  $('#new-dialog').showModal(); $('#new-note-title').focus();
}
function renderReader() {
  $('#app').innerHTML = `<aside class="sidebar" aria-label="笔记目录">
    <button class="close-mobile" aria-label="关闭目录">×</button><a class="brand" href="${ROOT.href}"><span class="brand-mark">Y</span><div><span class="brand-name">我的学习笔记</span><small>A LITTLE, EVERY DAY</small></div></a>
    <div class="sidebar-disclosure sidebar-compose" id="sidebar-compose">
      <button class="sidebar-tool-toggle" id="compose-toggle" aria-expanded="false" aria-controls="compose-panel" title="鼠标移入或点击展开搜索与新建">${icon('search')}<span>搜索 / 新建</span><small id="search-active" hidden>筛选中</small><span class="tool-chevron" aria-hidden="true">⌄</span></button>
      <div class="sidebar-popover" id="compose-panel" hidden>
        <label class="search-box">${icon('search')}<input id="search" type="search" aria-label="搜索全部笔记" placeholder="搜索笔记…"><kbd>Ctrl K</kbd></label>
        <button class="new-note" id="new-note">${icon('plus')}新建笔记</button>
      </div>
    </div>
    <div class="library-heading"><span>我的知识库</span><span id="note-count"></span></div><nav class="tree" id="tree" aria-label="课程分类"></nav>
    <div class="sidebar-bottom sidebar-disclosure" id="sidebar-utilities">
      <button class="sidebar-tool-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools-panel" title="鼠标移入或点击展开笔记工具">${icon('menu')}<span>笔记工具</span><span class="tool-chevron" aria-hidden="true">⌃</span></button>
      <div class="sidebar-popover" id="tools-panel" hidden><button id="import">${icon('download')}导入 Markdown / 备份</button><button id="backup">${icon('book')}导出全部笔记</button><button id="trash">${icon('trash')}回收站</button><button id="refresh">${icon('refresh')}拉取 GitHub 更新</button><button data-action="rename-directory">${icon('edit')}重命名目录</button><p>记录、理解，再连接。<br>Yan's personal learning space</p></div>
    </div>
  </aside><main class="workspace"><header class="topbar"><button class="mobile-menu" aria-label="打开笔记目录">${icon('menu')}</button><div class="breadcrumb" id="breadcrumb"></div>
    <div class="top-actions"><span class="status" role="status"></span><a class="text-button study-entry" href="${new URL('study/', ROOT).href}">学习计划</a><button class="text-button" data-action="connect" title="连接 GitHub">${icon('github')}<span class="connection-label">连接 GitHub</span></button><button class="primary" data-action="save" hidden>${icon('cloud')}保存到 GitHub</button><a class="secondary" id="edit-link">${icon('edit')}编辑笔记</a></div></header>
    <div id="storage-alert" class="storage-alert" role="alert" hidden>浏览器未能保存草稿，请立即导出备份，避免关闭页面后丢失。</div>
    <div class="reading-layout"><article class="page"><div class="eyebrow" id="eyebrow"></div><h1 class="title" id="note-title"></h1><div class="meta"><span class="tag" id="note-tag"></span><span id="note-date"></span><span id="reading-time"></span></div>
    <div class="read-hint">${icon('edit')}<span>这里是阅读模式 · 点击正文空白处，或右上角按钮进入编辑页</span><div class="read-tools"><button class="text-button" data-action="move">${icon('folder')}移动笔记</button>${fontButton()}</div></div>
    <details class="article-toc" id="article-toc" hidden></details><div class="prose" id="note-body"></div><footer class="page-footer"><span>${icon('leaf')}让知识慢慢生长</span><div class="note-footer-actions"><button class="text-button" data-action="export">${icon('download')}导出 Markdown</button><button class="text-button danger-text" data-action="delete">${icon('trash')}删除笔记</button></div></footer></article></div></main>${dialogs()}`;
  sidebarTools = setupSidebarTools($('.sidebar'));
  sharedEvents(); $('#new-note').onclick = openNew; $('#import').onclick = () => $('#import-file').click(); $('#backup').onclick = backup; $('#refresh').onclick = () => pullCloud(); $('#trash').onclick = openTrash;
  $('#search').oninput = event => { tree(event.target.value); $('#search-active').hidden = !event.target.value.trim(); };
  $('.mobile-menu').onclick = () => $('.sidebar').classList.toggle('open'); $('.close-mobile').onclick = () => { $('.sidebar').classList.remove('open'); sidebarTools.closeAll(); };
  $('#note-body').onclick = event => {
    if (window.getSelection()?.toString() || event.target.closest('a, button, input, code, pre, img, .katex, table')) return;
    if (event.target === $('#note-body')) location.href = editorURL();
  };
  window.addEventListener('popstate', () => { currentId = new URLSearchParams(location.search).get('note') || state.document.notes[0]?.id; renderNote(); });
  renderNote();
}
function renderNote() {
  disposeToc(); disposeToc = () => {};
  if (!current()) currentId = state.document.notes[0]?.id || null;
  const n = current();
  $('#edit-link').hidden = !n;
  document.querySelectorAll('[data-action=export], [data-action=delete], [data-action=move]').forEach(b => { b.hidden = !n; });
  $('.meta').hidden = !n; $('.read-hint').hidden = !n;
  if (!n) {
    state.lastOpened = null; persist(); document.title = '我的学习笔记';
    $('#breadcrumb').textContent = '学习笔记'; $('#eyebrow').textContent = '从一个新的想法开始'; $('#note-title').textContent = '还没有笔记';
    $('#note-body').innerHTML = '<p>新建一篇笔记，或从回收站恢复以前的记录。</p><div class="empty-actions"><button class="primary" id="empty-new">新建第一篇笔记</button><button class="secondary" id="empty-trash">打开回收站</button></div>';
    $('#empty-new').onclick = openNew; $('#empty-trash').onclick = openTrash;
    tree($('#search').value); draftStatus(); updateConnection(); return;
  }
  state.lastOpened = n.id; persist();
  document.title = `${n.title} · 学习笔记`;
  $('#note-title').textContent = n.title; $('#eyebrow').textContent = n.category.split('/').map(s => s.trim()).join('  /  ');
  $('#note-tag').textContent = n.category.split('/').pop().trim();
  const date = new Date(n.updatedAt); $('#note-date').textContent = Number.isNaN(date.getTime()) ? '' : `${new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)} 更新`;
  $('#reading-time').textContent = `约 ${Math.max(1, Math.ceil(n.body.length / 450))} 分钟阅读`;
  $('#breadcrumb').replaceChildren();
  for (const text of ['学习笔记', ...n.category.split('/').map(s => s.trim())]) { const span = document.createElement('span'); span.textContent = text; if ($('#breadcrumb').children.length) { const separator = document.createElement('span'); separator.textContent = '/'; $('#breadcrumb').append(separator); } $('#breadcrumb').append(span); }
  $('#edit-link').href = editorURL(); renderBody($('#note-body'), n.body);
  disposeToc = setupTableOfContents($('#note-body'), $('#article-toc'), $('.reading-layout'));
  tree($('#search').value); draftStatus(); updateConnection();
}
function updateBody(value) {
  if (busy) return;
  const n = current(); if (!n || n.body === value) return;
  n.body = value; n.updatedAt = new Date().toISOString(); persist(); draftStatus(); updateEditorCount();
}
function captureRich() { if (rich && !editorMounting && !busy) { const value = rich.getMarkdown(); if (value !== richBaseline) updateBody(value); } }
function updateEditorCount() { if ($('#editor-count')) $('#editor-count').textContent = `${current().body.length.toLocaleString()} 字符 · Markdown / LaTeX`; }
async function mountRich() {
  if (rich || editorMounting) return editorMounting;
  $('#rich-editor').innerHTML = '<p class="edit-loading">正在打开编辑器…</p>';
  editorMounting = (async () => {
    try {
      const { mount } = await import('./editor/editor-entry.js?v=20261027-editor2');
      $('#rich-editor').replaceChildren(); rich = await mount($('#rich-editor'), current().body, updateBody); richBaseline = rich.getMarkdown();
    } catch (e) { console.error(e); $('#rich-editor').replaceChildren(); toast('可视编辑器未能打开，已切换到 Markdown 编辑。'); mode = 'source'; renderBody($('#source-preview'), current().body); $('#source-wrap').hidden = false; $('#rich-editor').hidden = true; setTabs(); }
    finally { editorMounting = null; }
  })();
  return editorMounting;
}
function setTabs() { document.querySelectorAll('.tab').forEach(b => { b.setAttribute('aria-selected', String(b.dataset.mode === mode)); }); $('#source-controls').hidden = mode !== 'source'; sourceLayout?.refresh(); }
async function switchMode(next) {
  if (busy || editorMounting || next === mode) return;
  captureRich();
  mode = next; setTabs();
  if (mode === 'source') {
    if (rich) { await rich.destroy(); rich = null; }
    $('#rich-editor').hidden = true; $('#source-wrap').hidden = false; $('#source').value = current().body; renderBody($('#source-preview'), current().body);
  } else { $('#source-wrap').hidden = true; $('#rich-editor').hidden = false; await mountRich(); }
}
function renderEditor() {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('notes/editor/editor-entry.css?v=20261027-editor2', ROOT).href; document.head.prepend(css);
  $('#app').innerHTML = `<header class="editor-topbar"><div class="editor-left"><a id="back-link" class="text-button">${icon('back')}返回阅读</a><span class="editor-divider"></span><span class="editor-badge">独立编辑空间</span></div>
    <div class="editor-actions"><span class="status" role="status"></span><button class="text-button danger-text" data-action="delete">${icon('trash')}删除笔记</button><button class="text-button" data-action="export">${icon('download')}导出 .md</button><button class="text-button" data-action="connect">${icon('github')}<span class="connection-label">连接 GitHub</span></button><button class="primary" data-action="save">${icon('cloud')}保存到 GitHub</button></div></header>
    <div id="storage-alert" class="storage-alert" role="alert" hidden>草稿未能写入浏览器，请先导出备份。</div>
    <main class="editor-shell"><div class="editor-heading"><div class="editor-category-row"><label class="visually-hidden" for="edit-category">课程 / 分类</label><input id="edit-category" class="editor-category" maxlength="160" placeholder="课程 / 分类"><button class="text-button" data-action="move">${icon('folder')}移动笔记</button><button class="text-button" data-action="rename-directory">${icon('edit')}重命名目录</button></div><label class="visually-hidden" for="edit-title">笔记标题</label><input id="edit-title" class="editor-title" maxlength="160" placeholder="未命名笔记"></div>
    <div class="editor-tabs"><div class="tab-list" role="tablist" aria-label="编辑模式"><button class="tab" role="tab" data-mode="rich" aria-selected="true">可视编辑</button><button class="tab" role="tab" data-mode="source" aria-selected="false">Markdown + 预览</button></div><div class="editor-display"><span class="editor-help">悬停段落显示 ≡，可调整格式或添加公式</span>${fontButton()}</div></div>
    <div id="source-controls" class="source-controls" hidden><label for="source-layout">布局</label><select id="source-layout" aria-label="Markdown 预览布局"><option value="auto">自动适应</option><option value="side">左右分栏</option><option value="stack">上下排列</option><option value="source">仅 Markdown</option><option value="preview">仅预览</option></select><button class="text-button" data-layout-wide aria-pressed="false">展开编辑区</button><span data-layout-hint>拖动分隔条调整比例</span></div>
    <div class="editor-content"><div id="rich-editor"></div><div id="source-wrap" class="source-wrap" hidden><textarea id="source" aria-label="Markdown 源码" spellcheck="false"></textarea><div id="source-divider" class="source-divider" role="separator" tabindex="0" aria-label="调整编辑区与预览区比例" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50" aria-controls="source source-preview" title="拖动调整比例；方向键微调；双击恢复各一半"></div><div id="source-preview" class="prose source-preview" aria-label="实时预览"></div></div></div>
    <footer class="editor-bottom"><span>草稿自动保存于此浏览器</span><span id="editor-count"></span></footer></main>${dialogs()}`;
  sourceLayout = setupEditorLayout($('.editor-shell'), $('#source-wrap'), $('#source-controls'));
  sharedEvents(); $('#back-link').href = readerURL();
  $('#back-link').addEventListener('click', captureRich);
  window.addEventListener('pagehide', captureRich);
  window.addEventListener('beforeunload', captureRich);
  $('#edit-title').value = current().title; $('#edit-category').value = current().category; $('#source').value = current().body;
  for (const [id, field] of [['edit-title', 'title'], ['edit-category', 'category']]) $( `#${id}`).oninput = event => { if (busy) return; current()[field] = event.target.value; current().updatedAt = new Date().toISOString(); persist(); draftStatus(); };
  $('#source').oninput = event => { updateBody(event.target.value); renderBody($('#source-preview'), event.target.value); };
  $('#source').onkeydown = event => { if (event.key === 'Tab') { event.preventDefault(); event.target.setRangeText('  ', event.target.selectionStart, event.target.selectionEnd, 'end'); event.target.dispatchEvent(new Event('input')); } };
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => switchMode(b.dataset.mode));
  document.title = `编辑：${current().title} · 学习笔记`; updateEditorCount(); draftStatus(); mountRich();
}
function updateConnection() { document.querySelectorAll('.connection-label').forEach(el => { el.textContent = token ? '已连接 GitHub' : '连接 GitHub'; }); }
function openConnection(save = false) { pendingSave = save; $('#connection-error').textContent = ''; $('#connection-dialog').showModal(); $('#github-token').focus(); }
async function request(path, options = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...options, headers, cache: 'no-store', signal: AbortSignal.timeout(25000), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) {
    let detail; try { detail = await response.json(); } catch { /* Use the status code. */ }
    const messages = { 401: '令牌无效或已过期，请重新连接。', 403: 'GitHub 拒绝访问，请检查仓库权限或 API 访问额度。', 404: '未找到仓库、分支或笔记文件，请确认权限及部署状态。', 409: '云端刚刚有了新版本。请再次保存以重新比较版本。', 422: 'GitHub 未能接受本次保存，请检查分支保护及文件版本。', 429: '请求过于频繁，请稍后重试。' };
    const error = new Error(messages[response.status] || `GitHub 请求失败（${response.status}）。${detail?.message || ''}`); error.status = response.status; throw error;
  }
  return response.json();
}
async function connect() {
  const candidate = $('#github-token').value.trim(); if (!candidate) return $('#connection-error').textContent = '请先输入访问令牌。';
  $('#connect').disabled = true; const previous = token; token = candidate;
  try { await request(''); $('#github-token').value = ''; $('#connection-dialog').close(); updateConnection(); toast('GitHub 已连接，令牌仅保留在当前页面。'); if (pendingSave) { pendingSave = false; await saveCloud(); } }
  catch (e) { token = previous; $('#connection-error').textContent = e.message; }
  finally { $('#connect').disabled = false; }
}
async function fetchCloud() {
  const data = await request(`/contents/${FILE}?ref=${encodeURIComponent(BRANCH)}`);
  if (data.type !== 'file' || data.encoding !== 'base64' || !data.content) throw new Error('云端笔记文件超过支持的读取大小，或文件内容不可用。');
  return { document: validateDocument(JSON.parse(fromBase64(data.content))), sha: data.sha };
}
function showConflict(remote, conflicts) { conflictRemote = remote; $('#conflict-text').textContent = `以下笔记在本地与云端均有修改：${conflicts.join('、')}。本次没有覆盖云端。`; $('#conflict-dialog').showModal(); }
function setBusy(value) {
  busy = value;
  document.querySelectorAll('[data-action=save], [data-action=delete], [data-action=move], [data-action=rename-directory], #confirm-move, #confirm-rename, #move-directory, #move-new-path, #rename-directory, #rename-name, #confirm-delete, #new-note, #import, #trash, #refresh, .tab, #edit-title, #edit-category, #source').forEach(el => { el.disabled = value; });
  rich?.setReadonly(value);
}
async function saveCloud() {
  if (busy) return;
  captureRich();
  if (!token) return openConnection(true);
  if (state.document.notes.some(n => !n.title.trim() || !n.category.trim())) return toast('请填写笔记标题与分类后保存。');
  setBusy(true); setStatus('正在比较并保存云端版本…');
  try {
    const cloud = await fetchCloud();
    const merged = mergeDocuments(state.base, state.document, cloud.document);
    if (merged.conflicts.length) { showConflict(cloud.document, merged.conflicts); setStatus('存在版本冲突，草稿已保留', true); return; }
    const payload = JSON.stringify(validateDocument(merged.document), null, 2) + '\n';
    if (new TextEncoder().encode(payload).length > 900000) throw new Error('笔记本接近 GitHub 读取大小上限，请导出备份并减少嵌入图片。');
    if (!sameDocument(merged.document, cloud.document)) await request(`/contents/${FILE}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `notes: update ${current()?.title || 'notebook'}`, content: toBase64(payload), sha: cloud.sha, branch: BRANCH }) });
    const before = clone(current());
    state.document = merged.document; state.base = clone(merged.document); persist(); channel?.postMessage({ updated: true });
    if (EDIT && !current()) { if (rich) { await rich.destroy(); rich = null; } location.href = readerURL(null); return; }
    if (EDIT && current() && (before?.body !== current().body || before?.title !== current().title || before?.category !== current().category)) {
      $('#edit-title').value = current().title; $('#edit-category').value = current().category;
      $('#source').value = current().body; renderBody($('#source-preview'), current().body);
      if (rich) { await rich.destroy(); rich = null; }
      if (mode === 'rich') await mountRich(); updateEditorCount();
    }
    if (!EDIT) renderNote(); updateSaveVisibility(); setStatus(storageFailed ? '已保存云端；本地草稿存储失败' : '已保存到 GitHub', storageFailed);
    toast('已保存到 GitHub。阅读页发布更新可能需要等待构建完成。');
  } catch (e) { draftStatus(); setStatus('云端保存失败，草稿已保留', true); toast(e.name === 'TimeoutError' ? '连接 GitHub 超时，请检查网络后重试。草稿已保留。' : e.message); }
  finally { setBusy(false); }
}
async function pullCloud() {
  if (busy) return; setBusy(true); setStatus('正在读取 GitHub…');
  try {
    const cloud = await fetchCloud(), merged = mergeDocuments(state.base, state.document, cloud.document);
    if (merged.conflicts.length) return showConflict(cloud.document, merged.conflicts);
    state.base = clone(cloud.document); state.document = merged.document; persist(); if (!current()) currentId = state.document.notes[0]?.id;
    renderNote(); toast('已读取云端更新，本地草稿已保留。');
  } catch (e) { draftStatus(); toast(e.message); } finally { setBusy(false); }
}
async function importFile(event) {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  if (file.size > 900000) return toast('请选择小于 900 KB 的文件。');
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith('.json')) {
      const imported = validateDocument(JSON.parse(text)), next = clone(state.document);
      for (const n of imported.notes) { const existing = next.notes.find(m => m.id === n.id); if (existing && JSON.stringify(existing) !== JSON.stringify(n)) next.notes.push({ ...n, id: crypto.randomUUID(), title: `${n.title.slice(0, 150)}（导入）` }); else if (!existing) next.notes.push(n); }
      state.document = validateDocument(next); persist(); tree($('#search').value); draftStatus(); toast(`已导入备份，保留了已有笔记。`); return;
    }
    if (text.length > 200000) throw new Error('Markdown 文件过长，请控制在 20 万字符以内。');
    const match = /^#\s+(.+)\r?\n/.exec(text);
    const n = { id: crypto.randomUUID(), title: (match?.[1] || file.name.replace(/\.(md|markdown)$/i, '')).slice(0, 160), category: '导入笔记', body: match ? text.slice(match[0].length).replace(/^\s*\n/, '') : text, updatedAt: new Date().toISOString() };
    state.document.notes.unshift(n); state.lastOpened = n.id; if (persist()) location.href = editorURL(n.id); else toast('浏览器未能保存导入的笔记，请先导出备份。');
  } catch (e) { toast(`导入失败：${e.message}`); }
}
async function boot() {
  let loaded = false, corrupt = false, migrationMessage = '';
  try { storageSnapshot = localStorage.getItem(STORAGE); const saved = JSON.parse(storageSnapshot); if (saved) { state = { base: validateDocument(saved.base), document: validateDocument(saved.document), lastOpened: saved.lastOpened, catalogVersion: saved.catalogVersion || null }; persistedDocument = clone(state.document); loaded = true; } }
  catch { corrupt = true; try { if (storageSnapshot) localStorage.setItem(`${STORAGE}:recovery:${Date.now()}`, storageSnapshot); } catch { /* Preserve the old value when storage is unavailable. */ } }
  try {
    const response = await fetch(new URL(FILE, ROOT), { cache: 'no-store' }); if (!response.ok) throw new Error('无法读取笔记');
    const published = validateDocument(await response.json());
    if (!loaded) state = { base: clone(published), document: clone(published), lastOpened: null, catalogVersion: CATALOG_VERSION };
    else if (state.catalogVersion !== CATALOG_VERSION) {
      const merged = mergeDocuments(state.base, state.document, published);
      const order = new Map(published.notes.map((note, index) => [note.id, index]));
      merged.document.notes.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
      state.base = clone(published); state.document = merged.document; state.catalogVersion = CATALOG_VERSION;
      if (['calculus-derivative', 'linear-algebra', 'gradient-descent', 'paper-reading'].includes(state.lastOpened) && !currentId) state.lastOpened = published.notes[0]?.id || null;
      migrationMessage = `已迁入 ${published.notes.length} 篇已有笔记。${merged.conflicts.length ? `另保留了 ${merged.conflicts.length} 篇有本地修改的草稿。` : '原有草稿已合并保留。'}`;
    }
    // Published assets can lag behind a successful GitHub commit. Cached drafts
    // must only refresh through the API, never through this potentially old file.
  } catch { if (!loaded) { $('#app').innerHTML = '<p class="loading">无法打开笔记文件。请使用本地 HTTP 服务器或 GitHub Pages 访问网站。</p>'; return; } }
  currentId = state.document.notes.find(n => n.id === currentId)?.id || state.document.notes.find(n => n.id === state.lastOpened)?.id || state.document.notes[0]?.id || null;
  state.lastOpened = currentId;
  if (EDIT && !current()) { location.replace(readerURL(null)); return; }
  configureMarkdown(); if (EDIT) renderEditor(); else renderReader();
  if (corrupt) { storageFailed = true; $('#storage-alert').hidden = false; setStatus('本地存储读取异常，请先导出备份', true); }
  else persist();
  if (migrationMessage) toast(migrationMessage);
}
applyFontSize(readFontSize());
boot().catch(e => { console.error(e); $('#app').textContent = '页面未能打开。请刷新，或检查本地文件是否完整。'; });
