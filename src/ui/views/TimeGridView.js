// Day and week views: an all-day strip on top and a scrolling time grid below.

import {
  DAY, MINUTE, addDays, addMinutes, atMinutes, clamp, floorTo, format, formatTimeRange, isSameDay,
  minutesOfDay, snap, startOfDay, diffCalendarDays,
} from '../../core/date.js';
import { layoutDayRow, layoutTimeGridColumn } from '../../core/layout.js';
import { h } from '../dom.js';
import { startDrag } from '../drag.js';
import { eventContent, eventProps, canMove, canResize, isBackground } from '../content.js';

const isAllDayLike = (e) => e.allDay || e.end - e.start >= DAY;

export class TimeGridView {
  constructor(cal) {
    this.cal = cal;
    this.el = h('div', { class: 'ck-tg' });
    this.scrollEl = h('div', { class: 'ck-tg-scroll', onScroll: () => (this._top = this.scrollEl.scrollTop) });
    this._top = null;
    this.colEls = [];
    this.ghost = null;
  }

  // ------------------------------------------------------------ render

  render() {
    const cal = this.cal;
    const { config, instances, locale, readOnly } = cal;
    const days = cal.range.days;
    const n = days.length;
    const { dayStartHour, dayEndHour, workingHours, workingDays } = config;
    const { hourHeight, allDayLane: ALLDAY_LANE } = cal.metrics;
    this.days = days;
    this.n = n;
    this.rowStart = days[0];
    this.winStartMin = dayStartHour * 60;
    this.winEndMin = dayEndHour * 60;
    const px = (m) => this.px(m);
    const now = cal.now();

    const allDayItems = [];
    const timedItems = [];
    const bgItems = [];
    for (const i of instances) (isBackground(i) ? bgItems : isAllDayLike(i) ? allDayItems : timedItems).push(i);
    const allDay = layoutDayRow(allDayItems, this.rowStart, n);

    // header
    const head = h(
      'div',
      { class: 'ck-tg-head' },
      h('div', { class: 'ck-tg-gutter' }),
      days.map((day) =>
        h(
          'button',
          {
            type: 'button',
            class: `ck-tg-dayhead${isSameDay(day, now) ? ' ck-today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' ck-weekend' : ''}`,
            title: format(day, { dateStyle: 'full' }, locale),
            onClick: () => cal.goToDay(day),
          },
          h('span', { class: 'ck-tg-dow' }, format(day, { weekday: n === 1 ? 'long' : 'short' }, locale)),
          h('span', { class: 'ck-tg-dom' }, day.getDate()),
        ),
      ),
    );

    // all-day strip
    const allDayHeight = Math.max(1, allDay.laneCount) * ALLDAY_LANE + 8;
    this.allDayInner = h(
      'div',
      { class: 'ck-tg-allday-inner', style: { height: allDayHeight } },
      allDay.segments.map((seg) => {
        const inst = seg.item;
        const cls = ['ck-event-bar', seg.continuesBefore && 'ck-cont-before', seg.continuesAfter && 'ck-cont-after'].filter(Boolean).join(' ');
        return h(
          'div',
          eventProps(cal, inst, cls, {
            left: `calc(${(seg.startCol / n) * 100}% + 2px)`,
            width: `calc(${((seg.endCol - seg.startCol + 1) / n) * 100}% - 4px)`,
            top: seg.lane * ALLDAY_LANE + 4,
          }, (e) => this.onAllDayDown(e, inst, 'move')),
          eventContent(cal, inst, 'week', true),
          inst.allDay && !readOnly && canResize(inst) && !seg.continuesAfter && h('span', { class: 'ck-resize ck-resize-x ck-resize-end', onPointerdown: (e) => this.onAllDayDown(e, inst, 'end') }),
        );
      }),
    );
    this.allDayEl = h(
      'div',
      {
        class: 'ck-tg-allday-cells',
        style: { height: Math.min(allDayHeight, 4 * ALLDAY_LANE + 8) },
        onPointerdown: (e) => this.onAllDayBackgroundDown(e),
        onDblclick: (e) => this.onAllDayDoubleClick(e),
      },
      days.map((day, i) => h('div', { class: 'ck-tg-allday-cell', style: { left: `${(i / n) * 100}%`, width: `${100 / n}%` } })),
      this.allDayInner,
    );
    const allDayRow = h('div', { class: 'ck-tg-allday' }, h('div', { class: 'ck-tg-gutter ck-tg-allday-label' }, 'All day'), this.allDayEl);

    // hour labels
    const hours = [];
    for (let hr = dayStartHour + 1; hr < dayEndHour; hr++) {
      hours.push(h('span', { class: 'ck-tg-hour', style: { top: px(hr * 60) } }, format(new Date(2000, 0, 1, hr), { hour: 'numeric' }, locale)));
    }

    // day columns
    const nowMin = minutesOfDay(now);
    this.colEls = days.map((day) => {
      const ws = atMinutes(day, this.winStartMin);
      const we = atMinutes(day, this.winEndMin);
      const segs = layoutTimeGridColumn(timedItems.filter((i) => i.start < we && i.end > ws), ws, we);
      const bgs = bgItems.filter((i) => i.start < we && i.end > ws);
      const offDay = !workingDays.includes(day.getDay());
      const today = isSameDay(day, now);
      return h(
        'div',
        {
          class: `ck-tg-col${offDay ? ' ck-offday' : ''}${today ? ' ck-today' : ''}`,
          onPointerdown: (e) => this.onColumnDown(e),
          onDblclick: (e) => this.onColumnDoubleClick(e),
        },
        !offDay && workingHours && workingHours.start * 60 > this.winStartMin && h('div', { class: 'ck-nonwork', style: { top: 0, height: px(workingHours.start * 60) } }),
        !offDay && workingHours && workingHours.end * 60 < this.winEndMin && h('div', { class: 'ck-nonwork', style: { top: px(workingHours.end * 60), bottom: 0 } }),
        bgs.map((inst) => this.renderBackground(inst, day, ws, we)),
        segs.map((seg) => {
          const inst = seg.item;
          const top = (seg.startMin / 60) * hourHeight;
          const sc = cal.scale || 1;
          const height = Math.max(18 * sc, ((seg.endMin - seg.startMin) / 60) * hourHeight - 2);
          const short = height < 38 * sc;
          return h(
            'div',
            eventProps(cal, inst, `ck-event-timed${short ? ' ck-short' : ''}`, {
              top,
              height,
              left: `calc(${seg.left * 100}% + 1px)`,
              width: `calc(${seg.width * 100}% - ${seg.left + seg.width >= 0.999 ? 6 : 2}px)`,
            }, (e) => this.onTimedDown(e, inst, 'move')),
            eventContent(cal, inst, n === 1 ? 'day' : 'week', short),
            !readOnly && canResize(inst) && !seg.continuesBefore && h('span', { class: 'ck-resize ck-resize-y ck-resize-start', onPointerdown: (e) => this.onTimedDown(e, inst, 'start') }),
            !readOnly && canResize(inst) && !seg.continuesAfter && h('span', { class: 'ck-resize ck-resize-y ck-resize-end', onPointerdown: (e) => this.onTimedDown(e, inst, 'end') }),
          );
        }),
        today && config.nowIndicator !== false && nowMin >= this.winStartMin && nowMin <= this.winEndMin && h('div', { class: 'ck-now', style: { top: px(nowMin) } }),
      );
    });

    const body = h(
      'div',
      { class: 'ck-tg-body', style: { height: ((this.winEndMin - this.winStartMin) / 60) * hourHeight } },
      h('div', { class: 'ck-tg-gutter ck-tg-hours' }, hours),
      h('div', { class: 'ck-tg-cols' }, this.colEls),
    );

    this.ghost = null;
    this.el.style.setProperty('--ck-hour', `${hourHeight}px`);
    this.scrollEl.replaceChildren(body);
    this.el.replaceChildren(head, allDayRow, this.scrollEl);

    // scroll: first time to `scrollToHour`, afterwards keep the user's position
    this.scrollEl.scrollTop = this._top ?? Math.max(0, (config.scrollToHour - dayStartHour) * hourHeight - 8);
    // line the header columns up with the body when a scrollbar takes space
    const sbw = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
    head.style.paddingRight = allDayRow.style.paddingRight = `${sbw > 0 ? sbw : 0}px`;
  }

