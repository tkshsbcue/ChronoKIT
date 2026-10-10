// Calendar: the main widget. Plain JavaScript, no framework.
//
//   import { Calendar } from './chronokit/src/index.js';
//   const calendar = new Calendar({ appendTo: '#schedule', crudManager: { loadUrl, syncUrl } });
//
// Day, week, month and resource-timeline views over one shared Project, with
// drag/resize/create, an event editor, recurring-edit scopes, undo/redo, a
// resource filter and optional backend sync.

import { Emitter } from '../core/emitter.js';
import { Project } from '../core/project.js';
import { CrudManager } from '../core/crud.js';
import { addDays, addMonths, clamp, format, startOfDay, startOfWeek, toDate } from '../core/date.js';
import { h, keepFocus, raf, cancelRaf, fromHTML } from './dom.js';
import { buildToolbar } from './Toolbar.js';
import { buildSidebar } from './Sidebar.js';
import { EventEditor, askScope } from './EventEditor.js';
import { tooltipContent, resolveColor, EVENT_COLORS, canMove, canResize, canReassign } from './content.js';
import { TimeGridView, weekDays } from './views/TimeGridView.js';
import { MonthView, monthGrid } from './views/MonthView.js';
import { TimelineView } from './views/TimelineView.js';
import { ListView, listRange } from './views/ListView.js';

const VIEW_TYPES = ['day', 'week', 'month', 'timeline', 'list'];
const DEFAULT_VIEWS = ['day', 'week', 'month', 'timeline'];
const FALLBACK_COLOR = EVENT_COLORS.cobalt;

/** Default configuration. Every key can be passed to `new Calendar({...})` or `setConfig()`. */
export const DEFAULTS = {
  view: 'week',
  views: DEFAULT_VIEWS,
  height: 720,
  readOnly: false,
  locale: undefined,
  weekStartsOn: 1,
  hourHeight: 48,
  snapMinutes: 15,
  dayStartHour: 0,
  dayEndHour: 24,
  scrollToHour: 8,
  workingHours: { start: 9, end: 18 },
  workingDays: [1, 2, 3, 4, 5],
  defaultEventDuration: 60,
  timelineDays: 7,
  timelineHourWidth: 60,
  rowHeight: 52,
  laneHeight: 40,
  resourceColumnWidth: 220,
  resourceLabel: 'People',
  showSidebar: true,
  showUnassigned: true,
  showResourceInEvents: true,
  editorFields: [],
  eventRenderer: null,
  theme: 'light',
  toolbarItems: null,
  sidebarItems: null,
  cls: '',
  // 0.2
  editor: true,
  showToolbar: true,
  tooltip: true,
  nowIndicator: true,
  now: null,
  eventSource: null,
  listRange: 'week',
  listShowEmpty: false,
  listEmptyText: 'Nothing scheduled',
  viewLabels: null,
  scale: 1,
  resourceFilterCollapsed: false,
  editorSections: null,
  editorLabels: null,
  editorActions: null,
  editorReadOnly: false,
  assigneeLabel: null,
};

export { canMove, canResize, canReassign } from './content.js';

function formatRange(a, b, locale) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, opts).formatRange(a, b);
  } catch {
    return `${format(a, opts, locale)} – ${format(b, opts, locale)}`;
  }
}

