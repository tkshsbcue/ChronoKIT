// Event editor dialog: title, time, assignee, color, recurrence, notes and any
// custom fields passed as `editorFields` (e.g. CRM customer, deal stage).

import { addDays, addMonths, dateKey, daysInMonth, format, fromInputs, toDate, toTimeInput, WEEKDAY_CODES } from '../core/date.js';
import { describeRRule, parseRRule, parseByDay, stringifyRRule } from '../core/recurrence.js';
import { h, icon, ICONS, keepFocus } from './dom.js';
import { EVENT_COLORS } from './content.js';

const WEEK_ORDER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR'];
const ORD = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', '-1': 'last' };
const UNIT = { DAILY: 'days', WEEKLY: 'weeks', MONTHLY: 'months', YEARLY: 'years' };

function nthOf(date) {
  const n = Math.ceil(date.getDate() / 7);
  const isLast = date.getDate() + 7 > daysInMonth(date.getFullYear(), date.getMonth());
  return n >= 5 || (isLast && n === 4) ? -1 : n;
}

function ruleToForm(rrule, start) {
  const base = { freq: 'NONE', interval: 1, byDay: [WEEKDAY_CODES[start.getDay()]], monthly: 'day', ends: 'never', count: 10, until: dateKey(addMonths(start, 3)) };
  const r = parseRRule(rrule);
  if (!r) return base;
  const codes = (r.byDay || []).map((t) => parseByDay(t));
  const out = { ...base, interval: r.interval };
  if (r.freq === 'DAILY' && codes.length === 5 && WEEKDAYS.every((c) => codes.some((x) => x.code === c))) out.freq = 'WEEKDAYS';
  else out.freq = r.freq;
  if (r.freq === 'WEEKLY' && codes.length) out.byDay = codes.map((c) => c.code);
  if (r.freq === 'MONTHLY' && codes.length && codes[0].n) out.monthly = 'weekday';
  if (r.count) {
    out.ends = 'count';
    out.count = r.count;
  } else if (r.until) {
    out.ends = 'until';
    out.until = dateKey(r.until);
  }
  return out;
}

function formToRule(f, start) {
  if (f.freq === 'NONE') return null;
  const rule = f.freq === 'WEEKDAYS' ? { freq: 'DAILY', byDay: WEEKDAYS } : { freq: f.freq, interval: Math.max(1, +f.interval || 1) };
  if (f.freq === 'WEEKLY') rule.byDay = f.byDay.length ? f.byDay : [WEEKDAY_CODES[start.getDay()]];
  if (f.freq === 'MONTHLY' && f.monthly === 'weekday') rule.byDay = [`${nthOf(start)}${WEEKDAY_CODES[start.getDay()]}`];
  if (f.ends === 'count') rule.count = Math.max(1, +f.count || 1);
  if (f.ends === 'until' && f.until) {
    const u = toDate(f.until);
    if (u) {
      u.setHours(23, 59, 59);
      rule.until = u;
    }
  }
  return stringifyRRule(rule);
}

const weekdayDate = (code) => new Date(2024, 0, 7 + WEEKDAY_CODES.indexOf(code)); // 2024-01-07 is a Sunday

export class EventEditor {
  /**
   * @param {import('./Calendar.js').Calendar} cal
   * @param {{ instance?: object, draft?: object, isNew: boolean }} state
   * @param {{ onSave: Function, onDelete: Function, onClose: Function }} handlers
   */
  constructor(cal, state, { onSave, onDelete, onClose }) {
    this.cal = cal;
    this.state = state;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.onClose = onClose;
    const src = state.instance || state.draft;
    this.src = src;
    const endShown = src.allDay ? addDays(src.end, -1) : src.end;
    const extra = {};
    for (const f of cal.config.editorFields) extra[f.name] = src[f.name] ?? f.defaultValue ?? '';
    this.form = {
      title: src.title ?? '',
      allDay: !!src.allDay,
      startDate: dateKey(src.start),
      startTime: toTimeInput(src.start),
      endDate: dateKey(endShown),
      endTime: toTimeInput(src.end),
      resourceId: src.resourceId == null ? '' : String(src.resourceId),
      color: src.color ?? '',
      notes: src.notes ?? '',
      repeat: ruleToForm(src.rrule, src.start),
      extra,
    };
    this.el = h('div', { class: 'ck-overlay', onPointerdown: (e) => e.target === e.currentTarget && this.onClose() });
    this.render();
    const title = this.el.querySelector('.ck-editor-title');
    setTimeout(() => {
      title?.focus();
      title?.select();
    }, 0);
  }

