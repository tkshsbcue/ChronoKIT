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

const groupOf = (cal, r) => {
  const field = cal.config.resourceGroupBy;
  const v = field ? r[field] : null;
  return v == null ? '' : String(v).trim();
};

/**
 * The people the list shows, after its own search, group and order. They
 * narrow the list only: who shows on the calendar is still the ticks.
 */
export function listedResources(cal) {
  const q = cal.resourceQuery.trim().toLowerCase();
  const group = cal.resourceGroup;
  const byName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''));
  const rows = cal.project.resources.filter((r) => {
    if (group && groupOf(cal, r) !== group) return false;
    if (!q) return true;
    return String(r.name ?? '').toLowerCase().includes(q) || groupOf(cal, r).toLowerCase().includes(q);
  });
  if (cal.resourceSort === 'name-desc') return rows.sort((a, b) => byName(b, a));
  if (cal.resourceSort === 'group') return rows.sort((a, b) => (groupOf(cal, a) || '￿').localeCompare(groupOf(cal, b) || '￿') || byName(a, b));
  return rows.sort(byName);
}

function resourceItem(cal, r, hidden) {
  const group = groupOf(cal, r);
  return h(
    'li',
    null,
    h(
      'label',
      { class: 'ck-filter-item', style: { '--ck-res': resolveColor(r.color) || 'var(--ck-accent)' }, title: group ? `${r.name} · ${group}` : r.name },
      h('input', { type: 'checkbox', checked: !hidden.has(r.id), 'data-key': `res-${r.id}`, onChange: () => cal.setResourceVisible(r.id, hidden.has(r.id)) }),
      h('span', { class: 'ck-filter-box', 'aria-hidden': 'true' }),
      h('span', { class: 'ck-filter-name' }, r.name),
      group && cal.resourceSort !== 'group' && h('span', { class: 'ck-filter-group' }, group),
    ),
  );
}

function resourceFilter(cal) {
  const resources = cal.project.resources;
  if (!resources.length) return null;
  const { config } = cal;
  const hidden = cal.hiddenResources;
  const allOn = hidden.size === 0;
  const open = !cal.filterCollapsed;
  const shown = resources.length - resources.filter((r) => hidden.has(r.id)).length;
  const groups = config.resourceGroupBy ? [...new Set(resources.map((r) => groupOf(cal, r)).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : [];
  const searchOn = config.resourceSearch === true || (config.resourceSearch === 'auto' && resources.length > 8);
  const narrowed = Boolean(cal.resourceQuery.trim() || cal.resourceGroup);
  const listed = open ? listedResources(cal) : [];
  const label = String(config.resourceLabel || 'People');
  const groupLabel = String(config.resourceGroupLabel || 'Group');

  // With the list narrowed, the link acts on what it shows: only these on the calendar.
  const link = narrowed
    ? h('button', { type: 'button', class: 'ck-link', 'data-key': 'filter-only', onClick: () => { const keep = new Set(listed.map((r) => r.id)); cal.setHiddenResources(resources.filter((r) => !keep.has(r.id)).map((r) => r.id)); } }, 'Show only these')
    : h('button', { type: 'button', class: 'ck-link', 'data-key': 'filter-all', onClick: () => cal.setHiddenResources(allOn ? resources.map((r) => r.id) : []) }, allOn ? 'Hide all' : 'Show all');

  let list = null;
  if (open) {
    let items;
    if (cal.resourceSort === 'group' && groups.length) {
      items = [];
      let current = null;
      for (const r of listed) {
        const g = groupOf(cal, r) || `No ${groupLabel.toLowerCase()}`;
        if (g !== current) {
          current = g;
          items.push(h('li', { class: 'ck-filter-heading', role: 'presentation' }, g));
        }
        items.push(resourceItem(cal, r, hidden));
      }
    } else items = listed.map((r) => resourceItem(cal, r, hidden));
    list = h('ul', { class: 'ck-filter-list' }, items.length ? items : h('li', { class: 'ck-filter-empty' }, `No ${label.toLowerCase()} match`));
  }

  const controls = open && (searchOn || groups.length)
    ? h(
      'div',
      { class: 'ck-filter-tools' },
      searchOn && h('input', {
        type: 'search',
        class: 'ck-filter-search',
        placeholder: `Search ${label.toLowerCase()}`,
        'aria-label': `Search ${label.toLowerCase()}`,
        value: cal.resourceQuery,
        'data-key': 'filter-search',
        onInput: (e) => cal.setResourceQuery(e.target.value),
      }),
      groups.length > 0 && h(
        'div',
        { class: 'ck-filter-selects' },
        h(
          'select',
          { class: 'ck-filter-select', 'aria-label': `Filter by ${groupLabel.toLowerCase()}`, 'data-key': 'filter-group', value: cal.resourceGroup, onChange: (e) => cal.setResourceGroup(e.target.value) },
          h('option', { value: '' }, `Every ${groupLabel.toLowerCase()}`),
          groups.map((g) => h('option', { value: g }, `${g} (${resources.filter((r) => groupOf(cal, r) === g).length})`)),
        ),
        h(
          'select',
          { class: 'ck-filter-select', 'aria-label': 'Sort by', 'data-key': 'filter-sort', value: cal.resourceSort, onChange: (e) => cal.setResourceSort(e.target.value) },
          h('option', { value: 'name' }, 'Name A–Z'),
          h('option', { value: 'name-desc' }, 'Name Z–A'),
          h('option', { value: 'group' }, `By ${groupLabel.toLowerCase()}`),
        ),
      ),
    )
    : null;

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
        h('span', null, label),
        h('span', { class: 'ck-filter-count' }, shown === resources.length ? String(resources.length) : `${shown} of ${resources.length}`),
      ),
      link,
    ),
    controls,
    list,
  );
}

/** Builds the sidebar contents. Re-run on every render. */
export function buildSidebar(cal) {
  const extra = typeof cal.config.sidebarItems === 'function' ? cal.config.sidebarItems(cal) : cal.config.sidebarItems;
  return [miniMonth(cal), resourceFilter(cal), extra];
}