export class Calendar extends Emitter {
  /**
   * @param {object} config See DEFAULTS and the README for every option.
   * @param {HTMLElement|string} config.appendTo element or CSS selector to render into
   * @param {Project|{events?: object[], resources?: object[]}} [config.project]
   * @param {CrudManager|object} [config.crudManager] an instance, or options for one
   *        ({ loadUrl, syncUrl, headers, transport, autoLoad = true, autoSync = true })
   * @param {Date|string} [config.date] date to show first (default today)
   * @param {Record<string, Function>} [config.listeners] e.g. { beforeEventChange(change) {}, eventClick(e) {} }
   */
  constructor(config = {}) {
    super();
    const { appendTo, project, crudManager, listeners, date, ...rest } = config;
    this.config = { ...DEFAULTS, ...rest };

    this.project = project instanceof Project ? project : new Project(project || {});
    this._ownsCrud = false;
    if (crudManager instanceof CrudManager) this.crudManager = crudManager;
    else if (crudManager) {
      const { autoLoad = true, autoSync = true, ...crudConfig } = crudManager;
      this.crudManager = new CrudManager(this.project, { autoSync, ...crudConfig });
      this._ownsCrud = true;
      if (autoLoad) this.crudManager.load().catch(() => {});
    } else this.crudManager = null;

    for (const [name, fn] of Object.entries(listeners || {})) this.on(name, fn);

    this._view = VIEW_TYPES.includes(this.config.view) ? this.config.view : 'week';
    // toDate() reads 'YYYY-MM-DD' as local midnight (new Date() would read it as UTC)
    this._date = startOfDay((date && toDate(date)) || this.now());
    this.hiddenResources = new Set();
    this.sidebarOpen = true;
    this.filterCollapsed = !!this.config.resourceFilterCollapsed;
    this.zoom = this.config.timelineHourWidth;
    this.selectedId = null;
    this._views = {};
    this._editor = null;
    this._modal = 0;
    this._tipTimer = 0;
    this._rafId = 0;
    this._cacheKey = null;
    this._rangeKey = null;
    this._loadSeq = 0;
    this.loading = false;

    // DOM skeleton
    this.toolbarEl = h('div', { class: 'ck-toolbar' });
    this.sidebarEl = h('aside', { class: 'ck-sidebar' });
    this.viewEl = h('div', { class: 'ck-view' });
    this.tooltipEl = h('div', { class: 'ck-tooltip', role: 'tooltip', hidden: true });
    this.el = h(
      'div',
      {
        class: 'ck-root',
        tabindex: '-1',
        onKeydown: (e) => this._onKeyDown(e),
        onPointerdown: (e) => {
          this.hideTooltip();
          if (!e.target.closest('.ck-event, .ck-overlay')) this.setSelected(null);
        },
      },
      this.toolbarEl,
      h('div', { class: 'ck-main' }, this.sidebarEl, this.viewEl),
      this.tooltipEl,
    );
    // h() sets `hidden` as an attribute only for true values; make it explicit
    this.tooltipEl.hidden = true;

    this._offProject = this.project.on('change', () => this.refresh());
    this._offCrud = this.crudManager ? this.crudManager.on('status', () => this.refresh()) : null;
    this._clock = setInterval(() => this.refresh(), 60000);
    if (typeof ResizeObserver !== 'undefined') {
      let last = '';
      this._ro = new ResizeObserver(() => {
        const size = `${this.el.clientWidth}x${this.el.clientHeight}`;
        if (size !== last) {
          last = size;
          this.refresh();
        }
      });
      this._ro.observe(this.el);
    }

    if (appendTo) this.mount(appendTo);
  }

  // ------------------------------------------------------------ mounting

  /** Render into an element (or CSS selector). Called automatically when `appendTo` is given. */
  mount(target) {
    const parent = typeof target === 'string' ? document.querySelector(target) : target;
    if (!parent) throw new Error(`ChronoKit: element ${target} not found`);
    parent.appendChild(this.el);
    this.renderNow();
    return this;
  }

  destroy() {
    cancelRaf(this._rafId);
    clearInterval(this._clock);
    clearTimeout(this._tipTimer);
    this._ro?.disconnect();
    this._offProject?.();
    this._offCrud?.();
    if (this._ownsCrud) this.crudManager.destroy();
    this._editor?.destroy();
    this.el.remove();
    this.emit('destroy');
    this._listeners.clear();
  }

  // ------------------------------------------------------------ public API

  get view() {
    return this._view;
  }

  get date() {
    return this._date;
  }

  get readOnly() {
    return this.config.readOnly;
  }

  get locale() {
    return this.config.locale;
  }

