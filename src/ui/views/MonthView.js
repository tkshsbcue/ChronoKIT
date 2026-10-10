// Month view: weeks as rows, events as bars (multi-day / all-day) or compact
// lines (timed), with an "N more" link when a day overflows.

import { DAY, addDays, atMinutes, clamp, diffCalendarDays, format, isSameDay, startOfDay } from '../../core/date.js';
import { layoutDayRow } from '../../core/layout.js';
import { h } from '../dom.js';
import { startDrag } from '../drag.js';
import { eventContent, eventProps, canMove, canResize, isBackground } from '../content.js';


export class MonthView {
  constructor(cal) {
    this.cal = cal;
    this.headEl = h('div', { class: 'ck-month-head' });
    this.gridEl = h('div', {
      class: 'ck-month-grid',
      onPointerdown: (e) => this.onGridDown(e),
      onDblclick: (e) => this.onGridDoubleClick(e),
    });
    this.el = h('div', { class: 'ck-month' }, this.headEl, this.gridEl);
    this.cellEls = new Map();
  }

  render() {
    const cal = this.cal;
    const { instances, locale, readOnly, config } = cal;
    const { gridStart, weeks, month } = cal.range.grid;
    this.gridStart = gridStart;
    this.weeks = weeks;
    const now = cal.now();
    const height = this.gridEl.clientHeight;
    const rowHeight = height ? height / weeks : 110;
    const { monthLane: LANE, monthHeader: HEADER } = cal.metrics;
    const maxLanes = Math.max(1, Math.floor((rowHeight - HEADER - 4) / LANE));

    this.headEl.replaceChildren(
      ...Array.from({ length: 7 }, (_, i) => h('div', { class: 'ck-month-dow' }, format(addDays(gridStart, i), { weekday: 'short' }, locale))),
    );

    this.cellEls = new Map();
    const rows = [];
    for (let w = 0; w < weeks; w++) {
      const start = addDays(gridStart, w * 7);
      const { segments, laneCount } = layoutDayRow(instances, start, 7);
      const visibleLanes = laneCount > maxLanes ? maxLanes - 1 : maxLanes;
      const hidden = new Array(7).fill(0);
      for (const s of segments) if (s.lane >= visibleLanes) for (let c = s.startCol; c <= s.endCol; c++) hidden[c]++;

      const cells = Array.from({ length: 7 }, (_, c) => {
        const day = addDays(start, c);
        const cls = ['ck-month-cell'];
        if (day.getMonth() !== month) cls.push('ck-other-month');
        if (!config.workingDays.includes(day.getDay())) cls.push('ck-offday');
        const cell = h(
          'div',
          { class: cls.join(' ') },
          h(
            'button',
            {
              type: 'button',
              class: `ck-month-date${isSameDay(day, now) ? ' ck-today' : ''}`,
              title: format(day, { dateStyle: 'full' }, locale),
              onClick: () => cal.goToDay(day),
            },
            day.getDate() === 1 ? format(day, { month: 'short', day: 'numeric' }, locale) : day.getDate(),
          ),
          hidden[c] > 0 && h('button', { type: 'button', class: 'ck-more', style: { top: HEADER + visibleLanes * LANE }, onClick: () => cal.goToDay(day) }, `${hidden[c]} more`),
        );
        this.cellEls.set(+day, cell);
        return cell;
      });

      const events = segments
        .filter((s) => s.lane < visibleLanes)
        .map((seg) => {
          const inst = seg.item;
          const bar = inst.allDay || inst.end - inst.start >= DAY || seg.endCol > seg.startCol;
          const cls = [bar ? 'ck-event-bar' : 'ck-event-line', isBackground(inst) && 'ck-bg-month', seg.continuesBefore && 'ck-cont-before', seg.continuesAfter && 'ck-cont-after'].filter(Boolean).join(' ');
          return h(
            'div',
            eventProps(cal, inst, cls, {
              left: `calc(${(seg.startCol / 7) * 100}% + 3px)`,
              width: `calc(${((seg.endCol - seg.startCol + 1) / 7) * 100}% - 6px)`,
              top: HEADER + seg.lane * LANE,
            }, (e) => this.onEventDown(e, inst, 'move')),
            eventContent(cal, inst, 'month', true),
            bar && inst.allDay && !readOnly && canResize(inst) && !seg.continuesAfter && h('span', { class: 'ck-resize ck-resize-x ck-resize-end', onPointerdown: (e) => this.onEventDown(e, inst, 'end') }),
          );
        });

      rows.push(h('div', { class: 'ck-month-row' }, cells, h('div', { class: 'ck-month-events' }, events)));
    }
    this.gridEl.style.gridTemplateRows = `repeat(${weeks}, 1fr)`;
    this.gridEl.replaceChildren(...rows);
  }

