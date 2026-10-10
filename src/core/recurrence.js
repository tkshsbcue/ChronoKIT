// Recurrence rules: a practical subset of iCalendar RFC 5545 RRULE.
// Supported: FREQ (DAILY|WEEKLY|MONTHLY|YEARLY), INTERVAL, COUNT, UNTIL,
// BYDAY (incl. ordinals like 2TU / -1FR for MONTHLY), BYMONTHDAY.
// Weeks start on Monday (RFC default WKST=MO).

import {
  toDate, clone, pad, startOfDay, addDays, addMonths, startOfWeek, startOfMonth,
  daysInMonth, diffCalendarDays, diffMonths, dateKey, format, WEEKDAY_CODES,
} from './date.js';

const FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const MONDAY_ORDER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Parse 'MO' | '2TU' | '-1FR' into { n, code, weekday } */
export function parseByDay(token) {
  const m = /^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/.exec(String(token).toUpperCase());
  if (!m) return null;
  return { n: m[1] ? parseInt(m[1], 10) : 0, code: m[2], weekday: WEEKDAY_CODES.indexOf(m[2]) };
}

function normalizeRule(r) {
  if (!r || !FREQS.includes(String(r.freq).toUpperCase())) return null;
  const out = { freq: String(r.freq).toUpperCase(), interval: Math.max(1, parseInt(r.interval, 10) || 1) };
  if (r.count > 0) out.count = parseInt(r.count, 10);
  else if (r.until) out.until = toDate(r.until);
  const byDay = (r.byDay || []).map((t) => String(t).toUpperCase()).filter((t) => parseByDay(t));
  if (byDay.length) out.byDay = byDay;
  const byMonthDay = (r.byMonthDay || []).map(Number).filter((n) => n && Math.abs(n) <= 31);
  if (byMonthDay.length) out.byMonthDay = byMonthDay;
  return out;
}

function parseUntil(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) return toDate(v);
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) return new Date(+y, +mo - 1, +d, 23, 59, 59);
  return z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

/** Accepts an RRULE string ('FREQ=WEEKLY;BYDAY=MO,WE') or a rule object. Returns a normalized rule or null. */
export function parseRRule(input) {
  if (!input) return null;
  if (typeof input === 'object') return normalizeRule(input);
  const rule = {};
  for (const part of String(input).replace(/^RRULE:/i, '').trim().split(';')) {
    const [rawKey, value] = part.split('=');
    if (!rawKey || value == null) continue;
    switch (rawKey.trim().toUpperCase()) {
      case 'FREQ': rule.freq = value.trim(); break;
      case 'INTERVAL': rule.interval = value; break;
      case 'COUNT': rule.count = parseInt(value, 10); break;
      case 'UNTIL': rule.until = parseUntil(value.trim()); break;
      case 'BYDAY': rule.byDay = value.split(','); break;
      case 'BYMONTHDAY': rule.byMonthDay = value.split(','); break;
      default: break; // unsupported parts are ignored
    }
  }
  return normalizeRule(rule);
}

function formatUntil(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function stringifyRRule(rule) {
  const r = parseRRule(rule);
  if (!r) return null;
  const parts = [`FREQ=${r.freq}`];
  if (r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.byDay) parts.push(`BYDAY=${r.byDay.join(',')}`);
  if (r.byMonthDay) parts.push(`BYMONTHDAY=${r.byMonthDay.join(',')}`);
  if (r.count) parts.push(`COUNT=${r.count}`);
  else if (r.until) parts.push(`UNTIL=${formatUntil(r.until)}`);
  return parts.join(';');
}

const withTime = (day, src) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), src.getHours(), src.getMinutes(), src.getSeconds(), src.getMilliseconds());

/** nth weekday of a month: n=2, weekday=2 -> second Tuesday; n=-1 -> last. Returns null if absent. */
export function nthWeekdayOfMonth(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(year, month, 1);
    const day = 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7;
    return day <= daysInMonth(year, month) ? new Date(year, month, day) : null;
  }
  const lastDay = daysInMonth(year, month);
  const last = new Date(year, month, lastDay);
  const day = lastDay - ((last.getDay() - weekday + 7) % 7) + (n + 1) * 7;
  return day >= 1 ? new Date(year, month, day) : null;
}