  setView(view) {
    if (!VIEW_TYPES.includes(view) || view === this._view) return this;
    this._view = view;
    this.emit('viewChange', { view, calendar: this });
    return this.renderNow();
  }

  setDate(date) {
    const parsed = toDate(date);
    if (!parsed) return this;
    const d = startOfDay(parsed);
    if (+d === +this._date) return this;
    this._date = d;
    this.emit('dateChange', { date: d, calendar: this });
    return this.renderNow();
  }

  /** Move one period back / forward (day, week, month or timeline range). */
  shift(dir) {
    return this.setDate(this._shiftedDate(dir));
  }

  /** The date one period back / forward, without moving there. */
  _shiftedDate(dir, view = this.view, date = this.date) {
    if (view === 'day') return addDays(date, dir);
    if (view === 'month') return addMonths(date, dir);
    if (view === 'timeline') return addDays(date, dir * this.config.timelineDays);
    if (view === 'list') {
      const r = this.config.listRange;
      if (r === 'day') return addDays(date, dir);
      if (r === 'month') return addMonths(date, dir);
    }
    return addDays(date, dir * 7);
  }

  /** The range a view shows for a date: { start, end }. */
  rangeFor(date = this.date, view = this.view) {
    const r = this._computeRange(view, startOfDay(toDate(date)));
    return { start: r.start, end: r.end, view };
  }

  /** The ranges Previous and Next would show, e.g. to fetch them ahead. */
  adjacentRanges() {
    return [this.rangeFor(this._shiftedDate(-1)), this.rangeFor(this._shiftedDate(1))];
  }

  next() {
    return this.shift(1);
  }

  prev() {
    return this.shift(-1);
  }

  today() {
    return this.setDate(this.now());
  }

  /** The current time as the calendar sees it (`config.now()`, e.g. a clinic's wall clock). */
  now() {
    return (typeof this.config.now === 'function' && toDate(this.config.now())) || new Date();
  }

  /** Open the day view for a date (falls back to just moving the date). */
  goToDay(day) {
    this.setDate(day);
    if (this.config.views.includes('day')) this.setView('day');
    return this;
  }

  /** Change any option at runtime, e.g. setConfig({ theme: 'dark', readOnly: true }). */
  setConfig(patch) {
    Object.assign(this.config, patch);
    if ('timelineHourWidth' in patch) this.zoom = patch.timelineHourWidth;
    if ('view' in patch && VIEW_TYPES.includes(patch.view) && patch.view !== this._view) {
      this._view = patch.view;
      this.emit('viewChange', { view: patch.view, calendar: this });
    }
    if ('eventSource' in patch) this._rangeKey = null;
    this._cacheKey = null;
    return this.renderNow();
  }

  setZoom(pxPerHour) {
    this.zoom = clamp(pxPerHour, 6, 180);
    return this.renderNow();
  }

  toggleSidebar(open = !this.sidebarOpen) {
    this.sidebarOpen = open;
    return this.renderNow();
  }

  /** Fold the sidebar's people list away (or open it again); the show / hide choices are kept. */
  toggleResourceFilter(collapsed = !this.filterCollapsed) {
    this.filterCollapsed = collapsed;
    return this.renderNow();
  }

  setResourceVisible(id, visible) {
    if (visible) this.hiddenResources.delete(id);
    else this.hiddenResources.add(id);
    this._cacheKey = null;
    return this.renderNow();
  }

  setHiddenResources(ids) {
    this.hiddenResources = new Set(ids);
    this._cacheKey = null;
    return this.renderNow();
  }

  /** Schedule a re-render on the next animation frame (cheap to call often). */
  refresh() {
    if (this._rafId) return this;
    this._rafId = raf(() => {
      this._rafId = 0;
      this._render();
    });
    return this;
  }

  /** Re-render immediately. */
  renderNow() {
    if (this._rafId) {
      cancelRaf(this._rafId);
      this._rafId = 0;
    }
    this._render();
    return this;
  }

