// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { Calendar, MiniMonth, Project, canMove, canResize, canReassign, listRange } from '../src/index.js';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let calendar;
let picker;
afterEach(() => {
  calendar?.destroy();
  picker?.destroy();
  calendar = picker = null;
  document.body.innerHTML = '';
});

const day = new Date(2026, 9, 12); // Monday 12 Oct 2026, local
const at = (hr, m = 0, d = day) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hr, m);
const host = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};
const mount = (config) => {
  const el = host();
  calendar = new Calendar({ appendTo: el, date: day, ...config });
  return el;
};
const flush = () => new Promise((r) => setTimeout(r, 40));

describe('MiniMonth', () => {
  it('renders a month with marks, day styles, titles and disabled days, and selects', () => {
    const onSelect = vi.fn();
    const el = host();
    picker = new MiniMonth({
      appendTo: el,
      selected: day,
      marks: (d) => (d.getDate() === 14 ? [{ color: 'teal' }, { color: '#f00' }] : []),
      dayStyle: (d) => (d.getDate() === 15 ? { background: 'rgb(1, 2, 3)' } : null),
      dayTitle: (d) => (d.getDate() === 15 ? '80% free' : null),
      disabled: (d) => d.getDate() === 16,
      onSelect,
    });
    expect(el.textContent).toContain('October 2026');
    const btn = (n) => [...el.querySelectorAll('.ck-mini-day:not(.ck-other-month)')].find((b) => b.querySelector('.ck-mini-num').textContent === String(n));
    expect(btn(12).classList.contains('ck-selected-day')).toBe(true);
    expect(btn(14).querySelectorAll('.ck-mini-mark').length).toBe(2);
    expect(btn(15).style.background).toBe('rgb(1, 2, 3)');
    expect(btn(15).title).toBe('80% free');
    expect(btn(16).disabled).toBe(true);
    btn(20).click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(+onSelect.mock.calls[0][0]).toBe(+new Date(2026, 9, 20));
    expect(btn(20).classList.contains('ck-selected-day')).toBe(true);
  });

  it('shows two months, moves, and reports month changes', () => {
    const onMonthChange = vi.fn();
    const el = host();
    picker = new MiniMonth({ appendTo: el, date: day, months: 2, onMonthChange });
    expect(el.textContent).toContain('October 2026');
    expect(el.textContent).toContain('November 2026');
    el.querySelector('[aria-label="Next month"]').click();
    expect(el.textContent).toContain('December 2026');
    expect(onMonthChange).toHaveBeenCalled();
    picker.setOptions({ selected: new Date(2027, 2, 3) });
    expect(el.textContent).toContain('March 2027');
  });

  it('has a strip layout on whole weeks', () => {
    const el = host();
    picker = new MiniMonth({ appendTo: el, selected: new Date(2026, 9, 14), layout: 'strip', stripDays: 7 });
    const days = el.querySelectorAll('.ck-mini-strip .ck-mini-day');
    expect(days.length).toBe(7);
    expect(days[0].querySelector('.ck-mini-num').textContent).toBe('12'); // Monday
    el.querySelector('[aria-label="Later days"]').click();
    expect(el.querySelector('.ck-mini-strip .ck-mini-num').textContent).toBe('19');
  });
});

describe('list view', () => {
  it('computes day / week / month ranges', () => {
    expect(+listRange(at(15), 'day').start).toBe(+at(0));
    expect(+listRange(new Date(2026, 9, 14), 'week', 1).start).toBe(+day);
    const m = listRange(day, 'month');
    expect(m.start.getDate()).toBe(1);
    expect(m.end.getMonth()).toBe(10);
  });

  it('lists events by day and clicks through eventClick', () => {
    const click = vi.fn(() => false);
    const el = mount({
      view: 'list',
      views: ['week', 'list'],
      project: { events: [{ id: 1, title: 'Ana Silva', start: at(10), end: at(10, 30) }, { id: 2, title: 'Clinic', start: at(9), end: at(13), display: 'background' }] },
      listeners: { eventClick: click },
    });
    expect(el.querySelectorAll('.ck-list-day').length).toBe(1);
    expect(el.textContent).toContain('Ana Silva');
    expect(el.querySelector('.ck-bg-item')).not.toBeNull();
    el.querySelector('.ck-event-list:not(.ck-bg-item)').click();
    expect(click).toHaveBeenCalled();
    expect(el.querySelector('.ck-editor, [role="dialog"]')).toBeNull();
  });

  it('shows the empty text when nothing is scheduled', () => {
    const el = mount({ view: 'list', listEmptyText: 'No appointments' });
    expect(el.textContent).toContain('No appointments');
  });
});