  get values() {
    const f = this.form;
    let start;
    let end;
    if (f.allDay) {
      start = toDate(f.startDate);
      const e = toDate(f.endDate);
      end = e ? addDays(e, 1) : null;
    } else {
      start = fromInputs(f.startDate, f.startTime);
      end = fromInputs(f.endDate, f.endTime);
    }
    const error = !start || !end ? 'Enter a valid start and end.' : end <= start ? 'End must be after start.' : null;
    return { start, end, error, rrule: start ? formToRule(f.repeat, start) : null };
  }

  set(patch, rerender = false) {
    Object.assign(this.form, patch);
    if (rerender) this.render();
    else this.updateDerived();
  }

  setRepeat(patch) {
    Object.assign(this.form.repeat, patch);
    this.render();
  }

  /** Refresh the parts that depend on the form without rebuilding inputs (keeps typing smooth). */
  updateDerived() {
    const { error, rrule, start } = this.values;
    const errEl = this.el.querySelector('.ck-error');
    if (errEl) {
      errEl.textContent = error || '';
      errEl.hidden = !error;
    }
    const hint = this.el.querySelector('.ck-hint');
    if (hint) hint.textContent = rrule && start ? describeRRule(rrule, start, this.cal.locale) : '';
    const save = this.el.querySelector('button[type="submit"]');
    if (save) save.disabled = !!error;
    this.el.querySelector('.ck-editor')?.style.setProperty('--ck-ev', this.swatch());
  }

  swatch() {
    const f = this.form;
    return f.color ? EVENT_COLORS[f.color] || f.color : this.cal.colorOf({ ...this.src, color: null, resourceId: f.resourceId === '' ? null : this.resolveResourceId(f.resourceId) });
  }

  resolveResourceId(value) {
    if (value === '') return null;
    return this.cal.project.resources.find((r) => String(r.id) === String(value))?.id ?? value;
  }

  submit(e) {
    e.preventDefault();
    const { error, start, end, rrule } = this.values;
    if (error || this.cal.readOnly) return;
    const f = this.form;
    this.onSave({
      title: f.title.trim(),
      allDay: f.allDay,
      start,
      end,
      resourceId: this.resolveResourceId(f.resourceId),
      color: f.color || null,
      notes: f.notes,
      rrule,
      ...f.extra,
    });
  }

  changeStartDate(value) {
    // keep the duration when the start date moves
    const oldStart = toDate(this.form.startDate);
    const newStart = toDate(value);
    const oldEnd = toDate(this.form.endDate);
    if (oldStart && newStart && oldEnd) {
      const shift = Math.round((newStart - oldStart) / 86400000);
      this.set({ startDate: value, endDate: dateKey(addDays(oldEnd, shift)) }, true);
    } else this.set({ startDate: value }, true);
  }

  render() {
    keepFocus(this.el, () => this.el.replaceChildren(this.build()));
    this.updateDerived();
  }

