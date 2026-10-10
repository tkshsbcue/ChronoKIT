// Project: the single data model shared by every view.
// Holds events + resources as immutable (frozen) records, keeps an undo/redo
// history of transactions, and tracks unsaved changes for backend sync.

import { Emitter } from './emitter.js';
import { toDate, addDays, addMinutes, startOfDay, dateKey, diffCalendarDays } from './date.js';
import {
  parseRRule, stringifyRRule, expandRecurring, shiftRuleDays, countOccurrencesBefore,
} from './recurrence.js';

let phantomSeq = 0;
export const PHANTOM_PREFIX = '_new_';
export const isPhantomId = (id) => typeof id === 'string' && id.startsWith(PHANTOM_PREFIX);
export const newPhantomId = () => `${PHANTOM_PREFIX}${++phantomSeq}`;

const STORES = ['resources', 'events'];

function normalizeEvent(raw) {
  let start = toDate(raw.start) ?? startOfDay(new Date());
  let end = toDate(raw.end);
  if (!end) end = addMinutes(start, raw.duration ?? 60);
  if (end < start) end = new Date(start);
  const allDay = !!raw.allDay;
  if (allDay) {
    // all-day events span whole days; end is exclusive midnight
    start = startOfDay(start);
    const endDay = startOfDay(end);
    end = +endDay === +end ? endDay : addDays(endDay, 1);
    if (end <= start) end = addDays(start, 1);
  }
  let rrule = null;
  if (raw.rrule) rrule = stringifyRRule(raw.rrule);
  const ev = {
    ...raw,
    id: raw.id ?? newPhantomId(),
    title: raw.title ?? '',
    start,
    end,
    allDay,
    resourceId: raw.resourceId ?? null,
    color: raw.color ?? null,
    notes: raw.notes ?? '',
    rrule,
    exceptionDates: rrule ? [...new Set((raw.exceptionDates || []).map(toKey))].sort() : [],
    recurringEventId: raw.recurringEventId ?? null,
    originalDateKey: raw.originalDateKey ?? null,
  };
  delete ev.duration;
  return Object.freeze(ev);
}

function toKey(v) {
  if (v instanceof Date) return dateKey(v);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : dateKey(toDate(s));
}

function normalizeResource(raw) {
  return Object.freeze({ ...raw, id: raw.id ?? newPhantomId(), name: raw.name ?? '' });
}

const freshChangeState = () => {
  const s = {};
  for (const store of STORES) s[store] = { added: new Set(), updated: new Map(), removed: new Map() };
  return s;
};

function changedKeys(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const k of keys) {
    const x = a[k];
    const y = b[k];
    if (x instanceof Date && y instanceof Date ? +x !== +y : Array.isArray(x) && Array.isArray(y) ? x.join() !== y.join() : x !== y) out.push(k);
  }
  return out;
}

const shiftKeys = (keys, days) => (days ? keys.map((k) => dateKey(addDays(toDate(k), days))) : keys);

const EVENT_COPY_FIELDS_EXCLUDE = new Set(['id', 'rrule', 'exceptionDates', 'recurringEventId', 'originalDateKey']);

export class Project extends Emitter {
  /**
   * @param {{ events?: object[], resources?: object[], undoLimit?: number }} config
   */
  constructor({ events = [], resources = [], undoLimit = 100 } = {}) {
    super();
    this._events = new Map();
    this._resources = new Map();
    this._resourceOrder = [];
    this._undo = [];
    this._redo = [];
    this._tx = null;
    this._replaying = false;
    this._changes = freshChangeState();
    this._cache = {};
    this.undoLimit = undoLimit;
    this.version = 0;
    this.subscribe = (fn) => this.on('change', fn);
    this.getVersion = () => this.version;
    this.loadData({ events, resources });
  }

  // ---------------------------------------------------------------- reading

  get events() {
    return (this._cache.events ??= [...this._events.values()]);
  }

  get resources() {
    return (this._cache.resources ??= this._resourceOrder.map((id) => this._resources.get(id)));
  }