describe('create callbacks and editor: false', () => {
  it('select() fires and never opens the editor when editor is false', () => {
    const select = vi.fn();
    const el = mount({ view: 'week', editor: false, listeners: { select } });
    calendar.select({ start: at(10), end: at(11) }, null, 'drag');
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ allDay: false, source: 'drag' }));
    expect(el.querySelector('.ck-overlay')).toBeNull();
    calendar.eventClick({ id: 1, instanceId: '1' }, null);
    expect(el.querySelector('.ck-overlay')).toBeNull();
  });

  it('a select listener returning false stops the editor', () => {
    const el = mount({ view: 'week', listeners: { select: () => false } });
    calendar.select({ start: at(10), end: at(11) });
    expect(el.querySelector('.ck-overlay')).toBeNull();
  });

  it('dateClick reports date and resource', () => {
    const dateClick = vi.fn();
    mount({ listeners: { dateClick } });
    calendar.dateClick({ date: at(9), resourceId: 'r1' });
    expect(dateClick).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'r1', allDay: false }));
  });
});

describe('editor options', () => {
  it('hides sections, locks fields, renames buttons and adds actions', () => {
    const onView = vi.fn();
    const el = mount({
      view: 'day',
      project: { events: [{ id: 1, title: 'Ana', start: at(10), end: at(11), place: 'Room 2' }], resources: [{ id: 'a', name: 'Dr A' }] },
      editorSections: { title: false, allDay: false, color: false, repeat: false, notes: false },
      editorLabels: { delete: 'Cancel appointment', save: 'Move' },
      editorActions: [{ key: 'view', label: 'View details', onClick: onView }],
      editorFields: [{ name: 'place', label: 'Location', readOnly: true }],
      assigneeLabel: 'Clinician',
    });
    calendar.openEditor(1);
    const form = el.querySelector('.ck-editor');
    expect(form.querySelector('.ck-editor-title').disabled).toBe(true);
    expect(form.querySelector('[data-key="allDay"]')).toBeNull();
    expect(form.querySelector('.ck-swatches')).toBeNull();
    expect(form.querySelector('.ck-repeat')).toBeNull();
    expect(form.querySelector('[data-key="notes"]')).toBeNull();
    expect(form.querySelector('[data-key="x-place"]').disabled).toBe(true);
    expect(form.textContent).toContain('Clinician');
    const buttons = [...form.querySelectorAll('.ck-dialog-foot button')].map((b) => b.textContent);
    expect(buttons).toEqual(['Cancel appointment', 'View details', 'Cancel', 'Move']);
    form.querySelector('[data-key="action-view"]').click();
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ event: expect.objectContaining({ masterId: 1 }) }));
    calendar.closeEditor();
    expect(el.querySelector('.ck-editor')).toBeNull();
  });

  it('editorReadOnly shows the event without a save button', () => {
    const el = mount({ view: 'day', project: { events: [{ id: 1, title: 'Ana', start: at(10), end: at(11) }] }, editorReadOnly: true });
    calendar.openEditor(1);
    expect(el.querySelector('.ck-editor button[type="submit"]')).toBeNull();
    expect(el.querySelector('[data-key="startTime"]').disabled).toBe(true);
  });
});

describe('per-event permissions', () => {
  it('reads editable and the specific flags', () => {
    expect(canMove({})).toBe(true);
    expect(canMove({ editable: false })).toBe(false);
    expect(canMove({ editable: false, startEditable: true })).toBe(true);
    expect(canResize({ durationEditable: false })).toBe(false);
    expect(canReassign({ resourceEditable: false, editable: true })).toBe(false);
  });

  it('commitChange refuses moves, resizes and reassignments that are not allowed', async () => {
    const project = new Project({ events: [{ id: 1, title: 'Locked', start: at(10), end: at(11), editable: false }, { id: 2, title: 'Fixed person', start: at(12), end: at(13), resourceId: 'a', resourceEditable: false }] });
    mount({ project });
    const inst = (id) => calendar.instances.find((i) => i.masterId === id);
    expect(await calendar.commitChange({ type: 'move', instance: inst(1), changes: { start: at(11), end: at(12) } })).toBe(false);
    expect(await calendar.commitChange({ type: 'resize', instance: inst(1), changes: { start: at(10), end: at(12) } })).toBe(false);
    expect(await calendar.commitChange({ type: 'move', instance: inst(2), changes: { start: at(12), end: at(13), resourceId: 'b' } })).toBe(false);
    expect(await calendar.commitChange({ type: 'move', instance: inst(2), changes: { start: at(14), end: at(15) } })).toBe(true);
  });

  it('hides resize handles on events that cannot be resized', () => {
    const el = mount({ view: 'day', project: { events: [{ id: 1, title: 'A', start: at(10), end: at(11), durationEditable: false }] } });
    expect(el.querySelector('.ck-event .ck-resize')).toBeNull();
  });
});

