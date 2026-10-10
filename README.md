# ChronoKit

A calendar and resource scheduler in plain JavaScript. Every file is a standard ES module (`import { x } from './file.js'`) with no framework and no build step, so it works in any web app: plain HTML, jQuery, React, Vue, Angular, Svelte, server-rendered pages. It is a starting point for a Bryntum-style component you own: one shared data model behind day, week, month and resource-timeline views, with drag-and-drop editing, recurring events, undo/redo and batched backend sync.

```
src/
  index.js         everything you import comes from here
  styles.css       all styling, themed with CSS variables
  core/            data layer (works without any UI, even in Node)
    project.js     events + resources, undo/redo, change tracking
    crud.js        CrudManager: load + batched sync with your API
    recurrence.js  RRULE parsing, expansion, descriptions
    layout.js      overlap / lane layout algorithms
    date.js        DST-safe date helpers
  ui/              the widget, plain DOM code
    Calendar.js    main class: toolbar, sidebar, dialogs, keyboard
    views/         TimeGridView (day/week), MonthView, TimelineView
    EventEditor.js, Toolbar.js, Sidebar.js, content.js, drag.js, dom.js
dist/              optional bundles: chronokit.js (ES module), chronokit.umd.js (<script>), chronokit.css
demo/              CRM-style demo, runs straight from src/
examples/          <script>-tag page, Express backend for the sync protocol
test/              Vitest unit + DOM tests
```

## Quick start

Copy the `src` folder into your CRM (for example as `vendor/chronokit`), then:

```html
<link rel="stylesheet" href="/vendor/chronokit/styles.css" />
<div id="schedule"></div>

<script type="module">
  import { Calendar } from '/vendor/chronokit/index.js';

  const calendar = new Calendar({
    appendTo: '#schedule',
    view: 'timeline',
    height: 700,
    resourceLabel: 'Sales team',
    crudManager: {
      loadUrl: '/api/schedule',
      syncUrl: '/api/schedule/sync',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    },
    editorFields: [
      { name: 'customer', label: 'Customer' },
      { name: 'stage', label: 'Deal stage', type: 'select', options: ['Lead', 'Qualified', 'Proposal', 'Won'] },
    ],
    listeners: {
      eventChange: ({ type, event, changes }) => console.log(type, event, changes),
    },
  });
</script>
```

That loads the schedule from your API, saves changes back automatically, and shows "Saving…" / "All changes saved" in the toolbar. Your API needs two endpoints. Their request and response shapes are in [SYNC_PROTOCOL.md](./SYNC_PROTOCOL.md), and `examples/express-server.js` is a working server to copy.

No backend yet? Pass data directly:

```js
new Calendar({
  appendTo: document.getElementById('schedule'),
  project: {
    resources: [{ id: 1, name: 'Maya Fernandes', color: 'cobalt' }],
    events: [{ id: 1, title: 'Demo: Globex', start: '2026-10-12T10:00', end: '2026-10-12T11:00', resourceId: 1 }],
  },
});
```

### Three ways to include it

| How | Use when |
| --- | --- |
| `import { Calendar } from './chronokit/src/index.js'` | Your app uses ES modules (native or through Vite, webpack, Rollup, esbuild). Recommended: you can read and change every file |
| `import { Calendar } from './chronokit/dist/chronokit.js'` | You want one file instead of a folder |
| `<script src="chronokit/dist/chronokit.umd.js">` then `window.ChronoKit.Calendar` | Older pages without modules. Works even from `file://`. See `examples/script-tag.html` |

### From npm

```bash
npm install @mysticsoulwander/chronokit
```

```js
import { Calendar } from '@mysticsoulwander/chronokit';
import '@mysticsoulwander/chronokit/style.css';
```

The CSS file is always loaded separately, so the JavaScript runs without a bundler. Pages without a build step can load it from a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@mysticsoulwander/chronokit/dist/chronokit.css" />
<script src="https://unpkg.com/@mysticsoulwander/chronokit/dist/chronokit.umd.js"></script>
<!-- then: new ChronoKit.Calendar({ appendTo: '#schedule', ... }) -->
```

### Using it inside a framework

The calendar is a normal class, so wrapping it takes a few lines: create it when the component mounts, and destroy it when the component unmounts.

```jsx
// React
import { useEffect, useRef } from 'react';
import { Calendar } from '@mysticsoulwander/chronokit';