/** Candidate dates for period p (sorted), plus the period's first day. */
function periodCandidates(start, r, p) {
  switch (r.freq) {
    case 'DAILY': {
      const day = addDays(startOfDay(start), p * r.interval);
      if (r.byDay && !r.byDay.some((t) => parseByDay(t).weekday === day.getDay())) return { periodStart: day, dates: [] };
      return { periodStart: day, dates: [withTime(day, start)] };
    }
    case 'WEEKLY': {
      const weekStart = addDays(startOfWeek(start, 1), p * 7 * r.interval);
      const codes = r.byDay ? r.byDay.map((t) => parseByDay(t).code) : [WEEKDAY_CODES[start.getDay()]];
      const dates = [...new Set(codes)]
        .map((c) => MONDAY_ORDER.indexOf(c))
        .sort((a, b) => a - b)
        .map((i) => withTime(addDays(weekStart, i), start));
      return { periodStart: weekStart, dates };
    }
    case 'MONTHLY': {
      const monthStart = addMonths(startOfMonth(start), p * r.interval);
      const y = monthStart.getFullYear();
      const m = monthStart.getMonth();
      let days = [];
      if (r.byDay) {
        for (const t of r.byDay) {
          const { n, weekday } = parseByDay(t);
          if (n) {
            const d = nthWeekdayOfMonth(y, m, weekday, n);
            if (d) days.push(d);
          } else {
            for (let d = 1; d <= daysInMonth(y, m); d++) {
              const date = new Date(y, m, d);
              if (date.getDay() === weekday) days.push(date);
            }
          }
        }
      } else {
        const mds = r.byMonthDay || [start.getDate()];
        const dim = daysInMonth(y, m);
        for (const md of mds) {
          const d = md > 0 ? md : dim + md + 1;
          if (d >= 1 && d <= dim) days.push(new Date(y, m, d));
        }
      }
      days = days.sort((a, b) => a - b).map((d) => withTime(d, start));
      return { periodStart: monthStart, dates: days };
    }
    case 'YEARLY': {
      const year = start.getFullYear() + p * r.interval;
      const d = new Date(year, start.getMonth(), start.getDate());
      const valid = d.getMonth() === start.getMonth(); // skip Feb 29 in non-leap years
      return { periodStart: new Date(year, 0, 1), dates: valid ? [withTime(d, start)] : [] };
    }
    default:
      return null;
  }
}

/** First period that could still contain an occurrence on/after `earliest` (only valid without COUNT). */
function estimateStartPeriod(start, r, earliest) {
  if (r.count || earliest <= start) return 0;
  let periods;
  switch (r.freq) {
    case 'DAILY': periods = diffCalendarDays(earliest, start) / r.interval; break;
    case 'WEEKLY': periods = diffCalendarDays(earliest, startOfWeek(start, 1)) / (7 * r.interval); break;
    case 'MONTHLY': periods = diffMonths(earliest, start) / r.interval; break;
    case 'YEARLY': periods = (earliest.getFullYear() - start.getFullYear()) / r.interval; break;
    default: periods = 0;
  }
  return Math.max(0, Math.floor(periods) - 1);
}

/**
 * Generate occurrence start dates in order.
 * @param {Date} start first occurrence (series anchor)
 * @param {object|string} rule
 * @param {{ before?: Date, after?: Date, maxPeriods?: number }} opts stop once a start reaches `before`;
 *        `after` lets the generator skip ahead when the rule has no COUNT.
 */
export function* occurrenceStarts(start, rule, { before = null, after = null, maxPeriods = 50000 } = {}) {
  const r = parseRRule(rule);
  if (!r) {
    yield clone(start);
    return;
  }
  let produced = 0;
  const first = after ? estimateStartPeriod(start, r, after) : 0;
  for (let p = first; p < first + maxPeriods; p++) {
    const { periodStart, dates } = periodCandidates(start, r, p);
    if (before && periodStart >= before) return;
    if (r.until && periodStart > r.until) return;
    for (const d of dates) {
      if (d < start) continue;
      if (r.until && d > r.until) return;
      if (before && d >= before) return;
      yield d;
      produced++;
      if (r.count && produced >= r.count) return;
    }
  }
}

/**
 * Occurrences of a recurring event overlapping [rangeStart, rangeEnd).
 * Returns [{ start, end, key }] where key is the occurrence's local date ('YYYY-MM-DD').
 */