describe('background events', () => {
  const events = [
    { id: 's1', title: 'Morning clinic', start: at(9), end: at(12), display: 'background', resourceIds: ['a', 'b'] },
    { id: 1, title: 'Ana Silva', start: at(10), end: at(10, 30), resourceId: 'a' },
  ];
  const resources = [{ id: 'a', name: 'Dr A' }, { id: 'b', name: 'Dr B' }, { id: 'c', name: 'Dr C' }];

  it('draws behind events in day and week views, outside the lane layout', () => {
    const el = mount({ view: 'day', project: { events, resources } });
    const bg = el.querySelector('.ck-event-bg');
    expect(bg).not.toBeNull();
    expect(bg.textContent).toContain('Morning clinic');
    // the appointment keeps the full column width
    const ev = [...el.querySelectorAll('.ck-event-timed')].find((e) => e.textContent.includes('Ana Silva'));
    expect(ev.style.width).toContain('100%');
  });

  it('a plain click inside the block opens it through eventClick', () => {
    const eventClick = vi.fn(() => false);
    const dateClick = vi.fn();
    const el = mount({ view: 'day', project: { events, resources }, listeners: { eventClick, dateClick } });
    const col = el.querySelector('.ck-tg-col');
    col.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 1152, width: 200, height: 1152 });
    const y = 11 * 48; // 11:00, inside the 09:00–12:00 block, outside the 10:00 appointment
    col.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: y, pointerType: 'mouse' }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 50, clientY: y }));
    expect(eventClick).toHaveBeenCalledWith(expect.objectContaining({ event: expect.objectContaining({ masterId: 's1' }) }));
    expect(dateClick).not.toHaveBeenCalled();
  });

  it('shades only its resources rows in the timeline', () => {
    const el = mount({ view: 'timeline', project: { events, resources } });
    const rows = [...el.querySelectorAll('.ck-tl-row')];
    const has = (name) => rows.find((r) => r.textContent.includes(name)).querySelector('.ck-event-bg') != null;
    expect(has('Dr A')).toBe(true);
    expect(has('Dr B')).toBe(true);
    expect(has('Dr C')).toBe(false);
  });
});

describe('range-driven data', () => {
  it('emits rangeChange and loads from eventSource on mount and navigation', async () => {
    const ranges = [];
    const eventSource = vi.fn(async ({ start }) => [{ id: `e${+start}`, title: `Loaded ${start.getDate()}`, start: at(10, 0, start), end: at(11, 0, start) }]);
    const el = mount({ view: 'week', eventSource, listeners: { rangeChange: ({ start, view }) => ranges.push([start.getDate(), view]) } });
    await flush();
    expect(eventSource).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain('Loaded 12');
    calendar.next();
    await flush();
    expect(eventSource).toHaveBeenCalledTimes(2);
    calendar.setConfig({ view: 'month' });
    await flush();
    expect(ranges.map((r) => r[1])).toEqual(['week', 'week', 'month']);
    calendar.refetch();
    await flush();
    expect(eventSource).toHaveBeenCalledTimes(4);
  });

  it('ignores an older response that arrives after a newer one', async () => {
    let resolveFirst;
    const eventSource = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(async () => [{ id: 'new', title: 'Newer', start: at(9), end: at(10) }]);
    const el = mount({ view: 'day', eventSource });
    calendar.refetch();
    await flush();
    resolveFirst([{ id: 'old', title: 'Older', start: at(9), end: at(10) }]);
    await flush();
    expect(el.textContent).toContain('Newer');
    expect(el.textContent).not.toContain('Older');
  });

  it('aborts a superseded load and keeps what is shown when the source returns null', async () => {
    const signals = [];
    let call = 0;
    const eventSource = vi.fn(async ({ signal }) => {
      signals.push(signal);
      call += 1;
      if (call === 1) return [{ id: 'a', title: 'First', start: at(9), end: at(10) }];
      if (call === 2) return new Promise(() => {}); // never answers
      return null;
    });
    const el = mount({ view: 'day', eventSource });
    await flush();
    expect(el.textContent).toContain('First');
    calendar.refetch();
    calendar.refetch();
    await flush();
    expect(signals[1].aborted).toBe(true);
    expect(signals[2].aborted).toBe(false);
    expect(el.textContent).toContain('First');
  });

  it('works out the adjacent ranges', () => {
    mount({ view: 'week' });
    const [prev, next] = calendar.adjacentRanges();
    expect(prev.start.getDate()).toBe(5);
    expect(next.start.getDate()).toBe(19);
    expect(calendar.rangeFor(new Date(2026, 10, 3), 'month').start.getDate()).toBe(26);
  });

  it('setConfig({ view }) emits viewChange', () => {
    const viewChange = vi.fn();
    mount({ listeners: { viewChange } });
    calendar.setConfig({ view: 'month' });
    expect(viewChange).toHaveBeenCalledWith(expect.objectContaining({ view: 'month' }));
  });
});

