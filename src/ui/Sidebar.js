import { addDays, addMonths, format, isSameDay, startOfDay, startOfMonth } from '../core/date.js';
import { h, icon, ICONS } from './dom.js';
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
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const now = new Date();
  const { start, end } = cal.range;

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

  const move = (n) => {
    cal._miniCursor = addMonths(shown, n);
    cal.refresh();
  };
  return h(
    'div',
    { class: 'ck-mini' },
    h(
      'div',
      { class: 'ck-mini-head' },
      h('span', { class: 'ck-mini-title' }, format(shown, { month: 'long', year: 'numeric' }, locale)),
      h('button', { type: 'button', class: 'ck-icon-btn', 'aria-label': 'Previous month', 'data-key': 'mini-prev', onClick: () => move(-1) }, icon(ICONS.prev, 14)),
      h('button', { type: 'button', class: 'ck-icon-btn', 'aria-label': 'Next month', 'data-key': 'mini-next', onClick: () => move(1) }, icon(ICONS.next, 14)),
    ),
    h(
      'div',
      { class: 'ck-mini-grid' },
      cells.slice(0, 7).map((d) => h('span', { class: 'ck-mini-dow', 'aria-hidden': 'true' }, format(d, { weekday: 'narrow' }, locale))),
      cells.map((d) => {
        const cls = ['ck-mini-day'];
        if (d.getMonth() !== shown.getMonth()) cls.push('ck-other-month');
        if (d >= start && d < end) cls.push('ck-in-range');
        if (isSameDay(d, now)) cls.push('ck-today');
        if (cal._busy.has(+d)) cls.push('ck-busy');
        return h(
          'button',
          { type: 'button', class: cls.join(' '), 'aria-label': format(d, { dateStyle: 'full' }, locale), 'data-key': `mini-${+d}`, onClick: () => cal.setDate(d) },
          d.getDate(),
        );
      }),
    ),
  );
}

function resourceFilter(cal) {
  const resources = cal.project.resources;
  if (!resources.length) return null;
  const hidden = cal.hiddenResources;
  const allOn = hidden.size === 0;
  return h(
    'div',
    { class: 'ck-filter' },
    h(
      'div',
      { class: 'ck-filter-head' },
      h('span', null, cal.config.resourceLabel),
      h(
        'button',
        { type: 'button', class: 'ck-link', 'data-key': 'filter-all', onClick: () => cal.setHiddenResources(allOn ? resources.map((r) => r.id) : []) },
        allOn ? 'Hide all' : 'Show all',
      ),
    ),
    h(
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
