import { h, icon, ICONS } from './dom.js';

const VIEW_LABELS = { day: 'Day', week: 'Week', month: 'Month', timeline: 'Timeline', list: 'List' };

function syncStatus(crud) {
  const save = () => crud.sync().catch(() => {});
  if (crud.status === 'syncing' || crud.status === 'loading') {
    return h('span', { class: 'ck-sync ck-sync-busy' }, crud.status === 'loading' ? 'Loading…' : 'Saving…');
  }
  if (crud.status === 'error') {
    return h('button', { type: 'button', class: 'ck-sync ck-sync-error', title: crud.lastError?.message, 'data-key': 'sync', onClick: save }, 'Not saved · Retry');
  }
  if (crud.hasChanges) {
    return h('button', { type: 'button', class: 'ck-sync ck-sync-dirty', title: 'Save changes (Ctrl+S)', 'data-key': 'sync', onClick: save }, 'Unsaved changes');
  }
  return h('span', { class: 'ck-sync ck-sync-ok' }, 'All changes saved');
}

/** Builds the toolbar contents. Re-run on every render. */
export function buildToolbar(cal) {
  const { project, config } = cal;
  const extra = typeof config.toolbarItems === 'function' ? config.toolbarItems(cal) : config.toolbarItems;
  const btn = (key, label, d, onClick, props = {}) =>
    h('button', { type: 'button', class: 'ck-icon-btn', 'aria-label': label, title: label, 'data-key': key, onClick, ...props }, icon(d));
  return [
    config.showSidebar &&
      btn('sidebar', 'Toggle sidebar', ICONS.sidebar, () => cal.toggleSidebar(), { class: 'ck-icon-btn ck-sidebar-toggle', 'aria-pressed': String(cal.sidebarOpen) }),
    h('button', { type: 'button', class: 'ck-btn', 'data-key': 'today', onClick: () => cal.today() }, 'Today'),
    h('div', { class: 'ck-nav' }, btn('prev', 'Previous', ICONS.prev, () => cal.prev()), btn('next', 'Next', ICONS.next, () => cal.next())),
    h('h2', { class: 'ck-title', 'aria-live': 'polite' }, cal.title),
    h('span', { class: 'ck-spacer' }),
    extra,
    cal.crudManager && syncStatus(cal.crudManager),
    h(
      'div',
      { class: 'ck-group' },
      btn('undo', project.canUndo ? `Undo ${project.undoLabel?.toLowerCase()} (Ctrl+Z)` : 'Nothing to undo', ICONS.undo, () => cal.undo(), { disabled: !project.canUndo, 'aria-label': 'Undo' }),
      btn('redo', project.canRedo ? `Redo ${project.redoLabel?.toLowerCase()} (Ctrl+Shift+Z)` : 'Nothing to redo', ICONS.redo, () => cal.redo(), { disabled: !project.canRedo, 'aria-label': 'Redo' }),
    ),
    cal.view === 'timeline' &&
      h(
        'div',
        { class: 'ck-group' },
        btn('zoom-out', 'Zoom out', ICONS.minus, () => cal.setZoom(cal.zoom / 1.5)),
        btn('zoom-in', 'Zoom in', ICONS.plus, () => cal.setZoom(cal.zoom * 1.5)),
      ),
    config.views.length > 1 &&
      h(
        'div',
        { class: 'ck-segmented', role: 'tablist', 'aria-label': 'View' },
        config.views.map((v) =>
          h(
            'button',
            { type: 'button', role: 'tab', 'aria-selected': String(cal.view === v), class: cal.view === v ? 'ck-on' : '', 'data-key': `view-${v}`, onClick: () => cal.setView(v) },
            config.viewLabels?.[v] || VIEW_LABELS[v] || v,
          ),
        ),
      ),
  ];
}