describe('eventRenderer', () => {
  it('is told when the block is short', () => {
    const seen = [];
    mount({ view: 'day', project: { events: [{ id: 1, title: 'Short', start: at(10), end: at(10, 20) }, { id: 2, title: 'Long', start: at(12), end: at(14) }] }, eventRenderer: ({ event, compact }) => (seen.push([event.title, compact]), null) });
    expect(seen).toContainEqual(['Short', true]);
    expect(seen).toContainEqual(['Long', false]);
  });
});

describe('people list in the sidebar', () => {
  it('folds and opens from its heading, keeping the choices', () => {
    const el = mount({ project: { resources: [{ id: 'a', name: 'Dr A' }, { id: 'b', name: 'Dr B' }] }, resourceFilterCollapsed: true });
    expect(el.querySelector('.ck-filter-list')).toBeNull();
    expect(el.querySelector('.ck-filter-count').textContent).toBe('2');
    el.querySelector('[data-key="filter-toggle"]').click();
    expect(el.querySelectorAll('.ck-filter-list li').length).toBe(2);
    calendar.setResourceVisible('a', false);
    calendar.toggleResourceFilter(true);
    expect(el.querySelector('.ck-filter-count').textContent).toBe('1 of 2');
  });
});

describe('people list: search, group and order (0.2.1)', () => {
  const people = [
    { id: 1, name: 'Zara Khan', role: 'Surgeon' },
    { id: 2, name: 'Amir Patel', role: 'Nurse' },
    { id: 3, name: 'Beth Lee', role: 'Surgeon' },
    { id: 4, name: 'Cara Diaz', role: 'Coordinator' },
    { id: 5, name: 'Dan Wu', role: 'Nurse' },
    { id: 6, name: 'Eve Roy' },
    { id: 7, name: 'Finn Ash', role: 'Nurse' },
    { id: 8, name: 'Gail Ott', role: 'Surgeon' },
    { id: 9, name: 'Hugo Ma', role: 'Coordinator' },
  ];
  const names = (el) => [...el.querySelectorAll('.ck-filter-name')].map((n) => n.textContent);
  const opts = { project: { resources: people }, resourceGroupBy: 'role', resourceGroupLabel: 'Role' };

  it('shows a search box over 8 people and narrows the list by name or role, not the calendar', () => {
    const el = mount(opts);
    const search = el.querySelector('[data-key="filter-search"]');
    expect(search).not.toBeNull();
    search.focus();
    search.value = 'nur';
    search.dispatchEvent(new Event('input'));
    expect(names(el)).toEqual(['Amir Patel', 'Dan Wu', 'Finn Ash']);
    expect(calendar.hiddenResources.size).toBe(0);
    expect(document.activeElement?.dataset.key).toBe('filter-search');
    calendar.setResourceQuery('nobody');
    expect(el.querySelector('.ck-filter-empty').textContent).toBe('No people match');
  });

  it('no search box for a short list unless asked', () => {
    const el = mount({ project: { resources: people.slice(0, 3) } });
    expect(el.querySelector('[data-key="filter-search"]')).toBeNull();
    calendar.setConfig({ resourceSearch: true });
    expect(el.querySelector('[data-key="filter-search"]')).not.toBeNull();
  });

  it('filters by role, with counts, and "Show only these" keeps just that role on the calendar', () => {
    const el = mount(opts);
    const select = el.querySelector('[data-key="filter-group"]');
    expect([...select.options].map((o) => o.textContent)).toEqual(['Every role', 'Coordinator (2)', 'Nurse (3)', 'Surgeon (3)']);
    calendar.setResourceGroup('Surgeon');
    expect(names(el)).toEqual(['Beth Lee', 'Gail Ott', 'Zara Khan']);
    el.querySelector('[data-key="filter-only"]').click();
    expect([...calendar.hiddenResources].sort()).toEqual([2, 4, 5, 6, 7, 9]);
    calendar.setResourceGroup('');
    expect(el.querySelector('[data-key="filter-all"]').textContent).toBe('Show all');
  });

  it('sorts Z–A, and by role with headings (people without one last)', () => {
    const el = mount(opts);
    calendar.setResourceSort('name-desc');
    expect(names(el)[0]).toBe('Zara Khan');
    calendar.setResourceSort('group');
    const headings = [...el.querySelectorAll('.ck-filter-heading')].map((n) => n.textContent);
    expect(headings).toEqual(['Coordinator', 'Nurse', 'Surgeon', 'No role']);
    expect(names(el).slice(0, 2)).toEqual(['Cara Diaz', 'Hugo Ma']);
    expect(names(el).at(-1)).toBe('Eve Roy');
  });

  it('without resourceGroupBy there is no role filter or sort', () => {
    const el = mount({ project: { resources: people } });
    expect(el.querySelector('[data-key="filter-group"]')).toBeNull();
    expect(el.querySelector('[data-key="filter-search"]')).not.toBeNull();
  });
});