export function Schedule({ project }) {
  const ref = useRef(null);
  useEffect(() => {
    const cal = new Calendar({ appendTo: ref.current, project, view: 'week' });
    return () => cal.destroy();
  }, [project]);
  return <div ref={ref} />;
}
```

```js
// Vue 3
import { onMounted, onBeforeUnmount, ref, h } from 'vue';
import { Calendar } from '@mysticsoulwander/chronokit';

export default {
  props: ['project'],
  setup(props) {
    const el = ref(null);
    let cal;
    onMounted(() => (cal = new Calendar({ appendTo: el.value, project: props.project })));
    onBeforeUnmount(() => cal?.destroy());
    return () => h('div', { ref: el });
  },
};
```

Angular works the same way: create the calendar in `ngAfterViewInit` with `appendTo: this.host.nativeElement`, and call `destroy()` in `ngOnDestroy`.

## What's included

| Area | Features |
| --- | --- |
| Views | Day, week, month, resource timeline (people as rows); mini month picker; filter to show or hide people |
| Editing | Drag to move, resize from either edge, drag across empty time to create, double-click to create, drag between people in the timeline, Delete key, read-only mode |
| Recurrence | Daily, weekdays, weekly on chosen days, monthly by date or "second Tuesday", yearly; ends never / after N / on a date; edit or delete "this event", "this and following" or "all events" |
| Editor | Title, time, all-day, assignee, color, repeat rules, notes, plus your own CRM fields (text, select, textarea, number…) |
| Data | Immutable records, transactions, undo/redo (Ctrl+Z / Ctrl+Shift+Z), conflict lookup for double-booking checks |
| Backend | Load + batched sync of added/updated/removed rows, temporary-id swapping, auto-save with debounce, retry on failure, pluggable transport |
| Performance | Timeline only puts visible rows in the page: 300 people × 6,000 events loads in about 100 ms. Recurring events are expanded only for the visible dates |
| Look | Light, dark or system theme; every color and size is a CSS variable; custom event content |

No dependencies. About 26 KB gzipped JavaScript plus 5 KB CSS.

## Configuration

Pass these to `new Calendar({...})`, or change them later with `calendar.setConfig({...})`.

| Option | Default | |
| --- | --- | --- |
| `appendTo` | | Element or CSS selector to render into. Leave it out and call `calendar.mount(el)` later |
| `project` | empty | A `Project`, or plain `{ events, resources }` |
| `crudManager` | | A `CrudManager`, or its options: `{ loadUrl, syncUrl, headers, fetchOptions, transport, autoLoad: true, autoSync: true, autoSyncDelay: 800 }` |
| `listeners` | | `{ eventName: fn }`, see Events below |
| `view` | `'week'` | `'day' \| 'week' \| 'month' \| 'timeline' \| 'list'` |
| `date` | today | Date or ISO string to show first |
| `views` | day, week, month, timeline | Which view buttons to show. Add `'list'` for the agenda view |
| `height` | `720` | Number (px) or CSS length such as `'100%'` |
| `readOnly` | `false` | |
| `eventRenderer({ event, resource, view, timeText, compact })` | | Return an HTML string or a DOM node to replace an event's content, or `null` for the default. `compact` is true when the block is short (draw one line). Escape user text with `escapeHtml()` |
| `editorFields` | `[]` | Extra editor fields: `{ name, label, type?, options?, placeholder?, defaultValue?, readOnly? }`. Values are saved on the event under `name` |
| `weekStartsOn` | `1` | 0 = Sunday |
| `workingHours` / `workingDays` | `{ start: 9, end: 18 }` / Mon–Fri | Time outside these is shaded |
| `dayStartHour` / `dayEndHour` / `scrollToHour` | `0` / `24` / `8` | Day and week views |
| `hourHeight` / `snapMinutes` / `defaultEventDuration` | `48` / `15` / `60` | |
| `timelineDays` / `timelineHourWidth` | `7` / `60` | Timeline range and starting zoom (px per hour) |
| `rowHeight` / `laneHeight` / `resourceColumnWidth` | `52` / `40` / `220` | Timeline sizing |
| `resourceLabel` | `'People'` | Heading for the people column and filter |
| `showSidebar` / `showUnassigned` / `showResourceInEvents` | `true` | |
| `theme` | `'light'` | `'light' \| 'dark' \| 'auto'` (follows the OS) |
| `locale` | browser | Any `Intl` locale, e.g. `'en-IN'`, `'de-DE'` |
| `toolbarItems` / `sidebarItems` | | A DOM node (or a function returning one) added to the toolbar or sidebar |
| `cls` | | Extra CSS class on the root element |
| `editor` | `true` | `false` never opens the built-in editor: handle `eventClick` and `select` yourself |
| `eventSource({ start, end, view, signal })` | | Async function returning the events (or `{ events, resources }`) for the visible range. Called on mount, on every range or view change, and by `refetch()`. `signal` aborts when a newer range supersedes this one (pass it to `fetch`). Return `null` to keep what is shown. Undo history is kept across loads |
| `showToolbar` | `true` | `false` hides the built-in toolbar so your app can drive the calendar with its methods |
| `tooltip` | `true` | `false` turns hover cards off; a function `({ event }) => html \| Node` replaces their content |
| `nowIndicator` | `true` | The red now line in day, week and timeline views |
| `now` | | Function returning the current time, e.g. a clinic's wall clock. Drives the now line, today highlight and `today()` |
| `editorSections` | all on | Hide parts of the editor: `{ title, allDay, assignee, color, repeat, notes, delete }` set to `false` |
| `editorLabels` | | Rename its buttons: `{ delete, cancel, save, create }` |
| `editorActions` | | Extra footer buttons: `[{ key, label, onClick({ event, editor, calendar }) }]` |
| `editorReadOnly` | `false` | Open the editor to look, not to change (per call: set it with `setConfig` before `openEditor`) |
| `assigneeLabel` | `'Assigned to'` | The editor's assignee label, e.g. `'Clinician'` |
| `scale` | `1` | Multiplies text and every laid-out size. `'auto'` follows the calendar's width (1 up to 1200px wide, growing to 1.5 on very wide screens). MiniMonth takes a number |
| `resourceFilterCollapsed` | `false` | Start with the sidebar's people list folded; its heading opens and closes it (`calendar.toggleResourceFilter()`) |
| `viewLabels` | | Rename the view buttons, e.g. `{ timeline: 'Clinicians', list: 'Agenda' }` |
| `listRange` / `listShowEmpty` / `listEmptyText` | `'week'` / `false` / `'Nothing scheduled'` | List view: one `'day'`, `'week'` or `'month'`, whether to show empty days, and the empty text |

## Methods

```js
calendar.setView('month');            // 'day' | 'week' | 'month' | 'timeline'
calendar.setDate('2026-11-02');
calendar.next(); calendar.prev(); calendar.today();
calendar.setConfig({ theme: 'dark', readOnly: true });
calendar.setResourceVisible('r1', false);
calendar.openEditor(eventId);         // or an event instance
calendar.openCreate({ start, end, resourceId });
calendar.closeEditor();
calendar.renderNow();                 // re-render immediately (normally automatic)
calendar.refetch();                   // load the visible range again from eventSource
calendar.rangeFor(date, view);        // { start, end } a view shows for a date
calendar.adjacentRanges();            // [previous, next] ranges, e.g. to fetch ahead
calendar.undo(); calendar.redo();     // through beforeEventChange (source 'undo' / 'redo')
calendar.select({ start, end, resourceId }); // as if the user picked that time
calendar.destroy();                   // remove from the page, stop timers and listeners

