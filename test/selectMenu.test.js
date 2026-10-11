// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { Calendar } from '../src/index.js';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let calendar;
afterEach(() => {
  calendar?.destroy();
  calendar = null;
  document.body.innerHTML = '';
});

const day = new Date(2026, 9, 12);
const at = (hr) => new Date(2026, 9, 12, hr);
const mount = (config) => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  calendar = new Calendar({ appendTo: el, date: day, view: 'day', ...config });
  return el;
};
const menu = () => document.querySelector('.ck-select-menu');

describe('selectMenu (0.2.2)', () => {
  it('offers the choices where the drag ended and runs the one picked with the time and person', () => {
    const appointment = vi.fn();
    const session = vi.fn();
    const picked = vi.fn();
    mount({
      selectMenu: [
        { key: 'appointment', label: 'Appointment', hint: 'Book a patient', onPick: appointment },
        { key: 'session', label: 'Session', onPick: session },
      ],
    });
    calendar.on('selectMenuPick', picked);
    calendar.select({ start: at(10), end: at(11), resourceId: 7 }, { clientX: 100, clientY: 120 });
    expect(menu()).not.toBeNull();
    expect(menu().getAttribute('role')).toBe('menu');
    expect([...menu().querySelectorAll('.ck-select-menu-label')].map((n) => n.textContent)).toEqual(['Appointment', 'Session']);
    expect(document.activeElement?.dataset.key).toBe('select-appointment');
    menu().querySelector('[data-key="select-session"]').click();
    expect(session).toHaveBeenCalledTimes(1);
    expect(session.mock.calls[0][0]).toMatchObject({ start: at(10), end: at(11), resourceId: 7 });
    expect(appointment).not.toHaveBeenCalled();
    expect(picked.mock.calls[0][0].key).toBe('session');
    expect(menu()).toBeNull();
    expect(document.querySelector('.ck-editor')).toBeNull();
  });

  it('runs a lone choice straight away, and a function can decide per time', () => {
    const only = vi.fn();
    mount({ selectMenu: (info) => (info.resourceId === 1 ? [{ key: 'only', label: 'Only', onPick: only }] : null), editor: false });
    calendar.select({ start: at(9), end: at(10), resourceId: 1 });
    expect(only).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    calendar.select({ start: at(9), end: at(10), resourceId: 2 });
    expect(menu()).toBeNull();
  });

  it('closes on Escape without picking, and a select listener returning false still wins', async () => {
    const pick = vi.fn();
    const closed = vi.fn();
    mount({ selectMenu: [{ key: 'a', label: 'A', onPick: pick }, { key: 'b', label: 'B', onPick: pick }] });
    calendar.on('selectMenuClose', closed);
    calendar.select({ start: at(9), end: at(10) });
    menu().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu()).toBeNull();
    expect(pick).not.toHaveBeenCalled();
    expect(closed).toHaveBeenCalledTimes(1);
    calendar.on('select', () => false);
    calendar.select({ start: at(9), end: at(10) });
    expect(menu()).toBeNull();
  });
});