describe('scale', () => {
  it('multiplies hour height and sets --ck-scale', () => {
    const el = mount({ view: 'day', hourHeight: 48, scale: 1.5 });
    expect(calendar.metrics.hourHeight).toBe(72);
    expect(el.querySelector('.ck-root').style.getPropertyValue('--ck-scale')).toBe('1.5');
    expect(el.querySelector('.ck-tg-body').style.height).toBe(`${24 * 72}px`);
  });

  it("'auto' stays 1 on a narrow calendar", () => {
    mount({ scale: 'auto' });
    expect(calendar.scale).toBe(1);
  });
});

describe('now, toolbar and tooltip options', () => {
  it('renames view buttons with viewLabels', () => {
    const el = mount({ views: ['day', 'timeline', 'list'], viewLabels: { timeline: 'Clinicians', list: 'Agenda' } });
    const labels = [...el.querySelectorAll('.ck-segmented button')].map((b) => b.textContent);
    expect(labels).toEqual(['Day', 'Clinicians', 'Agenda']);
  });

  it('uses config.now for today', () => {
    mount({ now: () => new Date(2027, 0, 5, 9) });
    calendar.today();
    expect(calendar.date.getFullYear()).toBe(2027);
  });

  it('hides the toolbar and the now line', () => {
    const el = mount({ view: 'day', date: new Date(), showToolbar: false, nowIndicator: false });
    expect(el.querySelector('.ck-toolbar').hidden).toBe(true);
    expect(el.querySelector('.ck-now')).toBeNull();
  });
});

describe('undo / redo through beforeEventChange', () => {
  it('passes undo to listeners and drops the step when refused', async () => {
    const seen = [];
    let refuse = false;
    const project = new Project({ events: [{ id: 1, title: 'A', start: at(10), end: at(11) }] });
    mount({ project, listeners: { beforeEventChange: (c) => (seen.push([c.type, c.source]), !refuse) } });
    const inst = calendar.instances[0];
    await calendar.commitChange({ type: 'move', instance: inst, changes: { start: at(12), end: at(13) } });
    expect(project.getEvent(1).start.getHours()).toBe(12);

    expect(await calendar.undo()).toBe(true);
    expect(project.getEvent(1).start.getHours()).toBe(10);
    expect(seen.at(-1)).toEqual(['move', 'undo']);

    refuse = true;
    expect(await calendar.redo()).toBe(false);
    expect(project.canRedo).toBe(false);
    expect(project.getEvent(1).start.getHours()).toBe(10);
  });

  it('keeps history across eventSource reloads', async () => {
    let n = 0;
    const eventSource = async () => [{ id: 1, title: `Load ${++n}`, start: at(10), end: at(11) }];
    mount({ view: 'day', eventSource });
    await flush();
    await calendar.commitChange({ type: 'move', instance: calendar.instances[0], changes: { start: at(12), end: at(13) } });
    calendar.refetch();
    await flush();
    expect(calendar.project.canUndo).toBe(true);
  });
});