  getEvent(id) {
    return this._events.get(id) ?? null;
  }

  getResource(id) {
    return this._resources.get(id) ?? null;
  }

  /**
   * Visible event instances overlapping [start, end): plain events plus expanded
   * occurrences of recurring ones. Each instance has `instanceId`, `masterId`,
   * `isOccurrence` and `occurrenceKey` in addition to the event fields.
   */
  getEventsInRange(start, end, { resourceIds = null, filter = null } = {}) {
    const ids = resourceIds ? new Set(resourceIds) : null;
    const out = [];
    for (const ev of this._events.values()) {
      if (ids && !ids.has(ev.resourceId)) continue;
      if (filter && !filter(ev)) continue;
      if (ev.rrule) {
        for (const occ of expandRecurring(ev, start, end)) {
          out.push({
            ...ev,
            start: occ.start,
            end: occ.end,
            instanceId: `${ev.id}::${occ.key}`,
            masterId: ev.id,
            isOccurrence: true,
            occurrenceKey: occ.key,
          });
        }
      } else if (ev.start < end && (ev.end > start || (+ev.end === +ev.start && ev.start >= start))) {
        out.push({ ...ev, instanceId: String(ev.id), masterId: ev.id, isOccurrence: false, occurrenceKey: null });
      }
    }
    return out.sort((a, b) => a.start - b.start || b.end - a.end);
  }

  /** Events of `resourceId` overlapping [start, end), excluding instance/master `ignoreId`. */
  getConflicts({ resourceId, start, end, ignoreId = null }) {
    if (resourceId == null) return [];
    return this.getEventsInRange(start, end, { resourceIds: [resourceId] }).filter(
      (e) => e.instanceId !== ignoreId && e.masterId !== ignoreId && e.start < end && e.end > start,
    );
  }

  // ---------------------------------------------------------------- loading

  /**
   * Replace data. Clears undo history and pending changes. Omitted keys are left untouched.
   * `keepHistory: true` keeps undo/redo (for data reloaded from a server after an edit).
   */
  loadData({ events, resources } = {}, { keepHistory = false } = {}) {
    if (resources) {
      this._resources.clear();
      this._resourceOrder = [];
      for (const r of resources) {
        const rec = normalizeResource(r);
        this._resources.set(rec.id, rec);
        this._resourceOrder.push(rec.id);
      }
    }
    if (events) {
      this._events.clear();
      for (const e of events) {
        const rec = normalizeEvent(e);
        this._events.set(rec.id, rec);
      }
    }
    if (!keepHistory) {
      this._undo = [];
      this._redo = [];
    }
    this._changes = freshChangeState();
    this._bump({ type: 'load' });
  }

  toJSON() {
    const ser = (r) => {
      const o = {};
      for (const [k, v] of Object.entries(r)) o[k] = v instanceof Date ? v.toISOString() : v;
      return o;
    };
    return { resources: this.resources.map(ser), events: this.events.map(ser) };
  }

  // ---------------------------------------------------------------- editing: events

  addEvent(data) {
    const rec = normalizeEvent({ ...data, id: data.id ?? newPhantomId() });
    this._do({ store: 'events', type: 'add', record: rec }, 'Add event');
    return rec;
  }

  updateEvent(id, changes) {
    const before = this._events.get(id);
    if (!before) throw new Error(`Event ${id} not found`);
    const after = normalizeEvent({ ...before, ...changes, id });
    if (!changedKeys(before, after).length) return before;
    this._do({ store: 'events', type: 'update', id, before, after }, 'Edit event');
    return after;
  }

  /** Removes an event; removing a series also removes its detached exceptions. */
  removeEvent(id) {
    const rec = this._events.get(id);
    if (!rec) return;
    this.transaction(() => {
      if (rec.rrule) {
        for (const ev of [...this._events.values()]) {
          if (ev.recurringEventId === id) this._do({ store: 'events', type: 'remove', record: ev });
        }
      }
      this._do({ store: 'events', type: 'remove', record: rec });
    }, 'Delete event');
  }

