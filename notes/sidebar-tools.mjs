// Popovers overlay the directory so revealing controls never shortens the list.
export function setupSidebarTools(sidebar) {
  const groups = [...sidebar.querySelectorAll('.sidebar-disclosure')].map(root => ({
    root, button: root.querySelector('.sidebar-tool-toggle'), panel: root.querySelector('.sidebar-popover'), hovered: false,
  }));
  function close(group, restoreFocus = false) {
    group.panel.hidden = true;
    group.button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) group.button.focus();
  }
  function open(group) {
    groups.forEach(other => { if (other !== group) close(other); });
    group.panel.hidden = false;
    group.button.setAttribute('aria-expanded', 'true');
  }
  groups.forEach(group => {
    group.root.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      group.hovered = true; open(group);
    });
    group.root.addEventListener('pointerleave', () => {
      group.hovered = false;
      if (!group.panel.contains(document.activeElement)) close(group);
    });
    group.button.addEventListener('click', event => {
      // A mouse hover has already opened the panel before its click arrives.
      if (event.detail > 0 && group.hovered) open(group);
      else if (group.panel.hidden) open(group);
      else close(group);
    });
    group.root.addEventListener('focusout', event => {
      if (!group.root.contains(event.relatedTarget) && !group.hovered) close(group);
    });
    group.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !group.panel.hidden) {
        event.preventDefault(); event.stopPropagation(); close(group, true);
      }
    });
    group.panel.addEventListener('click', event => {
      if (event.target.closest('button')) close(group);
    });
  });
  document.addEventListener('pointerdown', event => {
    groups.forEach(group => { if (!group.root.contains(event.target)) close(group); });
  });
  return {
    openSearch() { const group = groups.find(item => item.root.id === 'sidebar-compose'); open(group); sidebar.querySelector('#search').focus(); },
    closeAll() { groups.forEach(group => close(group)); },
  };
}
