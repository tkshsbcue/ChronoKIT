// List (agenda) view: the days in range, each with its events in time order.

import { addDays, addMonths, format, formatTimeRange, isSameDay, startOfDay, startOfMonth, startOfWeek } from '../../core/date.js';
import { h } from '../dom.js';
import { eventContent, eventProps } from '../content.js';

/** Range shown by the list view for a date: one day, the week, or the month. */
export function listRange(date, kind = 'week', weekStartsOn = 1) {
  const d = startOfDay(date);
  if (kind === 'day') return { start: d, end: addDays(d, 1) };
  if (kind === 'month') {
    const start = startOfMonth(d);
    return { start, end: addMonths(start, 1) };
  }
  const start = startOfWeek(d, weekStartsOn);
  return { start, end: addDays(start, 7) };
}

export class ListView {
  constructor(cal) {
    this.cal = cal;
    this.el = h('div', { class: 'ck-list' });
  }

  render() {
    const cal = this.cal;
    const { config, instances, locale } = cal;
    const { start, end } = cal.range;
    const now = cal.now();
    const byDay = new Map();
    for (const inst of [...instances].sort((a, b) => a.start - b.start || b.end - a.end)) {
      // an event spanning several days is listed on each of them
      const first = inst.start < start ? start : startOfDay(inst.start);
      for (let d = first; d < end && d < inst.end; d = addDays(d, 1)) {
        if (!byDay.has(+d)) byDay.set(+d, []);
        byDay.get(+d).push(inst);
      }
    }
    const days = [];
    for (let d = start; d < end; d = addDays(d, 1)) if (config.listShowEmpty || byDay.has(+d)) days.push(d);

    const rows = days.map((day) => {
      const items = byDay.get(+day) || [];
      return h(
        'section',
        { class: `ck-list-day${isSameDay(day, now) ? ' ck-today' : ''}` },
        h(
          'button',
          { type: 'button', class: 'ck-list-dayhead', onClick: () => cal.dateClick({ date: day, allDay: true }) },
          h('span', { class: 'ck-list-dow' }, format(day, { weekday: 'long' }, locale)),
          h('span', { class: 'ck-list-date' }, format(day, { day: 'numeric', month: 'long', year: 'numeric' }, locale)),
          h('span', { class: 'ck-list-count' }, items.length ? String(items.length) : ''),
        ),
        items.length
          ? h(
              'ul',
              { class: 'ck-list-items' },
              items.map((inst) => {
                const bg = inst.display === 'background';
                const time = inst.allDay || inst.end - inst.start >= 86400000 ? 'All day' : formatTimeRange(inst.start, inst.end, locale);
                const props = eventProps(cal, inst, `ck-event-list${bg ? ' ck-bg-item' : ''}`, {}, (e) => {
                  if (e.button !== 0) return;
                  cal.setSelected(inst.instanceId);
                });
                props.onClick = (e) => cal.eventClick(inst, e);
                return h(
                  'li',
                  props,
                  h('span', { class: 'ck-list-time' }, time),
                  h('span', { class: 'ck-list-dot', 'aria-hidden': 'true' }),
                  h('span', { class: 'ck-list-body' }, eventContent(cal, inst, 'list')),
                );
              }),
            )
          : h('div', { class: 'ck-list-none' }, config.listEmptyText),
      );
    });
    this.el.replaceChildren(...(rows.length ? rows : [h('div', { class: 'ck-empty ck-list-empty' }, config.listEmptyText)]));
  }

  destroy() {
    this.el.remove();
  }
}
