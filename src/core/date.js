// Date helpers. All calendar math is done in the browser's local time zone.
// Durations are milliseconds; "day" arithmetic uses calendar days so DST
// transitions do not shift wall-clock times.

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a Date, timestamp, or ISO string. 'YYYY-MM-DD' is read as local midnight. */
export function toDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value) ? null : new Date(value.getTime());
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  return null;
}

export const clone = (d) => new Date(d.getTime());
export const pad = (n) => String(n).padStart(2, '0');

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addMinutes(d, n) {
  return new Date(d.getTime() + n * MINUTE);
}

export function addDays(d, n) {
  const r = clone(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** Add months, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(d, n) {
  const r = clone(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  r.setDate(Math.min(day, daysInMonth(r.getFullYear(), r.getMonth())));
  return r;
}

export function startOfWeek(d, weekStartsOn = 1) {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() - weekStartsOn + 7) % 7));
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** a - b in whole calendar days (DST-safe). */
export function diffCalendarDays(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / DAY);
}

export function diffMonths(a, b) {
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

export function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** The given day at `minutes` past local midnight (minutes may exceed 1440). */
export function atMinutes(day, minutes) {
  const r = startOfDay(day);
  r.setHours(0, Math.round(minutes), 0, 0);
  return r;
}

export const snap = (value, step) => Math.round(value / step) * step;
export const floorTo = (value, step) => Math.floor(value / step) * step;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** 'YYYY-MM-DD' in local time. */
export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DDTHH:mm:ss' in local time, no offset. */
export function toLocalISO(d) {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function toTimeInput(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine values from <input type=date> and <input type=time>. */
export function fromInputs(dateStr, timeStr) {
  const day = toDate(dateStr);
  if (!day) return null;
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  day.setHours(h || 0, m || 0, 0, 0);
  return day;
}

export function isWeekend(d) {
  const g = d.getDay();
  return g === 0 || g === 6;
}

export const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const formatters = new Map();
export function format(d, options, locale) {
  const key = `${locale || ''}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, f);
  }
  return f.format(d);
}

export function formatTime(d, locale) {
  return format(d, { hour: 'numeric', minute: '2-digit' }, locale);
}

export function formatTimeRange(start, end, locale) {
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`;
}
