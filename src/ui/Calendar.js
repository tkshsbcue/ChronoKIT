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
import { h, keepFocus, raf, cancelRaf } from './dom.js';
import { buildToolbar } from './Toolbar.js';
import { buildSidebar } from './Sidebar.js';
import { EventEditor, askScope } from './EventEditor.js';
import { tooltipContent, resolveColor, EVENT_COLORS } from './content.js';
import { TimeGridView, weekDays } from './views/TimeGridView.js';
import { MonthView, monthGrid } from './views/MonthView.js';
import { TimelineView } from './views/TimelineView.js';

const VIEW_TYPES = ['day', 'week', 'month', 'timeline'];
const FALLBACK_COLOR = EVENT_COLORS.cobalt;

/** Default configuration. Every key can be passed to `new Calendar({...})` or `setConfig()`. */
export const DEFAULTS = {
  view: 'week',
  views: VIEW_TYPES,
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
};

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
    this._date = startOfDay((date && toDate(date)) || new Date());
    this.hiddenResources = new Set();
    this.sidebarOpen = true;
    this.zoom = this.config.timelineHourWidth;
    this.selectedId = null;
    this._views = {};
    this._editor = null;
    this._modal = 0;
    this._tipTimer = 0;
    this._rafId = 0;
    this._cacheKey = null;

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
    const { view, date } = this;
    if (view === 'day') return this.setDate(addDays(date, dir));
    if (view === 'month') return this.setDate(addMonths(date, dir));
    if (view === 'timeline') return this.setDate(addDays(date, dir * this.config.timelineDays));
    return this.setDate(addDays(date, dir * 7));
  }

  next() {
    return this.shift(1);
  }

  prev() {
    return this.shift(-1);
  }

  today() {
    return this.setDate(new Date());
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
    if ('view' in patch) this._view = patch.view;
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

  /** Open the editor for a new event, prefilled with `draft` ({ start, end, resourceId, … }). */
  openCreate(draft) {
    if (this.readOnly) return this;
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
    const payload = { type, event: instance, changes, project: this.project, calendar: this };
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
    if (e.pointerType === 'touch' || document.body.classList.contains('ck-body-dragging') || this._editor) return;
    clearTimeout(this._tipTimer);
    const { clientX: x, clientY: y } = e;
    this._tipTimer = setTimeout(() => {
      const t = this.tooltipEl;
      t.replaceChildren(...[tooltipContent(this, event)].flat(2).filter(Boolean));
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

  _computeRange() {
    const { view, date } = this;
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
    const days = weekDays(date, weekStartsOn, 7);
    return { start: days[0], end: addDays(days[0], 7), days };
  }

  _computeTitle() {
    const { view, date, range, locale } = this;
    if (view === 'day') return format(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, locale);
    if (view === 'month') return format(date, { month: 'long', year: 'numeric' }, locale);
    return formatRange(range.start, addDays(range.end, -1), locale);
  }

  _getView(type) {
    const key = type === 'day' || type === 'week' ? type : type;
    if (!this._views[key]) {
      if (type === 'month') this._views[key] = new MonthView(this);
      else if (type === 'timeline') this._views[key] = new TimelineView(this);
      else this._views[key] = new TimeGridView(this);
    }
    return this._views[key];
  }

  _render() {
    if (!this.el.isConnected && !this.el.parentNode) return;
    const { config, project } = this;
    this.range = this._computeRange();
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

    const root = this.el;
    root.className = `ck-root${config.readOnly ? ' ck-readonly' : ''}${config.cls ? ` ${config.cls}` : ''}`;
    root.dataset.theme = config.theme;
    root.style.height = typeof config.height === 'number' ? `${config.height}px` : config.height;

    keepFocus(root, () => {
      this.toolbarEl.replaceChildren(...[buildToolbar(this)].flat(2).filter(Boolean));
      const showSidebar = config.showSidebar && this.sidebarOpen;
      this.sidebarEl.hidden = !showSidebar;
      if (showSidebar) this.sidebarEl.replaceChildren(...[buildSidebar(this)].flat(2).filter(Boolean));
    });

    const view = this._getView(this.view);
    if (this.viewEl.firstChild !== view.el) this.viewEl.replaceChildren(view.el);
    this.viewEl.dataset.view = this.view;
    view.render();
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
      if (e.shiftKey) this.project.redo();
      else this.project.undo();
    } else if (mod && k === 'y') {
      e.preventDefault();
      this.project.redo();
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