calendar.view; calendar.date; calendar.project; calendar.crudManager;
```

## Events

Add listeners with `calendar.on(name, fn)` (it returns an unsubscribe function) or the `listeners` option.

| Event | Payload | |
| --- | --- | --- |
| `beforeEventChange` | `{ type, event, changes, project }` | `type` is `create`, `move`, `resize`, `update` or `remove`. Return `false` (or a Promise of `false`) to cancel |
| `eventChange` | `{ type, event, changes, scope, result }` | After a change is applied. `scope` is `this` / `future` / `all` for recurring events |
| `eventClick` | `{ event, domEvent }` | Return `false` to stop the editor opening, e.g. to open your own deal drawer instead |
| `viewChange` | `{ view }` | |
| `dateChange` | `{ date }` | |
| `selectionChange` | `{ instanceId }` | |
| `editorOpen` | `{ editor, instance?, draft?, isNew }` | |
| `select` | `{ start, end, allDay, resourceId, source, domEvent }` | Empty time picked by dragging across it (`source: 'drag'`) or double-clicking (`'dblclick'`). Return `false` to stop the editor, e.g. to open your own booking form |
| `dateClick` | `{ date, allDay, resourceId, domEvent }` | A single click on empty space (also fires when `readOnly` and on touch) |
| `rangeChange` | `{ start, end, view }` | The visible range changed (also fired once on mount) |
| `load` / `loadError` / `loading` | `{ start, end }` / `{ error }` / `{ loading }` | `eventSource` progress |
| `destroy` | | |

Undo and redo also go through `beforeEventChange`, with `source: 'undo'` or `'redo'` (edits from the views have `source: 'ui'`). Returning `false` drops that step from the history instead of applying it.

### Example: block double-booking

```js
calendar.on('beforeEventChange', ({ type, event, changes, project }) => {
  if (type === 'remove') return true;
  const resourceId = 'resourceId' in changes ? changes.resourceId : event?.resourceId;
  const start = changes.start ?? event.start;
  const end = changes.end ?? event.end;
  const clashes = project.getConflicts({ resourceId, start, end, ignoreId: event?.instanceId });
  if (clashes.length) {
    showToast(`Already booked: ${clashes[0].title}`);
    return false;
  }
});
```

### Example: open your CRM's deal page instead of the editor

```js
calendar.on('eventClick', ({ event }) => {
  if (event.dealId) {
    openDealDrawer(event.dealId);
    return false;
  }
});
```

### Example: custom event content

```js
import { Calendar, escapeHtml } from './chronokit/src/index.js';