  /** A background event: a shaded block behind the events; only its label strip takes the pointer. */
  renderBackground(inst, day, ws, we) {
    const cal = this.cal;
    const s = inst.start < ws ? ws : inst.start;
    const en = inst.end > we ? we : inst.end;
    const startMin = (s - startOfDay(day)) / MINUTE;
    const endMin = (en - startOfDay(day)) / MINUTE;
    const top = this.px(startMin);
    const height = Math.max(8, this.px(endMin) - top);
    const props = eventProps(cal, inst, 'ck-event-bg', { top, height }, null);
    delete props.onPointerdown;
    delete props.tabindex;
    return h(
      'div',
      props,
      h(
        'button',
        { type: 'button', class: 'ck-bg-label', onPointerdown: (e) => this.onTimedDown(e, inst, 'move') },
        eventContent(cal, inst, this.n === 1 ? 'day' : 'week', true),
      ),
      !cal.readOnly && canResize(inst) && inst.end <= we && h('span', { class: 'ck-resize ck-resize-y ck-resize-end', onPointerdown: (e) => this.onTimedDown(e, inst, 'end') }),
    );
  }

  px(minutes) {
    return ((minutes - this.winStartMin) / 60) * this.cal.metrics.hourHeight;
  }

  // ------------------------------------------------------------ hit testing