  /** Open the editor for an event id or instance. */
  openEditor(eventOrId) {
    const inst =
      typeof eventOrId === 'object' && eventOrId?.instanceId
        ? eventOrId
        : (() => {
            const ev = this.project.getEvent(eventOrId?.id ?? eventOrId);
            return ev ? { ...ev, instanceId: String(ev.id), masterId: ev.id, isOccurrence: false, occurrenceKey: null } : null;
          })();
    if (!inst) return this;
    this._openEditor({ instance: inst, isNew: false });
    return this;
  }

  /**
   * A time range was picked on empty space (drag across it, or double-click).
   * Fires `select`; any listener returning false, or `editor: false`, stops the
   * built-in editor from opening.
   */
  select(draft, domEvent = null, source = 'drag') {
    if (this.readOnly) return this;
    const info = { start: draft.start, end: draft.end, allDay: !!draft.allDay, resourceId: draft.resourceId ?? null, source, domEvent, calendar: this };
    for (const fn of [...(this._listeners.get('select') || [])]) {
      if (fn(info) === false) return this;
    }
    if (this.config.editor === false) return this;
    return this.openCreate(draft);
  }

  /** A single click on empty space. Fires `dateClick` ({ date, allDay, resourceId }). */
  dateClick(info, domEvent = null) {
    this.emit('dateClick', { date: info.date, allDay: !!info.allDay, resourceId: info.resourceId ?? null, domEvent, calendar: this });
    return this;
  }

  /** Load the visible range again from `eventSource`. */
  refetch() {
    this._rangeKey = null;
    return this.renderNow();
  }

  /** Undo the last change. It goes through `beforeEventChange` first, so a server can refuse it. */
  undo() {
    return this._replay('undo');
  }

  redo() {
    return this._replay('redo');
  }

  /** Close the editor if it is open. */
  closeEditor() {
    this._editor?.destroy();
    this._editor = null;
    return this;
  }

  /** Open the editor for a new event, prefilled with `draft` ({ start, end, resourceId, … }). */
  openCreate(draft) {
    if (this.readOnly || this.config.editor === false) return this;
    const d = { title: '', ...draft };
    if (d.resourceId === undefined) d.resourceId = this.visibleResources.length === 1 ? this.visibleResources[0].id : null;
    this._openEditor({ draft: d, isNew: true });
    return this;
  }

  // ------------------------------------------------------------ used by the views

  /** Resolved color for an event: its own, else its resource's, else the default. */
  colorOf(ev) {
    return resolveColor(ev.color) || resolveColor(this.resourcesById.get(ev.resourceId)?.color) || FALLBACK_COLOR;
  }

