// MiniMonth: a small month (or day-strip) picker. Used by the Calendar sidebar
// and usable on its own wherever a date has to be picked:
//
//   const picker = new MiniMonth({
//     appendTo: '#picker',
//     selected: '2026-10-12',
//     marks: (day) => [{ color: '#2b59c3' }],         // dots under the date
//     dayStyle: (day) => ({ background: '#dff3e4' }), // colour the whole day
//     dayTitle: (day) => '80% free',                  // hover text
//     disabled: (day) => day < today,
//     onSelect: (day) => …,
//   });
//
// `months: 2` shows two months side by side; `layout: 'strip'` shows
// `stripDays` days in one row with previous / next.

import { Emitter } from '../core/emitter.js';
import { addDays, addMonths, format, isSameDay, startOfDay, startOfMonth, toDate } from '../core/date.js';
import { h, icon, ICONS } from './dom.js';
import { resolveColor } from './content.js';

export const MINI_DEFAULTS = {
  selected: null,
  date: null,
  weekStartsOn: 1,
  locale: undefined,
  months: 1,
  layout: 'month',
  stripDays: 7,
  marks: null,
  dayStyle: null,
  dayTitle: null,
  disabled: null,
  range: null,
  now: null,
  theme: 'light',
  cls: '',
  scale: 1,
};

const call = (fn, ...args) => (typeof fn === 'function' ? fn(...args) : null);

function dayButton(opts, d, { otherMonth = false, strip = false } = {}) {
  const { locale, selected, range, onSelect } = opts;
  const now = opts.nowDate;
  const cls = ['ck-mini-day'];
  if (otherMonth) cls.push('ck-other-month');
  if (range && d >= range.start && d < range.end) cls.push('ck-in-range');
  if (isSameDay(d, now)) cls.push('ck-today');
  if (selected && isSameDay(d, selected)) cls.push('ck-selected-day');
  if (opts.busy?.(d)) cls.push('ck-busy');
  const off = !!call(opts.disabled, d);
  if (off) cls.push('ck-disabled');
  const style = call(opts.dayStyle, d) || null;
  const marks = (call(opts.marks, d) || []).slice(0, 4);
  const title = call(opts.dayTitle, d);
  const label = format(d, { dateStyle: 'full' }, locale);
  return h(
    'button',
    {
      type: 'button',
      class: cls.join(' '),
      'aria-label': title ? `${label}, ${title}` : label,
      'aria-pressed': selected ? String(isSameDay(d, selected)) : null,
      title: title || null,
      disabled: off,
      'data-key': `mini-${+d}`,
      style: style
        ? {
            background: style.background,
            color: style.color,
            boxShadow: style.ring ? `inset 0 0 0 1.5px ${style.ring}` : null,
          }
        : null,
      onClick: () => !off && onSelect?.(d),
    },
    strip && h('span', { class: 'ck-mini-strip-dow' }, format(d, { weekday: 'short' }, locale)),
    h('span', { class: 'ck-mini-num' }, d.getDate()),
    marks.length > 0 &&
      h(
        'span',
        { class: 'ck-mini-marks', 'aria-hidden': 'true' },
        marks.map((m) => h('span', { class: 'ck-mini-mark', style: { background: resolveColor(m?.color) || 'currentColor' } })),
      ),
  );
}

