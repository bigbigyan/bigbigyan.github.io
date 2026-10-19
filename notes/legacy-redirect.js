try {
  const response = await fetch('/notes/legacy-urls.json');
  if (response.ok) {
    const urls = await response.json();
    const path = decodeURIComponent(location.pathname).replace(/\/?$/, '/').toLowerCase();
    const id = urls[path];
    if (id) location.replace(`/?note=${encodeURIComponent(id)}`);
  }
} catch { /* Keep the usable home link when a redirect cannot be resolved. */ }
