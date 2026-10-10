import { addDays, addMonths, startOfDay, startOfMonth } from '../core/date.js';
import { h, icon, ICONS } from './dom.js';
import { buildMiniMonth } from './MiniMonth.js';
import { resolveColor } from './content.js';

function miniMonth(cal) {
  const { locale, config, project } = cal;
  // follow the main calendar when it moves to another month
  const key = `${cal.date.getFullYear()}-${cal.date.getMonth()}`;
  if (cal._miniKey !== key) {
    cal._miniKey = key;
    cal._miniCursor = startOfMonth(cal.date);
  }
  const shown = cal._miniCursor;
  const gridStart = addDays(shown, -((shown.getDay() - config.weekStartsOn + 7) % 7));

  // days with at least one event get a dot (cached per data version + month)
  const cacheKey = `${project.version}|${+gridStart}`;
  if (cal._busyKey !== cacheKey) {
    const set = new Set();
    for (const e of project.getEventsInRange(gridStart, addDays(gridStart, 42))) {
      for (let d = startOfDay(e.start); d < e.end; d = addDays(d, 1)) set.add(+d);
    }
    cal._busyKey = cacheKey;
    cal._busy = set;
  }

  return buildMiniMonth({
    locale,
    weekStartsOn: config.weekStartsOn,
    cursor: shown,
    range: cal.range,
    nowDate: cal.now(),
    busy: (d) => cal._busy.has(+d),
    onSelect: (d) => cal.setDate(d),
    onMove: (n) => {
      cal._miniCursor = addMonths(shown, n);
      cal.refresh();
    },
  });
}

function resourceFilter(cal) {
  const resources = cal.project.resources;
  if (!resources.length) return null;
  const hidden = cal.hiddenResources;
  const allOn = hidden.size === 0;
  const open = !cal.filterCollapsed;
  const shown = resources.length - resources.filter((r) => hidden.has(r.id)).length;
  return h(
    'div',
    { class: `ck-filter${open ? '' : ' ck-collapsed'}` },
    h(
      'div',
      { class: 'ck-filter-head' },
      h(
        'button',
        { type: 'button', class: 'ck-filter-toggle', 'aria-expanded': String(open), 'data-key': 'filter-toggle', onClick: () => cal.toggleResourceFilter() },
        icon(ICONS.down, 14),
        h('span', null, cal.config.resourceLabel),
        h('span', { class: 'ck-filter-count' }, shown === resources.length ? String(resources.length) : `${shown} of ${resources.length}`),
      ),
      h(
        'button',
        { type: 'button', class: 'ck-link', 'data-key': 'filter-all', onClick: () => cal.setHiddenResources(allOn ? resources.map((r) => r.id) : []) },
        allOn ? 'Hide all' : 'Show all',
      ),
    ),
    open && h(
      'ul',
      { class: 'ck-filter-list' },
      resources.map((r) =>
        h(
          'li',
          null,
          h(
            'label',
            { class: 'ck-filter-item', style: { '--ck-res': resolveColor(r.color) || 'var(--ck-accent)' } },
            h('input', { type: 'checkbox', checked: !hidden.has(r.id), 'data-key': `res-${r.id}`, onChange: () => cal.setResourceVisible(r.id, hidden.has(r.id)) }),
            h('span', { class: 'ck-filter-box', 'aria-hidden': 'true' }),
            h('span', { class: 'ck-filter-name' }, r.name),
          ),
        ),
      ),
    ),
  );
}

/** Builds the sidebar contents. Re-run on every render. */
export function buildSidebar(cal) {
  const extra = typeof cal.config.sidebarItems === 'function' ? cal.config.sidebarItems(cal) : cal.config.sidebarItems;
  return [miniMonth(cal), resourceFilter(cal), extra];
}