export function expandRecurring(event, rangeStart, rangeEnd) {
  const rule = parseRRule(event.rrule);
  const duration = event.end - event.start;
  if (!rule) {
    return event.start < rangeEnd && (event.end > rangeStart || (duration === 0 && event.start >= rangeStart))
      ? [{ start: clone(event.start), end: clone(event.end), key: dateKey(event.start) }]
      : [];
  }
  const exdates = new Set(event.exceptionDates || []);
  const earliest = new Date(rangeStart.getTime() - duration);
  const out = [];
  for (const s of occurrenceStarts(event.start, rule, { before: rangeEnd, after: earliest })) {
    const e = new Date(s.getTime() + duration);
    const visible = e > rangeStart || (duration === 0 && s >= rangeStart);
    if (!visible) continue;
    const key = dateKey(s);
    if (exdates.has(key)) continue;
    out.push({ start: s, end: e, key });
  }
  return out;
}

/** Number of occurrences (ignoring exception dates) that start before `date`. */
export function countOccurrencesBefore(start, rule, date) {
  let n = 0;
  for (const s of occurrenceStarts(start, rule, { before: date })) n++; // eslint-disable-line no-unused-vars
  return n;
}

/** Shift weekday-based parts of a rule when the series moves by `dayDelta` days. */
export function shiftRuleDays(rule, dayDelta) {
  const r = parseRRule(rule);
  if (!r || !dayDelta) return r;
  const out = { ...r };
  if (r.byDay) {
    out.byDay = r.byDay.map((t) => {
      const { n, weekday } = parseByDay(t);
      const code = WEEKDAY_CODES[(((weekday + dayDelta) % 7) + 7) % 7];
      return n ? `${n}${code}` : code;
    });
  }
  if (r.byMonthDay) {
    out.byMonthDay = r.byMonthDay.map((d) => (d > 0 ? Math.min(31, Math.max(1, d + dayDelta)) : d));
  }
  return out;
}

const UNIT = { DAILY: ['day', 'days'], WEEKLY: ['week', 'weeks'], MONTHLY: ['month', 'months'], YEARLY: ['year', 'years'] };
const ORDINAL = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', '-1': 'last' };
const WEEKDAYS_ONLY = ['MO', 'TU', 'WE', 'TH', 'FR'];

/** Human-readable summary, e.g. "Every 2 weeks on Mon, Wed, 10 times". */
export function describeRRule(rule, start, locale) {
  const r = parseRRule(rule);
  if (!r) return 'Does not repeat';
  const dayName = (code, style = 'short') =>
    format(new Date(2024, 0, 7 + WEEKDAY_CODES.indexOf(code)), { weekday: style }, locale); // 2024-01-07 is a Sunday
  let text;
  const codes = (r.byDay || []).map((t) => parseByDay(t));
  if (r.freq === 'DAILY' && codes.length === 5 && WEEKDAYS_ONLY.every((c) => codes.some((x) => x.code === c)) && r.interval === 1) {
    text = 'Every weekday';
  } else {
    text = r.interval === 1 ? `Every ${UNIT[r.freq][0]}` : `Every ${r.interval} ${UNIT[r.freq][1]}`;
    if (r.freq === 'WEEKLY') {
      const list = codes.length ? codes.map((c) => c.code) : start ? [WEEKDAY_CODES[start.getDay()]] : [];
      if (list.length) text += ` on ${MONDAY_ORDER.filter((c) => list.includes(c)).map((c) => dayName(c)).join(', ')}`;
    } else if (r.freq === 'MONTHLY') {
      if (codes.length && codes[0].n) text += ` on the ${ORDINAL[codes[0].n] || `${codes[0].n}th`} ${dayName(codes[0].code, 'long')}`;
      else if (r.byMonthDay) text += ` on day ${r.byMonthDay.join(', ')}`;
      else if (start) text += ` on day ${start.getDate()}`;
    } else if (r.freq === 'YEARLY' && start) {
      text += ` on ${format(start, { month: 'long', day: 'numeric' }, locale)}`;
    }
  }
  if (r.count) text += `, ${r.count} ${r.count === 1 ? 'time' : 'times'}`;
  else if (r.until) text += `, until ${format(r.until, { month: 'short', day: 'numeric', year: 'numeric' }, locale)}`;
  return text;
}