new Calendar({
  appendTo: '#schedule',
  eventRenderer: ({ event, timeText }) =>
    `<strong>${escapeHtml(event.title)}</strong><span>${timeText} · ${escapeHtml(event.customer ?? '')}</span>`,
});
```

## Data

**Event**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string \| number | New events get a temporary `_new_…` id until the server returns a real one |
| `title` | string | |
| `start`, `end` | Date \| ISO string | `end` is exclusive. All-day events snap to whole days |
| `allDay` | boolean | |
| `resourceId` | id \| null | `null` shows in the timeline's Unassigned row |
| `color` | string | A palette name (`cobalt`, `teal`, `plum`, `amber`, `rose`, `green`, `coral`, `slate`) or any CSS color. Falls back to the person's color |
| `notes` | string | |
| `rrule` | string \| null | e.g. `FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10` |
| `exceptionDates` | string[] | `YYYY-MM-DD` dates skipped in the series |
| `recurringEventId`, `originalDateKey` | | Set on an occurrence that was edited on its own |
| `editable` | boolean | `false` locks the event (it can still be clicked). Default `true` |
| `startEditable` / `durationEditable` / `resourceEditable` | boolean | Finer control: drag to another time / resize / drag to another person. Each falls back to `editable` |
| `display` | `'background'` | Drawn as a shaded block behind the other events (e.g. a clinic session or a shift). A click inside it opens it (`eventClick`); dragging across it still picks time (`select`), and its label strip drags it |
| `resourceIds` | id[] | Background events: the timeline rows to shade. Without it (and without `resourceId`) every row is shaded |
| `classNames` | string \| string[] | Extra classes on the event element |
| anything else | | Kept as-is and sent to the server (e.g. `customer`, `dealId`) |

**Resource**: `id`, `name`, optional `role`, `color`, `avatar` (image URL), plus any custom fields.

## Project API

The data layer has no UI code. You can use it on its own, in Node, or to drive several calendars at once.

```js
import { Project } from './chronokit/src/index.js';