  setSelected(id) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    for (const el of this.el.querySelectorAll('.ck-event[data-instance]')) el.classList.toggle('ck-selected', el.dataset.instance === id);
    this.emit('selectionChange', { instanceId: id, calendar: this });
  }

  eventClick(instance, domEvent) {
    for (const fn of [...(this._listeners.get('eventClick') || [])]) {
      if (fn({ event: instance, domEvent, calendar: this }) === false) return;
    }
    if (this.config.editor === false) return;
    this.openEditor(instance);
  }

  /**
   * Single entry point for every edit from the UI. Fires `beforeEventChange`
   * (any listener returning false — or a Promise of false — cancels), asks for
   * the recurring scope when needed, applies the change, then fires `eventChange`.
   * Resolves to true when the change was applied.
   */
  async commitChange({ type, instance, changes = {}, allowThis = true }) {
    if (this.readOnly) return false;
    if (instance && (type === 'move' || type === 'resize')) {
      const moved = (changes.start && +changes.start !== +instance.start) || (changes.end && +changes.end !== +instance.end);
      if (type === 'move' && moved && !canMove(instance)) return false;
      if (type === 'resize' && !canResize(instance)) return false;
      if ('resourceId' in changes && changes.resourceId !== instance.resourceId && !canReassign(instance)) return false;
    }
    const payload = { type, event: instance, changes, source: 'ui', project: this.project, calendar: this };
    for (const fn of [...(this._listeners.get('beforeEventChange') || [])]) {
      if ((await fn(payload)) === false) return false;
    }
    let scope = 'all';
    if (instance?.isOccurrence) {
      this._modal++;
      scope = await askScope(this.el, { kind: type === 'remove' ? 'delete' : 'edit', allowThis });
      this._modal--;
      this.el.focus({ preventScroll: true });
      if (!scope) return false;
    }
    let result = null;
    if (type === 'create') result = this.project.addEvent(changes);
    else if (type === 'remove') this.project.removeOccurrence(instance, scope);
    else result = this.project.updateOccurrence(instance, changes, scope);
    this.emit('eventChange', { ...payload, scope, result });
    return true;
  }

  showTooltip(event, e) {
    const tip = this.config.tooltip;
    if (tip === false) return;
    if (e.pointerType === 'touch' || document.body.classList.contains('ck-body-dragging') || this._editor) return;
    clearTimeout(this._tipTimer);
    const { clientX: x, clientY: y } = e;
    this._tipTimer = setTimeout(() => {
      const t = this.tooltipEl;
      let content = typeof tip === 'function' ? tip({ event, calendar: this }) : null;
      if (typeof content === 'string') content = fromHTML(content);
      if (content == null || content === false) content = tooltipContent(this, event);
      t.replaceChildren(...[content].flat(2).filter(Boolean));
      t.style.setProperty('--ck-ev', this.colorOf(event));
      t.style.left = `${Math.min(x + 14, window.innerWidth - 300)}px`;
      t.style.top = `${Math.min(y + 16, window.innerHeight - 180)}px`;
      t.hidden = false;
    }, 450);
  }

  hideTooltip() {
    clearTimeout(this._tipTimer);
    if (this.tooltipEl && !this.tooltipEl.hidden) this.tooltipEl.hidden = true;
  }

  // ------------------------------------------------------------ internals

  _computeRange(view = this.view, date = this.date) {
    const { weekStartsOn, timelineDays } = this.config;
    if (view === 'day') return { start: date, end: addDays(date, 1), days: [date] };
    if (view === 'month') {
      const g = monthGrid(date, weekStartsOn);
      return { start: g.gridStart, end: addDays(g.gridStart, g.weeks * 7), grid: g };
    }
    if (view === 'timeline') {
      const start = timelineDays === 7 ? startOfWeek(date, weekStartsOn) : date;
      return { start, end: addDays(start, timelineDays) };
    }
    if (view === 'list') return listRange(date, this.config.listRange, weekStartsOn);
    const days = weekDays(date, weekStartsOn, 7);
    return { start: days[0], end: addDays(days[0], 7), days };
  }

  _computeTitle() {
    const { view, date, range, locale } = this;
    if (view === 'day') return format(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, locale);
    if (view === 'month' || (view === 'list' && this.config.listRange === 'month')) return format(date, { month: 'long', year: 'numeric' }, locale);
    if (view === 'list' && this.config.listRange === 'day') return format(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, locale);
    return formatRange(range.start, addDays(range.end, -1), locale);
  }

  _getView(type) {
    const key = type === 'day' || type === 'week' ? type : type;
    if (!this._views[key]) {
      if (type === 'month') this._views[key] = new MonthView(this);
      else if (type === 'timeline') this._views[key] = new TimelineView(this);
      else if (type === 'list') this._views[key] = new ListView(this);
      else this._views[key] = new TimeGridView(this);
    }
    return this._views[key];
  }

  _render() {
    if (!this.el.isConnected && !this.el.parentNode) return;
    const { config, project } = this;
    this.range = this._computeRange();
    this._checkRange();
    const resources = project.resources;
    this.resourcesById = new Map(resources.map((r) => [r.id, r]));
    this.visibleResources = resources.filter((r) => !this.hiddenResources.has(r.id));
    const key = `${project.version}|${+this.range.start}|${+this.range.end}|${[...this.hiddenResources].join(',')}`;
    if (key !== this._cacheKey) {
      this._cacheKey = key;
      const hidden = this.hiddenResources;
      this.instances = project.getEventsInRange(this.range.start, this.range.end, {
        filter: hidden.size ? (ev) => ev.resourceId == null || !hidden.has(ev.resourceId) : null,
      });
      if (this.selectedId && !this.instances.some((i) => i.instanceId === this.selectedId)) this.selectedId = null;
    }
    this.title = this._computeTitle();
    this._applyScale();

    const root = this.el;
    root.className = `ck-root${config.readOnly ? ' ck-readonly' : ''}${this.loading ? ' ck-loading' : ''}${config.cls ? ` ${config.cls}` : ''}`;
    root.dataset.theme = config.theme;
    root.style.height = typeof config.height === 'number' ? `${config.height}px` : config.height;

    keepFocus(root, () => {
      this.toolbarEl.hidden = config.showToolbar === false;
      if (config.showToolbar !== false) this.toolbarEl.replaceChildren(...[buildToolbar(this)].flat(2).filter(Boolean));
      const showSidebar = config.showSidebar && this.sidebarOpen;
      this.sidebarEl.hidden = !showSidebar;
      if (showSidebar) this.sidebarEl.replaceChildren(...[buildSidebar(this)].flat(2).filter(Boolean));
    });

    const view = this._getView(this.view);
    if (this.viewEl.firstChild !== view.el) this.viewEl.replaceChildren(view.el);
    this.viewEl.dataset.view = this.view;
    view.render();
  }

  /**
   * `scale` (a number, or 'auto' to follow the calendar's width) multiplies
   * text and every size the views lay out with, so a big screen is readable.
   */
  _computeScale() {
    const s = this.config.scale;
    if (s === 'auto') {
      const w = this.el.clientWidth || 0;
      return w < 1200 ? 1 : Math.round(Math.min(1.5, Math.max(1, w / 1400)) * 100) / 100;
    }
    return Number(s) > 0 ? Number(s) : 1;
  }

  _applyScale() {
    const scale = this._computeScale();
    const c = this.config;
    const px = (n) => Math.round(n * scale);
    this.scale = scale;
    this.metrics = {
      hourHeight: px(c.hourHeight),
      rowHeight: px(c.rowHeight),
      laneHeight: px(c.laneHeight),
      resourceColumnWidth: px(c.resourceColumnWidth),
      monthLane: px(22),
      monthHeader: px(28),
      allDayLane: px(24),
    };
    this.el.style.setProperty('--ck-scale', String(scale));
  }

  /** Fires `rangeChange` when the visible range changed, and loads it from `eventSource`. */
  _checkRange() {
    const { start, end } = this.range;
    const key = `${this.view}|${+start}|${+end}`;
    if (key === this._rangeKey) return;
    this._rangeKey = key;
    this.emit('rangeChange', { start, end, view: this.view, calendar: this });
    if (typeof this.config.eventSource === 'function') this._load({ start, end, view: this.view });
  }

  async _load(range) {
    const seq = ++this._loadSeq;
    // a newer range supersedes this one: tell the source so it can cancel its request
    this._loadAbort?.abort();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this._loadAbort = controller;
    this._setLoading(true);
    try {
      const data = await this.config.eventSource({ ...range, signal: controller?.signal, calendar: this });
      if (seq !== this._loadSeq) return;
      // null / undefined: the source has nothing new yet, keep what is shown
      if (data == null) return;
      const payload = Array.isArray(data) ? { events: data } : data;
      this.project.loadData({ events: payload.events || [], ...(payload.resources ? { resources: payload.resources } : {}) }, { keepHistory: true });
      this.emit('load', { ...range, calendar: this });
    } catch (error) {
      if (seq !== this._loadSeq) return;
      this.emit('loadError', { ...range, error, calendar: this });
    } finally {
      if (seq === this._loadSeq) this._setLoading(false);
    }
  }

  _setLoading(on) {
    if (this.loading === on) return;
    this.loading = on;
    this.el.classList.toggle('ck-loading', on);
    this.emit('loading', { loading: on, calendar: this });
  }

  /**
   * Replays an undo / redo step through `beforeEventChange` (with `source`), so
   * an app that saves to a server can save it too. If a listener refuses, the
   * step is dropped from the history instead of being applied.
   */
  async _replay(dir) {
    const { project } = this;
    const entry = dir === 'undo' ? project.peekUndo() : project.peekRedo();
    if (!entry || this.readOnly) return false;
    const ops = dir === 'undo' ? [...entry.ops].reverse().map((op) => project._inverse(op)) : entry.ops;
    for (const op of ops) {
      if (op.store !== 'events') continue;
      const payload = this._replayPayload(op, dir);
      for (const fn of [...(this._listeners.get('beforeEventChange') || [])]) {
        if ((await fn(payload)) === false) {
          if (dir === 'undo') project.dropUndo();
          else project.dropRedo();
          return false;
        }
      }
    }
    // the step may have been dropped while a listener was waiting
    if ((dir === 'undo' ? project.peekUndo() : project.peekRedo()) !== entry) return false;
    if (dir === 'undo') project.undo();
    else project.redo();
    this.emit('eventChange', { type: dir, source: dir, label: entry.label, project, calendar: this });
    return true;
  }

  _replayPayload(op, source) {
    const base = { source, project: this.project, calendar: this };
    const asInstance = (rec) => ({ ...rec, instanceId: String(rec.id), masterId: rec.id, isOccurrence: false, occurrenceKey: null });
    if (op.type === 'add') return { ...base, type: 'create', event: null, changes: { ...op.record } };
    if (op.type === 'remove') return { ...base, type: 'remove', event: asInstance(op.record), changes: {} };
    const { before, after } = op;
    const changes = {};
    for (const k of ['start', 'end', 'resourceId', 'title', 'allDay']) {
      const a = before[k];
      const b = after[k];
      if (a instanceof Date && b instanceof Date ? +a !== +b : a !== b) changes[k] = b;
    }
    const sameLength = +after.end - +after.start === +before.end - +before.start;
    const timeOnly = Object.keys(changes).every((k) => k === 'start' || k === 'end' || k === 'resourceId');
    const type = timeOnly ? (sameLength ? 'move' : 'resize') : 'update';
    return { ...base, type, event: asInstance(before), changes };
  }

  _openEditor(state) {
    this.hideTooltip();
    this._editor?.destroy();
    const close = () => {
      this._editor?.destroy();
      this._editor = null;
      this.el.focus({ preventScroll: true });
    };
    const editor = new EventEditor(this, state, {
      onClose: close,
      onSave: async (values) => {
        let ok;
        if (state.isNew) {
          ok = await this.commitChange({ type: 'create', instance: null, changes: values });
        } else {
          const inst = state.instance;
          const ruleChanged = (values.rrule || null) !== (inst.rrule || null);
          const changes = { ...values };
          if (inst.isOccurrence && !ruleChanged) delete changes.rrule;
          ok = await this.commitChange({ type: 'update', instance: inst, changes, allowThis: !ruleChanged });
        }
        if (ok) close();
      },
      onDelete: async (inst) => {
        if (await this.commitChange({ type: 'remove', instance: inst })) close();
      },
    });
    this._editor = editor;
    this.el.appendChild(editor.el);
    this.emit('editorOpen', { editor, calendar: this, ...state });
  }

  _onKeyDown(e) {
    if (this._editor || this._modal) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (mod && k === 'y') {
      e.preventDefault();
      this.redo();
    } else if (mod && k === 's' && this.crudManager) {
      e.preventDefault();
      this.crudManager.sync().catch(() => {});
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId && !this.readOnly) {
      const inst = this.instances.find((i) => i.instanceId === this.selectedId);
      if (inst) {
        e.preventDefault();
        this.commitChange({ type: 'remove', instance: inst });
      }
    } else if (e.key === 'Escape') {
      this.setSelected(null);
    }
  }
}