  build() {
    const cal = this.cal;
    const { locale, readOnly } = cal;
    const resources = cal.project.resources;
    const f = this.form;
    const { instance, isNew } = this.state;
    const { start, rrule } = this.values;
    const isSeries = instance && (instance.isOccurrence || instance.rrule);
    const rep = f.repeat;
    const field = (label, control, cls = '') => h('label', { class: `ck-field${cls}` }, h('span', null, label), control);
    const input = (key, props) => h('input', { 'data-key': key, ...props });
    const select = (key, value, options, onChange) =>
      h('select', { 'data-key': key, value, onChange: (e) => onChange(e.target.value) }, options.map(([v, label]) => h('option', { value: v }, label)));

    const when = h(
      'div',
      { class: 'ck-field-row ck-when' },
      field(
        'Starts',
        h(
          'span',
          { class: 'ck-inline' },
          input('startDate', { type: 'date', value: f.startDate, required: true, onChange: (e) => this.changeStartDate(e.target.value) }),
          !f.allDay && input('startTime', { type: 'time', value: f.startTime, required: true, onInput: (e) => this.set({ startTime: e.target.value }) }),
        ),
      ),
      field(
        'Ends',
        h(
          'span',
          { class: 'ck-inline' },
          input('endDate', { type: 'date', value: f.endDate, required: true, onInput: (e) => this.set({ endDate: e.target.value }) }),
          !f.allDay && input('endTime', { type: 'time', value: f.endTime, required: true, onInput: (e) => this.set({ endTime: e.target.value }) }),
        ),
      ),
      h('label', { class: 'ck-check' }, input('allDay', { type: 'checkbox', checked: f.allDay, onChange: (e) => this.set({ allDay: e.target.checked }, true) }), 'All day'),
    );

    const swatches = h(
      'div',
      { class: 'ck-swatches', role: 'radiogroup', 'aria-label': 'Color' },
      h('button', {
        type: 'button', role: 'radio', 'data-key': 'color-auto', 'aria-checked': String(!f.color), class: `ck-swatch ck-swatch-auto${!f.color ? ' ck-on' : ''}`,
        title: "Use the assignee's color", 'aria-label': "Assignee's color", onClick: () => this.set({ color: '' }, true),
      }),
      Object.entries(EVENT_COLORS).map(([name, hex]) =>
        h('button', {
          type: 'button', role: 'radio', 'data-key': `color-${name}`, 'aria-checked': String(f.color === name), 'aria-label': name, title: name,
          class: `ck-swatch${f.color === name ? ' ck-on' : ''}`, style: { background: hex }, onClick: () => this.set({ color: name }, true),
        }),
      ),
    );

    const who = h(
      'div',
      { class: 'ck-field-row' },
      resources.length > 0 &&
        field('Assigned to', select('resourceId', f.resourceId, [['', 'Unassigned'], ...resources.map((r) => [String(r.id), r.name])], (v) => this.set({ resourceId: v }))),
      h('div', { class: 'ck-field' }, h('span', null, 'Color'), swatches),
    );

    const repeat = h(
      'fieldset',
      { class: 'ck-repeat' },
      field(
        'Repeat',
        select('freq', rep.freq, [
          ['NONE', 'Does not repeat'], ['DAILY', 'Daily'], ['WEEKDAYS', 'Every weekday (Mon–Fri)'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly'], ['YEARLY', 'Yearly'],
        ], (v) => this.setRepeat({ freq: v })),
      ),
      UNIT[rep.freq] &&
        field(
          'Every',
          h(
            'span',
            { class: 'ck-inline' },
            input('interval', { type: 'number', min: '1', max: '99', value: rep.interval, onInput: (e) => { rep.interval = e.target.value; this.updateDerived(); } }),
            h('span', { class: 'ck-unit' }, UNIT[rep.freq]),
          ),
          ' ck-field-narrow',
        ),
      rep.freq === 'WEEKLY' &&
        h(
          'div',
          { class: 'ck-field ck-field-wide' },
          h('span', null, 'On'),
          h(
            'div',
            { class: 'ck-daypicks' },
            WEEK_ORDER.map((code) => {
              const on = rep.byDay.includes(code);
              return h(
                'button',
                {
                  type: 'button', 'data-key': `day-${code}`, 'aria-pressed': String(on), class: `ck-daypick${on ? ' ck-on' : ''}`,
                  title: format(weekdayDate(code), { weekday: 'long' }, locale),
                  onClick: () => this.setRepeat({ byDay: on ? rep.byDay.filter((c) => c !== code) : [...rep.byDay, code] }),
                },
                format(weekdayDate(code), { weekday: 'narrow' }, locale),
              );
            }),
          ),
        ),
      rep.freq === 'MONTHLY' && start &&
        field('On', select('monthly', rep.monthly, [
          ['day', `Day ${start.getDate()}`],
          ['weekday', `The ${ORD[nthOf(start)]} ${format(start, { weekday: 'long' }, locale)}`],
        ], (v) => this.setRepeat({ monthly: v })), ' ck-field-wide'),
      rep.freq !== 'NONE' &&
        field(
          'Ends',
          h(
            'span',
            { class: 'ck-inline' },
            select('ends', rep.ends, [['never', 'Never'], ['count', 'After'], ['until', 'On date']], (v) => this.setRepeat({ ends: v })),
            rep.ends === 'count' && [
              input('count', { type: 'number', min: '1', max: '999', value: rep.count, onInput: (e) => { rep.count = e.target.value; this.updateDerived(); } }),
              h('span', { class: 'ck-unit' }, 'times'),
            ],
            rep.ends === 'until' && input('until', { type: 'date', value: rep.until, onInput: (e) => { rep.until = e.target.value; this.updateDerived(); } }),
          ),
          ' ck-field-wide',
        ),
      h('p', { class: 'ck-hint', 'aria-live': 'polite' }, rrule && start ? describeRRule(rrule, start, locale) : ''),
    );

    const fields = cal.config.editorFields;
    const custom =
      fields.length > 0 &&
      h(
        'div',
        { class: 'ck-field-grid' },
        fields.map((fd) => {
          const value = f.extra[fd.name];
          const update = (e) => {
            f.extra[fd.name] = e.target.value;
          };
          let control;
          if (fd.type === 'select') {
            control = h(
              'select',
              { 'data-key': `x-${fd.name}`, value: String(value ?? ''), onChange: update },
              h('option', { value: '' }, '—'),
              (fd.options || []).map((o) => h('option', { value: String(o?.value ?? o) }, String(o?.label ?? o))),
            );
          } else if (fd.type === 'textarea') {
            control = h('textarea', { 'data-key': `x-${fd.name}`, rows: '2', value: value ?? '', onInput: update });
          } else {
            control = input(`x-${fd.name}`, { type: fd.type || 'text', placeholder: fd.placeholder, value: value ?? '', onInput: update });
          }
          return field(fd.label, control, fd.type === 'textarea' ? ' ck-field-wide' : '');
        }),
      );

    const notes = field(
      'Notes',
      h('textarea', { 'data-key': 'notes', rows: '3', placeholder: 'Agenda, links, call notes', value: f.notes, onInput: (e) => (f.notes = e.target.value) }),
      ' ck-field-wide',
    );

    return h(
      'form',
      {
        class: 'ck-dialog ck-editor',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': isNew ? 'New event' : 'Edit event',
        novalidate: true,
        style: { '--ck-ev': this.swatch() },
        onSubmit: (e) => this.submit(e),
        onKeydown: (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            this.onClose();
          }
        },
      },
      h(
        'div',
        { class: 'ck-editor-head' },
        h('input', {
          class: 'ck-editor-title', 'data-key': 'title', placeholder: 'Add a title', 'aria-label': 'Title', value: f.title, disabled: readOnly,
          onInput: (e) => (f.title = e.target.value),
        }),
        h('button', { type: 'button', class: 'ck-icon-btn', 'aria-label': 'Close', onClick: () => this.onClose() }, icon(ICONS.close)),
      ),
      h(
        'div',
        { class: 'ck-editor-body' },
        when,
        h('p', { class: 'ck-error', role: 'alert', hidden: true }),
        who,
        repeat,
        custom,
        notes,
      ),
      h(
        'div',
        { class: 'ck-dialog-foot' },
        !isNew && !readOnly && h('button', { type: 'button', class: 'ck-btn ck-btn-danger', onClick: () => this.onDelete(instance) }, isSeries ? 'Delete…' : 'Delete'),
        h('span', { class: 'ck-spacer' }),
        h('button', { type: 'button', class: 'ck-btn', onClick: () => this.onClose() }, 'Cancel'),
        !readOnly && h('button', { type: 'submit', class: 'ck-btn ck-btn-primary' }, isNew ? 'Create event' : 'Save changes'),
      ),
    );
  }

