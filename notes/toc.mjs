// Build from the rendered article so code fences and inline formatting are handled
// by the same Markdown renderer as the text the reader is looking at.
export function setupTableOfContents(body, host, layout) {
  host.replaceChildren(); host.hidden = true; layout.classList.remove('has-toc');
  const headings = [...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => !h.closest('pre,code,.katex'));
  const usedIds = new Set([...document.querySelectorAll('[id]')].filter(el => !headings.includes(el)).map(el => el.id));
  const entries = headings.map((heading, index) => {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll('.katex').forEach(math => { math.replaceWith(document.createTextNode(math.querySelector('annotation')?.textContent || math.textContent)); });
    const title = copy.textContent.replace(/\s+/g, ' ').trim();
    if (!title) return null;
    const slug = title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    const base = heading.id || `section-${slug || index + 1}`;
    let id = base, suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id); heading.id = id;
    return { heading, title, id, level: Number(heading.tagName.slice(1)) };
  }).filter(Boolean);
  if (!entries.length) return () => {};

  const summary = document.createElement('summary');
  const title = document.createElement('span'); title.textContent = '本篇目录';
  const count = document.createElement('span'); count.className = 'toc-count'; count.textContent = `${entries.length} 节`;
  summary.append(title, count);
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '本篇目录');
  const list = document.createElement('ol'); list.className = 'toc-list';
  const minimum = Math.min(...entries.map(e => e.level));
  const links = entries.map(entry => {
    const item = document.createElement('li'), link = document.createElement('a');
    link.href = `#${encodeURIComponent(entry.id)}`;
    link.textContent = entry.title; link.title = entry.title;
    link.style.setProperty('--toc-depth', entry.level - minimum);
    item.append(link); list.append(item); return link;
  });
  nav.append(list); host.append(summary, nav); host.hidden = false; layout.classList.add('has-toc');
  const desktop = matchMedia('(min-width: 1200px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  host.open = desktop.matches;
  let active = -1, frame = 0;
  function select(index) {
    if (active === index) return;
    if (active >= 0) links[active].removeAttribute('aria-current');
    active = index; links[index].setAttribute('aria-current', 'location');
    if (desktop.matches) {
      const link = links[index].getBoundingClientRect(), box = nav.getBoundingClientRect();
      if (link.top < box.top) nav.scrollTop -= box.top - link.top + 8;
      else if (link.bottom > box.bottom) nav.scrollTop += link.bottom - box.bottom + 8;
    }
  }
  function update() {
    frame = 0;
    const offset = desktop.matches ? 40 : 80;
    let low = 0, high = entries.length;
    while (low < high) { const middle = (low + high) >>> 1; if (entries[middle].heading.getBoundingClientRect().top <= offset) low = middle + 1; else high = middle; }
    const atEnd = scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 3;
    select(atEnd ? entries.length - 1 : Math.max(0, low - 1));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function jump(entry, focus = false, animate = true) {
    if (!desktop.matches) host.open = false;
    if (focus) { entry.heading.setAttribute('tabindex', '-1'); entry.heading.focus({ preventScroll: true }); }
    entry.heading.scrollIntoView({ behavior: !animate || reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    select(entries.indexOf(entry));
  }
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const url = new URL(location.href); url.hash = encodeURIComponent(entries[index].id); history.replaceState(null, '', url);
    jump(entries[index], true);
  }));
  function followHash() {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const entry = entries.find(e => e.id === id); if (entry) jump(entry, false, false);
  }
  function breakpointChanged() { host.open = desktop.matches; schedule(); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', followHash);
  desktop.addEventListener('change', breakpointChanged);
  const observer = new ResizeObserver(schedule); observer.observe(body);
  const initialFrame = requestAnimationFrame(() => { followHash(); update(); });
  return () => {
    cancelAnimationFrame(initialFrame); cancelAnimationFrame(frame); observer.disconnect();
    window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('hashchange', followHash);
    desktop.removeEventListener('change', breakpointChanged);
    host.hidden = true; host.replaceChildren(); layout.classList.remove('has-toc');
  };
}
