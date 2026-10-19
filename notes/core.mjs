export const EMPTY = { version: 1, notes: [] };
export function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.notes) || value.notes.length > 500) throw new Error('笔记文件格式不正确，或超过 500 篇。');
  const ids = new Set();
  const notes = value.notes.map(n => {
    if (!n || typeof n.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(n.id) || ids.has(n.id)) throw new Error('笔记编号不正确或重复。');
    ids.add(n.id);
    for (const key of ['title', 'category', 'body', 'updatedAt']) if (typeof n[key] !== 'string') throw new Error('笔记缺少必要字段。');
    if (n.title.length > 160 || n.category.length > 160 || n.body.length > 200000) throw new Error('笔记内容超出长度限制。');
    return { id: n.id, title: n.title, category: n.category, body: n.body, updatedAt: n.updatedAt };
  });
  return { version: 1, notes };
}
const signature = n => n ? JSON.stringify([n.id, n.title, n.category, n.body]) : null;
export const sameDocument = (a, b) => a.notes.length === b.notes.length && a.notes.every(n => signature(n) === signature(b.notes.find(m => m.id === n.id)));
export function mergeDocuments(base, local, remote) {
  const maps = [base, local, remote].map(d => new Map(d.notes.map(n => [n.id, n])));
  const ids = new Set([...maps[1].keys(), ...maps[2].keys(), ...maps[0].keys()]);
  const conflicts = [], notes = [];
  for (const id of ids) {
    const [b, l, r] = maps.map(m => m.get(id));
    let selected;
    if (signature(l) === signature(r)) selected = l;
    else if (signature(l) === signature(b)) selected = r;
    else if (signature(r) === signature(b)) selected = l;
    else { conflicts.push((l || r || b).title); selected = l; }
    if (selected) notes.push({ ...selected });
  }
  return { document: { version: 1, notes }, conflicts };
}
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
export const fromBase64 = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));
export const searchNotes = (notes, query) => notes.filter(n => `${n.title}\n${n.category}\n${n.body}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
