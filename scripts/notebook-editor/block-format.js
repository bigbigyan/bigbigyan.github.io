import { $prose } from '@milkdown/kit/utils';
import { serializerCtx } from '@milkdown/kit/core';
import { Plugin, TextSelection } from '@milkdown/kit/prose/state';
import { setBlockType, wrapIn, lift } from '@milkdown/kit/prose/commands';
import { wrapInList } from '@milkdown/kit/prose/schema-list';

// Select only the requested block. Commands retain text instead of inserting a new block.
export function convertBlock(view, pos, format, serialize) {
  if (!view.editable) return false;
  const node = view.state.doc.nodeAt(pos);
  if (!node?.isTextblock) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos + 1))));
  const { nodes } = view.state.schema;
  let command;
  if (format === 'paragraph' && node.type === nodes.paragraph && view.state.selection.$from.depth > 1 && view.state.selection.$from.node(-1).type === nodes.blockquote) command = lift;
  else if (format === 'paragraph') command = setBlockType(nodes.paragraph);
  else if (/^h[1-6]$/.test(format)) command = setBlockType(nodes.heading, { level: Number(format[1]) });
  else if (format === 'code') {
    if (node.type === nodes.code_block) return true;
    const $pos = view.state.doc.resolve(pos);
    if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, nodes.code_block)) return false;
    // Inline formulas/images are atoms. Converting them through setBlockType would discard them.
    const text = serialize ? serialize(view.state.schema.topNodeType.create(null, nodes.paragraph.create(null, node.content))).trimEnd()
      : node.textBetween(0, node.content.size, '\n', leaf => leaf.attrs.value != null ? `$${leaf.attrs.value}$` : leaf.type.name === 'hardbreak' ? '\n' : leaf.attrs.src ? `![${leaf.attrs.alt || ''}](${leaf.attrs.src})` : '');
    view.dispatch(view.state.tr.replaceWith(pos, pos + node.nodeSize, nodes.code_block.create({ language: '' }, text ? view.state.schema.text(text) : null)));
    view.focus(); return true;
  }
  else if (format === 'quote') command = wrapIn(nodes.blockquote);
  else if (format === 'bullet') command = wrapInList(nodes.bullet_list);
  else if (format === 'ordered') command = wrapInList(nodes.ordered_list);
  if (!command) return false;
  if (format === 'paragraph' && node.type === nodes.paragraph && command !== lift) return true;
  if (/^h[1-6]$/.test(format) && node.type === nodes.heading && node.attrs.level === Number(format[1])) return true;
  const applied = command(view.state, view.dispatch);
  if (applied) view.focus();
  return applied;
}

const formats = [
  ['paragraph', '正文'], ['h1', '标题 1'], ['h2', '标题 2'], ['h3', '标题 3'],
  ['h4', '标题 4'], ['h5', '标题 5'], ['h6', '标题 6'], ['code', '代码块'],
  ['quote', '引用'], ['bullet', '无序列表'], ['ordered', '有序列表'],
];

