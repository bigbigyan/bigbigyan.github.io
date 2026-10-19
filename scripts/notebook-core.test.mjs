import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EMPTY, validateDocument, sameDocument, mergeDocuments, toBase64, fromBase64, searchNotes } from '../notes/core.mjs';
const note = (id, body) => ({ id, title: `标题 ${id}`, category: '数学 / 微积分', body, updatedAt: '2026-10-19T02:00:00.000Z' });
const doc = (...notes) => ({ version: 1, notes });
test('Unicode content and formulas survive GitHub Base64 encoding', () => {
  const source = '# 中文笔记 📝\n\n$$\\frac{1}{2}$$';
  assert.equal(fromBase64(toBase64(source)), source);
});
test('independent edits merge without overwriting either device', () => {
  const a = note('a', 'original'), b = note('b', 'original');
  const result = mergeDocuments(doc(a, b), doc({...a,body:'local'}, b), doc(a, {...b,body:'remote'}));
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.document.notes.find(n => n.id === 'a').body, 'local');
  assert.equal(result.document.notes.find(n => n.id === 'b').body, 'remote');
});
test('same-note concurrent edits retain local text and report conflict', () => {
  const a = note('a', 'original');
  const result = mergeDocuments(doc(a), doc({...a,body:'local'}), doc({...a,body:'remote'}));
  assert.deepEqual(result.conflicts, ['标题 a']);
  assert.equal(result.document.notes[0].body, 'local');
});
test('remote deletion and local edit conflict rather than erase the draft', () => {
  const a = note('a', 'original');
  const result = mergeDocuments(doc(a), doc({...a,body:'draft'}), EMPTY);
  assert.equal(result.conflicts.length, 1); assert.equal(result.document.notes[0].body, 'draft');
});
test('new notes from both sides are preserved', () => {
  const result = mergeDocuments(EMPTY, doc(note('a', 'one')), doc(note('b','two')));
  assert.equal(result.document.notes.length, 2); assert.equal(result.conflicts.length, 0);
});
test('identical edits are not a conflict', () => {
  const a=note('a','original'), edited={...a,body:'same'};
  assert.equal(mergeDocuments(doc(a),doc(edited),doc(edited)).conflicts.length,0);
});
test('timestamp-only changes do not mark a notebook dirty', () => {
  const a = note('a', 'original');
  assert.ok(sameDocument(doc(a),doc({...a,updatedAt:'later'})));
});
test('search covers Chinese body text and category as well as title', () => {
  const notes=[note('a','学习率决定步长'),note('b','导数的含义')];
  assert.equal(searchNotes(notes,'学习率')[0].id,'a');
  assert.equal(searchNotes(notes,'微积分').length,2);
});
test('malformed imports and duplicate IDs are rejected', () => {
  const a=note('a','body');
  assert.throws(()=>validateDocument(doc(a,a)));
  assert.throws(()=>validateDocument(doc({...a,id:'../unsafe'})));
  assert.throws(()=>validateDocument(doc({...a,body:42})));
  assert.throws(()=>validateDocument(doc({...a,title:'x'.repeat(161)})));
});
test('local deletion is preserved when the remote note is unchanged', () => {
  const original = doc(note('a', 'original'));
  const result = mergeDocuments(original, EMPTY, original);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.document.notes, []);
});
test('deleting one note preserves a remote edit to another note', () => {
  const a = note('a', 'one'), b = note('b', 'two');
  const result = mergeDocuments(doc(a, b), doc(b), doc(a, {...b,body:'remote edit'}));
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.document.notes.length, 1);
  assert.equal(result.document.notes[0].body, 'remote edit');
});
test('deletion conflicts with another device editing the same note', () => {
  const a = note('a', 'original');
  assert.equal(mergeDocuments(doc(a), EMPTY, doc({...a,body:'new remote text'})).conflicts.length, 1);
});
test('empty notebooks remain valid and do not resurrect deleted notes', () => {
  assert.deepEqual(validateDocument(EMPTY), EMPTY);
  assert.deepEqual(mergeDocuments(EMPTY, EMPTY, EMPTY).document, EMPTY);
});
test('catalog migration replaces untouched examples and preserves edited drafts', () => {
  const untouched = note('demo-a', 'example'), edited = note('demo-b', 'example');
  const local = doc(untouched, {...edited,body:'my changes'}, note('my-note','my new note'));
  const published = doc(note('imported','original article'));
  const result = mergeDocuments(doc(untouched, edited), local, published);
  assert.equal(result.document.notes.find(n => n.id === 'demo-a'), undefined);
  assert.equal(result.document.notes.find(n => n.id === 'demo-b').body, 'my changes');
  assert.equal(result.document.notes.find(n => n.id === 'my-note').body, 'my new note');
  assert.equal(result.document.notes.find(n => n.id === 'imported').body, 'original article');
});