  /**
   * Update an event instance from a view. For occurrences of a recurring series,
   * `scope` decides what changes: 'this' (detach one occurrence), 'future'
   * (split the series) or 'all' (edit the whole series).
   */
  updateOccurrence(instance, changes, scope = 'all') {
    if (!instance.isOccurrence) return this.updateEvent(instance.masterId, changes);
    const master = this._events.get(instance.masterId);
    if (!master) return null;
    const newStart = changes.start ? toDate(changes.start) : instance.start;
    const newEnd = changes.end ? toDate(changes.end) : addMinutes(newStart, (instance.end - instance.start) / 60000);
    const isFirst = +instance.start === +master.start;

    if (scope === 'this') {
      return this.transaction(() => {
        this.updateEvent(master.id, { exceptionDates: [...master.exceptionDates, instance.occurrenceKey] });
        const base = {};
        for (const [k, v] of Object.entries(master)) if (!EVENT_COPY_FIELDS_EXCLUDE.has(k)) base[k] = v;
        const { rrule, exceptionDates, ...rest } = changes; // eslint-disable-line no-unused-vars
        return this.addEvent({
          ...base,
          ...rest,
          start: newStart,
          end: newEnd,
          recurringEventId: master.id,
          originalDateKey: instance.occurrenceKey,
        });
      }, 'Edit occurrence');
    }

    // Moves are relative to the occurrence; apply the same delta to the series anchor.
    const startDelta = newStart - instance.start;
    const duration = newEnd - newStart;
    const dayDelta = diffCalendarDays(newStart, instance.start);
    const ruleChanged = 'rrule' in changes;
    const nextRule = (rule) => (ruleChanged ? changes.rrule : dayDelta ? stringifyRRule(shiftRuleDays(rule, dayDelta)) : rule);

    if (scope === 'all' || isFirst) {
      const seriesStart = new Date(master.start.getTime() + startDelta);
      return this.updateEvent(master.id, {
        ...changes,
        start: seriesStart,
        end: new Date(seriesStart.getTime() + duration),
        rrule: nextRule(master.rrule),
        exceptionDates: shiftKeys(changes.exceptionDates ?? master.exceptionDates, dayDelta),
      });
    }

    // scope === 'future': end the old series before this occurrence, start a new one here.
    return this.transaction(() => {
      const rule = parseRRule(master.rrule);
      const before = countOccurrencesBefore(master.start, rule, instance.start);
      const oldRule = { ...rule };
      delete oldRule.count;
      oldRule.until = new Date(instance.start.getTime() - 1000);
      this.updateEvent(master.id, {
        rrule: stringifyRRule(oldRule),
        exceptionDates: master.exceptionDates.filter((k) => k < instance.occurrenceKey),
      });
      const newRule = { ...rule };
      if (rule.count) newRule.count = Math.max(1, rule.count - before);
      const base = {};
      for (const [k, v] of Object.entries(master)) if (!EVENT_COPY_FIELDS_EXCLUDE.has(k)) base[k] = v;
      return this.addEvent({
        ...base,
        ...changes,
        start: newStart,
        end: newEnd,
        rrule: ruleChanged ? changes.rrule : stringifyRRule(dayDelta ? shiftRuleDays(newRule, dayDelta) : newRule),
        exceptionDates: shiftKeys(master.exceptionDates.filter((k) => k >= instance.occurrenceKey), dayDelta),
      });
    }, 'Edit series');
  }

  /** Remove an instance. For occurrences: 'this' | 'future' | 'all'. */
  removeOccurrence(instance, scope = 'all') {
    if (!instance.isOccurrence) return this.removeEvent(instance.masterId);
    const master = this._events.get(instance.masterId);
    if (!master) return;
    if (scope === 'all' || (scope === 'future' && +instance.start === +master.start)) {
      this.removeEvent(master.id);
    } else if (scope === 'this') {
      this.updateEvent(master.id, { exceptionDates: [...master.exceptionDates, instance.occurrenceKey] });
    } else {
      const rule = parseRRule(master.rrule);
      delete rule.count;
      rule.until = new Date(instance.start.getTime() - 1000);
      this.updateEvent(master.id, { rrule: stringifyRRule(rule) });
    }
  }

