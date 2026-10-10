// Pure layout algorithms used by the views. They only deal with numbers and
// dates, so they are easy to unit test and reuse in other renderers.

import { MINUTE, addDays, diffCalendarDays } from './date.js';

/**
 * Lay out timed events inside one day column (day/week views).
 * Overlapping events are grouped into clusters; each cluster is split into
 * columns, and an event widens into free columns to its right.
 *
 * @param {Array<{start: Date, end: Date}>} items
 * @param {Date} windowStart visible start of the column (e.g. day at 00:00 or 08:00)
 * @param {Date} windowEnd visible end of the column
 * @returns {Array<{item, startMin, endMin, left, width, col, cols, continuesBefore, continuesAfter}>}
 *          startMin/endMin are minutes from windowStart; left/width are fractions (0..1).
 */
export function layoutTimeGridColumn(items, windowStart, windowEnd, { minDurationMinutes = 20 } = {}) {
  const winMinutes = (windowEnd - windowStart) / MINUTE;
  const segs = items
    .filter((it) => it.start < windowEnd && (it.end > windowStart || (+it.end === +it.start && it.start >= windowStart)))
    .map((it) => {
      const startMin = Math.max(0, (it.start - windowStart) / MINUTE);
      let endMin = Math.min(winMinutes, (it.end - windowStart) / MINUTE);
      if (endMin - startMin < minDurationMinutes) endMin = Math.min(winMinutes, startMin + minDurationMinutes);
      return {
        item: it,
        startMin,
        endMin: Math.max(endMin, startMin + 1),
        continuesBefore: it.start < windowStart,
        continuesAfter: it.end > windowEnd,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - b.startMin - (a.endMin - a.startMin));

  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds = [];
    for (const seg of cluster) {
      let c = colEnds.findIndex((end) => end <= seg.startMin);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(seg.endMin);
      } else colEnds[c] = seg.endMin;
      seg.col = c;
    }
    const cols = colEnds.length;
    for (const seg of cluster) {
      let span = 1;
      for (let c = seg.col + 1; c < cols; c++) {
        const blocked = cluster.some((o) => o.col === c && o.startMin < seg.endMin && seg.startMin < o.endMin);
        if (blocked) break;
        span++;
      }
      seg.cols = cols;
      seg.left = seg.col / cols;
      seg.width = span / cols;
      result.push(seg);
    }
    cluster = [];
  };

  for (const seg of segs) {
    if (seg.startMin >= clusterEnd) {
      flush();
      clusterEnd = seg.endMin;
    } else clusterEnd = Math.max(clusterEnd, seg.endMin);
    cluster.push(seg);
  }
  flush();
  return result;
}

/**
 * Lay out events as horizontal bars across a row of days (month view rows and
 * the all-day strip of week view). Each event gets the first free lane.
 *
 * @returns {{ segments: Array<{item, startCol, endCol, lane, continuesBefore, continuesAfter}>, laneCount: number }}
 */
export function layoutDayRow(items, rowStart, dayCount) {
  const rowEnd = addDays(rowStart, dayCount);
  const segments = items
    .filter((it) => it.start < rowEnd && (it.end > rowStart || (+it.end === +it.start && it.start >= rowStart)))
    .map((it) => {
      const startCol = Math.max(0, diffCalendarDays(it.start, rowStart));
      // end is exclusive: an event ending at midnight does not occupy that day
      const lastDay = diffCalendarDays(new Date(Math.max(+it.start, +it.end - 1)), rowStart);
      return {
        item: it,
        startCol,
        endCol: Math.min(dayCount - 1, Math.max(startCol, lastDay)),
        continuesBefore: it.start < rowStart,
        continuesAfter: it.end > rowEnd,
      };
    })
    .sort(
      (a, b) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol) ||
        Number(!!b.item.allDay) - Number(!!a.item.allDay) ||
        a.item.start - b.item.start,
    );

  const lanes = [];
  for (const seg of segments) {
    let lane = 0;
    for (;;) {
      if (!lanes[lane]) lanes[lane] = new Array(dayCount).fill(false);
      let free = true;
      for (let c = seg.startCol; c <= seg.endCol; c++) {
        if (lanes[lane][c]) {
          free = false;
          break;
        }
      }
      if (free) break;
      lane++;
    }
    for (let c = seg.startCol; c <= seg.endCol; c++) lanes[lane][c] = true;
    seg.lane = lane;
  }
  return { segments, laneCount: lanes.length };
}

/**
 * Stack overlapping events into lanes (resource timeline rows).
 * @returns {{ placed: Array<{item, lane}>, laneCount: number }}
 */
export function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const laneEnds = [];
  const placed = [];
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else laneEnds[lane] = item.end;
    placed.push({ item, lane });
  }
  return { placed, laneCount: Math.max(1, laneEnds.length) };
}

/** Index of the last offset <= y (offsets sorted ascending). Used for row virtualization and hit testing. */
export function findRowIndex(offsets, y) {
  let lo = 0;
  let hi = offsets.length - 1;
  if (hi < 0) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
