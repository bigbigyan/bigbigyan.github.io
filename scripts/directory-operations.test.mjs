import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveNote, renameDirectory, listDirectories } from '../notes/directories.mjs';
import { mergeDocuments } from '../notes/core.mjs';

const note = (id, category) => ({ id, category, title: id, body: '# 内容\n\n$x^2$', updatedAt: 'before' });
const document = (...notes) => ({ version: 1, notes });
test('moving a note preserves its identity and contents and leaves its source document untouched', () => {
  const a = note('a', '数学 / 微积分'), b = note('b', '开发工具');
  const original = document(a, b), moved = moveNote(original, 'a', ' 机器学习/基础 ', 'after');
  assert.deepEqual(moved.document.notes[0], { ...a, category: '机器学习 / 基础', updatedAt: 'after' });
  assert.deepEqual(original, document(a, b)); assert.deepEqual(moved.document.notes[1], b);
  assert.equal(moveNote(moved.document, 'a', '机器学习/基础').changed, 0);
});
test('renaming a parent includes all descendants but never directories with a similar prefix', () => {
  const original = document(note('a','数学'),note('b','数学 / 微积分 / 导数'),note('c','数学分析 / 极限'));
  const result = renameDirectory(original, '数学', '基础数学', 'after');
  assert.equal(result.changed, 2);
  assert.deepEqual(result.document.notes.map(n => n.category), ['基础数学','基础数学 / 微积分 / 导数','数学分析 / 极限']);
  assert.equal(original.notes[0].category, '数学');
});
test('renaming a child keeps its parent and unrelated siblings', () => {
  const original = document(note('a','数学 / 微积分 / 导数'),note('b','数学 / 线性代数'));
  assert.deepEqual(renameDirectory(original,'数学 / 微积分','高等数学').document.notes.map(n=>n.category), ['数学 / 高等数学 / 导数','数学 / 线性代数']);
  assert.deepEqual(listDirectories(original), ['数学','数学 / 线性代数','数学 / 微积分','数学 / 微积分 / 导数'].sort((a,b)=>a.localeCompare(b,'zh-CN')));
});
test('renaming refuses a collision with an existing directory, including an implicit parent', () => {
  const original = document(note('a','数学 / 微积分'),note('b','基础数学 / 代数'));
  assert.throws(()=>renameDirectory(original,'数学','基础数学'), /同一级/);
  assert.equal(renameDirectory(original,'数学','数学').changed, 0);
});
test('invalid paths and descendant length overflow fail before the original can be changed', () => {
  const original = document(note('a','甲 / '+'乙'.repeat(150)));
  assert.throws(()=>renameDirectory(original,'甲','新'.repeat(15)), /160/);
  assert.equal(original.notes[0].category, '甲 / '+'乙'.repeat(150));
  for (const destination of ['', '数学//导数','数学 / ..','x'.repeat(161)]) assert.throws(()=>moveNote(original,'a',destination));
  assert.throws(()=>renameDirectory(original,'甲','新/目录'));
});
test('a move merges with a remote edit to another note and conflicts with a concurrent edit to the same note', () => {
  const original = document(note('a','数学 / 微积分'),note('b','工具'));
  const moved = moveNote(original,'a','数学 / 代数').document;
  const remoteOther = structuredClone(original); remoteOther.notes[1].body='new';
  assert.equal(mergeDocuments(original,moved,remoteOther).conflicts.length,0);
  const remoteSame = structuredClone(original); remoteSame.notes[0].body='new';
  assert.equal(mergeDocuments(original,moved,remoteSame).conflicts.length,1);
});