function monthGridEl(opts, shown) {
  const { weekStartsOn, locale } = opts;
  const gridStart = addDays(shown, -((shown.getDay() - weekStartsOn + 7) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return h(
    'div',
    { class: 'ck-mini-grid' },
    cells.slice(0, 7).map((d) => h('span', { class: 'ck-mini-dow', 'aria-hidden': 'true' }, format(d, { weekday: 'narrow' }, locale))),
    cells.map((d) => dayButton(opts, d, { otherMonth: d.getMonth() !== shown.getMonth() })),
  );
}

/**
 * Builds a mini month as plain DOM. `opts.cursor` is the first month (or the
 * first strip day) shown; `opts.onMove(n)` is called by previous / next.
 */
export function buildMiniMonth(opts) {
  const { locale, cursor, onMove } = opts;
  const nav = (dir, label) =>
    h('button', { type: 'button', class: 'ck-icon-btn', 'aria-label': label, 'data-key': `mini-${dir > 0 ? 'next' : 'prev'}`, onClick: () => onMove?.(dir) }, icon(dir > 0 ? ICONS.next : ICONS.prev, 14));

  if (opts.layout === 'strip') {
    const n = Math.max(1, opts.stripDays || 7);
    const days = Array.from({ length: n }, (_, i) => addDays(cursor, i));
    const last = days[n - 1];
    const title =
      days[0].getMonth() === last.getMonth()
        ? format(days[0], { month: 'long', year: 'numeric' }, locale)
        : `${format(days[0], { month: 'short' }, locale)} – ${format(last, { month: 'short', year: 'numeric' }, locale)}`;
    return h(
      'div',
      { class: 'ck-mini ck-mini-strip' },
      h('div', { class: 'ck-mini-head' }, h('span', { class: 'ck-mini-title' }, title), nav(-1, 'Earlier days'), nav(1, 'Later days')),
      h('div', { class: 'ck-mini-strip-row', style: { gridTemplateColumns: `repeat(${n}, 1fr)` } }, days.map((d) => dayButton(opts, d, { strip: true }))),
    );
  }

  const count = Math.max(1, opts.months || 1);
  const months = Array.from({ length: count }, (_, i) => addMonths(cursor, i));
  return h(
    'div',
    { class: `ck-mini${count > 1 ? ' ck-mini-multi' : ''}` },
    months.map((shown, i) =>
      h(
        'div',
        { class: 'ck-mini-month' },
        h(
          'div',
          { class: 'ck-mini-head' },
          h('span', { class: 'ck-mini-title' }, format(shown, { month: 'long', year: 'numeric' }, locale)),
          i === 0 && nav(-1, 'Previous month'),
          i === count - 1 && nav(1, 'Next month'),
        ),
        monthGridEl(opts, shown),
      ),
    ),
  );
}

export class MiniMonth extends Emitter {
  /**
   * @param {object} config see MINI_DEFAULTS; plus appendTo, onSelect(day), onMonthChange(firstShownDay)
   */
  constructor(config = {}) {
    super();
    const { appendTo, onSelect, onMonthChange, ...rest } = config;
    this.config = { ...MINI_DEFAULTS, ...rest };
    if (onSelect) this.on('select', ({ date }) => onSelect(date));
    if (onMonthChange) this.on('monthChange', ({ date }) => onMonthChange(date));
    this.el = h('div', { class: 'ck-root ck-minimonth' });
    this._cursor = this._cursorFor(toDate(this.config.date || this.config.selected) || this._now());
    if (appendTo) this.mount(appendTo);
  }

  mount(target) {
    const parent = typeof target === 'string' ? document.querySelector(target) : target;
    if (!parent) throw new Error(`ChronoKit: element ${target} not found`);
    parent.appendChild(this.el);
    return this.render();
  }

  destroy() {
    this.el.remove();
    this.emit('destroy');
    this._listeners.clear();
  }

  get selected() {
    return this.config.selected ? startOfDay(toDate(this.config.selected)) : null;
  }

  /** First month (or first strip day) on show. */
  get cursor() {
    return this._cursor;
  }

  /** Change any option; a new `date` or `selected` outside the view moves the view to it. */
  setOptions(patch = {}) {
    Object.assign(this.config, patch);
    const target = toDate(patch.date || patch.selected);
    if (target && !this._shows(target)) this._setCursor(this._cursorFor(target));
    return this.render();
  }

  setDate(date) {
    return this.setOptions({ selected: date });
  }

  /** Move by months (or by whole strips). */
  move(n) {
    const c = this.config;
    this._setCursor(c.layout === 'strip' ? addDays(this._cursor, n * (c.stripDays || 7)) : addMonths(this._cursor, n));
    return this.render();
  }

  render() {
    const c = this.config;
    this.el.className = `ck-root ck-minimonth${c.cls ? ` ${c.cls}` : ''}`;
    this.el.dataset.theme = c.theme;
    this.el.style.setProperty('--ck-scale', String(Number(c.scale) > 0 ? Number(c.scale) : 1));
    const range = c.range ? { start: toDate(c.range.start), end: toDate(c.range.end) } : null;
    this.el.replaceChildren(
      buildMiniMonth({
        ...c,
        range,
        selected: this.selected,
        nowDate: this._now(),
        cursor: this._cursor,
        onMove: (n) => this.move(n),
        onSelect: (d) => {
          this.config.selected = d;
          this.render();
          this.emit('select', { date: d, picker: this });
        },
      }),
    );
    return this;
  }

  // ------------------------------------------------------------ internals

  _now() {
    return (typeof this.config.now === 'function' && toDate(this.config.now())) || new Date();
  }

  _cursorFor(d) {
    const day = startOfDay(d);
    if (this.config.layout !== 'strip') return startOfMonth(day);
    const n = this.config.stripDays || 7;
    // keep the strip on whole weeks when it is a week long
    return n === 7 ? addDays(day, -((day.getDay() - this.config.weekStartsOn + 7) % 7)) : day;
  }

  _shows(d) {
    const c = this.config;
    if (c.layout === 'strip') return d >= this._cursor && d < addDays(this._cursor, c.stripDays || 7);
    const end = addMonths(this._cursor, Math.max(1, c.months || 1));
    return d >= this._cursor && d < end;
  }

  _setCursor(d) {
    if (+d === +this._cursor) return;
    this._cursor = d;
    this.emit('monthChange', { date: d, picker: this });
  }
}
