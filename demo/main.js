// Demo: ChronoKit inside a sample sales CRM, written the way you would use it
// in your own app: plain JavaScript, native ES module imports, no build step.

import { Calendar, CrudManager, Project, createMemoryTransport, h } from '../src/index.js';
import { resources, editorFields, makeEvents, makeStressData } from './data.js';

// ---------------------------------------------------------------- data + "server"

const log = [];
let seq = 0;
const project = new Project();
const transport = createMemoryTransport({
  latency: 350,
  data: { resources, events: makeEvents() },
  onRequest: ({ type, request, response }) => {
    log.unshift({ n: ++seq, type, request, response, time: new Date().toLocaleTimeString() });
    log.length = Math.min(log.length, 12);
    renderLog();
  },
});
const realSync = transport.sync;
const crud = new CrudManager(project, { transport, autoSync: true, autoSyncDelay: 700 });

// ---------------------------------------------------------------- demo settings (sidebar)

const settings = { noDoubleBooking: true, autoSave: true, failSaves: false, stress: false };
const prefersDark = () => {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};
let dark = prefersDark();

const toggle = (label, checked, onChange) =>
  h('label', null, h('input', { type: 'checkbox', checked, onChange: (e) => onChange(e.target.checked) }), ` ${label}`);

const stressBtn = h('button', { type: 'button', class: 'demo-btn', onClick: () => toggleStress() }, 'Load 300 people, 6,000 events');
const settingsPanel = h(
  'div',
  { class: 'demo-settings' },
  h('div', { class: 'demo-settings-title' }, 'Demo settings'),
  toggle('Prevent double-booking', settings.noDoubleBooking, (v) => (settings.noDoubleBooking = v)),
  toggle('Save automatically', settings.autoSave, (v) => crud.setAutoSync((settings.autoSave = v))),
  toggle('Simulate server errors', settings.failSaves, (v) => {
    settings.failSaves = v;
    transport.sync = v
      ? async () => {
          await new Promise((r) => setTimeout(r, 300));
          throw new Error('Server unavailable (simulated)');
        }
      : realSync;
  }),
  toggle('Dark theme', dark, (v) => setDark(v)),
  stressBtn,
);

// ---------------------------------------------------------------- the calendar

const calendar = new Calendar({
  appendTo: document.getElementById('schedule'),
  project,
  crudManager: crud,
  view: 'timeline',
  height: '100%',
  editorFields,
  resourceLabel: 'Sales team',
  theme: dark ? 'dark' : 'light',
  sidebarItems: settingsPanel,
  listeners: {
    // Return false to cancel a change. Here: don't double-book a person.
    beforeEventChange({ type, event, changes }) {
      if (!settings.noDoubleBooking || type === 'remove') return true;
      const resourceId = 'resourceId' in changes ? changes.resourceId : event?.resourceId;
      const start = changes.start ?? event?.start;
      const end = changes.end ?? event?.end;
      if (resourceId == null || !start || !end || changes.allDay || event?.allDay) return true;
      const clashes = project.getConflicts({ resourceId, start, end, ignoreId: event?.instanceId }).filter((e) => !e.allDay);
      if (clashes.length) {
        const who = project.getResource(resourceId)?.name ?? 'This person';
        toast(`${who} already has “${clashes[0].title}” then. Turn off “Prevent double-booking” to allow overlaps.`);
        return false;
      }
      return true;
    },
  },
});

crud.load().catch(() => toast('Could not load the schedule.'));
crud.on('syncFail', ({ error }) => toast(`Save failed: ${error.message}. Your edits are kept; retry from the toolbar.`));

function setDark(v) {
  dark = v;
  document.querySelector('.demo-app').classList.toggle('demo-dark', v);
  document.querySelector('.demo-app').classList.toggle('demo-light', !v);
  calendar.setConfig({ theme: v ? 'dark' : 'light' });
}
setDark(dark);

function toggleStress() {
  if (settings.stress) {
    settings.stress = false;
    stressBtn.textContent = 'Load 300 people, 6,000 events';
    crud.load();
    return;
  }
  const t = performance.now();
  const data = makeStressData(300, 20);
  project.loadData(data);
  calendar.renderNow();
  settings.stress = true;
  stressBtn.textContent = 'Back to sample data';
  toast(`Loaded ${data.resources.length} people and ${data.events.length.toLocaleString()} events in ${Math.round(performance.now() - t)} ms. Switch to Timeline and scroll.`);
}

// ---------------------------------------------------------------- toast + sync log

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
}

const logEl = document.getElementById('log');
let logOpen = false;
function renderLog() {
  const count = log.length ? `${log.length} request${log.length > 1 ? 's' : ''}` : 'No requests yet';
  const head = h(
    'button',
    { type: 'button', class: 'demo-log-head', 'aria-expanded': String(logOpen), onClick: () => ((logOpen = !logOpen), renderLog()) },
    h('span', null, 'Sync log'),
    h('span', { class: 'demo-log-count' }, count),
    h('span', { class: 'demo-log-hint' }, logOpen ? 'Hide' : 'Show what the calendar sends to your API'),
  );
  const body =
    logOpen &&
    h(
      'div',
      { class: 'demo-log-body' },
      log.length === 0 && h('p', { class: 'demo-muted' }, 'Drag, resize or create an event. Each batch of changes is posted here, the way your CRM backend would receive it.'),
      log.map((e, i) =>
        h(
          'details',
          { open: i === 0 ? true : null },
          h(
            'summary',
            null,
            h('strong', null, e.type === 'load' ? 'GET load' : 'POST sync'),
            ' ',
            h('span', { class: 'demo-muted' }, e.time),
            e.response?.success === false && h('span', { class: 'demo-bad' }, ' failed'),
          ),
          h(
            'div',
            { class: 'demo-log-cols' },
            h('div', null, h('div', { class: 'demo-muted' }, 'Request'), h('pre', null, JSON.stringify(e.request, null, 2))),
            h('div', null, h('div', { class: 'demo-muted' }, 'Response'), h('pre', null, JSON.stringify(e.response, null, 2))),
          ),
        ),
      ),
      log.length > 0 && h('button', { type: 'button', class: 'demo-linkbtn', onClick: () => ((log.length = 0), renderLog()) }, 'Clear log'),
    );
  logEl.classList.toggle('is-open', logOpen);
  logEl.replaceChildren(head, ...(body ? [body] : []));
}
renderLog();

// handy for poking at it from the browser console
window.calendar = calendar;
window.project = project;
