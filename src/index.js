// ChronoKit: calendar + resource scheduler in plain JavaScript (ES modules, no framework).
//
//   import { Calendar } from './chronokit/src/index.js';
//   new Calendar({ appendTo: document.getElementById('schedule'), project: { events, resources } });
//
// Styles live in a separate file so this module works without a bundler:
//   <link rel="stylesheet" href="chronokit/src/styles.css">

export { Calendar, DEFAULTS } from './ui/Calendar.js';
export { EventEditor, askScope } from './ui/EventEditor.js';
export { EVENT_COLORS, resolveColor } from './ui/content.js';
export { h, escapeHtml } from './ui/dom.js';

export * from './core/index.js';
