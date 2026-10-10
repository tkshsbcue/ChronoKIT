// CrudManager: loads a Project from your backend and sends batched changes back.
//
// Load  (GET  loadUrl)  -> { resources: [...], events: [...] }   (or { events: { rows: [...] } })
// Sync  (POST syncUrl)  <- { resources?: {added, updated, removed}, events?: {added, updated, removed} }
//                       -> { success: true, resources?: { rows: [...] }, events?: { rows: [{ $phantomId, id }] } }
// See SYNC_PROTOCOL.md for the full contract.

import { Emitter } from './emitter.js';
import { isPhantomId } from './project.js';

const rowsOf = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.rows) ? v.rows : undefined);

export function createFetchTransport({ loadUrl, syncUrl, headers = {}, fetchOptions = {} } = {}) {
  return {
    async load(params) {
      if (!loadUrl) throw new Error('CrudManager: loadUrl is not set');
      const qs = params && Object.keys(params).length ? `${loadUrl.includes('?') ? '&' : '?'}${new URLSearchParams(params)}` : '';
      const res = await fetch(loadUrl + qs, { headers, ...fetchOptions });
      if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`);
      return res.json();
    },
    async sync(payload) {
      if (!syncUrl) throw new Error('CrudManager: syncUrl is not set');
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        ...fetchOptions,
      });
      if (!res.ok) throw new Error(`Sync failed: HTTP ${res.status}`);
      return res.json();
    },
  };
}

/**
 * In-memory "server" that follows the sync protocol. Handy for demos, tests and
 * prototyping the UI before your API exists.
 */
export function createMemoryTransport({ data = { resources: [], events: [] }, latency = 250, failRate = 0, onRequest } = {}) {
  const db = {
    resources: new Map((data.resources || []).map((r) => [r.id, { ...r }])),
    events: new Map((data.events || []).map((e) => [e.id, { ...e }])),
  };
  let seq = 1000;
  const wait = () => new Promise((r) => setTimeout(r, latency));
  const serialize = (rec) => {
    const out = {};
    for (const [k, v] of Object.entries(rec)) out[k] = v instanceof Date ? v.toISOString() : v;
    return out;
  };
  return {
    db,
    async load(params) {
      await wait();
      const response = { success: true, resources: [...db.resources.values()].map(serialize), events: [...db.events.values()].map(serialize) };
      onRequest?.({ type: 'load', request: params ?? null, response });
      return response;
    },
    async sync(payload) {
      await wait();
      if (failRate && Math.random() < failRate) {
        const response = { success: false, message: 'Simulated server error' };
        onRequest?.({ type: 'sync', request: payload, response });
        return response;
      }
      const response = { success: true };
      const idMap = {};
      for (const store of ['resources', 'events']) {
        const block = payload[store];
        if (!block) continue;
        const rows = [];
        for (const row of block.added || []) {
          const id = `${store === 'events' ? 'ev' : 'res'}-${++seq}`;
          idMap[row.$phantomId] = id;
          const { $phantomId, ...fields } = row;
          if (store === 'events' && isPhantomId(fields.resourceId) && idMap[fields.resourceId]) fields.resourceId = idMap[fields.resourceId];
          if (store === 'events' && isPhantomId(fields.recurringEventId) && idMap[fields.recurringEventId]) fields.recurringEventId = idMap[fields.recurringEventId];
          db[store].set(id, { ...fields, id });
          rows.push({ $phantomId, id });
        }
        for (const row of block.updated || []) {
          const fields = { ...row };
          if (store === 'events' && isPhantomId(fields.resourceId) && idMap[fields.resourceId]) {
            fields.resourceId = idMap[fields.resourceId];
            rows.push({ id: row.id, resourceId: fields.resourceId });
          }
          db[store].set(row.id, { ...(db[store].get(row.id) || {}), ...fields });
        }
        for (const { id } of block.removed || []) db[store].delete(id);
        if (rows.length) response[store] = { rows };
      }
      onRequest?.({ type: 'sync', request: payload, response });
      return response;
    },
  };
}

export class CrudManager extends Emitter {
  /**
   * @param {import('./project.js').Project} project
   * @param {object} config
   * @param {string} [config.loadUrl]
   * @param {string} [config.syncUrl]
   * @param {object} [config.headers] e.g. { Authorization: 'Bearer …' }
   * @param {object} [config.fetchOptions] extra fetch() options, e.g. { credentials: 'include' }
   * @param {{load: Function, sync: Function}} [config.transport] replace HTTP entirely (GraphQL, websockets, your CRM SDK…)
   * @param {boolean} [config.autoSync=false] sync automatically after edits
   * @param {number} [config.autoSyncDelay=800] debounce in ms
   * @param {(d: Date) => any} [config.serializeDate] defaults to ISO-8601 UTC
   */
  constructor(project, config = {}) {
    super();
    this.project = project;
    this.serializeDate = config.serializeDate ?? ((d) => d.toISOString());
    this.transport = config.transport ?? createFetchTransport(config);
    this.autoSyncDelay = config.autoSyncDelay ?? 800;
    this.status = 'idle'; // idle | loading | syncing | error
    this.lastError = null;
    this._inflight = null;
    this._queued = false;
    this._timer = null;
    this._unsub = null;
    if (config.autoSync) this.setAutoSync(true);
  }

  setAutoSync(enabled) {
    this._unsub?.();
    this._unsub = null;
    if (enabled) {
      this._unsub = this.project.on('change', (info) => {
        if (['load', 'sync', 'changes', 'history'].includes(info?.type)) return;
        if (this.project.hasChanges) this.scheduleSync();
      });
    }
  }

  scheduleSync() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.sync().catch(() => {}), this.autoSyncDelay);
  }

  _setStatus(status, error = null) {
    this.status = status;
    this.lastError = error;
    this.emit('status', { status, error });
  }

  async load(params) {
    this._setStatus('loading');
    this.emit('beforeLoad', params);
    try {
      const response = await this.transport.load(params);
      if (response && response.success === false) throw new Error(response.message || 'Load failed');
      this.project.loadData({ resources: rowsOf(response?.resources), events: rowsOf(response?.events) });
      this._setStatus('idle');
      this.emit('load', response);
      return response;
    } catch (error) {
      this._setStatus('error', error);
      this.emit('loadFail', error);
      throw error;
    }
  }

  get hasChanges() {
    return this.project.hasChanges;
  }

  /** Send pending changes. Edits made while a request is in flight are sent in a follow-up request. */
  sync() {
    if (this._inflight) {
      this._queued = true;
      return this._inflight;
    }
    clearTimeout(this._timer);
    if (!this.project.hasChanges) return Promise.resolve(null);
    const state = this.project._takeChanges();
    const payload = this.project._serializeChanges(state, this.serializeDate);
    if (!payload) return Promise.resolve(null);
    this._setStatus('syncing');
    this.emit('beforeSync', payload);
    this._inflight = (async () => {
      try {
        const response = await this.transport.sync(payload);
        if (response && response.success === false) throw new Error(response.message || 'Sync failed');
        this.project.applySyncResponse(response || {});
        this._setStatus('idle');
        this.emit('sync', { request: payload, response });
        return response;
      } catch (error) {
        this.project._restoreChanges(state);
        this._setStatus('error', error);
        this.emit('syncFail', { request: payload, error });
        throw error;
      } finally {
        this._inflight = null;
        if (this._queued) {
          this._queued = false;
          if (this.project.hasChanges) this.sync().catch(() => {});
        }
      }
    })();
    return this._inflight;
  }

  destroy() {
    clearTimeout(this._timer);
    this._unsub?.();
  }
}