  // ---------------------------------------------------------------- editing: resources

  addResource(data, index = this._resourceOrder.length) {
    const rec = normalizeResource({ ...data, id: data.id ?? newPhantomId() });
    this._do({ store: 'resources', type: 'add', record: rec, index }, 'Add resource');
    return rec;
  }

  updateResource(id, changes) {
    const before = this._resources.get(id);
    if (!before) throw new Error(`Resource ${id} not found`);
    const after = normalizeResource({ ...before, ...changes, id });
    if (!changedKeys(before, after).length) return before;
    this._do({ store: 'resources', type: 'update', id, before, after }, 'Edit resource');
    return after;
  }

  /** Removes a resource and unassigns its events. */
  removeResource(id) {
    const rec = this._resources.get(id);
    if (!rec) return;
    this.transaction(() => {
      for (const ev of [...this._events.values()]) if (ev.resourceId === id) this.updateEvent(ev.id, { resourceId: null });
      this._do({ store: 'resources', type: 'remove', record: rec, index: this._resourceOrder.indexOf(id) });
    }, 'Remove resource');
  }

  // ---------------------------------------------------------------- transactions & undo

  /** Group several edits into one undo step and one change notification. */
  transaction(fn, label = 'Edit') {
    if (this._tx) return fn();
    this._tx = { label, ops: [] };
    let result;
    try {
      result = fn();
    } catch (err) {
      const { ops } = this._tx;
      this._tx = null;
      for (let i = ops.length - 1; i >= 0; i--) this._apply(this._inverse(ops[i]), true);
      this._bump({ type: 'rollback' });
      throw err;
    }
    const tx = this._tx;
    this._tx = null;
    if (tx.ops.length) {
      this._pushHistory(tx);
      this._bump({ type: 'edit', label: tx.label, ops: tx.ops });
    }
    return result;
  }

  get canUndo() {
    return this._undo.length > 0;
  }

  get canRedo() {
    return this._redo.length > 0;
  }

  get undoLabel() {
    return this._undo[this._undo.length - 1]?.label ?? null;
  }

  get redoLabel() {
    return this._redo[this._redo.length - 1]?.label ?? null;
  }

  undo() {
    const entry = this._undo.pop();
    if (!entry) return false;
    for (let i = entry.ops.length - 1; i >= 0; i--) this._apply(this._inverse(entry.ops[i]), true);
    this._redo.push(entry);
    this._bump({ type: 'undo', label: entry.label });
    return true;
  }

  redo() {
    const entry = this._redo.pop();
    if (!entry) return false;
    for (const op of entry.ops) this._apply(op, true);
    this._undo.push(entry);
    this._bump({ type: 'redo', label: entry.label });
    return true;
  }

  /** The step `undo()` / `redo()` would replay next: { label, ops }. */
  peekUndo() {
    return this._undo[this._undo.length - 1] ?? null;
  }

  peekRedo() {
    return this._redo[this._redo.length - 1] ?? null;
  }

  /** Forget the next undo / redo step without applying it (e.g. the server refused it). */
  dropUndo() {
    const entry = this._undo.pop() ?? null;
    if (entry) this._bump({ type: 'history' });
    return entry;
  }

  dropRedo() {
    const entry = this._redo.pop() ?? null;
    if (entry) this._bump({ type: 'history' });
    return entry;
  }

  clearHistory() {
    this._undo = [];
    this._redo = [];
    this._bump({ type: 'history' });
  }

  _do(op, label) {
    this._apply(op, true);
    if (this._tx) {
      this._tx.ops.push(op);
    } else {
      this._pushHistory({ label: label || 'Edit', ops: [op] });
      this._bump({ type: 'edit', label, ops: [op] });
    }
  }