export function blockFormatPlugin(root) {
  return $prose(ctx => new Plugin({
    view(view) {
      const overlay = document.createElement('div');
      overlay.className = 'block-format-handles';
      overlay.setAttribute('aria-label', '段落格式');
      root.append(overlay);
      let frame = 0, menu = null, anchor = null, previousDoc = null;
      const close = (restore = false) => {
        menu?.remove(); menu = null;
        anchor?.setAttribute('aria-expanded', 'false');
        if (restore && anchor?.isConnected) anchor.focus();
        anchor = null;
      };
      const open = (button, pos) => {
        close();
        if (!view.editable) return;
        anchor = button;
        button.setAttribute('aria-expanded', 'true');
        menu = document.createElement('div');
        menu.className = 'block-format-menu'; menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', '调整当前段落');
        const node = view.state.doc.nodeAt(pos);
        const selected = node?.type.name === 'heading' ? `h${node.attrs.level}` : node?.type.name === 'code_block' ? 'code' : 'paragraph';
        for (const [format, label] of formats) {
          const item = document.createElement('button'); item.type = 'button';
          item.setAttribute('role', 'menuitemradio'); item.setAttribute('aria-checked', String(format === selected));
          item.dataset.format = format; item.textContent = label;
          item.addEventListener('mousedown', event => event.preventDefault());
          item.onclick = () => {
            const applied = convertBlock(view, pos, format, ctx.get(serializerCtx));
            if (applied) close();
            else {
              let message = menu.querySelector('[role=status]');
              if (!message) { message = document.createElement('p'); message.setAttribute('role', 'status'); menu.append(message); }
              message.textContent = '此位置不支持该格式，请先移出列表或表格。';
            }
          };
          menu.append(item);
        }
        menu.onkeydown = event => {
          if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
          const items = [...menu.querySelectorAll('button')];
          let index = items.indexOf(document.activeElement);
          if (event.key === 'ArrowDown') index = (index + 1) % items.length;
          else if (event.key === 'ArrowUp') index = (index - 1 + items.length) % items.length;
          else if (event.key === 'Home') index = 0;
          else if (event.key === 'End') index = items.length - 1;
          else if (event.key === 'Tab') { close(); return; }
          else return;
          event.preventDefault(); items[index].focus();
        };
        document.body.append(menu);
        const box = button.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(box.left, innerWidth - menu.offsetWidth - 8))}px`;
        menu.style.top = `${Math.max(8, Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8))}px`;
        menu.querySelector(`[data-format="${selected}"]`)?.focus();
      };
      const draw = () => {
        frame = 0;
        if (menu && previousDoc !== view.state.doc) close();
        previousDoc = view.state.doc;
        // Reuse controls while the document stays unchanged, keeping keyboard focus stable.
        const blocks = [];
        view.state.doc.descendants((node, pos) => {
          if (['paragraph', 'heading', 'code_block'].includes(node.type.name)) blocks.push({ node, pos });
        });
        const existing = new Map([...overlay.children].map(button => [Number(button.dataset.pos), button]));
        const rootBox = root.getBoundingClientRect();
        const active = view.state.selection.$from;
        for (const { node, pos } of blocks) {
          const dom = view.nodeDOM(pos);
          if (!(dom instanceof Element)) continue;
          const box = dom.getBoundingClientRect();
          if (!box.height) continue;
          let button = existing.get(pos); existing.delete(pos);
          if (!button) {
            button = document.createElement('button'); button.type = 'button'; button.className = 'block-format-handle';
            button.dataset.pos = pos; button.textContent = '≡';
            button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false');
            button.onmousedown = event => event.preventDefault();
            button.onclick = () => open(button, pos);
            overlay.append(button);
          }
          const label = node.type.name === 'heading' ? `标题 ${node.attrs.level}` : node.type.name === 'code_block' ? '代码块' : '正文';
          button.setAttribute('aria-label', `调整当前段落格式：${label}，${node.textContent.slice(0, 24) || '空段落'}`);
          button.title = `调整当前段落 · ${label}`;
          button.style.left = `${Math.max(2, box.left - rootBox.left - 30)}px`;
          button.style.top = `${box.top - rootBox.top + Math.max(0, (parseFloat(getComputedStyle(dom).lineHeight) || 28) / 2 - 12)}px`;
          button.classList.toggle('is-current', active.pos > pos && active.pos <= pos + node.nodeSize - 1);
          button.disabled = !view.editable;
        }
        for (const button of existing.values()) button.remove();
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
      const outside = event => { if (menu && !menu.contains(event.target) && !anchor?.contains(event.target)) close(); };
      const scroll = event => { if (menu && !menu.contains(event.target)) close(); };
      const observer = new ResizeObserver(schedule); observer.observe(root);
      root.addEventListener('load', schedule, true);
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', scroll, true);
      document.addEventListener('pointerdown', outside);
      schedule();
      return {
        update: schedule,
        destroy() {
          close(); cancelAnimationFrame(frame); observer.disconnect(); overlay.remove();
          root.removeEventListener('load', schedule, true);
          window.removeEventListener('resize', schedule); window.removeEventListener('scroll', scroll, true);
          document.removeEventListener('pointerdown', outside);
        },
      };
    },
  }));
}
