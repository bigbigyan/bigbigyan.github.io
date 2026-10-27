const KEY = 'yan-notebook:editor-layout:v1';
const clamp = value => Math.min(0.8, Math.max(0.2, value));

export function setupEditorLayout(shell, wrap, controls) {
  const defaults = { mode: 'auto', wide: false, side: 0.5, stack: 0.5 };
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch { /* Preferences are optional. */ }
  const settings = { ...defaults, ...saved };
  if (!['auto', 'side', 'stack', 'source', 'preview'].includes(settings.mode)) settings.mode = 'auto';
  for (const key of ['side', 'stack']) settings[key] = Number.isFinite(settings[key]) ? clamp(settings[key]) : 0.5;
  const divider = wrap.querySelector('[role=separator]');
  const select = controls.querySelector('select');
  const wide = controls.querySelector('[data-layout-wide]');
  const hint = controls.querySelector('[data-layout-hint]');
  let layout = 'stack', dragging = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Keep working without persistence. */ } };
  const refresh = () => {
    shell.classList.toggle('editor-wide', !!settings.wide);
    wide.setAttribute('aria-pressed', String(!!settings.wide));
    wide.textContent = settings.wide ? '收回编辑区' : '展开编辑区';
    select.value = settings.mode;
    const width = wrap.getBoundingClientRect().width;
    layout = settings.mode === 'auto' ? (width >= 950 ? 'side' : 'stack') : settings.mode;
    wrap.dataset.layout = layout;
    const ratio = settings[layout] ?? 0.5;
    wrap.style.setProperty('--source-first', `${ratio}fr`);
    wrap.style.setProperty('--source-second', `${1 - ratio}fr`);
    divider.setAttribute('aria-orientation', layout === 'side' ? 'vertical' : 'horizontal');
    divider.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    divider.setAttribute('aria-valuetext', `编辑区占 ${Math.round(ratio * 100)}%`);
    hint.textContent = ['side', 'stack'].includes(layout) ? '拖动分隔条调整比例' : '可随时切回双栏';
  };
  select.onchange = () => { settings.mode = select.value; refresh(); save(); };
  wide.onclick = () => { settings.wide = !settings.wide; refresh(); save(); };
  const adjust = value => { if (!['side', 'stack'].includes(layout)) return; settings[layout] = clamp(value); refresh(); };
  divider.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault(); dragging = true; divider.setPointerCapture(event.pointerId);
    wrap.classList.add('is-resizing');
  };
  divider.onpointermove = event => {
    if (!dragging) return;
    const box = wrap.getBoundingClientRect();
    adjust(layout === 'side' ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height);
  };
  const finish = () => { if (!dragging) return; dragging = false; wrap.classList.remove('is-resizing'); save(); };
  divider.onpointerup = finish; divider.onpointercancel = finish; divider.onlostpointercapture = finish;
  divider.ondblclick = () => { adjust(0.5); save(); };
  divider.onkeydown = event => {
    const decrease = layout === 'side' ? 'ArrowLeft' : 'ArrowUp';
    const increase = layout === 'side' ? 'ArrowRight' : 'ArrowDown';
    if (event.key === decrease) adjust(settings[layout] - 0.05);
    else if (event.key === increase) adjust(settings[layout] + 0.05);
    else if (event.key === 'Home') adjust(0.2);
    else if (event.key === 'End') adjust(0.8);
    else return;
    event.preventDefault(); save();
  };
  const observer = new ResizeObserver(refresh); observer.observe(wrap);
  refresh();
  return { refresh };
}
