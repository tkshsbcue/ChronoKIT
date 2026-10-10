// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Calendar, Project } from '../src/index.js';

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

const today = new Date();
const at = (hr, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hr, m);

const makeProject = () =>
  new Project({
    resources: [
      { id: 'r1', name: 'Maya Fernandes', color: 'cobalt' },
      { id: 'r2', name: 'Jonah Weiss', color: 'teal' },
    ],
    events: [
      { id: 1, title: 'Demo with Globex', start: at(10), end: at(11), resourceId: 'r1' },
      { id: 2, title: 'Daily check-in', start: at(9), end: at(9, 15), resourceId: 'r2', rrule: 'FREQ=DAILY' },
    ],
  });

const mount = (config) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  calendar = new Calendar({ appendTo: host, ...config });
  return host;
};
const text = (host) => host.textContent;
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const button = (host, label) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);

describe('Calendar (plain JS)', () => {
  it.each(['day', 'week', 'month', 'timeline'])('renders the %s view with events', (view) => {
    const host = mount({ project: makeProject(), view });
    expect(host.querySelector('.ck-root')).not.toBeNull();
    expect(text(host)).toContain('Demo with Globex');
    expect(text(host)).toContain('Daily check-in');
  });

  it('accepts plain data instead of a Project and a CSS selector for appendTo', () => {
    document.body.innerHTML = '<div id="schedule"></div>';
    calendar = new Calendar({ appendTo: '#schedule', project: { events: [{ id: 'a', title: 'Kickoff', start: at(13), end: at(14) }] }, view: 'day' });
    expect(document.querySelector('#schedule').textContent).toContain('Kickoff');
  });

  it('re-renders when data changes and undoes from the toolbar', async () => {
    const project = makeProject();
    const host = mount({ project, view: 'week' });
    project.updateEvent(1, { title: 'Demo with Initech' });
    calendar.renderNow();
    expect(text(host)).toContain('Demo with Initech');
    click(button(host, 'Undo'));
    calendar.renderNow();
    expect(text(host)).toContain('Demo with Globex');
  });

  it('switches views and filters people', () => {
    const host = mount({ project: makeProject(), view: 'week' });
    click([...host.querySelectorAll('[role=tab]')].find((t) => t.textContent === 'Timeline'));
    expect(calendar.view).toBe('timeline');
    expect(text(host)).toContain('Maya Fernandes');
    const box = [...host.querySelectorAll('.ck-filter-item')].find((l) => l.textContent.includes('Maya')).querySelector('input');
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(host.querySelector('.ck-view').textContent).not.toContain('Demo with Globex');
  });

  it('opens the editor on click and saves through the project', async () => {
    const project = makeProject();
    const host = mount({ project, view: 'day' });
    const ev = [...host.querySelectorAll('.ck-event')].find((e) => e.textContent.includes('Demo with Globex'));
    ev.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 10, clientY: 10 }));
    const title = host.querySelector('.ck-editor-title');
    expect(title).not.toBeNull();
    title.value = 'Demo with Hooli';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector('.ck-editor').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(project.getEvent(1).title).toBe('Demo with Hooli');
    expect(host.querySelector('.ck-editor')).toBeNull();
  });

  it('lets a beforeEventChange listener cancel a change', async () => {
    const project = makeProject();
    const seen = [];
    mount({ project, listeners: { beforeEventChange: (c) => (seen.push(c.type), false) } });
    const inst = project.getEventsInRange(at(0), at(23)).find((e) => e.masterId === 1);
    const ok = await calendar.commitChange({ type: 'move', instance: inst, changes: { start: at(12), end: at(13) } });
    expect(ok).toBe(false);
    expect(seen).toEqual(['move']);
    expect(project.getEvent(1).start.getHours()).toBe(10);
  });

  it('supports custom event content and runtime config', () => {
    const host = mount({
      project: makeProject(),
      view: 'day',
      eventRenderer: ({ event }) => (event.id === 1 ? `<b class="custom">★ ${event.title}</b>` : null),
    });
    expect(host.querySelector('.custom')?.textContent).toBe('★ Demo with Globex');
    calendar.setConfig({ theme: 'dark', readOnly: true });
    expect(host.querySelector('.ck-root').dataset.theme).toBe('dark');
    expect(host.querySelector('.ck-root').classList.contains('ck-readonly')).toBe(true);
  });

  it('navigates and emits events', () => {
    const changes = [];
    // pin the locale so the title format doesn't depend on the machine's language settings
    mount({ project: makeProject(), view: 'week', date: '2026-10-07', locale: 'en-US', listeners: { dateChange: ({ date }) => changes.push(date.getDate()) } });
    expect(calendar.title).toMatch(/Oct 5/);
    calendar.next();
    expect(changes).toEqual([14]);
    calendar.setView('month');
    expect(calendar.title).toMatch(/October 2026/);
  });

  it('cleans up on destroy', () => {
    const host = mount({ project: makeProject() });
    calendar.destroy();
    calendar = null;
    expect(host.children).toHaveLength(0);
  });
});
