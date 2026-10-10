import { describe, it, expect } from 'vitest';
import {
  Project, CrudManager, createMemoryTransport, parseRRule, stringifyRRule, describeRRule, expandRecurring,
  layoutTimeGridColumn, layoutDayRow, layoutLanes, findRowIndex, isPhantomId,
} from '../src/core/index.js';
import { dateKey, addDays } from '../src/core/date.js';

const d = (s) => new Date(s); // local time when no offset given

describe('recurrence', () => {
  it('round-trips RRULE strings', () => {
    const s = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10';
    expect(stringifyRRule(parseRRule(s))).toBe(s);
    expect(parseRRule('RRULE:FREQ=DAILY').freq).toBe('DAILY');
    expect(parseRRule('FREQ=NOPE')).toBeNull();
  });

  it('expands weekly BYDAY with COUNT', () => {
    const ev = { start: d('2026-10-05T10:00'), end: d('2026-10-05T11:00'), rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=5' };
    const occ = expandRecurring(ev, d('2026-10-01'), d('2026-11-01'));
    expect(occ.map((o) => o.key)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14']);
    expect(occ[1].start.getHours()).toBe(10);
  });

  it('skips exception dates and respects UNTIL', () => {
    const ev = {
      start: d('2026-10-01T09:00'), end: d('2026-10-01T09:30'),
      rrule: 'FREQ=DAILY;UNTIL=20261005T235959Z', exceptionDates: ['2026-10-03'],
    };
    const keys = expandRecurring(ev, d('2026-09-01'), d('2026-12-01')).map((o) => o.key);
    expect(keys).toEqual(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05']);
  });

  it('supports monthly nth weekday and last weekday', () => {
    const ev = { start: d('2026-01-13T09:00'), end: d('2026-01-13T10:00'), rrule: 'FREQ=MONTHLY;BYDAY=2TU' };
    const keys = expandRecurring(ev, d('2026-01-01'), d('2026-05-01')).map((o) => o.key);
    expect(keys).toEqual(['2026-01-13', '2026-02-10', '2026-03-10', '2026-04-14']);
    const last = { start: d('2026-01-30T09:00'), end: d('2026-01-30T10:00'), rrule: 'FREQ=MONTHLY;BYDAY=-1FR' };
    expect(expandRecurring(last, d('2026-02-01'), d('2026-03-01')).map((o) => o.key)).toEqual(['2026-02-27']);
  });

  it('skips months without the day (31st) and fast-forwards far ranges', () => {
    const ev = { start: d('2026-01-31T09:00'), end: d('2026-01-31T10:00'), rrule: 'FREQ=MONTHLY' };
    const keys = expandRecurring(ev, d('2026-01-01'), d('2026-06-01')).map((o) => o.key);
    expect(keys).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
    const daily = { start: d('2020-01-01T09:00'), end: d('2020-01-01T10:00'), rrule: 'FREQ=DAILY' };
    const t = performance.now();
    const far = expandRecurring(daily, d('2030-03-01'), d('2030-03-08'));
    expect(far).toHaveLength(7);
    expect(performance.now() - t).toBeLessThan(50);
  });

  it('describes rules in plain language', () => {
    expect(describeRRule('FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR', d('2026-10-05'), 'en-US')).toBe('Every weekday');
    expect(describeRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10', d('2026-10-05'), 'en-US')).toBe('Every 2 weeks on Mon, Wed, 10 times');
    expect(describeRRule('FREQ=MONTHLY;BYDAY=2TU', d('2026-10-13'), 'en-US')).toBe('Every month on the second Tuesday');
  });
});

describe('layout', () => {
  it('splits overlapping timed events into columns and lets free ones widen', () => {
    const day = d('2026-10-05T00:00');
    const items = [
      { id: 'a', start: d('2026-10-05T09:00'), end: d('2026-10-05T11:00') },
      { id: 'b', start: d('2026-10-05T09:30'), end: d('2026-10-05T10:00') },
      { id: 'c', start: d('2026-10-05T10:00'), end: d('2026-10-05T10:30') },
      { id: 'z', start: d('2026-10-05T14:00'), end: d('2026-10-05T15:00') },
    ];
    const segs = Object.fromEntries(layoutTimeGridColumn(items, day, addDays(day, 1)).map((s) => [s.item.id, s]));
    expect(segs.a.width).toBe(0.5);
    expect(segs.b.left).toBe(0.5);
    expect(segs.c.left).toBe(0.5);
    expect(segs.z.width).toBe(1);
    expect(segs.a.startMin).toBe(540);
  });

  it('lays out multi-day bars in lanes, with exclusive midnight ends', () => {
    const week = d('2026-10-05T00:00');
    const { segments, laneCount } = layoutDayRow([
      { id: 'trip', allDay: true, start: d('2026-10-05T00:00'), end: d('2026-10-08T00:00') },
      { id: 'one', allDay: true, start: d('2026-10-06T00:00'), end: d('2026-10-07T00:00') },
      { id: 'late', allDay: true, start: d('2026-10-09T00:00'), end: d('2026-10-10T00:00') },
    ], week, 7);
    const by = Object.fromEntries(segments.map((s) => [s.item.id, s]));
    expect([by.trip.startCol, by.trip.endCol, by.trip.lane]).toEqual([0, 2, 0]);
    expect(by.one.lane).toBe(1);
    expect(by.late.lane).toBe(0);
    expect(laneCount).toBe(2);
  });

  it('stacks timeline lanes and finds rows', () => {
    const { placed, laneCount } = layoutLanes([
      { start: 0, end: 10 }, { start: 5, end: 8 }, { start: 10, end: 12 },
    ].map((x) => ({ start: new Date(x.start), end: new Date(x.end) })));
    expect(laneCount).toBe(2);
    expect(placed.map((p) => p.lane)).toEqual([0, 1, 0]);
    expect(findRowIndex([0, 44, 88, 150], 100)).toBe(2);
    expect(findRowIndex([0, 44, 88, 150], 0)).toBe(0);
  });
});

const seed = () => new Project({
  resources: [{ id: 'r1', name: 'Asha' }, { id: 'r2', name: 'Ben' }],
  events: [
    { id: 1, title: 'Call', start: '2026-10-05T10:00', end: '2026-10-05T11:00', resourceId: 'r1' },
    { id: 2, title: 'Standup', start: '2026-10-05T09:00', end: '2026-10-05T09:15', resourceId: 'r2', rrule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR' },
  ],
});

describe('Project', () => {
  it('adds, edits, removes with undo/redo', () => {
    const p = seed();
    const ev = p.addEvent({ title: 'Demo', start: d('2026-10-06T12:00'), end: d('2026-10-06T13:00') });
    expect(isPhantomId(ev.id)).toBe(true);
    p.updateEvent(1, { title: 'Call Acme' });
    p.removeEvent(1);
    expect(p.getEvent(1)).toBeNull();
    p.undo();
    expect(p.getEvent(1).title).toBe('Call Acme');
    p.undo();
    expect(p.getEvent(1).title).toBe('Call');
    p.redo();
    expect(p.getEvent(1).title).toBe('Call Acme');
    expect(p.undoLabel).toBe('Edit event');
  });

  it('groups transactions into one undo step and rolls back on error', () => {
    const p = seed();
    const v = p.version;
    p.transaction(() => {
      p.updateEvent(1, { title: 'A' });
      p.updateEvent(1, { resourceId: 'r2' });
    }, 'Reassign');
    expect(p.version).toBe(v + 1);
    p.undo();
    expect(p.getEvent(1)).toMatchObject({ title: 'Call', resourceId: 'r1' });
    expect(() => p.transaction(() => { p.updateEvent(1, { title: 'X' }); throw new Error('boom'); })).toThrow('boom');
    expect(p.getEvent(1).title).toBe('Call');
  });

  it('expands recurring events and edits a single occurrence', () => {
    const p = seed();
    const week = p.getEventsInRange(d('2026-10-05'), d('2026-10-12'), { resourceIds: ['r2'] });
    expect(week).toHaveLength(5);
    const wed = week[2];
    expect(wed.isOccurrence).toBe(true);
    p.updateOccurrence(wed, { start: d('2026-10-07T15:00'), end: d('2026-10-07T15:30'), title: 'Moved standup' }, 'this');
    const after = p.getEventsInRange(d('2026-10-05'), d('2026-10-12'), { resourceIds: ['r2'] });
    expect(after).toHaveLength(5);
    const moved = after.find((e) => e.title === 'Moved standup');
    expect(moved.isOccurrence).toBe(false);
    expect(moved.recurringEventId).toBe(2);
    expect(p.getEvent(2).exceptionDates).toEqual(['2026-10-07']);
    p.undo();
    expect(p.getEvent(2).exceptionDates).toEqual([]);
    expect(p.events).toHaveLength(2);
  });

  it('moves a whole series and splits a series ("this and following")', () => {
    const p = seed();
    const [mon] = p.getEventsInRange(d('2026-10-05'), d('2026-10-06'), { resourceIds: ['r2'] });
    p.updateOccurrence(mon, { start: d('2026-10-05T09:30'), end: d('2026-10-05T09:45') }, 'all');
    expect(p.getEvent(2).start.getHours()).toBe(9);
    expect(p.getEvent(2).start.getMinutes()).toBe(30);

    const thu = p.getEventsInRange(d('2026-10-08'), d('2026-10-09'), { resourceIds: ['r2'] })[0];
    const created = p.updateOccurrence(thu, { title: 'New standup' }, 'future');
    const range = p.getEventsInRange(d('2026-10-05'), d('2026-10-17'), { resourceIds: ['r2'] });
    expect(range.filter((e) => e.masterId === 2).map((e) => dateKey(e.start))).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(range.filter((e) => e.masterId === created.id)).toHaveLength(7);
    expect(range.every((e) => e.start.getMinutes() === 30)).toBe(true);
  });

  it('shifts BYDAY when a weekly series moves to another weekday', () => {
    const p = new Project({ events: [{ id: 'w', start: '2026-10-05T10:00', end: '2026-10-05T11:00', rrule: 'FREQ=WEEKLY;BYDAY=MO' }] });
    const [mon] = p.getEventsInRange(d('2026-10-05'), d('2026-10-06'));
    p.updateOccurrence(mon, { start: d('2026-10-07T10:00'), end: d('2026-10-07T11:00') }, 'all');
    expect(p.getEvent('w').rrule).toBe('FREQ=WEEKLY;BYDAY=WE');
    expect(p.getEventsInRange(d('2026-10-12'), d('2026-10-19')).map((e) => dateKey(e.start))).toEqual(['2026-10-14']);
  });

  it('normalizes all-day events to whole days', () => {
    const p = new Project();
    const ev = p.addEvent({ title: 'Offsite', allDay: true, start: '2026-10-05T13:00', end: '2026-10-06T10:00' });
    expect(dateKey(ev.start)).toBe('2026-10-05');
    expect(dateKey(ev.end)).toBe('2026-10-07');
    expect(ev.start.getHours()).toBe(0);
  });

  it('finds resource conflicts', () => {
    const p = seed();
    expect(p.getConflicts({ resourceId: 'r1', start: d('2026-10-05T10:30'), end: d('2026-10-05T12:00') })).toHaveLength(1);
    expect(p.getConflicts({ resourceId: 'r1', start: d('2026-10-05T10:30'), end: d('2026-10-05T12:00'), ignoreId: 1 })).toHaveLength(0);
  });

  it('tracks changes for sync', () => {
    const p = seed();
    expect(p.hasChanges).toBe(false);
    const ev = p.addEvent({ title: 'New', start: d('2026-10-06T12:00') });
    p.updateEvent(ev.id, { title: 'New 2' }); // still just "added"
    p.updateEvent(1, { title: 'Changed' });
    p.removeEvent(2);
    const ch = p.getChanges();
    expect(ch.events.added).toHaveLength(1);
    expect(ch.events.added[0]).toMatchObject({ $phantomId: ev.id, title: 'New 2' });
    expect(ch.events.added[0].id).toBeUndefined();
    expect(ch.events.updated).toEqual([{ id: 1, title: 'Changed' }]);
    expect(ch.events.removed).toEqual([{ id: 2 }]);
    p.removeEvent(ev.id);
    expect(p.getChanges().events.added).toBeUndefined();
  });
});

describe('CrudManager', () => {
  it('syncs, remaps phantom ids everywhere and keeps undo working', async () => {
    const transport = createMemoryTransport({ latency: 1 });
    const p = new Project();
    const crud = new CrudManager(p, { transport });
    const res = p.addResource({ name: 'Cara' });
    const ev = p.addEvent({ title: 'Kickoff', start: d('2026-10-06T12:00'), resourceId: res.id });
    await crud.sync();
    expect(p.hasChanges).toBe(false);
    const [serverEvent] = p.events;
    expect(serverEvent.id).toMatch(/^ev-/);
    expect(serverEvent.resourceId).toMatch(/^res-/);
    expect(p.getEvent(ev.id)).toBeNull();
    expect(transport.db.events.get(serverEvent.id).resourceId).toBe(serverEvent.resourceId);
    // undo the add -> removal uses the server id
    p.undo();
    expect(p.getChanges().events.removed).toEqual([{ id: serverEvent.id }]);
  });

  it('restores changes when sync fails and queues edits made during a request', async () => {
    let fail = true;
    const transport = { load: async () => ({}), sync: async () => { await new Promise((r) => setTimeout(r, 5)); if (fail) throw new Error('offline'); return { success: true }; } };
    const p = seed();
    const crud = new CrudManager(p, { transport });
    p.updateEvent(1, { title: 'One' });
    const pending = crud.sync();
    p.updateEvent(1, { notes: 'typed while saving' });
    await expect(pending).rejects.toThrow('offline');
    expect(crud.status).toBe('error');
    expect(p.getChanges().events.updated[0]).toMatchObject({ id: 1, title: 'One', notes: 'typed while saving' });
    fail = false;
    await crud.sync();
    expect(p.hasChanges).toBe(false);
  });

  it('loads data from the transport', async () => {
    const transport = createMemoryTransport({ latency: 1, data: { resources: [{ id: 'x', name: 'X' }], events: [{ id: 'e', title: 'E', start: '2026-10-05T10:00', end: '2026-10-05T11:00', resourceId: 'x' }] } });
    const p = new Project();
    await new CrudManager(p, { transport }).load();
    expect(p.resources).toHaveLength(1);
    expect(p.getEvent('e').start).toBeInstanceOf(Date);
  });
});
