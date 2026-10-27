import test from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@milkdown/kit/prose/model';
import { EditorState, TextSelection } from '@milkdown/kit/prose/state';
import { convertBlock } from './block-format.js';

const schema = new Schema({ nodes: {
  doc: { content: 'block+' }, text: { group: 'inline' },
  paragraph: { group: 'block', content: 'inline*' },
  heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
  code_block: { group: 'block', content: 'text*', marks: '', code: true, attrs: { language: { default: '' } } },
  blockquote: { group: 'block', content: 'block+' },
  bullet_list: { group: 'block', content: 'list_item+' },
  ordered_list: { group: 'block', content: 'list_item+' },
  list_item: { content: 'paragraph block*' },
  math_inline: { inline: true, group: 'inline', atom: true, attrs: { value: {} } },
  hardbreak: { inline: true, group: 'inline' },
} });
const p = text => schema.nodes.paragraph.create(null, text ? schema.text(text) : null);
function makeView(children) {
  const view = { editable: true, state: EditorState.create({ doc: schema.nodes.doc.create(null, children) }), focus() {} };
  view.dispatch = transaction => { view.state = view.state.apply(transaction); };
  return view;
}
test('converting one block never changes adjacent blocks or a previous multi-block selection', () => {
  const view = makeView([p('first'), p('current'), p('last')]);
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, view.state.doc.content.size - 1)));
  assert.equal(convertBlock(view, 7, 'h3'), true);
  assert.equal(view.state.doc.child(0).type.name, 'paragraph');
  assert.equal(view.state.doc.child(1).type.name, 'heading');
  assert.equal(view.state.doc.child(1).attrs.level, 3);
  assert.equal(view.state.doc.child(1).textContent, 'current');
  assert.equal(view.state.doc.child(2).type.name, 'paragraph');
});
test('heading and paragraph conversion retain inline formula nodes', () => {
  const formula = schema.nodes.math_inline.create({ value: 'E=mc^2' });
  const view = makeView([schema.nodes.paragraph.create(null, [schema.text('formula '), formula])]);
  assert.equal(convertBlock(view, 0, 'h2'), true);
  assert.equal(view.state.doc.firstChild.lastChild.attrs.value, 'E=mc^2');
  assert.equal(convertBlock(view, 0, 'paragraph'), true);
  assert.equal(view.state.doc.firstChild.lastChild.attrs.value, 'E=mc^2');
});
test('code conversion retains text, formula source, line breaks and neighboring blocks', () => {
  const view = makeView([schema.nodes.paragraph.create(null, [schema.text('formula '), schema.nodes.math_inline.create({ value: 'x^2' }), schema.nodes.hardbreak.create(), schema.text('next')]), p('untouched')]);
  assert.equal(convertBlock(view, 0, 'code'), true);
  assert.equal(view.state.doc.firstChild.textContent, 'formula $x^2$\nnext');
  assert.equal(view.state.doc.child(1).textContent, 'untouched');
});
test('a quote can return to normal text and readonly edits are refused', () => {
  const view = makeView([schema.nodes.blockquote.create(null, p('quoted'))]);
  assert.equal(convertBlock(view, 1, 'paragraph'), true);
  assert.equal(view.state.doc.firstChild.type.name, 'paragraph');
  const before = view.state.doc; view.editable = false;
  assert.equal(convertBlock(view, 0, 'h1'), false);
  assert.equal(view.state.doc, before);
});
test('a list item that requires its first paragraph refuses code conversion without data loss', () => {
  const view = makeView([schema.nodes.bullet_list.create(null, schema.nodes.list_item.create(null, p('keep me')))]);
  const before = view.state.doc;
  assert.equal(convertBlock(view, 2, 'code'), false);
  assert.equal(view.state.doc, before);
  assert.equal(convertBlock(view, 2, 'formula'), false);
  assert.equal(view.state.doc, before);
});
test('formula conversion preserves raw LaTeX, line breaks and the neighboring paragraph', () => {
  const view = makeView([schema.nodes.paragraph.create(null, [schema.text('\\begin{aligned}x&=1'), schema.nodes.hardbreak.create(), schema.text('y&=2\\end{aligned}')]), p('untouched')]);
  assert.equal(convertBlock(view, 0, 'formula'), true);
  assert.equal(view.state.doc.firstChild.attrs.language, 'LaTeX');
  assert.equal(view.state.doc.firstChild.textContent, '\\begin{aligned}x&=1\ny&=2\\end{aligned}');
  assert.equal(view.state.doc.child(1).textContent, 'untouched');
});
test('an existing inline formula becomes a display formula without dollar delimiters', () => {
  const view = makeView([schema.nodes.paragraph.create(null, schema.nodes.math_inline.create({ value: 'E=mc^2' }))]);
  assert.equal(convertBlock(view, 0, 'formula'), true);
  assert.equal(view.state.doc.firstChild.textContent, 'E=mc^2');
  for (const source of ['$x^2$', '$$x^2$$', '\\[x^2\\]']) {
    const wrapped = makeView([p(source)]);
    assert.equal(convertBlock(wrapped, 0, 'formula'), true);
    assert.equal(wrapped.state.doc.firstChild.textContent, 'x^2');
  }
});
test('code and formula conversion can be reversed without changing the source', () => {
  const source = '\\frac{x}{y} + z_1';
  const view = makeView([schema.nodes.code_block.create({ language: 'python' }, schema.text(source))]);
  assert.equal(convertBlock(view, 0, 'formula'), true);
  assert.equal(view.state.doc.firstChild.attrs.language, 'LaTeX');
  assert.equal(view.state.doc.firstChild.textContent, source);
  assert.equal(convertBlock(view, 0, 'code'), true);
  assert.equal(view.state.doc.firstChild.attrs.language, '');
  assert.equal(view.state.doc.firstChild.textContent, source);
});
test('an empty paragraph opens an empty formula and readonly mode refuses conversion', () => {
  const view = makeView([p('')]);
  assert.equal(convertBlock(view, 0, 'formula'), true);
  assert.equal(view.state.doc.firstChild.attrs.language, 'LaTeX');
  assert.equal(view.state.doc.firstChild.content.size, 0);
  const before = view.state.doc; view.editable = false;
  assert.equal(convertBlock(view, 0, 'code'), false);
  assert.equal(view.state.doc, before);
});