  hitDay(x, y) {
    const r = this.gridEl.getBoundingClientRect();
    const col = clamp(Math.floor(((x - r.left) / (r.width || 1)) * 7), 0, 6);
    const row = clamp(Math.floor(((y - r.top) / (r.height || 1)) * this.weeks), 0, this.weeks - 1);
    return addDays(this.gridStart, row * 7 + col);
  }

  highlight(range) {
    for (const cell of this.cellEls.values()) cell.classList.remove('ck-drop-target');
    if (!range) return;
    const last = new Date(Math.max(+range.start, +range.end - 1));
    for (let d = startOfDay(range.start); d <= last; d = addDays(d, 1)) this.cellEls.get(+d)?.classList.add('ck-drop-target');
  }

  onEventDown(e, inst, mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const cal = this.cal;
    const srcEl = e.currentTarget.closest('.ck-event');
    cal.hideTooltip();
    cal.setSelected(inst.instanceId);
    const grabDay = this.hitDay(e.clientX, e.clientY);
    const allowed = !cal.readOnly && (mode === 'move' ? canMove(inst) : canResize(inst));
    let preview = null;
    const reset = () => {
      this.highlight(null);
      srcEl.classList.remove('ck-is-dragging');
    };
    startDrag(e, {
      onStart: () => allowed && srcEl.classList.add('ck-is-dragging'),
      onMove: (ev) => {
        if (!allowed) return;
        const day = this.hitDay(ev.clientX, ev.clientY);
        let { start, end } = inst;
        if (mode === 'move') {
          const delta = diffCalendarDays(day, grabDay);
          start = addDays(inst.start, delta);
          end = addDays(inst.end, delta);
        } else {
          end = addDays(startOfDay(day < startOfDay(inst.start) ? inst.start : day), 1);
        }
        preview = { start, end };
        this.highlight(preview);
      },
      onEnd: async (ev, moved) => {
        reset();
        if (!moved) return cal.eventClick(inst, ev);
        if (preview && (+preview.start !== +inst.start || +preview.end !== +inst.end)) {
          await cal.commitChange({ type: mode === 'move' ? 'move' : 'resize', instance: inst, changes: { start: preview.start, end: preview.end } });
        }
      },
      onCancel: reset,
    });
  }

  onGridDown(e) {
    const cal = this.cal;
    if (e.button !== 0 || e.target.closest('.ck-event, .ck-more, .ck-month-date')) return;
    const a = this.hitDay(e.clientX, e.clientY);
    if (cal.readOnly || e.pointerType === 'touch') {
      const up = (ev) => {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) cal.dateClick({ date: a, allDay: true }, ev);
      };
      window.addEventListener('pointerup', up, { once: true });
      return;
    }
    let sel = null;
    startDrag(e, {
      onMove: (ev) => {
        const b = this.hitDay(ev.clientX, ev.clientY);
        sel = { start: a < b ? a : b, end: addDays(a < b ? b : a, 1) };
        this.highlight(sel);
      },
      onEnd: (ev, moved) => {
        this.highlight(null);
        if (moved && sel) cal.select({ start: sel.start, end: sel.end, allDay: true }, ev, 'drag');
        else if (!moved) cal.dateClick({ date: a, allDay: true }, ev);
      },
      onCancel: () => this.highlight(null),
    });
  }

  onGridDoubleClick(e) {
    const cal = this.cal;
    if (cal.readOnly || e.target.closest('.ck-event, .ck-more, .ck-month-date')) return;
    const day = this.hitDay(e.clientX, e.clientY);
    const startMin = (cal.config.workingHours?.start ?? 9) * 60;
    cal.select({ start: atMinutes(day, startMin), end: atMinutes(day, startMin + cal.config.defaultEventDuration), allDay: false }, e, 'dblclick');
  }

  destroy() {
    this.el.remove();
  }
}

export function monthGrid(date, weekStartsOn) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = addDays(first, -((first.getDay() - weekStartsOn + 7) % 7));
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const weeks = Math.ceil((diffCalendarDays(last, gridStart) + 1) / 7);
  return { gridStart, weeks, month: date.getMonth() };
}