  _pushHistory(entry) {
    this._undo.push(entry);
    if (this._undo.length > this.undoLimit) this._undo.shift();
    this._redo = [];
  }

  _inverse(op) {
    if (op.type === 'add') return { ...op, type: 'remove' };
    if (op.type === 'remove') return { ...op, type: 'add' };
    return { ...op, before: op.after, after: op.before };
  }

  _apply(op, track) {
    const map = op.store === 'events' ? this._events : this._resources;
    if (op.type === 'add') {
      map.set(op.record.id, op.record);
      if (op.store === 'resources') {
        const idx = op.index == null ? this._resourceOrder.length : Math.min(op.index, this._resourceOrder.length);
        this._resourceOrder.splice(idx, 0, op.record.id);
      }
    } else if (op.type === 'update') {
      map.set(op.id, op.after);
    } else if (op.type === 'remove') {
      map.delete(op.record.id);
      if (op.store === 'resources') {
        const i = this._resourceOrder.indexOf(op.record.id);
        if (i >= 0) this._resourceOrder.splice(i, 1);
      }
    }
    if (track) this._track(op);
    this._cache = {};
  }

  _bump(info) {
    this._cache = {};
    this.version++;
    this.emit('change', info);
  }

  // ---------------------------------------------------------------- change tracking (sync)

  _track(op) {
    const c = this._changes[op.store];
    if (op.type === 'add') {
      const id = op.record.id;
      if (c.removed.has(id)) {
        c.removed.delete(id);
        c.updated.set(id, new Set(Object.keys(op.record)));
      } else c.added.add(id);
    } else if (op.type === 'update') {
      if (c.added.has(op.id)) return;
      const fields = c.updated.get(op.id) ?? new Set();
      for (const k of changedKeys(op.before, op.after)) fields.add(k);
      if (fields.size) c.updated.set(op.id, fields);
    } else if (op.type === 'remove') {
      const id = op.record.id;
      if (c.added.has(id)) {
        c.added.delete(id);
        return;
      }
      c.updated.delete(id);
      c.removed.set(id, op.record);
    }
  }

  get hasChanges() {
    return STORES.some((s) => {
      const c = this._changes[s];
      return c.added.size || c.updated.size || c.removed.size;
    });
  }

  /** Pending changes as a JSON-ready payload (does not clear them). */
  getChanges(serializeDate = (d) => d.toISOString()) {
    return this._serializeChanges(this._changes, serializeDate);
  }

  _serializeChanges(state, serializeDate) {
    const value = (v) => (v instanceof Date ? serializeDate(v) : v);
    const out = {};
    for (const store of STORES) {
      const c = state[store];
      const map = store === 'events' ? this._events : this._resources;
      const block = {};
      const added = [...c.added].filter((id) => map.has(id)).map((id) => {
        const { id: _omit, ...rest } = map.get(id); // eslint-disable-line no-unused-vars
        const row = { $phantomId: id };
        for (const [k, v] of Object.entries(rest)) row[k] = value(v);
        return row;
      });
      const updated = [...c.updated].filter(([id]) => map.has(id)).map(([id, fields]) => {
        const rec = map.get(id);
        const row = { id };
        for (const f of fields) if (f !== 'id') row[f] = value(rec[f]);
        return row;
      });
      const removed = [...c.removed.keys()].map((id) => ({ id }));
      if (added.length) block.added = added;
      if (updated.length) block.updated = updated;
      if (removed.length) block.removed = removed;
      if (Object.keys(block).length) out[store] = block;
    }
    return Object.keys(out).length ? out : null;
  }

  /** Move pending changes into an in-flight snapshot (used by CrudManager). */
  _takeChanges() {
    const state = this._changes;
    this._changes = freshChangeState();
    return state;
  }

