export class Emitter {
  constructor() {
    this._listeners = new Map();
  }

  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  emit(type, ...args) {
    const set = this._listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(...args);
  }
}
