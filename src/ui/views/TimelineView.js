// Resource timeline (scheduler): resources as rows, time on the x-axis.
// Only the rows in view are in the DOM, so thousands of resources stay fast.

import { HOUR, MINUTE, addDays, clamp, format, formatTimeRange, isSameDay, snap, floorTo } from '../../core/date.js';
import { findRowIndex, layoutLanes } from '../../core/layout.js';
import { h, raf } from '../dom.js';
import { startDrag } from '../drag.js';
import { eventContent, eventProps, resolveColor, canMove, canResize, canReassign, isBackground, backgroundResources } from '../content.js';

const OVERSCAN = 300;
const UNASSIGNED = '__unassigned__';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export class TimelineView {
  constructor(cal) {
    this.cal = cal;
    this.innerEl = h('div', { class: 'ck-tl-inner' });
    this.scrollEl = h('div', { class: 'ck-tl-scroll', onScroll: () => this.onScroll() }, this.innerEl);
    this.el = h('div', { class: 'ck-tl' }, this.scrollEl);
    this.rows = [];
    this.ghost = null;
    this._scrolledFor = null;
    this._zoom = null;
    this._window = null;
    this._rafId = 0;
    this._pos = null; // last scroll position, kept while the view is switched out
  }

  get pxPerHour() {
    return this.cal.zoom * (this.cal.scale || 1);
  }

  xOf(d) {
    return ((d - this.rangeStart) / HOUR) * this.pxPerHour;
  }

  timeAt(x) {
    return new Date(this.rangeStart.getTime() + (x / this.pxPerHour) * HOUR);
  }

  snapTime(d) {
    return new Date(this.rangeStart.getTime() + snap((d - this.rangeStart) / MINUTE, this.cal.config.snapMinutes) * MINUTE);
  }

  // ------------------------------------------------------------ render

  render() {
    const cal = this.cal;
    const { config, instances, locale } = cal;
    const { workingHours, workingDays, timelineDays: days } = config;
    const { rowHeight, laneHeight, resourceColumnWidth: RES_W } = cal.metrics;
    this.rangeStart = cal.range.start;
    this.rangeEnd = cal.range.end;
    this.days = days;
    const pxh = this.pxPerHour;
    const totalW = days * 24 * pxh;
    this.totalW = totalW;
    const now = cal.now();

    // rows: one per visible resource (+ "Unassigned" when needed)
    const byRes = new Map();
    const bgs = [];
    for (const inst of instances) {
      if (isBackground(inst)) {
        bgs.push(inst);
        continue;
      }
      const key = inst.resourceId == null ? UNASSIGNED : inst.resourceId;
      if (!byRes.has(key)) byRes.set(key, []);
      byRes.get(key).push(inst);
    }
    const rowsBg = (id) => bgs.filter((b) => {
      const ids = backgroundResources(b);
      return !ids || ids.includes(id);
    });
    const rows = cal.visibleResources.map((r) => ({ key: r.id, resource: r, items: byRes.get(r.id) || [], bg: rowsBg(r.id) }));
    if (byRes.has(UNASSIGNED) && config.showUnassigned) rows.unshift({ key: UNASSIGNED, resource: null, items: byRes.get(UNASSIGNED), bg: [] });
    let top = 0;
    for (const row of rows) {
      const { placed, laneCount } = layoutLanes(row.items);
      row.placed = placed;
      row.height = Math.max(rowHeight, laneCount * laneHeight + 8);
      row.top = top;
      top += row.height;
    }
    this.rows = rows;
    this.offsets = rows.map((r) => r.top);
    const totalH = top;

    // time scale
    const step = [1, 2, 3, 6, 12, 24].find((s) => s * pxh >= 48) || 24;
    const dayList = Array.from({ length: days }, (_, i) => addDays(this.rangeStart, i));
    const ticks = [];
    if (step < 24) for (let hr = 0; hr < days * 24; hr += step) ticks.push(hr);

    const header = h(
      'div',
      { class: 'ck-tl-header' },
      h('div', { class: 'ck-tl-corner' }, config.resourceLabel),
      h(
        'div',
        { class: 'ck-tl-scale', style: { width: totalW } },
        h(
          'div',
          { class: 'ck-tl-days' },
          dayList.map((d) =>
            h(
              'button',
              { type: 'button', class: `ck-tl-day${isSameDay(d, now) ? ' ck-today' : ''}`, style: { width: 24 * pxh }, onClick: () => cal.goToDay(d) },
              h('span', { class: 'ck-tl-day-label' }, format(d, { weekday: 'short', day: 'numeric', month: pxh < 12 ? undefined : 'short' }, locale)),
            ),
          ),
        ),
        ticks.length > 0 &&
          h(
            'div',
            { class: 'ck-tl-hours' },
            ticks.map((hr) => h('span', { class: 'ck-tl-hour', style: { left: hr * pxh, width: step * pxh } }, format(new Date(2000, 0, 1, hr % 24), { hour: 'numeric' }, locale))),
          ),
      ),
    );

    // background: non-working time + now line
    const bg = h(
      'div',
      { class: 'ck-tl-bg', style: { left: RES_W, width: totalW } },
      dayList.map((d, i) => {
        const left = i * 24 * pxh;
        if (!workingDays.includes(d.getDay())) return h('div', { class: 'ck-nonwork ck-nonwork-day', style: { left, width: 24 * pxh } });
        if (!workingHours) return null;
        return [
          h('div', { class: 'ck-nonwork', style: { left, width: workingHours.start * pxh } }),
          h('div', { class: 'ck-nonwork', style: { left: left + workingHours.end * pxh, width: (24 - workingHours.end) * pxh } }),
        ];
      }),
      config.nowIndicator !== false && now >= this.rangeStart && now < this.rangeEnd && h('div', { class: 'ck-now ck-now-v', style: { left: this.xOf(now) } }),
    );

    this.rowsLayer = h('div', { class: 'ck-tl-rows' });
    this.bodyEl = h(
      'div',
      {
        class: 'ck-tl-body',
        style: { height: Math.max(totalH, 1), '--ck-tick': `${step * pxh}px`, '--ck-day': `${24 * pxh}px` },
        onPointerdown: (e) => this.onLaneDown(e),
        onDblclick: (e) => this.onLaneDoubleClick(e),
      },
      bg,
      this.rowsLayer,
      rows.length === 0 && h('div', { class: 'ck-empty' }, 'No people to show. Add someone, or turn people back on in the filter.'),
    );

    this.ghost = null;
    this.el.style.setProperty('--ck-res-w', `${RES_W}px`);
    this.innerEl.style.width = `${RES_W + totalW}px`;

    // keep the centre of the viewport in place when zooming
    const el = this.scrollEl;
    // a view taken out of the page loses its scroll position, so use the remembered one
    let scrollLeft = this._pos ? this._pos.left : el.scrollLeft;
    const scrollTop = this._pos ? this._pos.top : el.scrollTop;
    if (this._zoom && this._zoom !== pxh) {
      const visibleW = el.clientWidth - RES_W;
      scrollLeft = Math.max(0, ((scrollLeft + visibleW / 2) / this._zoom) * pxh - visibleW / 2);
    }
    this._zoom = pxh;

    this.innerEl.replaceChildren(header, this.bodyEl);
    el.scrollTop = scrollTop;
    el.scrollLeft = scrollLeft;

    // first time this range is shown: scroll to the start of working hours today (or day one)
    if (this._scrolledFor !== +this.rangeStart) {
      this._scrolledFor = +this.rangeStart;
      const focusDay = now >= this.rangeStart && now < this.rangeEnd ? now : this.rangeStart;
      const target = new Date(focusDay.getFullYear(), focusDay.getMonth(), focusDay.getDate(), workingHours?.start ?? 8);
      el.scrollLeft = Math.max(0, this.xOf(target) - 24);
    }
    this._pos = { left: el.scrollLeft, top: el.scrollTop };
    this._window = null;
    this.renderRows();
  }

  onScroll() {
    if (this.el.isConnected) this._pos = { left: this.scrollEl.scrollLeft, top: this.scrollEl.scrollTop };
    if (this._rafId) return;
    this._rafId = raf(() => {
      this._rafId = 0;
      this.renderRows();
    });
  }

  /** Render only the rows inside the scroll viewport (plus some overscan). */
  renderRows() {
    const cal = this.cal;
    const { rows, offsets } = this;
    const el = this.scrollEl;
    const viewTop = el.scrollTop;
    const viewH = el.clientHeight || 800;
    const left = el.scrollLeft;
    const first = Math.max(0, findRowIndex(offsets, viewTop - OVERSCAN));
    const last = Math.max(first, findRowIndex(offsets, viewTop + viewH + OVERSCAN));
    const key = `${first}:${last}:${Math.round(left)}`;
    if (this._window === key) return;
    this._window = key;

    const { laneHeight, resourceColumnWidth: RES_W } = cal.metrics;
    const rangeStart = this.rangeStart;
    const rangeEnd = this.rangeEnd;
    const out = [];
    for (let i = first; i <= last && i < rows.length; i++) {
      const row = rows[i];
      const r = row.resource;
      const resCell = h(
        'div',
        { class: 'ck-tl-res', style: { '--ck-res': resolveColor(r?.color) || 'var(--ck-muted)' } },
        r
          ? [
              h('span', { class: 'ck-avatar', 'aria-hidden': 'true' }, r.avatar ? h('img', { src: r.avatar, alt: '' }) : initials(r.name)),
              h('span', { class: 'ck-tl-res-text' }, h('span', { class: 'ck-tl-res-name' }, r.name), r.role && h('span', { class: 'ck-tl-res-role' }, r.role)),
              h('span', { class: 'ck-tl-res-count', title: `${row.items.length} this period` }, row.items.length || ''),
            ]
          : h('span', { class: 'ck-tl-res-text' }, h('span', { class: 'ck-tl-res-name' }, 'Unassigned'), h('span', { class: 'ck-tl-res-role' }, 'Drag onto a person to assign')),
      );
      const events = row.placed.map(({ item: inst, lane }) => {
        const s = inst.start < rangeStart ? rangeStart : inst.start;
        const en = inst.end > rangeEnd ? rangeEnd : inst.end;
        const x = this.xOf(s);
        const width = Math.max(6, this.xOf(en) - x - 2);
        // keep the label readable when the event starts left of the visible area
        const shift = Math.max(0, Math.min(left - x, width - 60));
        const cls = ['ck-event-tl', width < 56 && 'ck-narrow', inst.start < rangeStart && 'ck-cont-before', inst.end > rangeEnd && 'ck-cont-after'].filter(Boolean).join(' ');
        return h(
          'div',
          eventProps(cal, inst, cls, {
            left: RES_W + x + 1,
            width,
            top: 4 + lane * laneHeight,
            height: laneHeight - 4,
            paddingLeft: shift ? shift + 10 : null,
          }, (e) => this.onEventDown(e, inst, 'move')),
          eventContent(cal, inst, 'timeline', laneHeight < 40 * (cal.scale || 1)),
          !cal.readOnly && canResize(inst) && inst.start >= rangeStart && h('span', { class: 'ck-resize ck-resize-x ck-resize-start', onPointerdown: (e) => this.onEventDown(e, inst, 'start') }),
          !cal.readOnly && canResize(inst) && inst.end <= rangeEnd && h('span', { class: 'ck-resize ck-resize-x ck-resize-end', onPointerdown: (e) => this.onEventDown(e, inst, 'end') }),
        );
      });
      const bgEls = (row.bg || []).map((inst) => {
        const s = inst.start < rangeStart ? rangeStart : inst.start;
        const en = inst.end > rangeEnd ? rangeEnd : inst.end;
        const x = this.xOf(s);
        const props = eventProps(cal, inst, 'ck-event-bg ck-event-bg-tl', { left: RES_W + x, width: Math.max(4, this.xOf(en) - x), top: 0, bottom: 0 }, null);
        delete props.onPointerdown;
        delete props.tabindex;
        return h(
          'div',
          props,
          h('button', { type: 'button', class: 'ck-bg-label', onPointerdown: (e) => this.onEventDown(e, inst, 'move') }, eventContent(cal, inst, 'timeline', true)),
          !cal.readOnly && canResize(inst) && inst.end <= rangeEnd && h('span', { class: 'ck-resize ck-resize-x ck-resize-end', onPointerdown: (e) => this.onEventDown(e, inst, 'end') }),
        );
      });
      out.push(
        h('div', { class: `ck-tl-row${row.key === UNASSIGNED ? ' ck-tl-unassigned' : ''}`, style: { top: row.top, height: row.height }, dataset: { row: String(i) } }, resCell, bgEls, events),
      );
    }
    this.rowsLayer.replaceChildren(...out);
  }

  // ------------------------------------------------------------ hit testing & ghost

  hit(x, y) {
    const r = this.bodyEl.getBoundingClientRect();
    const RES_W = this.cal.metrics.resourceColumnWidth;
    const xx = clamp(x - r.left - RES_W, 0, this.totalW);
    const idx = clamp(findRowIndex(this.offsets, y - r.top), 0, Math.max(0, this.rows.length - 1));
    return { time: this.timeAt(xx), rowIdx: idx, row: this.rows[idx] };
  }

  resourceIdOf(row) {
    return row?.resource ? row.resource.id : null;
  }

  clearGhost() {
    this.ghost?.remove();
    this.ghost = null;
  }

  showGhost(g, inst) {
    this.clearGhost();
    const row = this.rows[g.rowIdx];
    if (!row) return;
    const { laneHeight, resourceColumnWidth: RES_W } = this.cal.metrics;
    this.ghost = h(
      'div',
      {
        class: `ck-event ck-event-tl ck-ghost${inst ? '' : ' ck-ghost-create'}`,
        style: {
          left: RES_W + this.xOf(g.start) + 1,
          width: Math.max(6, this.xOf(g.end) - this.xOf(g.start) - 2),
          top: row.top + 4,
          height: laneHeight - 4,
          '--ck-ev': inst ? this.cal.colorOf({ ...inst, resourceId: g.resourceId }) : 'var(--ck-accent)',
        },
      },
      h('span', { class: 'ck-ev-title' }, inst?.title || 'New event'),
      h('span', { class: 'ck-ev-time' }, formatTimeRange(g.start, g.end, this.cal.locale)),
    );
    this.bodyEl.appendChild(this.ghost);
  }

  // ------------------------------------------------------------ interactions

  onEventDown(e, inst, mode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const cal = this.cal;
    const srcEl = e.currentTarget.closest('.ck-event');
    cal.hideTooltip();
    cal.setSelected(inst.instanceId);
    const { snapMinutes } = cal.config;
    const h0 = this.hit(e.clientX, e.clientY);
    const grab = h0.time - inst.start;
    const dur = inst.end - inst.start;
    const homeRow = Math.max(0, isBackground(inst) ? h0.rowIdx : this.rows.findIndex((r) => r.key === (inst.resourceId ?? UNASSIGNED)));
    const allowed = !cal.readOnly && (mode === 'move' ? canMove(inst) || canReassign(inst) : canResize(inst));
    // background events shade several rows: they never change resource by dragging
    const reassign = canReassign(inst) && !isBackground(inst);
    let preview = null;
    // the source element can be re-created by row virtualization while dragging
    const setDragging = (on) => {
      for (const el of this.rowsLayer.querySelectorAll('.ck-event')) if (el.dataset.instance === inst.instanceId) el.classList.toggle('ck-is-dragging', on);
      srcEl.classList.toggle('ck-is-dragging', on);
    };
    startDrag(e, {
      scrollEl: this.scrollEl,
      onStart: () => allowed && setDragging(true),
      onMove: (ev) => {
        if (!allowed) return;
        const hh = this.hit(ev.clientX, ev.clientY);
        let { start, end } = inst;
        let rowIdx = homeRow;
        let resourceId = inst.resourceId;
        if (mode === 'move') {
          if (canMove(inst)) {
            start = this.snapTime(new Date(hh.time - grab));
            end = new Date(start.getTime() + dur);
          }
          if (reassign) {
            rowIdx = hh.rowIdx;
            resourceId = this.resourceIdOf(hh.row);
          }
        } else if (mode === 'end') {
          end = this.snapTime(hh.time);
          if (end - start < snapMinutes * MINUTE) end = new Date(start.getTime() + snapMinutes * MINUTE);
        } else {
          start = this.snapTime(hh.time);
          if (end - start < snapMinutes * MINUTE) start = new Date(end.getTime() - snapMinutes * MINUTE);
        }
        preview = { start, end, rowIdx, resourceId };
        this.showGhost(preview, inst);
        setDragging(true);
      },
      onEnd: async (ev, moved) => {
        this.clearGhost();
        setDragging(false);
        if (!moved) return cal.eventClick(inst, ev);
        if (!preview) return;
        const changed = +preview.start !== +inst.start || +preview.end !== +inst.end || preview.resourceId !== inst.resourceId;
        if (!changed) return;
        const changes = { start: preview.start, end: preview.end };
        if (preview.resourceId !== inst.resourceId) changes.resourceId = preview.resourceId;
        await cal.commitChange({ type: mode === 'move' ? 'move' : 'resize', instance: inst, changes });
      },
      onCancel: () => {
        this.clearGhost();
        setDragging(false);
      },
    });
  }

  onLaneDown(e) {
    const cal = this.cal;
    if (e.button !== 0 || e.target.closest('.ck-event:not(.ck-event-bg), .ck-bg-label, .ck-resize, .ck-tl-res') || !this.rows.length) return;
    const { snapMinutes } = cal.config;
    const h0 = this.hit(e.clientX, e.clientY);
    const clickInfo = () => ({ date: new Date(this.rangeStart.getTime() + floorTo((h0.time - this.rangeStart) / MINUTE, snapMinutes) * MINUTE), allDay: false, resourceId: this.resourceIdOf(h0.row) });
    // a plain click inside a background event on this row opens it; elsewhere it is a dateClick
    const click = (ev) => {
      const bg = (h0.row?.bg || []).find((i) => i.start <= h0.time && i.end > h0.time);
      if (bg) cal.eventClick(bg, ev);
      else cal.dateClick(clickInfo(), ev);
    };
    if (cal.readOnly || e.pointerType === 'touch') {
      const up = (ev) => {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) click(ev);
      };
      window.addEventListener('pointerup', up, { once: true });
      return;
    }
    const anchor = new Date(this.rangeStart.getTime() + floorTo((h0.time - this.rangeStart) / MINUTE, snapMinutes) * MINUTE);
    let sel = null;
    startDrag(e, {
      scrollEl: this.scrollEl,
      onMove: (ev) => {
        const t = this.snapTime(this.hit(ev.clientX, ev.clientY).time);
        const start = t < anchor ? t : anchor;
        let end = t < anchor ? new Date(anchor.getTime() + snapMinutes * MINUTE) : t;
        if (end <= start) end = new Date(start.getTime() + snapMinutes * MINUTE);
        sel = { start, end, rowIdx: h0.rowIdx, resourceId: this.resourceIdOf(h0.row) };
        this.showGhost(sel, null);
      },
      onEnd: (ev, moved) => {
        this.clearGhost();
        if (moved && sel) cal.select({ start: sel.start, end: sel.end, allDay: false, resourceId: sel.resourceId }, ev, 'drag');
        else if (!moved) click(ev);
      },
      onCancel: () => this.clearGhost(),
    });
  }

  onLaneDoubleClick(e) {
    const cal = this.cal;
    if (cal.readOnly || e.target.closest('.ck-event:not(.ck-event-bg), .ck-bg-label, .ck-tl-res') || !this.rows.length) return;
    const hh = this.hit(e.clientX, e.clientY);
    const start = new Date(this.rangeStart.getTime() + floorTo((hh.time - this.rangeStart) / MINUTE, 30) * MINUTE);
    cal.select({ start, end: new Date(start.getTime() + cal.config.defaultEventDuration * MINUTE), allDay: false, resourceId: this.resourceIdOf(hh.row) }, e, 'dblclick');
  }

  destroy() {
    this.el.remove();
  }
}