  /** Put a failed in-flight snapshot back, merged with edits made since. */
  _restoreChanges(state) {
    for (const store of STORES) {
      const cur = this._changes[store];
      const inf = state[store];
      for (const id of inf.added) {
        if (cur.removed.has(id)) cur.removed.delete(id);
        else {
          cur.added.add(id);
          cur.updated.delete(id);
        }
      }
      for (const [id, fields] of inf.updated) {
        if (cur.removed.has(id) || cur.added.has(id)) continue;
        const merged = cur.updated.get(id) ?? new Set();
        for (const f of fields) merged.add(f);
        cur.updated.set(id, merged);
      }
      for (const [id, rec] of inf.removed) {
        if (cur.added.has(id)) {
          cur.added.delete(id);
          cur.updated.set(id, new Set(Object.keys(this._events.get(id) || this._resources.get(id) || rec)));
        } else cur.removed.set(id, rec);
      }
    }
    this._bump({ type: 'changes' });
  }

  /**
   * Apply a sync response: { resources: { rows, removed }, events: { rows, removed } }.
   * Rows with `$phantomId` get their server id; other row fields overwrite local values.
   */
  applySyncResponse(response = {}) {
    for (const store of STORES) {
      const block = response[store];
      if (!block) continue;
      const map = store === 'events' ? this._events : this._resources;
      for (const row of block.rows || []) {
        const { $phantomId, ...fields } = row;
        let id = fields.id;
        if ($phantomId != null && map.has($phantomId) && id != null && id !== $phantomId) this._remapId(store, $phantomId, id);
        id = id ?? $phantomId;
        const rec = map.get(id);
        if (!rec) continue;
        const merged = store === 'events' ? normalizeEvent({ ...rec, ...fields, id }) : normalizeResource({ ...rec, ...fields, id });
        map.set(id, merged);
      }
      for (const r of block.removed || []) {
        const id = r.id ?? r;
        map.delete(id);
        if (store === 'resources') this._resourceOrder = this._resourceOrder.filter((x) => x !== id);
      }
    }
    this._bump({ type: 'sync' });
  }

  /** Replace a (phantom) id everywhere: records, references, history and pending changes. */
  _remapId(store, oldId, newId) {
    const fixEvent = (rec) => {
      if (!rec) return rec;
      let out = rec;
      if (store === 'events' && rec.id === oldId) out = { ...out, id: newId };
      if (store === 'events' && rec.recurringEventId === oldId) out = { ...out, recurringEventId: newId };
      if (store === 'resources' && rec.resourceId === oldId) out = { ...out, resourceId: newId };
      return out === rec ? rec : Object.freeze(out);
    };
    const fixResource = (rec) => (rec && store === 'resources' && rec.id === oldId ? Object.freeze({ ...rec, id: newId }) : rec);
    const fix = (s, rec) => (s === 'events' ? fixEvent(rec) : fixResource(rec));

    // live records
    if (store === 'resources') {
      const rec = this._resources.get(oldId);
      this._resources.delete(oldId);
      this._resources.set(newId, fixResource(rec));
      this._resourceOrder = this._resourceOrder.map((x) => (x === oldId ? newId : x));
    }
    const events = new Map();
    for (const [id, rec] of this._events) {
      const next = fixEvent(rec);
      events.set(store === 'events' && id === oldId ? newId : id, next);
    }
    this._events = events;

    // history
    const fixOp = (op) => {
      const out = { ...op };
      if (op.record) out.record = fix(op.store, op.record);
      if (op.before) out.before = fix(op.store, op.before);
      if (op.after) out.after = fix(op.store, op.after);
      if (op.store === store && op.id === oldId) out.id = newId;
      return out;
    };
    for (const stack of [this._undo, this._redo]) {
      for (const entry of stack) entry.ops = entry.ops.map(fixOp);
    }

    // pending changes
    const c = this._changes[store];
    if (c.added.delete(oldId)) c.added.add(newId);
    if (c.updated.has(oldId)) {
      c.updated.set(newId, c.updated.get(oldId));
      c.updated.delete(oldId);
    }
    if (c.removed.has(oldId)) {
      c.removed.set(newId, c.removed.get(oldId));
      c.removed.delete(oldId);
    }
    this._cache = {};
    this.emit('idchange', { store, oldId, newId });
  }
}
