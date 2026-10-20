import { validateDocument } from './core.mjs';

export const directoryParts = value => String(value).split('/').map(part => part.trim()).filter(Boolean);
export const directoryKey = value => directoryParts(value).join(' / ') || '未分类';
export function normalizeDirectory(value) {
  const parts = String(value).split('/').map(part => part.trim());
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('请填写目录名称，使用 / 分隔层级，每一层都不能为空或仅为点号。');
  const path = parts.join(' / ');
  if (path.length > 160) throw new Error('完整目录路径不能超过 160 个字符。');
  return path;
}
export function listDirectories(document) {
  const paths = new Set();
  document.notes.forEach(note => {
    const parts = directoryParts(directoryKey(note.category));
    parts.forEach((_, i) => paths.add(parts.slice(0, i + 1).join(' / ')));
  });
  return [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
export function inDirectory(category, path) {
  const candidate = directoryParts(directoryKey(category)), prefix = directoryParts(directoryKey(path));
  return prefix.length <= candidate.length && prefix.every((part, i) => part === candidate[i]);
}
export function moveNote(document, id, destination, updatedAt = new Date().toISOString()) {
  const copy = validateDocument(document), path = normalizeDirectory(destination);
  const note = copy.notes.find(item => item.id === id);
  if (!note) throw new Error('这篇笔记已不存在，请刷新后重试。');
  const changed = directoryKey(note.category) !== path;
  if (changed) { note.category = path; note.updatedAt = updatedAt; }
  return { document: copy, path, changed: Number(changed) };
}
export function renameDirectory(document, source, newName, updatedAt = new Date().toISOString()) {
  const copy = validateDocument(document), from = directoryKey(source), name = String(newName).trim();
  if (!name || name.includes('/') || name === '.' || name === '..') throw new Error('请填写单层目录名称；重命名时名称不能包含 /。');
  const parts = directoryParts(from), path = normalizeDirectory([...parts.slice(0, -1), name].join(' / '));
  const directories = listDirectories(copy);
  if (!directories.includes(from)) throw new Error('这个目录已不存在，请重新选择。');
  if (path === from) return { document: copy, path, changed: 0 };
  if (directories.includes(path)) throw new Error('同一级已经存在这个名称，请使用其他名称，或用“移动笔记”整理到已有目录。');
  let changed = 0;
  copy.notes.forEach(note => {
    if (!inDirectory(note.category, from)) return;
    const suffix = directoryParts(directoryKey(note.category)).slice(parts.length);
    note.category = normalizeDirectory([path, ...suffix].join(' / '));
    note.updatedAt = updatedAt; changed++;
  });
  return { document: validateDocument(copy), path, changed };
}