  destroy() {
    this.el.remove();
  }
}

/**
 * Ask how much of a recurring series an edit or delete applies to.
 * Resolves to 'this' | 'future' | 'all', or null when cancelled.
 */
export function askScope(container, { kind = 'edit', allowThis = true } = {}) {
  return new Promise((resolve) => {
    let scope = allowThis ? 'this' : 'future';
    const verb = kind === 'delete' ? 'Delete' : 'Change';
    let overlay;
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    const radio = (value, label) =>
      h('label', null, h('input', { type: 'radio', name: 'ck-scope', checked: scope === value, onChange: () => (scope = value) }), ` ${label}`);
    const form = h(
      'form',
      {
        class: 'ck-dialog ck-scope',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': `${verb} recurring event`,
        onSubmit: (e) => {
          e.preventDefault();
          close(scope);
        },
        onKeydown: (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            close(null);
          }
        },
      },
      h('h2', { class: 'ck-dialog-title' }, `${verb} recurring event`),
      h(
        'div',
        { class: 'ck-scope-options' },
        allowThis && radio('this', 'This event'),
        radio('future', 'This and following events'),
        radio('all', 'All events in the series'),
      ),
      h(
        'div',
        { class: 'ck-dialog-foot' },
        h('span', { class: 'ck-spacer' }),
        h('button', { type: 'button', class: 'ck-btn', onClick: () => close(null) }, 'Cancel'),
        h('button', { type: 'submit', class: `ck-btn ${kind === 'delete' ? 'ck-btn-danger-solid' : 'ck-btn-primary'}` }, kind === 'delete' ? 'Delete' : 'Save'),
      ),
    );
    overlay = h('div', { class: 'ck-overlay', onPointerdown: (e) => e.target === e.currentTarget && close(null) }, form);
    container.appendChild(overlay);
    setTimeout(() => form.querySelector('input:checked')?.focus(), 0);
  });
}