const project = new Project({ resources, events });

project.addEvent({ title, start, end, resourceId });
project.updateEvent(id, { title: 'Renamed' });
project.removeEvent(id);
project.transaction(() => { /* several edits */ }, 'Reassign deals'); // one undo step

project.getEventsInRange(start, end);            // plain + expanded recurring instances
project.getConflicts({ resourceId, start, end, ignoreId });
project.updateOccurrence(instance, changes, 'this' | 'future' | 'all');
project.removeOccurrence(instance, 'this' | 'future' | 'all');

project.undo(); project.redo(); project.canUndo; project.undoLabel;
project.hasChanges; project.getChanges();         // what the next sync will send
project.on('change', (info) => {});
```

## MiniMonth

A small month picker, the same one as in the sidebar, usable on its own:

```js
import { MiniMonth } from '@mysticsoulwander/chronokit';

const picker = new MiniMonth({
  appendTo: '#picker',
  selected: '2026-10-12',
  months: 2,                                        // two months side by side
  marks: (day) => [{ color: 'teal' }],              // up to four dots under the date
  dayStyle: (day) => ({ background: '#dff3e4', color: '#14532d', ring: '#16a34a' }),
  dayTitle: (day) => '80% of slots free',           // hover text
  disabled: (day) => day < new Date(),
  onSelect: (day) => console.log(day),
  onMonthChange: (firstDay) => loadAvailability(firstDay),
});
picker.setOptions({ selected: new Date() });        // any option, any time
picker.destroy();
```

`layout: 'strip'` shows `stripDays` days (default 7, on whole weeks) in one row with previous / next, for a date strip above a slot list. Other options: `weekStartsOn`, `locale`, `range: { start, end }` (shaded), `now`, `theme`, `cls`.

## Theming

```css
.ck-root {
  --ck-font: 'Inter', sans-serif;
  --ck-accent: #0b7a75;
  --ck-radius: 4px;
}
```

All variables are at the top of `src/styles.css`.

## Keyboard

| Keys | Action |
| --- | --- |
| Ctrl/⌘ + Z | Undo |
| Ctrl/⌘ + Shift + Z, Ctrl + Y | Redo |
| Ctrl/⌘ + S | Save now (when connected to a backend) |
| Tab, then Enter | Focus an event, open the editor |
| Delete / Backspace | Delete the selected event |
| Esc | Cancel a drag, close a dialog |

## Develop

```bash
npm install          # only needed for tests and bundling; the library itself has no dependencies
npm start            # demo at http://localhost:8080/demo/ (zero-dependency server)
npm test             # 32 unit + DOM tests
npm run build        # dist/chronokit.js, dist/chronokit.umd.js, dist/chronokit.css
npm run build:demo   # demo-dist/index.html, one self-contained file
```

### Publishing a new version

```bash
npm version patch    # or minor / major; also commits and tags
npm publish          # runs the tests and rebuilds dist/ first
git push --follow-tags
```

Browsers only load ES modules over `http://`, not by double-clicking an HTML file, so open the demo through `npm start` or any static server (your CRM's own server works too). The `<script>`-tag build has no such limit.

## Not built yet (compared with Bryntum)

These are the natural next steps, roughly in order of value for a CRM:

- Per-event time zones. All dates are shown in the browser's zone, and the timeline uses fixed hour widths, so a day when clocks change is off by an hour
- Export to Excel, PDF and ICS; print layout
- Dependencies, a scheduling engine (auto-reschedule), Gantt view
- Resource utilization / histogram views, travel time
- Real-time multi-user updates (push server changes in with `project.applySyncResponse`)
- Horizontal virtualization for very long timeline ranges
- Resource columns in the day and week views (people side by side); the timeline covers this today
- Translatable UI strings (dates already follow `locale`; button labels are English)
- Touch: drag-to-create is mouse-only; on touch you can move, resize and tap
- A full accessibility pass (moving events with the keyboard, screen-reader announcements)
