// Sample CRM data, generated relative to the current week so the demo always looks lived-in.
import { addDays, atMinutes, startOfWeek } from '../src/core/date.js';

export const resources = [
  { id: 'r1', name: 'Maya Fernandes', role: 'Account executive', color: 'cobalt' },
  { id: 'r2', name: 'Jonah Weiss', role: 'Account executive', color: 'teal' },
  { id: 'r3', name: 'Ines Okafor', role: 'Solutions engineer', color: 'plum' },
  { id: 'r4', name: 'Arjun Mehta', role: 'Sales development', color: 'amber' },
  { id: 'r5', name: 'Lena Novak', role: 'Customer success', color: 'rose' },
  { id: 'r6', name: 'Diego Ruiz', role: 'Sales development', color: 'green' },
  { id: 'r7', name: 'Hana Sato', role: 'Account manager', color: 'coral' },
  { id: 'r8', name: 'Tom Becker', role: 'Sales lead', color: 'slate' },
];

export const editorFields = [
  { name: 'customer', label: 'Customer', placeholder: 'Company name' },
  { name: 'stage', label: 'Deal stage', type: 'select', options: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won'] },
  { name: 'meetingType', label: 'Meeting type', type: 'select', options: ['Call', 'Video', 'On-site'] },
];

const COMPANIES = ['Globex', 'Initech', 'Umbrella Health', 'Stark Logistics', 'Wayne Retail', 'Hooli', 'Vandelay Imports', 'Soylent Foods', 'Cyberdyne', 'Tyrell Labs', 'Pied Piper', 'Massive Dynamic'];
const KINDS = [
  { title: (c) => `Discovery call: ${c}`, minutes: 30, stage: 'Lead', meetingType: 'Call' },
  { title: (c) => `Product demo: ${c}`, minutes: 60, stage: 'Qualified', meetingType: 'Video' },
  { title: (c) => `Proposal review: ${c}`, minutes: 45, stage: 'Proposal', meetingType: 'Video' },
  { title: (c) => `Contract terms: ${c}`, minutes: 60, stage: 'Negotiation', meetingType: 'Call' },
  { title: (c) => `On-site visit: ${c}`, minutes: 120, stage: 'Qualified', meetingType: 'On-site' },
  { title: (c) => `QBR: ${c}`, minutes: 60, stage: 'Won', meetingType: 'Video' },
  { title: (c) => `Follow-up: ${c}`, minutes: 30, stage: 'Proposal', meetingType: 'Call' },
];

// deterministic pseudo-random so the layout is stable between reloads
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function makeEvents(today = new Date()) {
  const week = startOfWeek(today, 1);
  const rand = rng(42);
  const events = [];
  let id = 1;
  const at = (dayOffset, h, m = 0) => atMinutes(addDays(week, dayOffset), h * 60 + m);

  // meetings for each rep over three weeks (previous, current, next)
  for (let w = -1; w <= 1; w++) {
    for (const r of resources) {
      for (let day = 0; day < 5; day++) {
        const count = 1 + Math.floor(rand() * 2.4);
        const used = [];
        for (let i = 0; i < count; i++) {
          const kind = KINDS[Math.floor(rand() * KINDS.length)];
          const company = COMPANIES[Math.floor(rand() * COMPANIES.length)];
          let hour = 9 + Math.floor(rand() * 8);
          if (used.includes(hour)) hour = Math.min(17, hour + 1);
          used.push(hour);
          const start = at(w * 7 + day, hour, rand() < 0.4 ? 30 : 0);
          events.push({
            id: id++,
            title: kind.title(company),
            start,
            end: new Date(start.getTime() + kind.minutes * 60000),
            resourceId: r.id,
            customer: company,
            stage: kind.stage,
            meetingType: kind.meetingType,
          });
        }
      }
    }
  }

  // recurring: team pipeline review, SDR standups, a monthly forecast
  events.push({ id: id++, title: 'Pipeline review', start: at(-14, 10), end: at(-14, 11), resourceId: 'r8', rrule: 'FREQ=WEEKLY;BYDAY=MO', notes: 'Walk through every deal in Negotiation.' });
  events.push({ id: id++, title: 'SDR standup', start: at(-14, 9, 0), end: at(-14, 9, 15), resourceId: 'r4', rrule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR', color: 'slate' });
  events.push({ id: id++, title: 'SDR standup', start: at(-14, 9, 0), end: at(-14, 9, 15), resourceId: 'r6', rrule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR', color: 'slate' });
  events.push({ id: id++, title: 'Forecast call', start: at(-21, 16), end: at(-21, 17), resourceId: 'r8', rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TH' });
  events.push({ id: id++, title: 'Customer health check', start: at(-7, 14), end: at(-7, 14, 45), resourceId: 'r5', rrule: 'FREQ=WEEKLY;BYDAY=TU,TH;COUNT=12' });

  // all-day and multi-day
  events.push({ id: id++, title: 'SaaS Connect trade show', allDay: true, start: addDays(week, 2), end: addDays(week, 4), resourceId: 'r2' });
  events.push({ id: id++, title: 'Quarter-end push', allDay: true, start: addDays(week, 7), end: addDays(week, 12), color: 'rose' });
  events.push({ id: id++, title: 'Annual leave', allDay: true, start: addDays(week, 3), end: addDays(week, 5), resourceId: 'r7', color: 'slate' });

  // unassigned inbound leads waiting for an owner
  events.push({ id: id++, title: 'Inbound lead: Hooli', start: at(1, 15), end: at(1, 15, 30), stage: 'Lead', customer: 'Hooli' });
  events.push({ id: id++, title: 'Inbound lead: Cyberdyne', start: at(2, 11), end: at(2, 11, 30), stage: 'Lead', customer: 'Cyberdyne' });
  events.push({ id: id++, title: 'Callback request: Initech', start: at(3, 16), end: at(3, 16, 30), stage: 'Qualified', customer: 'Initech' });

  return events;
}

/** Big synthetic dataset for the performance check. */
export function makeStressData(people = 300, perPerson = 20, today = new Date()) {
  const week = startOfWeek(today, 1);
  const rand = rng(7);
  const colors = ['cobalt', 'teal', 'plum', 'amber', 'rose', 'green', 'coral', 'slate'];
  const res = Array.from({ length: people }, (_, i) => ({ id: `s${i}`, name: `Rep ${String(i + 1).padStart(3, '0')}`, role: i % 3 ? 'Field sales' : 'Inside sales', color: colors[i % colors.length] }));
  const events = [];
  for (const r of res) {
    for (let i = 0; i < perPerson; i++) {
      const start = atMinutes(addDays(week, Math.floor(rand() * 7)), (7 + Math.floor(rand() * 12)) * 60);
      events.push({ id: `${r.id}-${i}`, title: `Visit ${COMPANIES[Math.floor(rand() * COMPANIES.length)]}`, start, end: new Date(start.getTime() + (30 + Math.floor(rand() * 4) * 30) * 60000), resourceId: r.id });
    }
  }
  return { resources: res, events };
}