  hitTimed(x, y) {
    const cols = this.colEls;
    let idx = cols.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return x >= r.left && x < r.right;
    });
    if (idx === -1) idx = x < cols[0].getBoundingClientRect().left ? 0 : this.n - 1;
    const r = cols[idx].getBoundingClientRect();
    const minutes = clamp(this.winStartMin + ((y - r.top) / this.cal.metrics.hourHeight) * 60, this.winStartMin, this.winEndMin);
    return { idx, day: this.days[idx], minutes };
  }

  hitAllDay(x) {
    const r = this.allDayEl.getBoundingClientRect();
    return clamp(Math.floor(((x - r.left) / (r.width || 1)) * this.n), 0, this.n - 1);
  }

  // ------------------------------------------------------------ ghosts

  clearGhost() {
    this.ghost?.remove();
    this.ghost = null;
  }

  showTimedGhost(g, inst) {
    this.clearGhost();
    const idx = this.days.findIndex((d) => isSameDay(d, g.start));
    if (idx === -1) return;
    const day = this.days[idx];
    const startMin = Math.max(this.winStartMin, (g.start - startOfDay(day)) / MINUTE);
    const endMin = Math.min(this.winEndMin, (g.end - startOfDay(day)) / MINUTE);
    this.ghost = h(
      'div',
      {
        class: `ck-event ck-event-timed ck-ghost${inst ? '' : ' ck-ghost-create'}`,
        style: {
          top: this.px(startMin),
          height: Math.max(16, this.px(endMin) - this.px(startMin) - 2),
          left: 1,
          width: 'calc(100% - 6px)',
          '--ck-ev': inst ? this.cal.colorOf(inst) : 'var(--ck-accent)',
        },
      },
      h('span', { class: 'ck-ev-title' }, inst?.title || 'New event'),
      h('span', { class: 'ck-ev-time' }, formatTimeRange(g.start, g.end, this.cal.locale)),
    );
    this.colEls[idx].appendChild(this.ghost);
  }

  showAllDayGhost(g, inst) {
    this.clearGhost();
    const seg = layoutDayRow([{ start: g.start, end: g.end }], this.rowStart, this.n).segments[0];
    if (!seg) return;
    this.ghost = h(
      'div',
      {
        class: 'ck-event ck-event-bar ck-ghost',
        style: {
          left: `calc(${(seg.startCol / this.n) * 100}% + 2px)`,
          width: `calc(${((seg.endCol - seg.startCol + 1) / this.n) * 100}% - 4px)`,
          top: 4,
          '--ck-ev': inst ? this.cal.colorOf(inst) : 'var(--ck-accent)',
        },
      },
      h('span', { class: 'ck-ev-title' }, inst?.title || 'New event'),
    );
    this.allDayInner.appendChild(this.ghost);
  }

  // ------------------------------------------------------------ timed events: move / resize

  onTimedDown(e, inst, mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const cal = this.cal;
    const srcEl = e.currentTarget.closest('.ck-event');
    cal.hideTooltip();
    cal.setSelected(inst.instanceId);
    const { snapMinutes } = cal.config;
    const h0 = this.hitTimed(e.clientX, e.clientY);
    const grab = (atMinutes(h0.day, h0.minutes) - inst.start) / MINUTE;
    const dur = (inst.end - inst.start) / MINUTE;
    const allowed = !cal.readOnly && (mode === 'move' ? canMove(inst) : canResize(inst));
    let preview = null;
    startDrag(e, {
      scrollEl: this.scrollEl,
      onStart: () => allowed && srcEl.classList.add('ck-is-dragging'),
      onMove: (ev) => {
        if (!allowed) return;
        const hh = this.hitTimed(ev.clientX, ev.clientY);
        let { start, end } = inst;
        if (mode === 'move') {
          start = atMinutes(hh.day, snap(hh.minutes - grab, snapMinutes));
          end = addMinutes(start, dur);
        } else if (mode === 'end') {
          end = atMinutes(hh.day, snap(hh.minutes, snapMinutes));
          if (end < addMinutes(start, snapMinutes)) end = addMinutes(start, snapMinutes);
        } else {
          start = atMinutes(hh.day, snap(hh.minutes, snapMinutes));
          if (start > addMinutes(end, -snapMinutes)) start = addMinutes(end, -snapMinutes);
        }
        preview = { start, end };
        this.showTimedGhost(preview, inst);
      },
      onEnd: async (ev, moved) => {
        this.clearGhost();
        srcEl.classList.remove('ck-is-dragging');
        if (!moved) return cal.eventClick(inst, ev);
        if (preview && (+preview.start !== +inst.start || +preview.end !== +inst.end)) {
          await cal.commitChange({ type: mode === 'move' ? 'move' : 'resize', instance: inst, changes: { start: preview.start, end: preview.end } });
        }
      },
      onCancel: () => {
        this.clearGhost();
        srcEl.classList.remove('ck-is-dragging');
      },
    });
  }

  // ------------------------------------------------------------ timed: drag across empty time to create

  onColumnDown(e) {
    const cal = this.cal;
    if (e.button !== 0 || e.target.closest('.ck-event:not(.ck-event-bg), .ck-bg-label, .ck-resize')) return;
    const { snapMinutes } = cal.config;
    const h0 = this.hitTimed(e.clientX, e.clientY);
    // a plain click inside a background event opens it; elsewhere it is a dateClick
    const click = (ev) => {
      const at = atMinutes(h0.day, h0.minutes);
      const bg = cal.instances.find((i) => isBackground(i) && i.start <= at && i.end > at);
      if (bg) cal.eventClick(bg, ev);
      else cal.dateClick({ date: atMinutes(h0.day, floorTo(h0.minutes, snapMinutes)), allDay: false }, ev);
    };
    if (cal.readOnly || e.pointerType === 'touch') {
      const up = (ev) => {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) click(ev);
      };
      window.addEventListener('pointerup', up, { once: true });
      return;
    }
    const anchor = floorTo(h0.minutes, snapMinutes);
    let sel = null;
    startDrag(e, {
      scrollEl: this.scrollEl,
      onMove: (ev) => {
        const cur = snap(this.hitTimed(ev.clientX, ev.clientY).minutes, snapMinutes);
        sel = { start: atMinutes(h0.day, Math.min(anchor, cur)), end: atMinutes(h0.day, Math.max(anchor + snapMinutes, cur)) };
        this.showTimedGhost(sel, null);
      },
      onEnd: (ev, moved) => {
        this.clearGhost();
        if (moved && sel) cal.select({ start: sel.start, end: sel.end, allDay: false }, ev, 'drag');
        else if (!moved) click(ev);
      },
      onCancel: () => this.clearGhost(),
    });
  }

  onColumnDoubleClick(e) {
    const cal = this.cal;
    if (cal.readOnly || e.target.closest('.ck-event:not(.ck-event-bg), .ck-bg-label')) return;
    const hh = this.hitTimed(e.clientX, e.clientY);
    const s = floorTo(hh.minutes, 30);
    cal.select({ start: atMinutes(hh.day, s), end: atMinutes(hh.day, s + cal.config.defaultEventDuration), allDay: false }, e, 'dblclick');
  }

  // ------------------------------------------------------------ all-day strip

  onAllDayDown(e, inst, mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const cal = this.cal;
    const srcEl = e.currentTarget.closest('.ck-event');
    cal.hideTooltip();
    cal.setSelected(inst.instanceId);
    const grabIdx = this.hitAllDay(e.clientX);
    const allowed = !cal.readOnly && (mode === 'move' ? canMove(inst) : canResize(inst));
    let preview = null;
    startDrag(e, {
      onStart: () => allowed && srcEl.classList.add('ck-is-dragging'),
      onMove: (ev) => {
        if (!allowed) return;
        const idx = this.hitAllDay(ev.clientX);
        let { start, end } = inst;
        if (mode === 'move') {
          start = addDays(inst.start, idx - grabIdx);
          end = addDays(inst.end, idx - grabIdx);
        } else if (inst.allDay) {
          const startIdx = diffCalendarDays(inst.start, this.rowStart);
          end = addDays(this.rowStart, Math.max(idx, startIdx) + 1);
        }
        preview = { start, end };
        this.showAllDayGhost(preview, inst);
      },
      onEnd: async (ev, moved) => {
        this.clearGhost();
        srcEl.classList.remove('ck-is-dragging');
        if (!moved) return cal.eventClick(inst, ev);
        if (preview && (+preview.start !== +inst.start || +preview.end !== +inst.end)) {
          await cal.commitChange({ type: mode === 'move' ? 'move' : 'resize', instance: inst, changes: { start: preview.start, end: preview.end } });
        }
      },
      onCancel: () => {
        this.clearGhost();
        srcEl.classList.remove('ck-is-dragging');
      },
    });
  }

  onAllDayBackgroundDown(e) {
    const cal = this.cal;
    if (e.button !== 0 || cal.readOnly || e.target.closest('.ck-event')) return;
    const a = this.hitAllDay(e.clientX);
    let sel = null;
    startDrag(e, {
      onMove: (ev) => {
        const b = this.hitAllDay(ev.clientX);
        sel = { start: addDays(this.rowStart, Math.min(a, b)), end: addDays(this.rowStart, Math.max(a, b) + 1) };
        this.showAllDayGhost(sel, null);
      },
      onEnd: (ev, moved) => {
        this.clearGhost();
        if (moved && sel) cal.select({ start: sel.start, end: sel.end, allDay: true }, ev, 'drag');
        else if (!moved) cal.dateClick({ date: addDays(this.rowStart, a), allDay: true }, ev);
      },
      onCancel: () => this.clearGhost(),
    });
  }

  onAllDayDoubleClick(e) {
    const cal = this.cal;
    if (cal.readOnly || e.target.closest('.ck-event')) return;
    const idx = this.hitAllDay(e.clientX);
    cal.select({ start: addDays(this.rowStart, idx), end: addDays(this.rowStart, idx + 1), allDay: true }, e, 'dblclick');
  }

  destroy() {
    this.el.remove();
  }
}

export const weekDays = (date, weekStartsOn, count = 7) => {
  const s = startOfDay(date);
  const first = count === 1 ? s : addDays(s, -((s.getDay() - weekStartsOn + 7) % 7));
  return Array.from({ length: count }, (_, i) => addDays(first, i));
};
