import { formatTime, formatTimeRange, format } from '../core/date.js';
import { describeRRule } from '../core/recurrence.js';
import { h, icon, ICONS, fromHTML } from './dom.js';

export const EVENT_COLORS = {
  cobalt: '#2b59c3',
  teal: '#138a7e',
  plum: '#8a4fb0',
  amber: '#b7760d',
  rose: '#c2416b',
  green: '#3e8e41',
  coral: '#d0613c',
  slate: '#5a6b85',
};

export const resolveColor = (c) => (c && EVENT_COLORS[c]) || c || null;

const repeatIcon = () => {
  const el = icon(ICONS.repeat, 11);
  el.setAttribute('class', 'ck-icon-repeat');
  el.removeAttribute('aria-hidden');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Repeats');
  return el;
};

/**
 * Content of one event block. If the calendar has an `eventRenderer`, its
 * result wins: a string is treated as HTML, a Node is inserted as-is, and
 * null/undefined falls back to the default content.
 */
export function eventContent(cal, event, view, compact = false) {
  const { locale, config } = cal;
  const resource = cal.resourcesById.get(event.resourceId) || null;
  const timeText = event.allDay ? '' : view === 'month' ? formatTime(event.start, locale) : formatTimeRange(event.start, event.end, locale);
  if (config.eventRenderer) {
    const custom = config.eventRenderer({ event, resource, view, timeText, calendar: cal });
    if (custom != null && custom !== false) return typeof custom === 'string' ? fromHTML(custom) : custom;
  }
  const repeats = event.isOccurrence || event.recurringEventId;
  const title = event.title || 'Untitled';
  if (compact) {
    // month view reads like an agenda (time first); elsewhere the title matters most
    const time = timeText ? h('span', { class: 'ck-ev-time' }, view === 'month' ? timeText : formatTime(event.start, locale)) : null;
    return h(
      'span',
      { class: 'ck-ev-line' },
      view === 'month' && time,
      h('span', { class: 'ck-ev-title' }, title),
      view !== 'month' && time,
      repeats && repeatIcon(),
    );
  }
  const showResource = config.showResourceInEvents && resource && view !== 'timeline';
  return [
    h('span', { class: 'ck-ev-title' }, title, repeats && repeatIcon()),
    timeText && h('span', { class: 'ck-ev-time' }, timeText),
    showResource && h('span', { class: 'ck-ev-meta' }, resource.name),
  ];
}

/** Hover card content for an event. */
export function tooltipContent(cal, event) {
  const { locale } = cal;
  const resource = cal.resourcesById.get(event.resourceId);
  const lastDay = new Date(event.end - 1);
  const sameDay = event.start.toDateString() === lastDay.toDateString();
  const when = event.allDay
    ? sameDay
      ? format(event.start, { weekday: 'long', month: 'long', day: 'numeric' }, locale)
      : `${format(event.start, { month: 'short', day: 'numeric' }, locale)} – ${format(lastDay, { month: 'short', day: 'numeric' }, locale)}`
    : `${format(event.start, { weekday: 'short', month: 'short', day: 'numeric' }, locale)}, ${formatTimeRange(event.start, event.end, locale)}`;
  const extras = (cal.config.editorFields || []).filter((f) => event[f.name]);
  const notes = event.notes ? (event.notes.length > 140 ? `${event.notes.slice(0, 140)}…` : event.notes) : null;
  return [
    h('div', { class: 'ck-tooltip-title' }, event.title || 'Untitled'),
    h('div', { class: 'ck-tooltip-row' }, when),
    event.rrule && h('div', { class: 'ck-tooltip-row' }, describeRRule(event.rrule, event.start, locale)),
    resource && h('div', { class: 'ck-tooltip-row' }, resource.name),
    extras.map((f) => {
      const opt = (f.options || []).find((o) => (o?.value ?? o) === event[f.name]);
      return h('div', { class: 'ck-tooltip-row' }, h('span', { class: 'ck-tooltip-label' }, f.label), ' ', String(opt?.label ?? event[f.name]));
    }),
    notes && h('div', { class: 'ck-tooltip-notes' }, notes),
  ];
}

/** Shared attributes + listeners for an event element. */
export function eventProps(cal, inst, extraClass, style, onDown) {
  const cls = ['ck-event', extraClass];
  if (inst.instanceId === cal.selectedId) cls.push('ck-selected');
  return {
    class: cls.filter(Boolean).join(' '),
    style: { ...style, '--ck-ev': cal.colorOf(inst) },
    tabindex: '0',
    dataset: { instance: inst.instanceId },
    'aria-label': `${inst.title || 'Untitled'}, ${inst.allDay ? 'all day' : formatTimeRange(inst.start, inst.end, cal.locale)}`,
    onPointerdown: onDown,
    onPointerenter: (e) => cal.showTooltip(inst, e),
    onPointerleave: () => cal.hideTooltip(),
    onKeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cal.openEditor(inst);
      }
    },
    onFocus: () => cal.setSelected(inst.instanceId),
  };
}
