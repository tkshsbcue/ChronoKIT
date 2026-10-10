//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = class {
	constructor() {
		this._listeners = /* @__PURE__ */ new Map();
	}
	on(e, t) {
		return this._listeners.has(e) || this._listeners.set(e, /* @__PURE__ */ new Set()), this._listeners.get(e).add(t), () => this.off(e, t);
	}
	off(e, t) {
		this._listeners.get(e)?.delete(t);
	}
	emit(e, ...t) {
		let n = this._listeners.get(e);
		if (n) for (let e of [...n]) e(...t);
	}
}, r = /* @__PURE__ */ t({
	DAY: () => o,
	HOUR: () => a,
	MINUTE: () => i,
	WEEKDAY_CODES: () => O,
	addDays: () => p,
	addMinutes: () => f,
	addMonths: () => h,
	atMinutes: () => S,
	clamp: () => T,
	clone: () => l,
	dateKey: () => D,
	daysInMonth: () => m,
	diffCalendarDays: () => y,
	diffMonths: () => b,
	floorTo: () => w,
	format: () => k,
	formatTime: () => A,
	formatTimeRange: () => j,
	fromInputs: () => ne,
	isSameDay: () => v,
	isWeekend: () => re,
	minutesOfDay: () => x,
	overlaps: () => E,
	pad: () => u,
	snap: () => C,
	startOfDay: () => d,
	startOfMonth: () => _,
	startOfWeek: () => g,
	toDate: () => c,
	toLocalISO: () => ee,
	toTimeInput: () => te
}), i = 6e4, a = 60 * i, o = 24 * a, s = /^(\d{4})-(\d{2})-(\d{2})$/;
function c(e) {
	if (e == null || e === "") return null;
	if (e instanceof Date) return isNaN(e) ? null : new Date(e.getTime());
	if (typeof e == "number") return new Date(e);
	if (typeof e == "string") {
		let t = s.exec(e);
		if (t) return new Date(+t[1], t[2] - 1, +t[3]);
		let n = new Date(e);
		return isNaN(n) ? null : n;
	}
	return null;
}
var l = (e) => new Date(e.getTime()), u = (e) => String(e).padStart(2, "0");
function d(e) {
	return new Date(e.getFullYear(), e.getMonth(), e.getDate());
}
function f(e, t) {
	return new Date(e.getTime() + t * i);
}
function p(e, t) {
	let n = l(e);
	return n.setDate(n.getDate() + t), n;
}
function m(e, t) {
	return new Date(e, t + 1, 0).getDate();
}
function h(e, t) {
	let n = l(e), r = n.getDate();
	return n.setDate(1), n.setMonth(n.getMonth() + t), n.setDate(Math.min(r, m(n.getFullYear(), n.getMonth()))), n;
}
function g(e, t = 1) {
	let n = d(e);
	return p(n, -((n.getDay() - t + 7) % 7));
}
function _(e) {
	return new Date(e.getFullYear(), e.getMonth(), 1);
}
function v(e, t) {
	return e.getFullYear() === t.getFullYear() && e.getMonth() === t.getMonth() && e.getDate() === t.getDate();
}
function y(e, t) {
	let n = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()), r = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
	return Math.round((n - r) / o);
}
function b(e, t) {
	return (e.getFullYear() - t.getFullYear()) * 12 + (e.getMonth() - t.getMonth());
}
function x(e) {
	return e.getHours() * 60 + e.getMinutes() + e.getSeconds() / 60;
}
function S(e, t) {
	let n = d(e);
	return n.setHours(0, Math.round(t), 0, 0), n;
}
var C = (e, t) => Math.round(e / t) * t, w = (e, t) => Math.floor(e / t) * t, T = (e, t, n) => Math.min(n, Math.max(t, e));
function E(e, t, n, r) {
	return e < r && n < t;
}
function D(e) {
	return `${e.getFullYear()}-${u(e.getMonth() + 1)}-${u(e.getDate())}`;
}
function ee(e) {
	return `${D(e)}T${u(e.getHours())}:${u(e.getMinutes())}:${u(e.getSeconds())}`;
}
function te(e) {
	return `${u(e.getHours())}:${u(e.getMinutes())}`;
}
function ne(e, t) {
	let n = c(e);
	if (!n) return null;
	let [r, i] = (t || "00:00").split(":").map(Number);
	return n.setHours(r || 0, i || 0, 0, 0), n;
}
function re(e) {
	let t = e.getDay();
	return t === 0 || t === 6;
}
var O = [
	"SU",
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA"
], ie = /* @__PURE__ */ new Map();
function k(e, t, n) {
	let r = `${n || ""}|${JSON.stringify(t)}`, i = ie.get(r);
	return i || (i = new Intl.DateTimeFormat(n, t), ie.set(r, i)), i.format(e);
}
function A(e, t) {
	return k(e, {
		hour: "numeric",
		minute: "2-digit"
	}, t);
}
function j(e, t, n) {
	return `${A(e, n)} – ${A(t, n)}`;
}
//#endregion
//#region src/core/recurrence.js
var ae = [
	"DAILY",
	"WEEKLY",
	"MONTHLY",
	"YEARLY"
], oe = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
];
function M(e) {
	let t = /^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/.exec(String(e).toUpperCase());
	return t ? {
		n: t[1] ? parseInt(t[1], 10) : 0,
		code: t[2],
		weekday: O.indexOf(t[2])
	} : null;
}
function se(e) {
	if (!e || !ae.includes(String(e.freq).toUpperCase())) return null;
	let t = {
		freq: String(e.freq).toUpperCase(),
		interval: Math.max(1, parseInt(e.interval, 10) || 1)
	};
	e.count > 0 ? t.count = parseInt(e.count, 10) : e.until && (t.until = c(e.until));
	let n = (e.byDay || []).map((e) => String(e).toUpperCase()).filter((e) => M(e));
	n.length && (t.byDay = n);
	let r = (e.byMonthDay || []).map(Number).filter((e) => e && Math.abs(e) <= 31);
	return r.length && (t.byMonthDay = r), t;
}
function ce(e) {
	let t = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(e);
	if (!t) return c(e);
	let [, n, r, i, a, o, s, l] = t;
	return a === void 0 ? new Date(+n, r - 1, +i, 23, 59, 59) : l ? new Date(Date.UTC(+n, r - 1, +i, +a, +o, +s)) : new Date(+n, r - 1, +i, +a, +o, +s);
}
function N(e) {
	if (!e) return null;
	if (typeof e == "object") return se(e);
	let t = {};
	for (let n of String(e).replace(/^RRULE:/i, "").trim().split(";")) {
		let [e, r] = n.split("=");
		if (e && r != null) switch (e.trim().toUpperCase()) {
			case "FREQ":
				t.freq = r.trim();
				break;
			case "INTERVAL":
				t.interval = r;
				break;
			case "COUNT":
				t.count = parseInt(r, 10);
				break;
			case "UNTIL":
				t.until = ce(r.trim());
				break;
			case "BYDAY":
				t.byDay = r.split(",");
				break;
			case "BYMONTHDAY": t.byMonthDay = r.split(",");
		}
	}
	return se(t);
}
function le(e) {
	return `${e.getUTCFullYear()}${u(e.getUTCMonth() + 1)}${u(e.getUTCDate())}T${u(e.getUTCHours())}${u(e.getUTCMinutes())}${u(e.getUTCSeconds())}Z`;
}
function P(e) {
	let t = N(e);
	if (!t) return null;
	let n = [`FREQ=${t.freq}`];
	return t.interval > 1 && n.push(`INTERVAL=${t.interval}`), t.byDay && n.push(`BYDAY=${t.byDay.join(",")}`), t.byMonthDay && n.push(`BYMONTHDAY=${t.byMonthDay.join(",")}`), t.count ? n.push(`COUNT=${t.count}`) : t.until && n.push(`UNTIL=${le(t.until)}`), n.join(";");
}
var ue = (e, t) => new Date(e.getFullYear(), e.getMonth(), e.getDate(), t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds());
function de(e, t, n, r) {
	if (r > 0) {
		let i = 1 + (n - new Date(e, t, 1).getDay() + 7) % 7 + (r - 1) * 7;
		return i <= m(e, t) ? new Date(e, t, i) : null;
	}
	let i = m(e, t), a = i - (new Date(e, t, i).getDay() - n + 7) % 7 + (r + 1) * 7;
	return a >= 1 ? new Date(e, t, a) : null;
}
function fe(e, t, n) {
	switch (t.freq) {
		case "DAILY": {
			let r = p(d(e), n * t.interval);
			return t.byDay && !t.byDay.some((e) => M(e).weekday === r.getDay()) ? {
				periodStart: r,
				dates: []
			} : {
				periodStart: r,
				dates: [ue(r, e)]
			};
		}
		case "WEEKLY": {
			let r = p(g(e, 1), n * 7 * t.interval), i = t.byDay ? t.byDay.map((e) => M(e).code) : [O[e.getDay()]];
			return {
				periodStart: r,
				dates: [...new Set(i)].map((e) => oe.indexOf(e)).sort((e, t) => e - t).map((t) => ue(p(r, t), e))
			};
		}
		case "MONTHLY": {
			let r = h(_(e), n * t.interval), i = r.getFullYear(), a = r.getMonth(), o = [];
			if (t.byDay) for (let e of t.byDay) {
				let { n: t, weekday: n } = M(e);
				if (t) {
					let e = de(i, a, n, t);
					e && o.push(e);
				} else for (let e = 1; e <= m(i, a); e++) {
					let t = new Date(i, a, e);
					t.getDay() === n && o.push(t);
				}
			}
			else {
				let n = t.byMonthDay || [e.getDate()], r = m(i, a);
				for (let e of n) {
					let t = e > 0 ? e : r + e + 1;
					t >= 1 && t <= r && o.push(new Date(i, a, t));
				}
			}
			return o = o.sort((e, t) => e - t).map((t) => ue(t, e)), {
				periodStart: r,
				dates: o
			};
		}
		case "YEARLY": {
			let r = e.getFullYear() + n * t.interval, i = new Date(r, e.getMonth(), e.getDate()), a = i.getMonth() === e.getMonth();
			return {
				periodStart: new Date(r, 0, 1),
				dates: a ? [ue(i, e)] : []
			};
		}
		default: return null;
	}
}
function pe(e, t, n) {
	if (t.count || n <= e) return 0;
	let r;
	switch (t.freq) {
		case "DAILY":
			r = y(n, e) / t.interval;
			break;
		case "WEEKLY":
			r = y(n, g(e, 1)) / (7 * t.interval);
			break;
		case "MONTHLY":
			r = b(n, e) / t.interval;
			break;
		case "YEARLY":
			r = (n.getFullYear() - e.getFullYear()) / t.interval;
			break;
		default: r = 0;
	}
	return Math.max(0, Math.floor(r) - 1);
}
function* me(e, t, { before: n = null, after: r = null, maxPeriods: i = 5e4 } = {}) {
	let a = N(t);
	if (!a) {
		yield l(e);
		return;
	}
	let o = 0, s = r ? pe(e, a, r) : 0;
	for (let t = s; t < s + i; t++) {
		let { periodStart: r, dates: i } = fe(e, a, t);
		if (n && r >= n || a.until && r > a.until) return;
		for (let t of i) if (!(t < e) && (a.until && t > a.until || n && t >= n || (yield t, o++, a.count && o >= a.count))) return;
	}
}
function he(e, t, n) {
	let r = N(e.rrule), i = e.end - e.start;
	if (!r) return e.start < n && (e.end > t || i === 0 && e.start >= t) ? [{
		start: l(e.start),
		end: l(e.end),
		key: D(e.start)
	}] : [];
	let a = new Set(e.exceptionDates || []), o = new Date(t.getTime() - i), s = [];
	for (let c of me(e.start, r, {
		before: n,
		after: o
	})) {
		let e = new Date(c.getTime() + i);
		if (!(e > t || i === 0 && c >= t)) continue;
		let n = D(c);
		a.has(n) || s.push({
			start: c,
			end: e,
			key: n
		});
	}
	return s;
}
function ge(e, t, n) {
	let r = 0;
	for (let i of me(e, t, { before: n })) r++;
	return r;
}
function _e(e, t) {
	let n = N(e);
	if (!n || !t) return n;
	let r = { ...n };
	return n.byDay && (r.byDay = n.byDay.map((e) => {
		let { n, weekday: r } = M(e), i = O[((r + t) % 7 + 7) % 7];
		return n ? `${n}${i}` : i;
	})), n.byMonthDay && (r.byMonthDay = n.byMonthDay.map((e) => e > 0 ? Math.min(31, Math.max(1, e + t)) : e)), r;
}
var ve = {
	DAILY: ["day", "days"],
	WEEKLY: ["week", "weeks"],
	MONTHLY: ["month", "months"],
	YEARLY: ["year", "years"]
}, ye = {
	1: "first",
	2: "second",
	3: "third",
	4: "fourth",
	5: "fifth",
	"-1": "last"
}, be = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR"
];
function F(e, t, n) {
	let r = N(e);
	if (!r) return "Does not repeat";
	let i = (e, t = "short") => k(new Date(2024, 0, 7 + O.indexOf(e)), { weekday: t }, n), a, o = (r.byDay || []).map((e) => M(e));
	if (r.freq === "DAILY" && o.length === 5 && be.every((e) => o.some((t) => t.code === e)) && r.interval === 1) a = "Every weekday";
	else if (a = r.interval === 1 ? `Every ${ve[r.freq][0]}` : `Every ${r.interval} ${ve[r.freq][1]}`, r.freq === "WEEKLY") {
		let e = o.length ? o.map((e) => e.code) : t ? [O[t.getDay()]] : [];
		e.length && (a += ` on ${oe.filter((t) => e.includes(t)).map((e) => i(e)).join(", ")}`);
	} else r.freq === "MONTHLY" ? o.length && o[0].n ? a += ` on the ${ye[o[0].n] || `${o[0].n}th`} ${i(o[0].code, "long")}` : r.byMonthDay ? a += ` on day ${r.byMonthDay.join(", ")}` : t && (a += ` on day ${t.getDate()}`) : r.freq === "YEARLY" && t && (a += ` on ${k(t, {
		month: "long",
		day: "numeric"
	}, n)}`);
	return r.count ? a += `, ${r.count} ${r.count === 1 ? "time" : "times"}` : r.until && (a += `, until ${k(r.until, {
		month: "short",
		day: "numeric",
		year: "numeric"
	}, n)}`), a;
}
//#endregion
//#region src/core/project.js
var xe = 0, Se = "_new_", I = (e) => typeof e == "string" && e.startsWith("_new_"), L = () => `${Se}${++xe}`, R = ["resources", "events"];
function Ce(e) {
	let t = c(e.start) ?? d(/* @__PURE__ */ new Date()), n = c(e.end);
	n ||= f(t, e.duration ?? 60), n < t && (n = new Date(t));
	let r = !!e.allDay;
	if (r) {
		t = d(t);
		let e = d(n);
		n = +e == +n ? e : p(e, 1), n <= t && (n = p(t, 1));
	}
	let i = null;
	e.rrule && (i = P(e.rrule));
	let a = {
		...e,
		id: e.id ?? L(),
		title: e.title ?? "",
		start: t,
		end: n,
		allDay: r,
		resourceId: e.resourceId ?? null,
		color: e.color ?? null,
		notes: e.notes ?? "",
		rrule: i,
		exceptionDates: i ? [...new Set((e.exceptionDates || []).map(we))].sort() : [],
		recurringEventId: e.recurringEventId ?? null,
		originalDateKey: e.originalDateKey ?? null
	};
	return delete a.duration, Object.freeze(a);
}
function we(e) {
	if (e instanceof Date) return D(e);
	let t = String(e);
	return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : D(c(t));
}
function Te(e) {
	return Object.freeze({
		...e,
		id: e.id ?? L(),
		name: e.name ?? ""
	});
}
var Ee = () => {
	let e = {};
	for (let t of R) e[t] = {
		added: /* @__PURE__ */ new Set(),
		updated: /* @__PURE__ */ new Map(),
		removed: /* @__PURE__ */ new Map()
	};
	return e;
};
function De(e, t) {
	let n = /* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)]), r = [];
	for (let i of n) {
		let n = e[i], a = t[i];
		(n instanceof Date && a instanceof Date ? +n != +a : Array.isArray(n) && Array.isArray(a) ? n.join() !== a.join() : n !== a) && r.push(i);
	}
	return r;
}
var Oe = (e, t) => t ? e.map((e) => D(p(c(e), t))) : e, ke = /* @__PURE__ */ new Set([
	"id",
	"rrule",
	"exceptionDates",
	"recurringEventId",
	"originalDateKey"
]), Ae = class extends n {
	constructor({ events: e = [], resources: t = [], undoLimit: n = 100 } = {}) {
		super(), this._events = /* @__PURE__ */ new Map(), this._resources = /* @__PURE__ */ new Map(), this._resourceOrder = [], this._undo = [], this._redo = [], this._tx = null, this._replaying = !1, this._changes = Ee(), this._cache = {}, this.undoLimit = n, this.version = 0, this.subscribe = (e) => this.on("change", e), this.getVersion = () => this.version, this.loadData({
			events: e,
			resources: t
		});
	}
	get events() {
		return this._cache.events ??= [...this._events.values()];
	}
	get resources() {
		return this._cache.resources ??= this._resourceOrder.map((e) => this._resources.get(e));
	}
	getEvent(e) {
		return this._events.get(e) ?? null;
	}
	getResource(e) {
		return this._resources.get(e) ?? null;
	}
	getEventsInRange(e, t, { resourceIds: n = null, filter: r = null } = {}) {
		let i = n ? new Set(n) : null, a = [];
		for (let n of this._events.values()) if ((!i || i.has(n.resourceId)) && (!r || r(n))) {
			if (n.rrule) for (let r of he(n, e, t)) a.push({
				...n,
				start: r.start,
				end: r.end,
				instanceId: `${n.id}::${r.key}`,
				masterId: n.id,
				isOccurrence: !0,
				occurrenceKey: r.key
			});
			else n.start < t && (n.end > e || +n.end == +n.start && n.start >= e) && a.push({
				...n,
				instanceId: String(n.id),
				masterId: n.id,
				isOccurrence: !1,
				occurrenceKey: null
			});
		}
		return a.sort((e, t) => e.start - t.start || t.end - e.end);
	}
	getConflicts({ resourceId: e, start: t, end: n, ignoreId: r = null }) {
		return e == null ? [] : this.getEventsInRange(t, n, { resourceIds: [e] }).filter((e) => e.instanceId !== r && e.masterId !== r && e.start < n && e.end > t);
	}
	loadData({ events: e, resources: t } = {}, { keepHistory: n = !1 } = {}) {
		if (t) {
			this._resources.clear(), this._resourceOrder = [];
			for (let e of t) {
				let t = Te(e);
				this._resources.set(t.id, t), this._resourceOrder.push(t.id);
			}
		}
		if (e) {
			this._events.clear();
			for (let t of e) {
				let e = Ce(t);
				this._events.set(e.id, e);
			}
		}
		n || (this._undo = [], this._redo = []), this._changes = Ee(), this._bump({ type: "load" });
	}
	toJSON() {
		let e = (e) => {
			let t = {};
			for (let [n, r] of Object.entries(e)) t[n] = r instanceof Date ? r.toISOString() : r;
			return t;
		};
		return {
			resources: this.resources.map(e),
			events: this.events.map(e)
		};
	}
	addEvent(e) {
		let t = Ce({
			...e,
			id: e.id ?? L()
		});
		return this._do({
			store: "events",
			type: "add",
			record: t
		}, "Add event"), t;
	}
	updateEvent(e, t) {
		let n = this._events.get(e);
		if (!n) throw Error(`Event ${e} not found`);
		let r = Ce({
			...n,
			...t,
			id: e
		});
		return De(n, r).length ? (this._do({
			store: "events",
			type: "update",
			id: e,
			before: n,
			after: r
		}, "Edit event"), r) : n;
	}
	removeEvent(e) {
		let t = this._events.get(e);
		t && this.transaction(() => {
			if (t.rrule) for (let t of [...this._events.values()]) t.recurringEventId === e && this._do({
				store: "events",
				type: "remove",
				record: t
			});
			this._do({
				store: "events",
				type: "remove",
				record: t
			});
		}, "Delete event");
	}
	updateOccurrence(e, t, n = "all") {
		if (!e.isOccurrence) return this.updateEvent(e.masterId, t);
		let r = this._events.get(e.masterId);
		if (!r) return null;
		let i = t.start ? c(t.start) : e.start, a = t.end ? c(t.end) : f(i, (e.end - e.start) / 6e4), o = +e.start == +r.start;
		if (n === "this") return this.transaction(() => {
			this.updateEvent(r.id, { exceptionDates: [...r.exceptionDates, e.occurrenceKey] });
			let n = {};
			for (let [e, t] of Object.entries(r)) ke.has(e) || (n[e] = t);
			let { rrule: o, exceptionDates: s, ...c } = t;
			return this.addEvent({
				...n,
				...c,
				start: i,
				end: a,
				recurringEventId: r.id,
				originalDateKey: e.occurrenceKey
			});
		}, "Edit occurrence");
		let s = i - e.start, l = a - i, u = y(i, e.start), d = "rrule" in t, p = (e) => d ? t.rrule : u ? P(_e(e, u)) : e;
		if (n === "all" || o) {
			let e = new Date(r.start.getTime() + s);
			return this.updateEvent(r.id, {
				...t,
				start: e,
				end: new Date(e.getTime() + l),
				rrule: p(r.rrule),
				exceptionDates: Oe(t.exceptionDates ?? r.exceptionDates, u)
			});
		}
		return this.transaction(() => {
			let n = N(r.rrule), o = ge(r.start, n, e.start), s = { ...n };
			delete s.count, s.until = /* @__PURE__ */ new Date(e.start.getTime() - 1e3), this.updateEvent(r.id, {
				rrule: P(s),
				exceptionDates: r.exceptionDates.filter((t) => t < e.occurrenceKey)
			});
			let c = { ...n };
			n.count && (c.count = Math.max(1, n.count - o));
			let l = {};
			for (let [e, t] of Object.entries(r)) ke.has(e) || (l[e] = t);
			return this.addEvent({
				...l,
				...t,
				start: i,
				end: a,
				rrule: d ? t.rrule : P(u ? _e(c, u) : c),
				exceptionDates: Oe(r.exceptionDates.filter((t) => t >= e.occurrenceKey), u)
			});
		}, "Edit series");
	}
	removeOccurrence(e, t = "all") {
		if (!e.isOccurrence) return this.removeEvent(e.masterId);
		let n = this._events.get(e.masterId);
		if (n) {
			if (t === "all" || t === "future" && +e.start == +n.start) this.removeEvent(n.id);
			else if (t === "this") this.updateEvent(n.id, { exceptionDates: [...n.exceptionDates, e.occurrenceKey] });
			else {
				let t = N(n.rrule);
				delete t.count, t.until = /* @__PURE__ */ new Date(e.start.getTime() - 1e3), this.updateEvent(n.id, { rrule: P(t) });
			}
		}
	}
	addResource(e, t = this._resourceOrder.length) {
		let n = Te({
			...e,
			id: e.id ?? L()
		});
		return this._do({
			store: "resources",
			type: "add",
			record: n,
			index: t
		}, "Add resource"), n;
	}
	updateResource(e, t) {
		let n = this._resources.get(e);
		if (!n) throw Error(`Resource ${e} not found`);
		let r = Te({
			...n,
			...t,
			id: e
		});
		return De(n, r).length ? (this._do({
			store: "resources",
			type: "update",
			id: e,
			before: n,
			after: r
		}, "Edit resource"), r) : n;
	}
	removeResource(e) {
		let t = this._resources.get(e);
		t && this.transaction(() => {
			for (let t of [...this._events.values()]) t.resourceId === e && this.updateEvent(t.id, { resourceId: null });
			this._do({
				store: "resources",
				type: "remove",
				record: t,
				index: this._resourceOrder.indexOf(e)
			});
		}, "Remove resource");
	}
	transaction(e, t = "Edit") {
		if (this._tx) return e();
		this._tx = {
			label: t,
			ops: []
		};
		let n;
		try {
			n = e();
		} catch (e) {
			let { ops: t } = this._tx;
			this._tx = null;
			for (let e = t.length - 1; e >= 0; e--) this._apply(this._inverse(t[e]), !0);
			throw this._bump({ type: "rollback" }), e;
		}
		let r = this._tx;
		return this._tx = null, r.ops.length && (this._pushHistory(r), this._bump({
			type: "edit",
			label: r.label,
			ops: r.ops
		})), n;
	}
	get canUndo() {
		return this._undo.length > 0;
	}
	get canRedo() {
		return this._redo.length > 0;
	}
	get undoLabel() {
		return this._undo[this._undo.length - 1]?.label ?? null;
	}
	get redoLabel() {
		return this._redo[this._redo.length - 1]?.label ?? null;
	}
	undo() {
		let e = this._undo.pop();
		if (!e) return !1;
		for (let t = e.ops.length - 1; t >= 0; t--) this._apply(this._inverse(e.ops[t]), !0);
		return this._redo.push(e), this._bump({
			type: "undo",
			label: e.label
		}), !0;
	}
	redo() {
		let e = this._redo.pop();
		if (!e) return !1;
		for (let t of e.ops) this._apply(t, !0);
		return this._undo.push(e), this._bump({
			type: "redo",
			label: e.label
		}), !0;
	}
	peekUndo() {
		return this._undo[this._undo.length - 1] ?? null;
	}
	peekRedo() {
		return this._redo[this._redo.length - 1] ?? null;
	}
	dropUndo() {
		let e = this._undo.pop() ?? null;
		return e && this._bump({ type: "history" }), e;
	}
	dropRedo() {
		let e = this._redo.pop() ?? null;
		return e && this._bump({ type: "history" }), e;
	}
	clearHistory() {
		this._undo = [], this._redo = [], this._bump({ type: "history" });
	}
	_do(e, t) {
		this._apply(e, !0), this._tx ? this._tx.ops.push(e) : (this._pushHistory({
			label: t || "Edit",
			ops: [e]
		}), this._bump({
			type: "edit",
			label: t,
			ops: [e]
		}));
	}
	_pushHistory(e) {
		this._undo.push(e), this._undo.length > this.undoLimit && this._undo.shift(), this._redo = [];
	}
	_inverse(e) {
		return e.type === "add" ? {
			...e,
			type: "remove"
		} : e.type === "remove" ? {
			...e,
			type: "add"
		} : {
			...e,
			before: e.after,
			after: e.before
		};
	}
	_apply(e, t) {
		let n = e.store === "events" ? this._events : this._resources;
		if (e.type === "add") {
			if (n.set(e.record.id, e.record), e.store === "resources") {
				let t = e.index == null ? this._resourceOrder.length : Math.min(e.index, this._resourceOrder.length);
				this._resourceOrder.splice(t, 0, e.record.id);
			}
		} else if (e.type === "update") n.set(e.id, e.after);
		else if (e.type === "remove" && (n.delete(e.record.id), e.store === "resources")) {
			let t = this._resourceOrder.indexOf(e.record.id);
			t >= 0 && this._resourceOrder.splice(t, 1);
		}
		t && this._track(e), this._cache = {};
	}
	_bump(e) {
		this._cache = {}, this.version++, this.emit("change", e);
	}
	_track(e) {
		let t = this._changes[e.store];
		if (e.type === "add") {
			let n = e.record.id;
			t.removed.has(n) ? (t.removed.delete(n), t.updated.set(n, new Set(Object.keys(e.record)))) : t.added.add(n);
		} else if (e.type === "update") {
			if (t.added.has(e.id)) return;
			let n = t.updated.get(e.id) ?? /* @__PURE__ */ new Set();
			for (let t of De(e.before, e.after)) n.add(t);
			n.size && t.updated.set(e.id, n);
		} else if (e.type === "remove") {
			let n = e.record.id;
			if (t.added.has(n)) {
				t.added.delete(n);
				return;
			}
			t.updated.delete(n), t.removed.set(n, e.record);
		}
	}
	get hasChanges() {
		return R.some((e) => {
			let t = this._changes[e];
			return t.added.size || t.updated.size || t.removed.size;
		});
	}
	getChanges(e = (e) => e.toISOString()) {
		return this._serializeChanges(this._changes, e);
	}
	_serializeChanges(e, t) {
		let n = (e) => e instanceof Date ? t(e) : e, r = {};
		for (let t of R) {
			let i = e[t], a = t === "events" ? this._events : this._resources, o = {}, s = [...i.added].filter((e) => a.has(e)).map((e) => {
				let { id: t, ...r } = a.get(e), i = { $phantomId: e };
				for (let [e, t] of Object.entries(r)) i[e] = n(t);
				return i;
			}), c = [...i.updated].filter(([e]) => a.has(e)).map(([e, t]) => {
				let r = a.get(e), i = { id: e };
				for (let e of t) e !== "id" && (i[e] = n(r[e]));
				return i;
			}), l = [...i.removed.keys()].map((e) => ({ id: e }));
			s.length && (o.added = s), c.length && (o.updated = c), l.length && (o.removed = l), Object.keys(o).length && (r[t] = o);
		}
		return Object.keys(r).length ? r : null;
	}
	_takeChanges() {
		let e = this._changes;
		return this._changes = Ee(), e;
	}
	_restoreChanges(e) {
		for (let t of R) {
			let n = this._changes[t], r = e[t];
			for (let e of r.added) n.removed.has(e) ? n.removed.delete(e) : (n.added.add(e), n.updated.delete(e));
			for (let [e, t] of r.updated) {
				if (n.removed.has(e) || n.added.has(e)) continue;
				let r = n.updated.get(e) ?? /* @__PURE__ */ new Set();
				for (let e of t) r.add(e);
				n.updated.set(e, r);
			}
			for (let [e, t] of r.removed) n.added.has(e) ? (n.added.delete(e), n.updated.set(e, new Set(Object.keys(this._events.get(e) || this._resources.get(e) || t)))) : n.removed.set(e, t);
		}
		this._bump({ type: "changes" });
	}
	applySyncResponse(e = {}) {
		for (let t of R) {
			let n = e[t];
			if (!n) continue;
			let r = t === "events" ? this._events : this._resources;
			for (let e of n.rows || []) {
				let { $phantomId: n, ...i } = e, a = i.id;
				n != null && r.has(n) && a != null && a !== n && this._remapId(t, n, a), a ??= n;
				let o = r.get(a);
				if (!o) continue;
				let s = t === "events" ? Ce({
					...o,
					...i,
					id: a
				}) : Te({
					...o,
					...i,
					id: a
				});
				r.set(a, s);
			}
			for (let e of n.removed || []) {
				let n = e.id ?? e;
				r.delete(n), t === "resources" && (this._resourceOrder = this._resourceOrder.filter((e) => e !== n));
			}
		}
		this._bump({ type: "sync" });
	}
	_remapId(e, t, n) {
		let r = (r) => {
			if (!r) return r;
			let i = r;
			return e === "events" && r.id === t && (i = {
				...i,
				id: n
			}), e === "events" && r.recurringEventId === t && (i = {
				...i,
				recurringEventId: n
			}), e === "resources" && r.resourceId === t && (i = {
				...i,
				resourceId: n
			}), i === r ? r : Object.freeze(i);
		}, i = (r) => r && e === "resources" && r.id === t ? Object.freeze({
			...r,
			id: n
		}) : r, a = (e, t) => e === "events" ? r(t) : i(t);
		if (e === "resources") {
			let e = this._resources.get(t);
			this._resources.delete(t), this._resources.set(n, i(e)), this._resourceOrder = this._resourceOrder.map((e) => e === t ? n : e);
		}
		let o = /* @__PURE__ */ new Map();
		for (let [i, a] of this._events) {
			let s = r(a);
			o.set(e === "events" && i === t ? n : i, s);
		}
		this._events = o;
		let s = (r) => {
			let i = { ...r };
			return r.record && (i.record = a(r.store, r.record)), r.before && (i.before = a(r.store, r.before)), r.after && (i.after = a(r.store, r.after)), r.store === e && r.id === t && (i.id = n), i;
		};
		for (let e of [this._undo, this._redo]) for (let t of e) t.ops = t.ops.map(s);
		let c = this._changes[e];
		c.added.delete(t) && c.added.add(n), c.updated.has(t) && (c.updated.set(n, c.updated.get(t)), c.updated.delete(t)), c.removed.has(t) && (c.removed.set(n, c.removed.get(t)), c.removed.delete(t)), this._cache = {}, this.emit("idchange", {
			store: e,
			oldId: t,
			newId: n
		});
	}
}, je = (e) => Array.isArray(e) ? e : e && Array.isArray(e.rows) ? e.rows : void 0;
function Me({ loadUrl: e, syncUrl: t, headers: n = {}, fetchOptions: r = {} } = {}) {
	return {
		async load(t) {
			if (!e) throw Error("CrudManager: loadUrl is not set");
			let i = t && Object.keys(t).length ? `${e.includes("?") ? "&" : "?"}${new URLSearchParams(t)}` : "", a = await fetch(e + i, {
				headers: n,
				...r
			});
			if (!a.ok) throw Error(`Load failed: HTTP ${a.status}`);
			return a.json();
		},
		async sync(e) {
			if (!t) throw Error("CrudManager: syncUrl is not set");
			let i = await fetch(t, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...n
				},
				body: JSON.stringify(e),
				...r
			});
			if (!i.ok) throw Error(`Sync failed: HTTP ${i.status}`);
			return i.json();
		}
	};
}
function Ne({ data: e = {
	resources: [],
	events: []
}, latency: t = 250, failRate: n = 0, onRequest: r } = {}) {
	let i = {
		resources: new Map((e.resources || []).map((e) => [e.id, { ...e }])),
		events: new Map((e.events || []).map((e) => [e.id, { ...e }]))
	}, a = 1e3, o = () => new Promise((e) => setTimeout(e, t)), s = (e) => {
		let t = {};
		for (let [n, r] of Object.entries(e)) t[n] = r instanceof Date ? r.toISOString() : r;
		return t;
	};
	return {
		db: i,
		async load(e) {
			await o();
			let t = {
				success: !0,
				resources: [...i.resources.values()].map(s),
				events: [...i.events.values()].map(s)
			};
			return r?.({
				type: "load",
				request: e ?? null,
				response: t
			}), t;
		},
		async sync(e) {
			if (await o(), n && Math.random() < n) {
				let t = {
					success: !1,
					message: "Simulated server error"
				};
				return r?.({
					type: "sync",
					request: e,
					response: t
				}), t;
			}
			let t = { success: !0 }, s = {};
			for (let n of ["resources", "events"]) {
				let r = e[n];
				if (!r) continue;
				let o = [];
				for (let e of r.added || []) {
					let t = `${n === "events" ? "ev" : "res"}-${++a}`;
					s[e.$phantomId] = t;
					let { $phantomId: r, ...c } = e;
					n === "events" && I(c.resourceId) && s[c.resourceId] && (c.resourceId = s[c.resourceId]), n === "events" && I(c.recurringEventId) && s[c.recurringEventId] && (c.recurringEventId = s[c.recurringEventId]), i[n].set(t, {
						...c,
						id: t
					}), o.push({
						$phantomId: r,
						id: t
					});
				}
				for (let e of r.updated || []) {
					let t = { ...e };
					n === "events" && I(t.resourceId) && s[t.resourceId] && (t.resourceId = s[t.resourceId], o.push({
						id: e.id,
						resourceId: t.resourceId
					})), i[n].set(e.id, {
						...i[n].get(e.id) || {},
						...t
					});
				}
				for (let { id: e } of r.removed || []) i[n].delete(e);
				o.length && (t[n] = { rows: o });
			}
			return r?.({
				type: "sync",
				request: e,
				response: t
			}), t;
		}
	};
}
var Pe = class extends n {
	constructor(e, t = {}) {
		super(), this.project = e, this.serializeDate = t.serializeDate ?? ((e) => e.toISOString()), this.transport = t.transport ?? Me(t), this.autoSyncDelay = t.autoSyncDelay ?? 800, this.status = "idle", this.lastError = null, this._inflight = null, this._queued = !1, this._timer = null, this._unsub = null, t.autoSync && this.setAutoSync(!0);
	}
	setAutoSync(e) {
		this._unsub?.(), this._unsub = null, e && (this._unsub = this.project.on("change", (e) => {
			[
				"load",
				"sync",
				"changes",
				"history"
			].includes(e?.type) || this.project.hasChanges && this.scheduleSync();
		}));
	}
	scheduleSync() {
		clearTimeout(this._timer), this._timer = setTimeout(() => this.sync().catch(() => {}), this.autoSyncDelay);
	}
	_setStatus(e, t = null) {
		this.status = e, this.lastError = t, this.emit("status", {
			status: e,
			error: t
		});
	}
	async load(e) {
		this._setStatus("loading"), this.emit("beforeLoad", e);
		try {
			let t = await this.transport.load(e);
			if (t && t.success === !1) throw Error(t.message || "Load failed");
			return this.project.loadData({
				resources: je(t?.resources),
				events: je(t?.events)
			}), this._setStatus("idle"), this.emit("load", t), t;
		} catch (e) {
			throw this._setStatus("error", e), this.emit("loadFail", e), e;
		}
	}
	get hasChanges() {
		return this.project.hasChanges;
	}
	sync() {
		if (this._inflight) return this._queued = !0, this._inflight;
		if (clearTimeout(this._timer), !this.project.hasChanges) return Promise.resolve(null);
		let e = this.project._takeChanges(), t = this.project._serializeChanges(e, this.serializeDate);
		return t ? (this._setStatus("syncing"), this.emit("beforeSync", t), this._inflight = (async () => {
			try {
				let e = await this.transport.sync(t);
				if (e && e.success === !1) throw Error(e.message || "Sync failed");
				return this.project.applySyncResponse(e || {}), this._setStatus("idle"), this.emit("sync", {
					request: t,
					response: e
				}), e;
			} catch (n) {
				throw this.project._restoreChanges(e), this._setStatus("error", n), this.emit("syncFail", {
					request: t,
					error: n
				}), n;
			} finally {
				this._inflight = null, this._queued && (this._queued = !1, this.project.hasChanges && this.sync().catch(() => {}));
			}
		})(), this._inflight) : Promise.resolve(null);
	}
	destroy() {
		clearTimeout(this._timer), this._unsub?.();
	}
}, Fe = "http://www.w3.org/2000/svg", Ie = /* @__PURE__ */ new Set([
	"svg",
	"path",
	"g",
	"circle",
	"rect",
	"line",
	"polyline"
]), Le = /* @__PURE__ */ new Set([
	"value",
	"checked",
	"disabled",
	"selected",
	"indeterminate",
	"readOnly",
	"multiple"
]), Re = /* @__PURE__ */ new Set([
	"opacity",
	"zIndex",
	"flex",
	"flexGrow",
	"flexShrink",
	"fontWeight",
	"lineHeight",
	"order"
]);
function ze(e, t) {
	for (let n of t) n != null && n !== !1 && n !== !0 && (Array.isArray(n) ? ze(e, n) : n instanceof Node ? e.appendChild(n) : e.appendChild(document.createTextNode(String(n))));
	return e;
}
function Be(e, t) {
	for (let [n, r] of Object.entries(t)) r != null && r !== !1 && (n.startsWith("--") ? e.style.setProperty(n, String(r)) : e.style[n] = typeof r == "number" && !Re.has(n) ? `${r}px` : r);
}
function z(e, t = null, ...n) {
	let r = Ie.has(e), i = r ? document.createElementNS(Fe, e) : document.createElement(e), a = null;
	if (t) for (let [e, n] of Object.entries(t)) n != null && n !== !1 && (e === "class" ? r ? i.setAttribute("class", n) : i.className = n : e === "style" ? typeof n == "string" ? i.style.cssText = n : Be(i, n) : e === "dataset" ? Object.assign(i.dataset, n) : e === "html" ? i.innerHTML = n : e.startsWith("on") && typeof n == "function" ? i.addEventListener(e.slice(2).toLowerCase(), n) : Le.has(e) ? (a ??= []).push([e, n]) : i.setAttribute(e, n === !0 ? "" : String(n)));
	if (ze(i, n), a) for (let [e, t] of a) i[e] = t;
	return i;
}
function B(e, t = 16) {
	return z("svg", {
		viewBox: "0 0 16 16",
		width: t,
		height: t,
		"aria-hidden": "true"
	}, z("path", {
		d: e,
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "1.6",
		"stroke-linecap": "round",
		"stroke-linejoin": "round"
	}));
}
var V = {
	prev: "M10 3 5 8l5 5",
	next: "M6 3l5 5-5 5",
	down: "M3 6l5 5 5-5",
	close: "M4 4l8 8M12 4l-8 8",
	undo: "M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2",
	redo: "M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2",
	minus: "M3 8h10",
	plus: "M3 8h10M8 3v10",
	sidebar: "M2.5 3.5h11v9h-11zM6 3.5v9",
	repeat: "M11.5 2.5 13.5 4.5 11.5 6.5M13.5 4.5H5a2.5 2.5 0 0 0-2.5 2.5v.5M4.5 13.5 2.5 11.5 4.5 9.5M2.5 11.5H11a2.5 2.5 0 0 0 2.5-2.5v-.5"
};
function Ve(e) {
	let t = document.createElement("template");
	return t.innerHTML = e, t.content;
}
var He = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, Ue = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => He[e]);
function We(e, t) {
	let n = document.activeElement, r = n && e.contains(n) ? n.closest("[data-key]") : null, i = r?.dataset.key, a = null;
	if (i && n === r && typeof n.selectionStart == "number") try {
		a = [n.selectionStart, n.selectionEnd];
	} catch {
		a = null;
	}
	if (t(), !i) return;
	let o = [...e.querySelectorAll("[data-key]")].find((e) => e.dataset.key === i);
	if (o && o !== document.activeElement && (o.focus({ preventScroll: !0 }), a)) try {
		o.setSelectionRange(a[0], a[1]);
	} catch {}
}
var Ge = (e) => typeof requestAnimationFrame == "function" ? requestAnimationFrame(e) : setTimeout(e, 16), Ke = (e) => typeof cancelAnimationFrame == "function" ? cancelAnimationFrame(e) : clearTimeout(e), qe = {
	day: "Day",
	week: "Week",
	month: "Month",
	timeline: "Timeline",
	list: "List"
};
function Je(e) {
	let t = () => e.sync().catch(() => {});
	return e.status === "syncing" || e.status === "loading" ? z("span", { class: "ck-sync ck-sync-busy" }, e.status === "loading" ? "Loading…" : "Saving…") : e.status === "error" ? z("button", {
		type: "button",
		class: "ck-sync ck-sync-error",
		title: e.lastError?.message,
		"data-key": "sync",
		onClick: t
	}, "Not saved · Retry") : e.hasChanges ? z("button", {
		type: "button",
		class: "ck-sync ck-sync-dirty",
		title: "Save changes (Ctrl+S)",
		"data-key": "sync",
		onClick: t
	}, "Unsaved changes") : z("span", { class: "ck-sync ck-sync-ok" }, "All changes saved");
}
function Ye(e) {
	let { project: t, config: n } = e, r = typeof n.toolbarItems == "function" ? n.toolbarItems(e) : n.toolbarItems, i = (e, t, n, r, i = {}) => z("button", {
		type: "button",
		class: "ck-icon-btn",
		"aria-label": t,
		title: t,
		"data-key": e,
		onClick: r,
		...i
	}, B(n));
	return [
		n.showSidebar && i("sidebar", "Toggle sidebar", V.sidebar, () => e.toggleSidebar(), {
			class: "ck-icon-btn ck-sidebar-toggle",
			"aria-pressed": String(e.sidebarOpen)
		}),
		z("button", {
			type: "button",
			class: "ck-btn",
			"data-key": "today",
			onClick: () => e.today()
		}, "Today"),
		z("div", { class: "ck-nav" }, i("prev", "Previous", V.prev, () => e.prev()), i("next", "Next", V.next, () => e.next())),
		z("h2", {
			class: "ck-title",
			"aria-live": "polite"
		}, e.title),
		z("span", { class: "ck-spacer" }),
		r,
		e.crudManager && Je(e.crudManager),
		z("div", { class: "ck-group" }, i("undo", t.canUndo ? `Undo ${t.undoLabel?.toLowerCase()} (Ctrl+Z)` : "Nothing to undo", V.undo, () => e.undo(), {
			disabled: !t.canUndo,
			"aria-label": "Undo"
		}), i("redo", t.canRedo ? `Redo ${t.redoLabel?.toLowerCase()} (Ctrl+Shift+Z)` : "Nothing to redo", V.redo, () => e.redo(), {
			disabled: !t.canRedo,
			"aria-label": "Redo"
		})),
		e.view === "timeline" && z("div", { class: "ck-group" }, i("zoom-out", "Zoom out", V.minus, () => e.setZoom(e.zoom / 1.5)), i("zoom-in", "Zoom in", V.plus, () => e.setZoom(e.zoom * 1.5))),
		n.views.length > 1 && z("div", {
			class: "ck-segmented",
			role: "tablist",
			"aria-label": "View"
		}, n.views.map((t) => z("button", {
			type: "button",
			role: "tab",
			"aria-selected": String(e.view === t),
			class: e.view === t ? "ck-on" : "",
			"data-key": `view-${t}`,
			onClick: () => e.setView(t)
		}, n.viewLabels?.[t] || qe[t] || t)))
	];
}
//#endregion
//#region src/ui/content.js
var H = {
	cobalt: "#2b59c3",
	teal: "#138a7e",
	plum: "#8a4fb0",
	amber: "#b7760d",
	rose: "#c2416b",
	green: "#3e8e41",
	coral: "#d0613c",
	slate: "#5a6b85"
}, U = (e) => e && H[e] || e || null, W = (e, t) => e == null ? t : !!e, G = (e) => W(e?.startEditable, W(e?.editable, !0)), K = (e) => W(e?.durationEditable, W(e?.editable, !0)), Xe = (e) => W(e?.resourceEditable, W(e?.editable, !0)), q = (e) => e?.display === "background", Ze = (e) => Array.isArray(e.resourceIds) ? e.resourceIds : e.resourceId == null ? null : [e.resourceId], Qe = () => {
	let e = B(V.repeat, 11);
	return e.setAttribute("class", "ck-icon-repeat"), e.removeAttribute("aria-hidden"), e.setAttribute("role", "img"), e.setAttribute("aria-label", "Repeats"), e;
};
function J(e, t, n, r = !1) {
	let { locale: i, config: a } = e, o = e.resourcesById.get(t.resourceId) || null, s = t.allDay ? "" : n === "month" ? A(t.start, i) : j(t.start, t.end, i);
	if (a.eventRenderer) {
		let i = a.eventRenderer({
			event: t,
			resource: o,
			view: n,
			timeText: s,
			compact: r,
			calendar: e
		});
		if (i != null && i !== !1) return typeof i == "string" ? Ve(i) : i;
	}
	let c = t.isOccurrence || t.recurringEventId, l = t.title || "Untitled";
	if (r) {
		let e = s ? z("span", { class: "ck-ev-time" }, n === "month" ? s : A(t.start, i)) : null;
		return z("span", { class: "ck-ev-line" }, n === "month" && e, z("span", { class: "ck-ev-title" }, l), n !== "month" && e, c && Qe());
	}
	let u = a.showResourceInEvents && o && n !== "timeline";
	return q(t) && n !== "list" && n !== "month" ? z("span", { class: "ck-ev-title" }, l) : [
		z("span", { class: "ck-ev-title" }, l, c && Qe()),
		s && n !== "list" && z("span", { class: "ck-ev-time" }, s),
		u && z("span", { class: "ck-ev-meta" }, o.name)
	];
}
function $e(e, t) {
	let { locale: n } = e, r = e.resourcesById.get(t.resourceId), i = /* @__PURE__ */ new Date(t.end - 1), a = t.start.toDateString() === i.toDateString(), o = t.allDay ? a ? k(t.start, {
		weekday: "long",
		month: "long",
		day: "numeric"
	}, n) : `${k(t.start, {
		month: "short",
		day: "numeric"
	}, n)} – ${k(i, {
		month: "short",
		day: "numeric"
	}, n)}` : `${k(t.start, {
		weekday: "short",
		month: "short",
		day: "numeric"
	}, n)}, ${j(t.start, t.end, n)}`, s = (e.config.editorFields || []).filter((e) => t[e.name]), c = t.notes ? t.notes.length > 140 ? `${t.notes.slice(0, 140)}…` : t.notes : null;
	return [
		z("div", { class: "ck-tooltip-title" }, t.title || "Untitled"),
		z("div", { class: "ck-tooltip-row" }, o),
		t.rrule && z("div", { class: "ck-tooltip-row" }, F(t.rrule, t.start, n)),
		r && z("div", { class: "ck-tooltip-row" }, r.name),
		s.map((e) => {
			let n = (e.options || []).find((n) => (n?.value ?? n) === t[e.name]);
			return z("div", { class: "ck-tooltip-row" }, z("span", { class: "ck-tooltip-label" }, e.label), " ", String(n?.label ?? t[e.name]));
		}),
		c && z("div", { class: "ck-tooltip-notes" }, c)
	];
}
function Y(e, t, n, r, i) {
	let a = ["ck-event", n];
	return t.instanceId === e.selectedId && a.push("ck-selected"), !G(t) && !K(t) && a.push("ck-locked"), t.classNames && a.push(...[].concat(t.classNames)), {
		class: a.filter(Boolean).join(" "),
		style: {
			...r,
			"--ck-ev": e.colorOf(t)
		},
		tabindex: "0",
		dataset: { instance: t.instanceId },
		"aria-label": `${t.title || "Untitled"}, ${t.allDay ? "all day" : j(t.start, t.end, e.locale)}`,
		onPointerdown: i,
		onPointerenter: (n) => e.showTooltip(t, n),
		onPointerleave: () => e.hideTooltip(),
		onKeydown: (n) => {
			n.key === "Enter" && (n.preventDefault(), e.eventClick(t, n));
		},
		onFocus: () => e.setSelected(t.instanceId)
	};
}
//#endregion
//#region src/ui/MiniMonth.js
var et = {
	selected: null,
	date: null,
	weekStartsOn: 1,
	locale: void 0,
	months: 1,
	layout: "month",
	stripDays: 7,
	marks: null,
	dayStyle: null,
	dayTitle: null,
	disabled: null,
	range: null,
	now: null,
	theme: "light",
	cls: "",
	scale: 1
}, tt = (e, ...t) => typeof e == "function" ? e(...t) : null;
function nt(e, t, { otherMonth: n = !1, strip: r = !1 } = {}) {
	let { locale: i, selected: a, range: o, onSelect: s } = e, c = e.nowDate, l = ["ck-mini-day"];
	n && l.push("ck-other-month"), o && t >= o.start && t < o.end && l.push("ck-in-range"), v(t, c) && l.push("ck-today"), a && v(t, a) && l.push("ck-selected-day"), e.busy?.(t) && l.push("ck-busy");
	let u = !!tt(e.disabled, t);
	u && l.push("ck-disabled");
	let d = tt(e.dayStyle, t) || null, f = (tt(e.marks, t) || []).slice(0, 4), p = tt(e.dayTitle, t), m = k(t, { dateStyle: "full" }, i);
	return z("button", {
		type: "button",
		class: l.join(" "),
		"aria-label": p ? `${m}, ${p}` : m,
		"aria-pressed": a ? String(v(t, a)) : null,
		title: p || null,
		disabled: u,
		"data-key": `mini-${+t}`,
		style: d ? {
			background: d.background,
			color: d.color,
			boxShadow: d.ring ? `inset 0 0 0 1.5px ${d.ring}` : null
		} : null,
		onClick: () => !u && s?.(t)
	}, r && z("span", { class: "ck-mini-strip-dow" }, k(t, { weekday: "short" }, i)), z("span", { class: "ck-mini-num" }, t.getDate()), f.length > 0 && z("span", {
		class: "ck-mini-marks",
		"aria-hidden": "true"
	}, f.map((e) => z("span", {
		class: "ck-mini-mark",
		style: { background: U(e?.color) || "currentColor" }
	}))));
}
function rt(e, t) {
	let { weekStartsOn: n, locale: r } = e, i = p(t, -((t.getDay() - n + 7) % 7)), a = Array.from({ length: 42 }, (e, t) => p(i, t));
	return z("div", { class: "ck-mini-grid" }, a.slice(0, 7).map((e) => z("span", {
		class: "ck-mini-dow",
		"aria-hidden": "true"
	}, k(e, { weekday: "narrow" }, r))), a.map((n) => nt(e, n, { otherMonth: n.getMonth() !== t.getMonth() })));
}
function it(e) {
	let { locale: t, cursor: n, onMove: r } = e, i = (e, t) => z("button", {
		type: "button",
		class: "ck-icon-btn",
		"aria-label": t,
		"data-key": `mini-${e > 0 ? "next" : "prev"}`,
		onClick: () => r?.(e)
	}, B(e > 0 ? V.next : V.prev, 14));
	if (e.layout === "strip") {
		let r = Math.max(1, e.stripDays || 7), a = Array.from({ length: r }, (e, t) => p(n, t)), o = a[r - 1];
		return z("div", { class: "ck-mini ck-mini-strip" }, z("div", { class: "ck-mini-head" }, z("span", { class: "ck-mini-title" }, a[0].getMonth() === o.getMonth() ? k(a[0], {
			month: "long",
			year: "numeric"
		}, t) : `${k(a[0], { month: "short" }, t)} – ${k(o, {
			month: "short",
			year: "numeric"
		}, t)}`), i(-1, "Earlier days"), i(1, "Later days")), z("div", {
			class: "ck-mini-strip-row",
			style: { gridTemplateColumns: `repeat(${r}, 1fr)` }
		}, a.map((t) => nt(e, t, { strip: !0 }))));
	}
	let a = Math.max(1, e.months || 1), o = Array.from({ length: a }, (e, t) => h(n, t));
	return z("div", { class: `ck-mini${a > 1 ? " ck-mini-multi" : ""}` }, o.map((n, r) => z("div", { class: "ck-mini-month" }, z("div", { class: "ck-mini-head" }, z("span", { class: "ck-mini-title" }, k(n, {
		month: "long",
		year: "numeric"
	}, t)), r === 0 && i(-1, "Previous month"), r === a - 1 && i(1, "Next month")), rt(e, n))));
}
var at = class extends n {
	constructor(e = {}) {
		super();
		let { appendTo: t, onSelect: n, onMonthChange: r, ...i } = e;
		this.config = {
			...et,
			...i
		}, n && this.on("select", ({ date: e }) => n(e)), r && this.on("monthChange", ({ date: e }) => r(e)), this.el = z("div", { class: "ck-root ck-minimonth" }), this._cursor = this._cursorFor(c(this.config.date || this.config.selected) || this._now()), t && this.mount(t);
	}
	mount(e) {
		let t = typeof e == "string" ? document.querySelector(e) : e;
		if (!t) throw Error(`ChronoKit: element ${e} not found`);
		return t.appendChild(this.el), this.render();
	}
	destroy() {
		this.el.remove(), this.emit("destroy"), this._listeners.clear();
	}
	get selected() {
		return this.config.selected ? d(c(this.config.selected)) : null;
	}
	get cursor() {
		return this._cursor;
	}
	setOptions(e = {}) {
		Object.assign(this.config, e);
		let t = c(e.date || e.selected);
		return t && !this._shows(t) && this._setCursor(this._cursorFor(t)), this.render();
	}
	setDate(e) {
		return this.setOptions({ selected: e });
	}
	move(e) {
		let t = this.config;
		return this._setCursor(t.layout === "strip" ? p(this._cursor, e * (t.stripDays || 7)) : h(this._cursor, e)), this.render();
	}
	render() {
		let e = this.config;
		this.el.className = `ck-root ck-minimonth${e.cls ? ` ${e.cls}` : ""}`, this.el.dataset.theme = e.theme, this.el.style.setProperty("--ck-scale", String(Number(e.scale) > 0 ? Number(e.scale) : 1));
		let t = e.range ? {
			start: c(e.range.start),
			end: c(e.range.end)
		} : null;
		return this.el.replaceChildren(it({
			...e,
			range: t,
			selected: this.selected,
			nowDate: this._now(),
			cursor: this._cursor,
			onMove: (e) => this.move(e),
			onSelect: (e) => {
				this.config.selected = e, this.render(), this.emit("select", {
					date: e,
					picker: this
				});
			}
		})), this;
	}
	_now() {
		return typeof this.config.now == "function" && c(this.config.now()) || /* @__PURE__ */ new Date();
	}
	_cursorFor(e) {
		let t = d(e);
		return this.config.layout === "strip" ? (this.config.stripDays || 7) === 7 ? p(t, -((t.getDay() - this.config.weekStartsOn + 7) % 7)) : t : _(t);
	}
	_shows(e) {
		let t = this.config;
		if (t.layout === "strip") return e >= this._cursor && e < p(this._cursor, t.stripDays || 7);
		let n = h(this._cursor, Math.max(1, t.months || 1));
		return e >= this._cursor && e < n;
	}
	_setCursor(e) {
		+e != +this._cursor && (this._cursor = e, this.emit("monthChange", {
			date: e,
			picker: this
		}));
	}
};
//#endregion
//#region src/ui/Sidebar.js
function ot(e) {
	let { locale: t, config: n, project: r } = e, i = `${e.date.getFullYear()}-${e.date.getMonth()}`;
	e._miniKey !== i && (e._miniKey = i, e._miniCursor = _(e.date));
	let a = e._miniCursor, o = p(a, -((a.getDay() - n.weekStartsOn + 7) % 7)), s = `${r.version}|${+o}`;
	if (e._busyKey !== s) {
		let t = /* @__PURE__ */ new Set();
		for (let e of r.getEventsInRange(o, p(o, 42))) for (let n = d(e.start); n < e.end; n = p(n, 1)) t.add(+n);
		e._busyKey = s, e._busy = t;
	}
	return it({
		locale: t,
		weekStartsOn: n.weekStartsOn,
		cursor: a,
		range: e.range,
		nowDate: e.now(),
		busy: (t) => e._busy.has(+t),
		onSelect: (t) => e.setDate(t),
		onMove: (t) => {
			e._miniCursor = h(a, t), e.refresh();
		}
	});
}
function st(e) {
	let t = e.project.resources;
	if (!t.length) return null;
	let n = e.hiddenResources, r = n.size === 0, i = !e.filterCollapsed, a = t.length - t.filter((e) => n.has(e.id)).length;
	return z("div", { class: `ck-filter${i ? "" : " ck-collapsed"}` }, z("div", { class: "ck-filter-head" }, z("button", {
		type: "button",
		class: "ck-filter-toggle",
		"aria-expanded": String(i),
		"data-key": "filter-toggle",
		onClick: () => e.toggleResourceFilter()
	}, B(V.down, 14), z("span", null, e.config.resourceLabel), z("span", { class: "ck-filter-count" }, a === t.length ? String(t.length) : `${a} of ${t.length}`)), z("button", {
		type: "button",
		class: "ck-link",
		"data-key": "filter-all",
		onClick: () => e.setHiddenResources(r ? t.map((e) => e.id) : [])
	}, r ? "Hide all" : "Show all")), i && z("ul", { class: "ck-filter-list" }, t.map((t) => z("li", null, z("label", {
		class: "ck-filter-item",
		style: { "--ck-res": U(t.color) || "var(--ck-accent)" }
	}, z("input", {
		type: "checkbox",
		checked: !n.has(t.id),
		"data-key": `res-${t.id}`,
		onChange: () => e.setResourceVisible(t.id, n.has(t.id))
	}), z("span", {
		class: "ck-filter-box",
		"aria-hidden": "true"
	}), z("span", { class: "ck-filter-name" }, t.name))))));
}
function ct(e) {
	let t = typeof e.config.sidebarItems == "function" ? e.config.sidebarItems(e) : e.config.sidebarItems;
	return [
		ot(e),
		st(e),
		t
	];
}
//#endregion
//#region src/ui/EventEditor.js
var lt = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
], ut = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR"
], dt = {
	1: "first",
	2: "second",
	3: "third",
	4: "fourth",
	"-1": "last"
}, ft = {
	DAILY: "days",
	WEEKLY: "weeks",
	MONTHLY: "months",
	YEARLY: "years"
};
function pt(e) {
	let t = Math.ceil(e.getDate() / 7), n = e.getDate() + 7 > m(e.getFullYear(), e.getMonth());
	return t >= 5 || n && t === 4 ? -1 : t;
}
function mt(e, t) {
	let n = {
		freq: "NONE",
		interval: 1,
		byDay: [O[t.getDay()]],
		monthly: "day",
		ends: "never",
		count: 10,
		until: D(h(t, 3))
	}, r = N(e);
	if (!r) return n;
	let i = (r.byDay || []).map((e) => M(e)), a = {
		...n,
		interval: r.interval
	};
	return a.freq = r.freq === "DAILY" && i.length === 5 && ut.every((e) => i.some((t) => t.code === e)) ? "WEEKDAYS" : r.freq, r.freq === "WEEKLY" && i.length && (a.byDay = i.map((e) => e.code)), r.freq === "MONTHLY" && i.length && i[0].n && (a.monthly = "weekday"), r.count ? (a.ends = "count", a.count = r.count) : r.until && (a.ends = "until", a.until = D(r.until)), a;
}
function ht(e, t) {
	if (e.freq === "NONE") return null;
	let n = e.freq === "WEEKDAYS" ? {
		freq: "DAILY",
		byDay: ut
	} : {
		freq: e.freq,
		interval: Math.max(1, +e.interval || 1)
	};
	if (e.freq === "WEEKLY" && (n.byDay = e.byDay.length ? e.byDay : [O[t.getDay()]]), e.freq === "MONTHLY" && e.monthly === "weekday" && (n.byDay = [`${pt(t)}${O[t.getDay()]}`]), e.ends === "count" && (n.count = Math.max(1, +e.count || 1)), e.ends === "until" && e.until) {
		let t = c(e.until);
		t && (t.setHours(23, 59, 59), n.until = t);
	}
	return P(n);
}
var gt = (e) => new Date(2024, 0, 7 + O.indexOf(e)), _t = class {
	constructor(e, t, { onSave: n, onDelete: r, onClose: i }) {
		this.cal = e, this.state = t, this.onSave = n, this.onDelete = r, this.onClose = i;
		let a = t.instance || t.draft;
		this.src = a;
		let o = a.allDay ? p(a.end, -1) : a.end, s = {};
		for (let t of e.config.editorFields) s[t.name] = a[t.name] ?? t.defaultValue ?? "";
		this.form = {
			title: a.title ?? "",
			allDay: !!a.allDay,
			startDate: D(a.start),
			startTime: te(a.start),
			endDate: D(o),
			endTime: te(a.end),
			resourceId: a.resourceId == null ? "" : String(a.resourceId),
			color: a.color ?? "",
			notes: a.notes ?? "",
			repeat: mt(a.rrule, a.start),
			extra: s
		}, this.el = z("div", {
			class: "ck-overlay",
			onPointerdown: (e) => e.target === e.currentTarget && this.onClose()
		}), this.render();
		let c = this.el.querySelector(".ck-editor-title");
		setTimeout(() => {
			c?.focus(), c?.select();
		}, 0);
	}
	get values() {
		let e = this.form, t, n;
		if (e.allDay) {
			t = c(e.startDate);
			let r = c(e.endDate);
			n = r ? p(r, 1) : null;
		} else t = ne(e.startDate, e.startTime), n = ne(e.endDate, e.endTime);
		return {
			start: t,
			end: n,
			error: !t || !n ? "Enter a valid start and end." : n <= t ? "End must be after start." : null,
			rrule: t ? ht(e.repeat, t) : null
		};
	}
	set(e, t = !1) {
		Object.assign(this.form, e), t ? this.render() : this.updateDerived();
	}
	setRepeat(e) {
		Object.assign(this.form.repeat, e), this.render();
	}
	updateDerived() {
		let { error: e, rrule: t, start: n } = this.values, r = this.el.querySelector(".ck-error");
		r && (r.textContent = e || "", r.hidden = !e);
		let i = this.el.querySelector(".ck-hint");
		i && (i.textContent = t && n ? F(t, n, this.cal.locale) : "");
		let a = this.el.querySelector("button[type=\"submit\"]");
		a && (a.disabled = !!e), this.el.querySelector(".ck-editor")?.style.setProperty("--ck-ev", this.swatch());
	}
	swatch() {
		let e = this.form;
		return e.color ? H[e.color] || e.color : this.cal.colorOf({
			...this.src,
			color: null,
			resourceId: e.resourceId === "" ? null : this.resolveResourceId(e.resourceId)
		});
	}
	resolveResourceId(e) {
		return e === "" ? null : this.cal.project.resources.find((t) => String(t.id) === String(e))?.id ?? e;
	}
	submit(e) {
		e.preventDefault();
		let { error: t, start: n, end: r, rrule: i } = this.values;
		if (t || this.cal.readOnly || this.cal.config.editorReadOnly) return;
		let a = this.form;
		this.onSave({
			title: a.title.trim(),
			allDay: a.allDay,
			start: n,
			end: r,
			resourceId: this.resolveResourceId(a.resourceId),
			color: a.color || null,
			notes: a.notes,
			rrule: i,
			...a.extra
		});
	}
	changeStartDate(e) {
		let t = c(this.form.startDate), n = c(e), r = c(this.form.endDate);
		if (t && n && r) {
			let i = Math.round((n - t) / 864e5);
			this.set({
				startDate: e,
				endDate: D(p(r, i))
			}, !0);
		} else this.set({ startDate: e }, !0);
	}
	render() {
		We(this.el, () => this.el.replaceChildren(this.build())), this.updateDerived();
	}
	build() {
		let e = this.cal, { locale: t } = e, n = e.readOnly || !!e.config.editorReadOnly, r = {
			title: !0,
			allDay: !0,
			assignee: !0,
			color: !0,
			repeat: !0,
			notes: !0,
			delete: !0,
			...e.config.editorSections || {}
		}, i = {
			delete: "Delete",
			cancel: "Cancel",
			save: "Save changes",
			create: "Create event",
			...e.config.editorLabels || {}
		}, a = e.config.editorActions || [], o = e.project.resources, s = this.form, { instance: c, isNew: l } = this.state, { start: u, rrule: d } = this.values, f = c && (c.isOccurrence || c.rrule), p = s.repeat, m = (e, t, n = "") => z("label", { class: `ck-field${n}` }, z("span", null, e), t), h = (e, t) => z("input", {
			"data-key": e,
			...t
		}), g = (e, t, n, r) => z("select", {
			"data-key": e,
			value: t,
			onChange: (e) => r(e.target.value)
		}, n.map(([e, t]) => z("option", { value: e }, t))), _ = z("div", { class: "ck-field-row ck-when" }, m("Starts", z("span", { class: "ck-inline" }, h("startDate", {
			type: "date",
			value: s.startDate,
			required: !0,
			disabled: n,
			onChange: (e) => this.changeStartDate(e.target.value)
		}), !s.allDay && h("startTime", {
			type: "time",
			value: s.startTime,
			required: !0,
			disabled: n,
			onInput: (e) => this.set({ startTime: e.target.value })
		}))), m("Ends", z("span", { class: "ck-inline" }, h("endDate", {
			type: "date",
			value: s.endDate,
			required: !0,
			disabled: n,
			onInput: (e) => this.set({ endDate: e.target.value })
		}), !s.allDay && h("endTime", {
			type: "time",
			value: s.endTime,
			required: !0,
			disabled: n,
			onInput: (e) => this.set({ endTime: e.target.value })
		}))), r.allDay && z("label", { class: "ck-check" }, h("allDay", {
			type: "checkbox",
			checked: s.allDay,
			disabled: n,
			onChange: (e) => this.set({ allDay: e.target.checked }, !0)
		}), "All day")), v = z("div", {
			class: "ck-swatches",
			role: "radiogroup",
			"aria-label": "Color"
		}, z("button", {
			type: "button",
			role: "radio",
			"data-key": "color-auto",
			"aria-checked": String(!s.color),
			class: `ck-swatch ck-swatch-auto${s.color ? "" : " ck-on"}`,
			title: "Use the assignee's color",
			"aria-label": "Assignee's color",
			onClick: () => this.set({ color: "" }, !0)
		}), Object.entries(H).map(([e, t]) => z("button", {
			type: "button",
			role: "radio",
			"data-key": `color-${e}`,
			"aria-checked": String(s.color === e),
			"aria-label": e,
			title: e,
			class: `ck-swatch${s.color === e ? " ck-on" : ""}`,
			style: { background: t },
			onClick: () => this.set({ color: e }, !0)
		}))), y = (r.assignee || r.color) && z("div", { class: "ck-field-row" }, r.assignee && o.length > 0 && m(e.config.assigneeLabel || "Assigned to", g("resourceId", s.resourceId, [["", "Unassigned"], ...o.map((e) => [String(e.id), e.name])], (e) => this.set({ resourceId: e }))), r.color && z("div", { class: "ck-field" }, z("span", null, "Color"), v)), b = r.repeat && z("fieldset", { class: "ck-repeat" }, m("Repeat", g("freq", p.freq, [
			["NONE", "Does not repeat"],
			["DAILY", "Daily"],
			["WEEKDAYS", "Every weekday (Mon–Fri)"],
			["WEEKLY", "Weekly"],
			["MONTHLY", "Monthly"],
			["YEARLY", "Yearly"]
		], (e) => this.setRepeat({ freq: e }))), ft[p.freq] && m("Every", z("span", { class: "ck-inline" }, h("interval", {
			type: "number",
			min: "1",
			max: "99",
			value: p.interval,
			onInput: (e) => {
				p.interval = e.target.value, this.updateDerived();
			}
		}), z("span", { class: "ck-unit" }, ft[p.freq])), " ck-field-narrow"), p.freq === "WEEKLY" && z("div", { class: "ck-field ck-field-wide" }, z("span", null, "On"), z("div", { class: "ck-daypicks" }, lt.map((e) => {
			let n = p.byDay.includes(e);
			return z("button", {
				type: "button",
				"data-key": `day-${e}`,
				"aria-pressed": String(n),
				class: `ck-daypick${n ? " ck-on" : ""}`,
				title: k(gt(e), { weekday: "long" }, t),
				onClick: () => this.setRepeat({ byDay: n ? p.byDay.filter((t) => t !== e) : [...p.byDay, e] })
			}, k(gt(e), { weekday: "narrow" }, t));
		}))), p.freq === "MONTHLY" && u && m("On", g("monthly", p.monthly, [["day", `Day ${u.getDate()}`], ["weekday", `The ${dt[pt(u)]} ${k(u, { weekday: "long" }, t)}`]], (e) => this.setRepeat({ monthly: e })), " ck-field-wide"), p.freq !== "NONE" && m("Ends", z("span", { class: "ck-inline" }, g("ends", p.ends, [
			["never", "Never"],
			["count", "After"],
			["until", "On date"]
		], (e) => this.setRepeat({ ends: e })), p.ends === "count" && [h("count", {
			type: "number",
			min: "1",
			max: "999",
			value: p.count,
			onInput: (e) => {
				p.count = e.target.value, this.updateDerived();
			}
		}), z("span", { class: "ck-unit" }, "times")], p.ends === "until" && h("until", {
			type: "date",
			value: p.until,
			onInput: (e) => {
				p.until = e.target.value, this.updateDerived();
			}
		})), " ck-field-wide"), z("p", {
			class: "ck-hint",
			"aria-live": "polite"
		}, d && u ? F(d, u, t) : "")), x = e.config.editorFields, S = x.length > 0 && z("div", { class: "ck-field-grid" }, x.map((e) => {
			let t = s.extra[e.name], r = (t) => {
				s.extra[e.name] = t.target.value;
			}, i, a = n || !!e.readOnly;
			return i = e.type === "select" ? z("select", {
				"data-key": `x-${e.name}`,
				value: String(t ?? ""),
				disabled: a,
				onChange: r
			}, z("option", { value: "" }, "—"), (e.options || []).map((e) => z("option", { value: String(e?.value ?? e) }, String(e?.label ?? e)))) : e.type === "textarea" ? z("textarea", {
				"data-key": `x-${e.name}`,
				rows: "2",
				value: t ?? "",
				disabled: a,
				onInput: r
			}) : h(`x-${e.name}`, {
				type: e.type || "text",
				placeholder: e.placeholder,
				value: t ?? "",
				disabled: a,
				onInput: r
			}), m(e.label, i, e.type === "textarea" ? " ck-field-wide" : "");
		})), C = r.notes && m("Notes", z("textarea", {
			"data-key": "notes",
			rows: "3",
			placeholder: "Agenda, links, call notes",
			value: s.notes,
			onInput: (e) => s.notes = e.target.value
		}), " ck-field-wide");
		return z("form", {
			class: "ck-dialog ck-editor",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": l ? "New event" : "Edit event",
			novalidate: !0,
			style: { "--ck-ev": this.swatch() },
			onSubmit: (e) => this.submit(e),
			onKeydown: (e) => {
				e.key === "Escape" && (e.stopPropagation(), this.onClose());
			}
		}, z("div", { class: "ck-editor-head" }, z("input", {
			class: "ck-editor-title",
			"data-key": "title",
			placeholder: "Add a title",
			"aria-label": "Title",
			value: s.title,
			disabled: n || !r.title,
			onInput: (e) => s.title = e.target.value
		}), z("button", {
			type: "button",
			class: "ck-icon-btn",
			"aria-label": "Close",
			onClick: () => this.onClose()
		}, B(V.close))), z("div", { class: "ck-editor-body" }, _, z("p", {
			class: "ck-error",
			role: "alert",
			hidden: !0
		}), y, b, S, C), z("div", { class: "ck-dialog-foot" }, !l && !n && r.delete && z("button", {
			type: "button",
			class: "ck-btn ck-btn-danger",
			onClick: () => this.onDelete(c)
		}, f ? `${i.delete}…` : i.delete), a.map((t) => z("button", {
			type: "button",
			class: "ck-btn",
			"data-key": `action-${t.key || t.label}`,
			onClick: () => t.onClick?.({
				event: c,
				editor: this,
				calendar: e
			})
		}, t.label)), z("span", { class: "ck-spacer" }), z("button", {
			type: "button",
			class: "ck-btn",
			onClick: () => this.onClose()
		}, i.cancel), !n && z("button", {
			type: "submit",
			class: "ck-btn ck-btn-primary"
		}, l ? i.create : i.save)));
	}
	destroy() {
		this.el.remove();
	}
};
function vt(e, { kind: t = "edit", allowThis: n = !0 } = {}) {
	return new Promise((r) => {
		let i = n ? "this" : "future", a = t === "delete" ? "Delete" : "Change", o, s = (e) => {
			o.remove(), r(e);
		}, c = (e, t) => z("label", null, z("input", {
			type: "radio",
			name: "ck-scope",
			checked: i === e,
			onChange: () => i = e
		}), ` ${t}`), l = z("form", {
			class: "ck-dialog ck-scope",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": `${a} recurring event`,
			onSubmit: (e) => {
				e.preventDefault(), s(i);
			},
			onKeydown: (e) => {
				e.key === "Escape" && (e.stopPropagation(), s(null));
			}
		}, z("h2", { class: "ck-dialog-title" }, `${a} recurring event`), z("div", { class: "ck-scope-options" }, n && c("this", "This event"), c("future", "This and following events"), c("all", "All events in the series")), z("div", { class: "ck-dialog-foot" }, z("span", { class: "ck-spacer" }), z("button", {
			type: "button",
			class: "ck-btn",
			onClick: () => s(null)
		}, "Cancel"), z("button", {
			type: "submit",
			class: `ck-btn ${t === "delete" ? "ck-btn-danger-solid" : "ck-btn-primary"}`
		}, t === "delete" ? "Delete" : "Save")));
		o = z("div", {
			class: "ck-overlay",
			onPointerdown: (e) => e.target === e.currentTarget && s(null)
		}, l), e.appendChild(o), setTimeout(() => l.querySelector("input:checked")?.focus(), 0);
	});
}
//#endregion
//#region src/core/layout.js
function yt(e, t, n, { minDurationMinutes: r = 20 } = {}) {
	let a = (n - t) / i, o = e.filter((e) => e.start < n && (e.end > t || +e.end == +e.start && e.start >= t)).map((e) => {
		let o = Math.max(0, (e.start - t) / i), s = Math.min(a, (e.end - t) / i);
		return s - o < r && (s = Math.min(a, o + r)), {
			item: e,
			startMin: o,
			endMin: Math.max(s, o + 1),
			continuesBefore: e.start < t,
			continuesAfter: e.end > n
		};
	}).sort((e, t) => e.startMin - t.startMin || t.endMin - t.startMin - (e.endMin - e.startMin)), s = [], c = [], l = -Infinity, u = () => {
		if (!c.length) return;
		let e = [];
		for (let t of c) {
			let n = e.findIndex((e) => e <= t.startMin);
			n === -1 ? (n = e.length, e.push(t.endMin)) : e[n] = t.endMin, t.col = n;
		}
		let t = e.length;
		for (let e of c) {
			let n = 1;
			for (let r = e.col + 1; r < t && !c.some((t) => t.col === r && t.startMin < e.endMin && e.startMin < t.endMin); r++) n++;
			e.cols = t, e.left = e.col / t, e.width = n / t, s.push(e);
		}
		c = [];
	};
	for (let e of o) e.startMin >= l ? (u(), l = e.endMin) : l = Math.max(l, e.endMin), c.push(e);
	return u(), s;
}
function X(e, t, n) {
	let r = p(t, n), i = e.filter((e) => e.start < r && (e.end > t || +e.end == +e.start && e.start >= t)).map((e) => {
		let i = Math.max(0, y(e.start, t)), a = y(new Date(Math.max(+e.start, e.end - 1)), t);
		return {
			item: e,
			startCol: i,
			endCol: Math.min(n - 1, Math.max(i, a)),
			continuesBefore: e.start < t,
			continuesAfter: e.end > r
		};
	}).sort((e, t) => e.startCol - t.startCol || t.endCol - t.startCol - (e.endCol - e.startCol) || Number(!!t.item.allDay) - Number(!!e.item.allDay) || e.item.start - t.item.start), a = [];
	for (let e of i) {
		let t = 0;
		for (;;) {
			a[t] || (a[t] = Array(n).fill(!1));
			let r = !0;
			for (let n = e.startCol; n <= e.endCol; n++) if (a[t][n]) {
				r = !1;
				break;
			}
			if (r) break;
			t++;
		}
		for (let n = e.startCol; n <= e.endCol; n++) a[t][n] = !0;
		e.lane = t;
	}
	return {
		segments: i,
		laneCount: a.length
	};
}
function bt(e) {
	let t = [...e].sort((e, t) => e.start - t.start || t.end - t.start - (e.end - e.start)), n = [], r = [];
	for (let e of t) {
		let t = n.findIndex((t) => t <= e.start);
		t === -1 ? (t = n.length, n.push(e.end)) : n[t] = e.end, r.push({
			item: e,
			lane: t
		});
	}
	return {
		placed: r,
		laneCount: Math.max(1, n.length)
	};
}
function Z(e, t) {
	let n = 0, r = e.length - 1;
	if (r < 0) return -1;
	for (; n < r;) {
		let i = n + r + 1 >> 1;
		e[i] <= t ? n = i : r = i - 1;
	}
	return n;
}
//#endregion
//#region src/ui/drag.js
function Q(e, { onStart: t, onMove: n, onEnd: r, onCancel: i, threshold: a = 4, scrollEl: o = null } = {}) {
	let s = e.clientX, c = e.clientY, l = !1, u = !1, d = e, f = 0, p = () => {
		if (u || !o) return;
		f = requestAnimationFrame(p);
		let e = o.getBoundingClientRect(), t = (e, t, n) => e < t + 36 ? -16 * Math.min(1, (t + 36 - e) / 36) : e > n - 36 ? 16 * Math.min(1, (e - (n - 36)) / 36) : 0, r = t(d.clientX, e.left, e.right), i = t(d.clientY, e.top, e.bottom);
		if (!r && !i) return;
		let a = o.scrollLeft, s = o.scrollTop;
		o.scrollLeft += r, o.scrollTop += i, (o.scrollLeft !== a || o.scrollTop !== s) && n?.(d);
	}, m = (e) => {
		if (d = e, !l) {
			if (Math.hypot(e.clientX - s, e.clientY - c) < a) return;
			l = !0, document.body.classList.add("ck-body-dragging"), t?.(e), o && typeof requestAnimationFrame < "u" && (f = requestAnimationFrame(p));
		}
		e.preventDefault?.(), n?.(e);
	}, h = () => {
		u = !0, f && cancelAnimationFrame(f), window.removeEventListener("pointermove", m), window.removeEventListener("pointerup", g), window.removeEventListener("pointercancel", _), window.removeEventListener("keydown", v, !0), document.body.classList.remove("ck-body-dragging");
	}, g = (e) => {
		h(), r?.(e, l);
	}, _ = () => {
		h(), i?.();
	}, v = (e) => {
		e.key === "Escape" && (e.stopPropagation(), _());
	};
	return window.addEventListener("pointermove", m), window.addEventListener("pointerup", g), window.addEventListener("pointercancel", _), window.addEventListener("keydown", v, !0), _;
}
//#endregion
//#region src/ui/views/TimeGridView.js
var xt = (e) => e.allDay || e.end - e.start >= 864e5, St = class {
	constructor(e) {
		this.cal = e, this.el = z("div", { class: "ck-tg" }), this.scrollEl = z("div", {
			class: "ck-tg-scroll",
			onScroll: () => this._top = this.scrollEl.scrollTop
		}), this._top = null, this.colEls = [], this.ghost = null;
	}
	render() {
		let e = this.cal, { config: t, instances: n, locale: r, readOnly: i } = e, a = e.range.days, o = a.length, { dayStartHour: s, dayEndHour: c, workingHours: l, workingDays: u } = t, { hourHeight: d, allDayLane: f } = e.metrics;
		this.days = a, this.n = o, this.rowStart = a[0], this.winStartMin = s * 60, this.winEndMin = c * 60;
		let p = (e) => this.px(e), m = e.now(), h = [], g = [], _ = [];
		for (let e of n) (q(e) ? _ : xt(e) ? h : g).push(e);
		let y = X(h, this.rowStart, o), b = z("div", { class: "ck-tg-head" }, z("div", { class: "ck-tg-gutter" }), a.map((t) => z("button", {
			type: "button",
			class: `ck-tg-dayhead${v(t, m) ? " ck-today" : ""}${t.getDay() === 0 || t.getDay() === 6 ? " ck-weekend" : ""}`,
			title: k(t, { dateStyle: "full" }, r),
			onClick: () => e.goToDay(t)
		}, z("span", { class: "ck-tg-dow" }, k(t, { weekday: o === 1 ? "long" : "short" }, r)), z("span", { class: "ck-tg-dom" }, t.getDate())))), C = Math.max(1, y.laneCount) * f + 8;
		this.allDayInner = z("div", {
			class: "ck-tg-allday-inner",
			style: { height: C }
		}, y.segments.map((t) => {
			let n = t.item, r = [
				"ck-event-bar",
				t.continuesBefore && "ck-cont-before",
				t.continuesAfter && "ck-cont-after"
			].filter(Boolean).join(" ");
			return z("div", Y(e, n, r, {
				left: `calc(${t.startCol / o * 100}% + 2px)`,
				width: `calc(${(t.endCol - t.startCol + 1) / o * 100}% - 4px)`,
				top: t.lane * f + 4
			}, (e) => this.onAllDayDown(e, n, "move")), J(e, n, "week", !0), n.allDay && !i && K(n) && !t.continuesAfter && z("span", {
				class: "ck-resize ck-resize-x ck-resize-end",
				onPointerdown: (e) => this.onAllDayDown(e, n, "end")
			}));
		})), this.allDayEl = z("div", {
			class: "ck-tg-allday-cells",
			style: { height: Math.min(C, 4 * f + 8) },
			onPointerdown: (e) => this.onAllDayBackgroundDown(e),
			onDblclick: (e) => this.onAllDayDoubleClick(e)
		}, a.map((e, t) => z("div", {
			class: "ck-tg-allday-cell",
			style: {
				left: `${t / o * 100}%`,
				width: `${100 / o}%`
			}
		})), this.allDayInner);
		let w = z("div", { class: "ck-tg-allday" }, z("div", { class: "ck-tg-gutter ck-tg-allday-label" }, "All day"), this.allDayEl), T = [];
		for (let e = s + 1; e < c; e++) T.push(z("span", {
			class: "ck-tg-hour",
			style: { top: p(e * 60) }
		}, k(new Date(2e3, 0, 1, e), { hour: "numeric" }, r)));
		let E = x(m);
		this.colEls = a.map((n) => {
			let r = S(n, this.winStartMin), a = S(n, this.winEndMin), s = yt(g.filter((e) => e.start < a && e.end > r), r, a), c = _.filter((e) => e.start < a && e.end > r), f = !u.includes(n.getDay()), h = v(n, m);
			return z("div", {
				class: `ck-tg-col${f ? " ck-offday" : ""}${h ? " ck-today" : ""}`,
				onPointerdown: (e) => this.onColumnDown(e),
				onDblclick: (e) => this.onColumnDoubleClick(e)
			}, !f && l && l.start * 60 > this.winStartMin && z("div", {
				class: "ck-nonwork",
				style: {
					top: 0,
					height: p(l.start * 60)
				}
			}), !f && l && l.end * 60 < this.winEndMin && z("div", {
				class: "ck-nonwork",
				style: {
					top: p(l.end * 60),
					bottom: 0
				}
			}), c.map((e) => this.renderBackground(e, n, r, a)), s.map((t) => {
				let n = t.item, r = t.startMin / 60 * d, a = e.scale || 1, s = Math.max(18 * a, (t.endMin - t.startMin) / 60 * d - 2), c = s < 38 * a;
				return z("div", Y(e, n, `ck-event-timed${c ? " ck-short" : ""}`, {
					top: r,
					height: s,
					left: `calc(${t.left * 100}% + 1px)`,
					width: `calc(${t.width * 100}% - ${t.left + t.width >= .999 ? 6 : 2}px)`
				}, (e) => this.onTimedDown(e, n, "move")), J(e, n, o === 1 ? "day" : "week", c), !i && K(n) && !t.continuesBefore && z("span", {
					class: "ck-resize ck-resize-y ck-resize-start",
					onPointerdown: (e) => this.onTimedDown(e, n, "start")
				}), !i && K(n) && !t.continuesAfter && z("span", {
					class: "ck-resize ck-resize-y ck-resize-end",
					onPointerdown: (e) => this.onTimedDown(e, n, "end")
				}));
			}), h && t.nowIndicator !== !1 && E >= this.winStartMin && E <= this.winEndMin && z("div", {
				class: "ck-now",
				style: { top: p(E) }
			}));
		});
		let D = z("div", {
			class: "ck-tg-body",
			style: { height: (this.winEndMin - this.winStartMin) / 60 * d }
		}, z("div", { class: "ck-tg-gutter ck-tg-hours" }, T), z("div", { class: "ck-tg-cols" }, this.colEls));
		this.ghost = null, this.el.style.setProperty("--ck-hour", `${d}px`), this.scrollEl.replaceChildren(D), this.el.replaceChildren(b, w, this.scrollEl), this.scrollEl.scrollTop = this._top ?? Math.max(0, (t.scrollToHour - s) * d - 8);
		let ee = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
		b.style.paddingRight = w.style.paddingRight = `${ee > 0 ? ee : 0}px`;
	}
	renderBackground(e, t, n, r) {
		let a = this.cal, o = e.start < n ? n : e.start, s = e.end > r ? r : e.end, c = (o - d(t)) / i, l = (s - d(t)) / i, u = this.px(c), f = Y(a, e, "ck-event-bg", {
			top: u,
			height: Math.max(8, this.px(l) - u)
		}, null);
		return delete f.onPointerdown, delete f.tabindex, z("div", f, z("button", {
			type: "button",
			class: "ck-bg-label",
			onPointerdown: (t) => this.onTimedDown(t, e, "move")
		}, J(a, e, this.n === 1 ? "day" : "week", !0)), !a.readOnly && K(e) && e.end <= r && z("span", {
			class: "ck-resize ck-resize-y ck-resize-end",
			onPointerdown: (t) => this.onTimedDown(t, e, "end")
		}));
	}
	px(e) {
		return (e - this.winStartMin) / 60 * this.cal.metrics.hourHeight;
	}
	hitTimed(e, t) {
		let n = this.colEls, r = n.findIndex((t) => {
			let n = t.getBoundingClientRect();
			return e >= n.left && e < n.right;
		});
		r === -1 && (r = e < n[0].getBoundingClientRect().left ? 0 : this.n - 1);
		let i = n[r].getBoundingClientRect(), a = T(this.winStartMin + (t - i.top) / this.cal.metrics.hourHeight * 60, this.winStartMin, this.winEndMin);
		return {
			idx: r,
			day: this.days[r],
			minutes: a
		};
	}
	hitAllDay(e) {
		let t = this.allDayEl.getBoundingClientRect();
		return T(Math.floor((e - t.left) / (t.width || 1) * this.n), 0, this.n - 1);
	}
	clearGhost() {
		this.ghost?.remove(), this.ghost = null;
	}
	showTimedGhost(e, t) {
		this.clearGhost();
		let n = this.days.findIndex((t) => v(t, e.start));
		if (n === -1) return;
		let r = this.days[n], a = Math.max(this.winStartMin, (e.start - d(r)) / i), o = Math.min(this.winEndMin, (e.end - d(r)) / i);
		this.ghost = z("div", {
			class: `ck-event ck-event-timed ck-ghost${t ? "" : " ck-ghost-create"}`,
			style: {
				top: this.px(a),
				height: Math.max(16, this.px(o) - this.px(a) - 2),
				left: 1,
				width: "calc(100% - 6px)",
				"--ck-ev": t ? this.cal.colorOf(t) : "var(--ck-accent)"
			}
		}, z("span", { class: "ck-ev-title" }, t?.title || "New event"), z("span", { class: "ck-ev-time" }, j(e.start, e.end, this.cal.locale))), this.colEls[n].appendChild(this.ghost);
	}
	showAllDayGhost(e, t) {
		this.clearGhost();
		let n = X([{
			start: e.start,
			end: e.end
		}], this.rowStart, this.n).segments[0];
		n && (this.ghost = z("div", {
			class: "ck-event ck-event-bar ck-ghost",
			style: {
				left: `calc(${n.startCol / this.n * 100}% + 2px)`,
				width: `calc(${(n.endCol - n.startCol + 1) / this.n * 100}% - 4px)`,
				top: 4,
				"--ck-ev": t ? this.cal.colorOf(t) : "var(--ck-accent)"
			}
		}, z("span", { class: "ck-ev-title" }, t?.title || "New event")), this.allDayInner.appendChild(this.ghost));
	}
	onTimedDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, a = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let { snapMinutes: o } = r.config, s = this.hitTimed(e.clientX, e.clientY), c = (S(s.day, s.minutes) - t.start) / i, l = (t.end - t.start) / i, u = !r.readOnly && (n === "move" ? G(t) : K(t)), d = null;
		Q(e, {
			scrollEl: this.scrollEl,
			onStart: () => u && a.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (!u) return;
				let r = this.hitTimed(e.clientX, e.clientY), { start: i, end: a } = t;
				n === "move" ? (i = S(r.day, C(r.minutes - c, o)), a = f(i, l)) : n === "end" ? (a = S(r.day, C(r.minutes, o)), a < f(i, o) && (a = f(i, o))) : (i = S(r.day, C(r.minutes, o)), i > f(a, -o) && (i = f(a, -o))), d = {
					start: i,
					end: a
				}, this.showTimedGhost(d, t);
			},
			onEnd: async (e, i) => {
				if (this.clearGhost(), a.classList.remove("ck-is-dragging"), !i) return r.eventClick(t, e);
				d && (+d.start != +t.start || +d.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: d.start,
						end: d.end
					}
				});
			},
			onCancel: () => {
				this.clearGhost(), a.classList.remove("ck-is-dragging");
			}
		});
	}
	onColumnDown(e) {
		let t = this.cal;
		if (e.button !== 0 || e.target.closest(".ck-event:not(.ck-event-bg), .ck-bg-label, .ck-resize")) return;
		let { snapMinutes: n } = t.config, r = this.hitTimed(e.clientX, e.clientY), i = (e) => {
			let i = S(r.day, r.minutes), a = t.instances.find((e) => q(e) && e.start <= i && e.end > i);
			a ? t.eventClick(a, e) : t.dateClick({
				date: S(r.day, w(r.minutes, n)),
				allDay: !1
			}, e);
		};
		if (t.readOnly || e.pointerType === "touch") {
			window.addEventListener("pointerup", (t) => {
				Math.hypot(t.clientX - e.clientX, t.clientY - e.clientY) < 4 && i(t);
			}, { once: !0 });
			return;
		}
		let a = w(r.minutes, n), o = null;
		Q(e, {
			scrollEl: this.scrollEl,
			onMove: (e) => {
				let t = C(this.hitTimed(e.clientX, e.clientY).minutes, n);
				o = {
					start: S(r.day, Math.min(a, t)),
					end: S(r.day, Math.max(a + n, t))
				}, this.showTimedGhost(o, null);
			},
			onEnd: (e, n) => {
				this.clearGhost(), n && o ? t.select({
					start: o.start,
					end: o.end,
					allDay: !1
				}, e, "drag") : n || i(e);
			},
			onCancel: () => this.clearGhost()
		});
	}
	onColumnDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event:not(.ck-event-bg), .ck-bg-label")) return;
		let n = this.hitTimed(e.clientX, e.clientY), r = w(n.minutes, 30);
		t.select({
			start: S(n.day, r),
			end: S(n.day, r + t.config.defaultEventDuration),
			allDay: !1
		}, e, "dblclick");
	}
	onAllDayDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, i = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let a = this.hitAllDay(e.clientX), o = !r.readOnly && (n === "move" ? G(t) : K(t)), s = null;
		Q(e, {
			onStart: () => o && i.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (!o) return;
				let r = this.hitAllDay(e.clientX), { start: i, end: c } = t;
				if (n === "move") i = p(t.start, r - a), c = p(t.end, r - a);
				else if (t.allDay) {
					let e = y(t.start, this.rowStart);
					c = p(this.rowStart, Math.max(r, e) + 1);
				}
				s = {
					start: i,
					end: c
				}, this.showAllDayGhost(s, t);
			},
			onEnd: async (e, a) => {
				if (this.clearGhost(), i.classList.remove("ck-is-dragging"), !a) return r.eventClick(t, e);
				s && (+s.start != +t.start || +s.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: s.start,
						end: s.end
					}
				});
			},
			onCancel: () => {
				this.clearGhost(), i.classList.remove("ck-is-dragging");
			}
		});
	}
	onAllDayBackgroundDown(e) {
		let t = this.cal;
		if (e.button !== 0 || t.readOnly || e.target.closest(".ck-event")) return;
		let n = this.hitAllDay(e.clientX), r = null;
		Q(e, {
			onMove: (e) => {
				let t = this.hitAllDay(e.clientX);
				r = {
					start: p(this.rowStart, Math.min(n, t)),
					end: p(this.rowStart, Math.max(n, t) + 1)
				}, this.showAllDayGhost(r, null);
			},
			onEnd: (e, i) => {
				this.clearGhost(), i && r ? t.select({
					start: r.start,
					end: r.end,
					allDay: !0
				}, e, "drag") : i || t.dateClick({
					date: p(this.rowStart, n),
					allDay: !0
				}, e);
			},
			onCancel: () => this.clearGhost()
		});
	}
	onAllDayDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event")) return;
		let n = this.hitAllDay(e.clientX);
		t.select({
			start: p(this.rowStart, n),
			end: p(this.rowStart, n + 1),
			allDay: !0
		}, e, "dblclick");
	}
	destroy() {
		this.el.remove();
	}
}, Ct = (e, t, n = 7) => {
	let r = d(e), i = n === 1 ? r : p(r, -((r.getDay() - t + 7) % 7));
	return Array.from({ length: n }, (e, t) => p(i, t));
}, wt = class {
	constructor(e) {
		this.cal = e, this.headEl = z("div", { class: "ck-month-head" }), this.gridEl = z("div", {
			class: "ck-month-grid",
			onPointerdown: (e) => this.onGridDown(e),
			onDblclick: (e) => this.onGridDoubleClick(e)
		}), this.el = z("div", { class: "ck-month" }, this.headEl, this.gridEl), this.cellEls = /* @__PURE__ */ new Map();
	}
	render() {
		let e = this.cal, { instances: t, locale: n, readOnly: r, config: i } = e, { gridStart: a, weeks: o, month: s } = e.range.grid;
		this.gridStart = a, this.weeks = o;
		let c = e.now(), l = this.gridEl.clientHeight, u = l ? l / o : 110, { monthLane: d, monthHeader: f } = e.metrics, m = Math.max(1, Math.floor((u - f - 4) / d));
		this.headEl.replaceChildren(...Array.from({ length: 7 }, (e, t) => z("div", { class: "ck-month-dow" }, k(p(a, t), { weekday: "short" }, n)))), this.cellEls = /* @__PURE__ */ new Map();
		let h = [];
		for (let l = 0; l < o; l++) {
			let o = p(a, l * 7), { segments: u, laneCount: g } = X(t, o, 7), _ = g > m ? m - 1 : m, y = Array(7).fill(0);
			for (let e of u) if (e.lane >= _) for (let t = e.startCol; t <= e.endCol; t++) y[t]++;
			let b = Array.from({ length: 7 }, (t, r) => {
				let a = p(o, r), l = ["ck-month-cell"];
				a.getMonth() !== s && l.push("ck-other-month"), i.workingDays.includes(a.getDay()) || l.push("ck-offday");
				let u = z("div", { class: l.join(" ") }, z("button", {
					type: "button",
					class: `ck-month-date${v(a, c) ? " ck-today" : ""}`,
					title: k(a, { dateStyle: "full" }, n),
					onClick: () => e.goToDay(a)
				}, a.getDate() === 1 ? k(a, {
					month: "short",
					day: "numeric"
				}, n) : a.getDate()), y[r] > 0 && z("button", {
					type: "button",
					class: "ck-more",
					style: { top: f + _ * d },
					onClick: () => e.goToDay(a)
				}, `${y[r]} more`));
				return this.cellEls.set(+a, u), u;
			}), x = u.filter((e) => e.lane < _).map((t) => {
				let n = t.item, i = n.allDay || n.end - n.start >= 864e5 || t.endCol > t.startCol, a = [
					i ? "ck-event-bar" : "ck-event-line",
					q(n) && "ck-bg-month",
					t.continuesBefore && "ck-cont-before",
					t.continuesAfter && "ck-cont-after"
				].filter(Boolean).join(" ");
				return z("div", Y(e, n, a, {
					left: `calc(${t.startCol / 7 * 100}% + 3px)`,
					width: `calc(${(t.endCol - t.startCol + 1) / 7 * 100}% - 6px)`,
					top: f + t.lane * d
				}, (e) => this.onEventDown(e, n, "move")), J(e, n, "month", !0), i && n.allDay && !r && K(n) && !t.continuesAfter && z("span", {
					class: "ck-resize ck-resize-x ck-resize-end",
					onPointerdown: (e) => this.onEventDown(e, n, "end")
				}));
			});
			h.push(z("div", { class: "ck-month-row" }, b, z("div", { class: "ck-month-events" }, x)));
		}
		this.gridEl.style.gridTemplateRows = `repeat(${o}, 1fr)`, this.gridEl.replaceChildren(...h);
	}
	hitDay(e, t) {
		let n = this.gridEl.getBoundingClientRect(), r = T(Math.floor((e - n.left) / (n.width || 1) * 7), 0, 6), i = T(Math.floor((t - n.top) / (n.height || 1) * this.weeks), 0, this.weeks - 1);
		return p(this.gridStart, i * 7 + r);
	}
	highlight(e) {
		for (let e of this.cellEls.values()) e.classList.remove("ck-drop-target");
		if (!e) return;
		let t = new Date(Math.max(+e.start, e.end - 1));
		for (let n = d(e.start); n <= t; n = p(n, 1)) this.cellEls.get(+n)?.classList.add("ck-drop-target");
	}
	onEventDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, i = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let a = this.hitDay(e.clientX, e.clientY), o = !r.readOnly && (n === "move" ? G(t) : K(t)), s = null, c = () => {
			this.highlight(null), i.classList.remove("ck-is-dragging");
		};
		Q(e, {
			onStart: () => o && i.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (!o) return;
				let r = this.hitDay(e.clientX, e.clientY), { start: i, end: c } = t;
				if (n === "move") {
					let e = y(r, a);
					i = p(t.start, e), c = p(t.end, e);
				} else c = p(d(r < d(t.start) ? t.start : r), 1);
				s = {
					start: i,
					end: c
				}, this.highlight(s);
			},
			onEnd: async (e, i) => {
				if (c(), !i) return r.eventClick(t, e);
				s && (+s.start != +t.start || +s.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: s.start,
						end: s.end
					}
				});
			},
			onCancel: c
		});
	}
	onGridDown(e) {
		let t = this.cal;
		if (e.button !== 0 || e.target.closest(".ck-event, .ck-more, .ck-month-date")) return;
		let n = this.hitDay(e.clientX, e.clientY);
		if (t.readOnly || e.pointerType === "touch") {
			window.addEventListener("pointerup", (r) => {
				Math.hypot(r.clientX - e.clientX, r.clientY - e.clientY) < 4 && t.dateClick({
					date: n,
					allDay: !0
				}, r);
			}, { once: !0 });
			return;
		}
		let r = null;
		Q(e, {
			onMove: (e) => {
				let t = this.hitDay(e.clientX, e.clientY);
				r = {
					start: n < t ? n : t,
					end: p(n < t ? t : n, 1)
				}, this.highlight(r);
			},
			onEnd: (e, i) => {
				this.highlight(null), i && r ? t.select({
					start: r.start,
					end: r.end,
					allDay: !0
				}, e, "drag") : i || t.dateClick({
					date: n,
					allDay: !0
				}, e);
			},
			onCancel: () => this.highlight(null)
		});
	}
	onGridDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event, .ck-more, .ck-month-date")) return;
		let n = this.hitDay(e.clientX, e.clientY), r = (t.config.workingHours?.start ?? 9) * 60;
		t.select({
			start: S(n, r),
			end: S(n, r + t.config.defaultEventDuration),
			allDay: !1
		}, e, "dblclick");
	}
	destroy() {
		this.el.remove();
	}
};
function Tt(e, t) {
	let n = new Date(e.getFullYear(), e.getMonth(), 1), r = p(n, -((n.getDay() - t + 7) % 7)), i = new Date(e.getFullYear(), e.getMonth() + 1, 0);
	return {
		gridStart: r,
		weeks: Math.ceil((y(i, r) + 1) / 7),
		month: e.getMonth()
	};
}
//#endregion
//#region src/ui/views/TimelineView.js
var Et = 300, $ = "__unassigned__", Dt = (e = "") => e.split(/\s+/).filter(Boolean).slice(0, 2).map((e) => e[0].toUpperCase()).join(""), Ot = class {
	constructor(e) {
		this.cal = e, this.innerEl = z("div", { class: "ck-tl-inner" }), this.scrollEl = z("div", {
			class: "ck-tl-scroll",
			onScroll: () => this.onScroll()
		}, this.innerEl), this.el = z("div", { class: "ck-tl" }, this.scrollEl), this.rows = [], this.ghost = null, this._scrolledFor = null, this._zoom = null, this._window = null, this._rafId = 0, this._pos = null;
	}
	get pxPerHour() {
		return this.cal.zoom * (this.cal.scale || 1);
	}
	xOf(e) {
		return (e - this.rangeStart) / a * this.pxPerHour;
	}
	timeAt(e) {
		return new Date(this.rangeStart.getTime() + e / this.pxPerHour * a);
	}
	snapTime(e) {
		return new Date(this.rangeStart.getTime() + C((e - this.rangeStart) / i, this.cal.config.snapMinutes) * i);
	}
	render() {
		let e = this.cal, { config: t, instances: n, locale: r } = e, { workingHours: i, workingDays: a, timelineDays: o } = t, { rowHeight: s, laneHeight: c, resourceColumnWidth: l } = e.metrics;
		this.rangeStart = e.range.start, this.rangeEnd = e.range.end, this.days = o;
		let u = this.pxPerHour, d = o * 24 * u;
		this.totalW = d;
		let f = e.now(), m = /* @__PURE__ */ new Map(), h = [];
		for (let e of n) {
			if (q(e)) {
				h.push(e);
				continue;
			}
			let t = e.resourceId == null ? $ : e.resourceId;
			m.has(t) || m.set(t, []), m.get(t).push(e);
		}
		let g = (e) => h.filter((t) => {
			let n = Ze(t);
			return !n || n.includes(e);
		}), _ = e.visibleResources.map((e) => ({
			key: e.id,
			resource: e,
			items: m.get(e.id) || [],
			bg: g(e.id)
		}));
		m.has($) && t.showUnassigned && _.unshift({
			key: $,
			resource: null,
			items: m.get($),
			bg: []
		});
		let y = 0;
		for (let e of _) {
			let { placed: t, laneCount: n } = bt(e.items);
			e.placed = t, e.height = Math.max(s, n * c + 8), e.top = y, y += e.height;
		}
		this.rows = _, this.offsets = _.map((e) => e.top);
		let b = y, x = [
			1,
			2,
			3,
			6,
			12,
			24
		].find((e) => e * u >= 48) || 24, S = Array.from({ length: o }, (e, t) => p(this.rangeStart, t)), C = [];
		if (x < 24) for (let e = 0; e < o * 24; e += x) C.push(e);
		let w = z("div", { class: "ck-tl-header" }, z("div", { class: "ck-tl-corner" }, t.resourceLabel), z("div", {
			class: "ck-tl-scale",
			style: { width: d }
		}, z("div", { class: "ck-tl-days" }, S.map((t) => z("button", {
			type: "button",
			class: `ck-tl-day${v(t, f) ? " ck-today" : ""}`,
			style: { width: 24 * u },
			onClick: () => e.goToDay(t)
		}, z("span", { class: "ck-tl-day-label" }, k(t, {
			weekday: "short",
			day: "numeric",
			month: u < 12 ? void 0 : "short"
		}, r))))), C.length > 0 && z("div", { class: "ck-tl-hours" }, C.map((e) => z("span", {
			class: "ck-tl-hour",
			style: {
				left: e * u,
				width: x * u
			}
		}, k(new Date(2e3, 0, 1, e % 24), { hour: "numeric" }, r)))))), T = z("div", {
			class: "ck-tl-bg",
			style: {
				left: l,
				width: d
			}
		}, S.map((e, t) => {
			let n = t * 24 * u;
			return a.includes(e.getDay()) ? i ? [z("div", {
				class: "ck-nonwork",
				style: {
					left: n,
					width: i.start * u
				}
			}), z("div", {
				class: "ck-nonwork",
				style: {
					left: n + i.end * u,
					width: (24 - i.end) * u
				}
			})] : null : z("div", {
				class: "ck-nonwork ck-nonwork-day",
				style: {
					left: n,
					width: 24 * u
				}
			});
		}), t.nowIndicator !== !1 && f >= this.rangeStart && f < this.rangeEnd && z("div", {
			class: "ck-now ck-now-v",
			style: { left: this.xOf(f) }
		}));
		this.rowsLayer = z("div", { class: "ck-tl-rows" }), this.bodyEl = z("div", {
			class: "ck-tl-body",
			style: {
				height: Math.max(b, 1),
				"--ck-tick": `${x * u}px`,
				"--ck-day": `${24 * u}px`
			},
			onPointerdown: (e) => this.onLaneDown(e),
			onDblclick: (e) => this.onLaneDoubleClick(e)
		}, T, this.rowsLayer, _.length === 0 && z("div", { class: "ck-empty" }, "No people to show. Add someone, or turn people back on in the filter.")), this.ghost = null, this.el.style.setProperty("--ck-res-w", `${l}px`), this.innerEl.style.width = `${l + d}px`;
		let E = this.scrollEl, D = this._pos ? this._pos.left : E.scrollLeft, ee = this._pos ? this._pos.top : E.scrollTop;
		if (this._zoom && this._zoom !== u) {
			let e = E.clientWidth - l;
			D = Math.max(0, (D + e / 2) / this._zoom * u - e / 2);
		}
		if (this._zoom = u, this.innerEl.replaceChildren(w, this.bodyEl), E.scrollTop = ee, E.scrollLeft = D, this._scrolledFor !== +this.rangeStart) {
			this._scrolledFor = +this.rangeStart;
			let e = f >= this.rangeStart && f < this.rangeEnd ? f : this.rangeStart, t = new Date(e.getFullYear(), e.getMonth(), e.getDate(), i?.start ?? 8);
			E.scrollLeft = Math.max(0, this.xOf(t) - 24);
		}
		this._pos = {
			left: E.scrollLeft,
			top: E.scrollTop
		}, this._window = null, this.renderRows();
	}
	onScroll() {
		this.el.isConnected && (this._pos = {
			left: this.scrollEl.scrollLeft,
			top: this.scrollEl.scrollTop
		}), !this._rafId && (this._rafId = Ge(() => {
			this._rafId = 0, this.renderRows();
		}));
	}
	renderRows() {
		let e = this.cal, { rows: t, offsets: n } = this, r = this.scrollEl, i = r.scrollTop, a = r.clientHeight || 800, o = r.scrollLeft, s = Math.max(0, Z(n, i - Et)), c = Math.max(s, Z(n, i + a + Et)), l = `${s}:${c}:${Math.round(o)}`;
		if (this._window === l) return;
		this._window = l;
		let { laneHeight: u, resourceColumnWidth: d } = e.metrics, f = this.rangeStart, p = this.rangeEnd, m = [];
		for (let n = s; n <= c && n < t.length; n++) {
			let r = t[n], i = r.resource, a = z("div", {
				class: "ck-tl-res",
				style: { "--ck-res": U(i?.color) || "var(--ck-muted)" }
			}, i ? [
				z("span", {
					class: "ck-avatar",
					"aria-hidden": "true"
				}, i.avatar ? z("img", {
					src: i.avatar,
					alt: ""
				}) : Dt(i.name)),
				z("span", { class: "ck-tl-res-text" }, z("span", { class: "ck-tl-res-name" }, i.name), i.role && z("span", { class: "ck-tl-res-role" }, i.role)),
				z("span", {
					class: "ck-tl-res-count",
					title: `${r.items.length} this period`
				}, r.items.length || "")
			] : z("span", { class: "ck-tl-res-text" }, z("span", { class: "ck-tl-res-name" }, "Unassigned"), z("span", { class: "ck-tl-res-role" }, "Drag onto a person to assign"))), s = r.placed.map(({ item: t, lane: n }) => {
				let r = t.start < f ? f : t.start, i = t.end > p ? p : t.end, a = this.xOf(r), s = Math.max(6, this.xOf(i) - a - 2), c = Math.max(0, Math.min(o - a, s - 60)), l = [
					"ck-event-tl",
					s < 56 && "ck-narrow",
					t.start < f && "ck-cont-before",
					t.end > p && "ck-cont-after"
				].filter(Boolean).join(" ");
				return z("div", Y(e, t, l, {
					left: d + a + 1,
					width: s,
					top: 4 + n * u,
					height: u - 4,
					paddingLeft: c ? c + 10 : null
				}, (e) => this.onEventDown(e, t, "move")), J(e, t, "timeline", u < 40 * (e.scale || 1)), !e.readOnly && K(t) && t.start >= f && z("span", {
					class: "ck-resize ck-resize-x ck-resize-start",
					onPointerdown: (e) => this.onEventDown(e, t, "start")
				}), !e.readOnly && K(t) && t.end <= p && z("span", {
					class: "ck-resize ck-resize-x ck-resize-end",
					onPointerdown: (e) => this.onEventDown(e, t, "end")
				}));
			}), c = (r.bg || []).map((t) => {
				let n = t.start < f ? f : t.start, r = t.end > p ? p : t.end, i = this.xOf(n), a = Y(e, t, "ck-event-bg ck-event-bg-tl", {
					left: d + i,
					width: Math.max(4, this.xOf(r) - i),
					top: 0,
					bottom: 0
				}, null);
				return delete a.onPointerdown, delete a.tabindex, z("div", a, z("button", {
					type: "button",
					class: "ck-bg-label",
					onPointerdown: (e) => this.onEventDown(e, t, "move")
				}, J(e, t, "timeline", !0)), !e.readOnly && K(t) && t.end <= p && z("span", {
					class: "ck-resize ck-resize-x ck-resize-end",
					onPointerdown: (e) => this.onEventDown(e, t, "end")
				}));
			});
			m.push(z("div", {
				class: `ck-tl-row${r.key === $ ? " ck-tl-unassigned" : ""}`,
				style: {
					top: r.top,
					height: r.height
				},
				dataset: { row: String(n) }
			}, a, c, s));
		}
		this.rowsLayer.replaceChildren(...m);
	}
	hit(e, t) {
		let n = this.bodyEl.getBoundingClientRect(), r = this.cal.metrics.resourceColumnWidth, i = T(e - n.left - r, 0, this.totalW), a = T(Z(this.offsets, t - n.top), 0, Math.max(0, this.rows.length - 1));
		return {
			time: this.timeAt(i),
			rowIdx: a,
			row: this.rows[a]
		};
	}
	resourceIdOf(e) {
		return e?.resource ? e.resource.id : null;
	}
	clearGhost() {
		this.ghost?.remove(), this.ghost = null;
	}
	showGhost(e, t) {
		this.clearGhost();
		let n = this.rows[e.rowIdx];
		if (!n) return;
		let { laneHeight: r, resourceColumnWidth: i } = this.cal.metrics;
		this.ghost = z("div", {
			class: `ck-event ck-event-tl ck-ghost${t ? "" : " ck-ghost-create"}`,
			style: {
				left: i + this.xOf(e.start) + 1,
				width: Math.max(6, this.xOf(e.end) - this.xOf(e.start) - 2),
				top: n.top + 4,
				height: r - 4,
				"--ck-ev": t ? this.cal.colorOf({
					...t,
					resourceId: e.resourceId
				}) : "var(--ck-accent)"
			}
		}, z("span", { class: "ck-ev-title" }, t?.title || "New event"), z("span", { class: "ck-ev-time" }, j(e.start, e.end, this.cal.locale))), this.bodyEl.appendChild(this.ghost);
	}
	onEventDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, a = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let { snapMinutes: o } = r.config, s = this.hit(e.clientX, e.clientY), c = s.time - t.start, l = t.end - t.start, u = Math.max(0, q(t) ? s.rowIdx : this.rows.findIndex((e) => e.key === (t.resourceId ?? $))), d = !r.readOnly && (n === "move" ? G(t) || Xe(t) : K(t)), f = Xe(t) && !q(t), p = null, m = (e) => {
			for (let n of this.rowsLayer.querySelectorAll(".ck-event")) n.dataset.instance === t.instanceId && n.classList.toggle("ck-is-dragging", e);
			a.classList.toggle("ck-is-dragging", e);
		};
		Q(e, {
			scrollEl: this.scrollEl,
			onStart: () => d && m(!0),
			onMove: (e) => {
				if (!d) return;
				let r = this.hit(e.clientX, e.clientY), { start: a, end: s } = t, h = u, g = t.resourceId;
				n === "move" ? (G(t) && (a = this.snapTime(new Date(r.time - c)), s = new Date(a.getTime() + l)), f && (h = r.rowIdx, g = this.resourceIdOf(r.row))) : n === "end" ? (s = this.snapTime(r.time), s - a < o * 6e4 && (s = new Date(a.getTime() + o * i))) : (a = this.snapTime(r.time), s - a < o * 6e4 && (a = new Date(s.getTime() - o * i))), p = {
					start: a,
					end: s,
					rowIdx: h,
					resourceId: g
				}, this.showGhost(p, t), m(!0);
			},
			onEnd: async (e, i) => {
				if (this.clearGhost(), m(!1), !i) return r.eventClick(t, e);
				if (!p || +p.start == +t.start && +p.end == +t.end && p.resourceId === t.resourceId) return;
				let a = {
					start: p.start,
					end: p.end
				};
				p.resourceId !== t.resourceId && (a.resourceId = p.resourceId), await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: a
				});
			},
			onCancel: () => {
				this.clearGhost(), m(!1);
			}
		});
	}
	onLaneDown(e) {
		let t = this.cal;
		if (e.button !== 0 || e.target.closest(".ck-event:not(.ck-event-bg), .ck-bg-label, .ck-resize, .ck-tl-res") || !this.rows.length) return;
		let { snapMinutes: n } = t.config, r = this.hit(e.clientX, e.clientY), a = () => ({
			date: new Date(this.rangeStart.getTime() + w((r.time - this.rangeStart) / i, n) * i),
			allDay: !1,
			resourceId: this.resourceIdOf(r.row)
		}), o = (e) => {
			let n = (r.row?.bg || []).find((e) => e.start <= r.time && e.end > r.time);
			n ? t.eventClick(n, e) : t.dateClick(a(), e);
		};
		if (t.readOnly || e.pointerType === "touch") {
			window.addEventListener("pointerup", (t) => {
				Math.hypot(t.clientX - e.clientX, t.clientY - e.clientY) < 4 && o(t);
			}, { once: !0 });
			return;
		}
		let s = new Date(this.rangeStart.getTime() + w((r.time - this.rangeStart) / i, n) * i), c = null;
		Q(e, {
			scrollEl: this.scrollEl,
			onMove: (e) => {
				let t = this.snapTime(this.hit(e.clientX, e.clientY).time), a = t < s ? t : s, o = t < s ? new Date(s.getTime() + n * i) : t;
				o <= a && (o = new Date(a.getTime() + n * i)), c = {
					start: a,
					end: o,
					rowIdx: r.rowIdx,
					resourceId: this.resourceIdOf(r.row)
				}, this.showGhost(c, null);
			},
			onEnd: (e, n) => {
				this.clearGhost(), n && c ? t.select({
					start: c.start,
					end: c.end,
					allDay: !1,
					resourceId: c.resourceId
				}, e, "drag") : n || o(e);
			},
			onCancel: () => this.clearGhost()
		});
	}
	onLaneDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event:not(.ck-event-bg), .ck-bg-label, .ck-tl-res") || !this.rows.length) return;
		let n = this.hit(e.clientX, e.clientY), r = new Date(this.rangeStart.getTime() + w((n.time - this.rangeStart) / i, 30) * i);
		t.select({
			start: r,
			end: new Date(r.getTime() + t.config.defaultEventDuration * i),
			allDay: !1,
			resourceId: this.resourceIdOf(n.row)
		}, e, "dblclick");
	}
	destroy() {
		this.el.remove();
	}
};
//#endregion
//#region src/ui/views/ListView.js
function kt(e, t = "week", n = 1) {
	let r = d(e);
	if (t === "day") return {
		start: r,
		end: p(r, 1)
	};
	if (t === "month") {
		let e = _(r);
		return {
			start: e,
			end: h(e, 1)
		};
	}
	let i = g(r, n);
	return {
		start: i,
		end: p(i, 7)
	};
}
var At = class {
	constructor(e) {
		this.cal = e, this.el = z("div", { class: "ck-list" });
	}
	render() {
		let e = this.cal, { config: t, instances: n, locale: r } = e, { start: i, end: a } = e.range, o = e.now(), s = /* @__PURE__ */ new Map();
		for (let e of [...n].sort((e, t) => e.start - t.start || t.end - e.end)) {
			let t = e.start < i ? i : d(e.start);
			for (let n = t; n < a && n < e.end; n = p(n, 1)) s.has(+n) || s.set(+n, []), s.get(+n).push(e);
		}
		let c = [];
		for (let e = i; e < a; e = p(e, 1)) (t.listShowEmpty || s.has(+e)) && c.push(e);
		let l = c.map((n) => {
			let i = s.get(+n) || [];
			return z("section", { class: `ck-list-day${v(n, o) ? " ck-today" : ""}` }, z("button", {
				type: "button",
				class: "ck-list-dayhead",
				onClick: () => e.dateClick({
					date: n,
					allDay: !0
				})
			}, z("span", { class: "ck-list-dow" }, k(n, { weekday: "long" }, r)), z("span", { class: "ck-list-date" }, k(n, {
				day: "numeric",
				month: "long",
				year: "numeric"
			}, r)), z("span", { class: "ck-list-count" }, i.length ? String(i.length) : "")), i.length ? z("ul", { class: "ck-list-items" }, i.map((t) => {
				let n = t.display === "background", i = t.allDay || t.end - t.start >= 864e5 ? "All day" : j(t.start, t.end, r), a = Y(e, t, `ck-event-list${n ? " ck-bg-item" : ""}`, {}, (n) => {
					n.button === 0 && e.setSelected(t.instanceId);
				});
				return a.onClick = (n) => e.eventClick(t, n), z("li", a, z("span", { class: "ck-list-time" }, i), z("span", {
					class: "ck-list-dot",
					"aria-hidden": "true"
				}), z("span", { class: "ck-list-body" }, J(e, t, "list")));
			})) : z("div", { class: "ck-list-none" }, t.listEmptyText));
		});
		this.el.replaceChildren(...l.length ? l : [z("div", { class: "ck-empty ck-list-empty" }, t.listEmptyText)]);
	}
	destroy() {
		this.el.remove();
	}
}, jt = [
	"day",
	"week",
	"month",
	"timeline",
	"list"
], Mt = [
	"day",
	"week",
	"month",
	"timeline"
], Nt = H.cobalt, Pt = {
	view: "week",
	views: Mt,
	height: 720,
	readOnly: !1,
	locale: void 0,
	weekStartsOn: 1,
	hourHeight: 48,
	snapMinutes: 15,
	dayStartHour: 0,
	dayEndHour: 24,
	scrollToHour: 8,
	workingHours: {
		start: 9,
		end: 18
	},
	workingDays: [
		1,
		2,
		3,
		4,
		5
	],
	defaultEventDuration: 60,
	timelineDays: 7,
	timelineHourWidth: 60,
	rowHeight: 52,
	laneHeight: 40,
	resourceColumnWidth: 220,
	resourceLabel: "People",
	showSidebar: !0,
	showUnassigned: !0,
	showResourceInEvents: !0,
	editorFields: [],
	eventRenderer: null,
	theme: "light",
	toolbarItems: null,
	sidebarItems: null,
	cls: "",
	editor: !0,
	showToolbar: !0,
	tooltip: !0,
	nowIndicator: !0,
	now: null,
	eventSource: null,
	listRange: "week",
	listShowEmpty: !1,
	listEmptyText: "Nothing scheduled",
	viewLabels: null,
	scale: 1,
	resourceFilterCollapsed: !1,
	editorSections: null,
	editorLabels: null,
	editorActions: null,
	editorReadOnly: !1,
	assigneeLabel: null
};
function Ft(e, t, n) {
	let r = {
		month: "short",
		day: "numeric",
		year: "numeric"
	};
	try {
		return new Intl.DateTimeFormat(n, r).formatRange(e, t);
	} catch {
		return `${k(e, r, n)} – ${k(t, r, n)}`;
	}
}
var It = class extends n {
	constructor(e = {}) {
		super();
		let { appendTo: t, project: n, crudManager: r, listeners: i, date: a, ...o } = e;
		if (this.config = {
			...Pt,
			...o
		}, this.project = n instanceof Ae ? n : new Ae(n || {}), this._ownsCrud = !1, r instanceof Pe) this.crudManager = r;
		else if (r) {
			let { autoLoad: e = !0, autoSync: t = !0, ...n } = r;
			this.crudManager = new Pe(this.project, {
				autoSync: t,
				...n
			}), this._ownsCrud = !0, e && this.crudManager.load().catch(() => {});
		} else this.crudManager = null;
		for (let [e, t] of Object.entries(i || {})) this.on(e, t);
		if (this._view = jt.includes(this.config.view) ? this.config.view : "week", this._date = d(a && c(a) || this.now()), this.hiddenResources = /* @__PURE__ */ new Set(), this.sidebarOpen = !0, this.filterCollapsed = !!this.config.resourceFilterCollapsed, this.zoom = this.config.timelineHourWidth, this.selectedId = null, this._views = {}, this._editor = null, this._modal = 0, this._tipTimer = 0, this._rafId = 0, this._cacheKey = null, this._rangeKey = null, this._loadSeq = 0, this.loading = !1, this.toolbarEl = z("div", { class: "ck-toolbar" }), this.sidebarEl = z("aside", { class: "ck-sidebar" }), this.viewEl = z("div", { class: "ck-view" }), this.tooltipEl = z("div", {
			class: "ck-tooltip",
			role: "tooltip",
			hidden: !0
		}), this.el = z("div", {
			class: "ck-root",
			tabindex: "-1",
			onKeydown: (e) => this._onKeyDown(e),
			onPointerdown: (e) => {
				this.hideTooltip(), e.target.closest(".ck-event, .ck-overlay") || this.setSelected(null);
			}
		}, this.toolbarEl, z("div", { class: "ck-main" }, this.sidebarEl, this.viewEl), this.tooltipEl), this.tooltipEl.hidden = !0, this._offProject = this.project.on("change", () => this.refresh()), this._offCrud = this.crudManager ? this.crudManager.on("status", () => this.refresh()) : null, this._clock = setInterval(() => this.refresh(), 6e4), typeof ResizeObserver < "u") {
			let e = "";
			this._ro = new ResizeObserver(() => {
				let t = `${this.el.clientWidth}x${this.el.clientHeight}`;
				t !== e && (e = t, this.refresh());
			}), this._ro.observe(this.el);
		}
		t && this.mount(t);
	}
	mount(e) {
		let t = typeof e == "string" ? document.querySelector(e) : e;
		if (!t) throw Error(`ChronoKit: element ${e} not found`);
		return t.appendChild(this.el), this.renderNow(), this;
	}
	destroy() {
		Ke(this._rafId), clearInterval(this._clock), clearTimeout(this._tipTimer), this._ro?.disconnect(), this._offProject?.(), this._offCrud?.(), this._ownsCrud && this.crudManager.destroy(), this._editor?.destroy(), this.el.remove(), this.emit("destroy"), this._listeners.clear();
	}
	get view() {
		return this._view;
	}
	get date() {
		return this._date;
	}
	get readOnly() {
		return this.config.readOnly;
	}
	get locale() {
		return this.config.locale;
	}
	setView(e) {
		return !jt.includes(e) || e === this._view ? this : (this._view = e, this.emit("viewChange", {
			view: e,
			calendar: this
		}), this.renderNow());
	}
	setDate(e) {
		let t = c(e);
		if (!t) return this;
		let n = d(t);
		return +n == +this._date ? this : (this._date = n, this.emit("dateChange", {
			date: n,
			calendar: this
		}), this.renderNow());
	}
	shift(e) {
		return this.setDate(this._shiftedDate(e));
	}
	_shiftedDate(e, t = this.view, n = this.date) {
		if (t === "day") return p(n, e);
		if (t === "month") return h(n, e);
		if (t === "timeline") return p(n, e * this.config.timelineDays);
		if (t === "list") {
			let t = this.config.listRange;
			if (t === "day") return p(n, e);
			if (t === "month") return h(n, e);
		}
		return p(n, e * 7);
	}
	rangeFor(e = this.date, t = this.view) {
		let n = this._computeRange(t, d(c(e)));
		return {
			start: n.start,
			end: n.end,
			view: t
		};
	}
	adjacentRanges() {
		return [this.rangeFor(this._shiftedDate(-1)), this.rangeFor(this._shiftedDate(1))];
	}
	next() {
		return this.shift(1);
	}
	prev() {
		return this.shift(-1);
	}
	today() {
		return this.setDate(this.now());
	}
	now() {
		return typeof this.config.now == "function" && c(this.config.now()) || /* @__PURE__ */ new Date();
	}
	goToDay(e) {
		return this.setDate(e), this.config.views.includes("day") && this.setView("day"), this;
	}
	setConfig(e) {
		return Object.assign(this.config, e), "timelineHourWidth" in e && (this.zoom = e.timelineHourWidth), "view" in e && jt.includes(e.view) && e.view !== this._view && (this._view = e.view, this.emit("viewChange", {
			view: e.view,
			calendar: this
		})), "eventSource" in e && (this._rangeKey = null), this._cacheKey = null, this.renderNow();
	}
	setZoom(e) {
		return this.zoom = T(e, 6, 180), this.renderNow();
	}
	toggleSidebar(e = !this.sidebarOpen) {
		return this.sidebarOpen = e, this.renderNow();
	}
	toggleResourceFilter(e = !this.filterCollapsed) {
		return this.filterCollapsed = e, this.renderNow();
	}
	setResourceVisible(e, t) {
		return t ? this.hiddenResources.delete(e) : this.hiddenResources.add(e), this._cacheKey = null, this.renderNow();
	}
	setHiddenResources(e) {
		return this.hiddenResources = new Set(e), this._cacheKey = null, this.renderNow();
	}
	refresh() {
		return this._rafId ||= Ge(() => {
			this._rafId = 0, this._render();
		}), this;
	}
	renderNow() {
		return this._rafId &&= (Ke(this._rafId), 0), this._render(), this;
	}
	openEditor(e) {
		let t = typeof e == "object" && e?.instanceId ? e : (() => {
			let t = this.project.getEvent(e?.id ?? e);
			return t ? {
				...t,
				instanceId: String(t.id),
				masterId: t.id,
				isOccurrence: !1,
				occurrenceKey: null
			} : null;
		})();
		return t && this._openEditor({
			instance: t,
			isNew: !1
		}), this;
	}
	select(e, t = null, n = "drag") {
		if (this.readOnly) return this;
		let r = {
			start: e.start,
			end: e.end,
			allDay: !!e.allDay,
			resourceId: e.resourceId ?? null,
			source: n,
			domEvent: t,
			calendar: this
		};
		for (let e of [...this._listeners.get("select") || []]) if (e(r) === !1) return this;
		return this.config.editor === !1 ? this : this.openCreate(e);
	}
	dateClick(e, t = null) {
		return this.emit("dateClick", {
			date: e.date,
			allDay: !!e.allDay,
			resourceId: e.resourceId ?? null,
			domEvent: t,
			calendar: this
		}), this;
	}
	refetch() {
		return this._rangeKey = null, this.renderNow();
	}
	undo() {
		return this._replay("undo");
	}
	redo() {
		return this._replay("redo");
	}
	closeEditor() {
		return this._editor?.destroy(), this._editor = null, this;
	}
	openCreate(e) {
		if (this.readOnly || this.config.editor === !1) return this;
		let t = {
			title: "",
			...e
		};
		return t.resourceId === void 0 && (t.resourceId = this.visibleResources.length === 1 ? this.visibleResources[0].id : null), this._openEditor({
			draft: t,
			isNew: !0
		}), this;
	}
	colorOf(e) {
		return U(e.color) || U(this.resourcesById.get(e.resourceId)?.color) || Nt;
	}
	setSelected(e) {
		if (this.selectedId !== e) {
			this.selectedId = e;
			for (let t of this.el.querySelectorAll(".ck-event[data-instance]")) t.classList.toggle("ck-selected", t.dataset.instance === e);
			this.emit("selectionChange", {
				instanceId: e,
				calendar: this
			});
		}
	}
	eventClick(e, t) {
		for (let n of [...this._listeners.get("eventClick") || []]) if (n({
			event: e,
			domEvent: t,
			calendar: this
		}) === !1) return;
		this.config.editor !== !1 && this.openEditor(e);
	}
	async commitChange({ type: e, instance: t, changes: n = {}, allowThis: r = !0 }) {
		if (this.readOnly) return !1;
		if (t && (e === "move" || e === "resize")) {
			let r = n.start && +n.start != +t.start || n.end && +n.end != +t.end;
			if (e === "move" && r && !G(t) || e === "resize" && !K(t) || "resourceId" in n && n.resourceId !== t.resourceId && !Xe(t)) return !1;
		}
		let i = {
			type: e,
			event: t,
			changes: n,
			source: "ui",
			project: this.project,
			calendar: this
		};
		for (let e of [...this._listeners.get("beforeEventChange") || []]) if (await e(i) === !1) return !1;
		let a = "all";
		if (t?.isOccurrence && (this._modal++, a = await vt(this.el, {
			kind: e === "remove" ? "delete" : "edit",
			allowThis: r
		}), this._modal--, this.el.focus({ preventScroll: !0 }), !a)) return !1;
		let o = null;
		return e === "create" ? o = this.project.addEvent(n) : e === "remove" ? this.project.removeOccurrence(t, a) : o = this.project.updateOccurrence(t, n, a), this.emit("eventChange", {
			...i,
			scope: a,
			result: o
		}), !0;
	}
	showTooltip(e, t) {
		let n = this.config.tooltip;
		if (n === !1 || t.pointerType === "touch" || document.body.classList.contains("ck-body-dragging") || this._editor) return;
		clearTimeout(this._tipTimer);
		let { clientX: r, clientY: i } = t;
		this._tipTimer = setTimeout(() => {
			let t = this.tooltipEl, a = typeof n == "function" ? n({
				event: e,
				calendar: this
			}) : null;
			typeof a == "string" && (a = Ve(a)), (a == null || a === !1) && (a = $e(this, e)), t.replaceChildren(...[a].flat(2).filter(Boolean)), t.style.setProperty("--ck-ev", this.colorOf(e)), t.style.left = `${Math.min(r + 14, window.innerWidth - 300)}px`, t.style.top = `${Math.min(i + 16, window.innerHeight - 180)}px`, t.hidden = !1;
		}, 450);
	}
	hideTooltip() {
		clearTimeout(this._tipTimer), this.tooltipEl && !this.tooltipEl.hidden && (this.tooltipEl.hidden = !0);
	}
	_computeRange(e = this.view, t = this.date) {
		let { weekStartsOn: n, timelineDays: r } = this.config;
		if (e === "day") return {
			start: t,
			end: p(t, 1),
			days: [t]
		};
		if (e === "month") {
			let e = Tt(t, n);
			return {
				start: e.gridStart,
				end: p(e.gridStart, e.weeks * 7),
				grid: e
			};
		}
		if (e === "timeline") {
			let e = r === 7 ? g(t, n) : t;
			return {
				start: e,
				end: p(e, r)
			};
		}
		if (e === "list") return kt(t, this.config.listRange, n);
		let i = Ct(t, n, 7);
		return {
			start: i[0],
			end: p(i[0], 7),
			days: i
		};
	}
	_computeTitle() {
		let { view: e, date: t, range: n, locale: r } = this;
		return e === "day" ? k(t, {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		}, r) : e === "month" || e === "list" && this.config.listRange === "month" ? k(t, {
			month: "long",
			year: "numeric"
		}, r) : e === "list" && this.config.listRange === "day" ? k(t, {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		}, r) : Ft(n.start, p(n.end, -1), r);
	}
	_getView(e) {
		let t = e;
		return this._views[t] || (e === "month" ? this._views[t] = new wt(this) : e === "timeline" ? this._views[t] = new Ot(this) : e === "list" ? this._views[t] = new At(this) : this._views[t] = new St(this)), this._views[t];
	}
	_render() {
		if (!this.el.isConnected && !this.el.parentNode) return;
		let { config: e, project: t } = this;
		this.range = this._computeRange(), this._checkRange();
		let n = t.resources;
		this.resourcesById = new Map(n.map((e) => [e.id, e])), this.visibleResources = n.filter((e) => !this.hiddenResources.has(e.id));
		let r = `${t.version}|${+this.range.start}|${+this.range.end}|${[...this.hiddenResources].join(",")}`;
		if (r !== this._cacheKey) {
			this._cacheKey = r;
			let e = this.hiddenResources;
			this.instances = t.getEventsInRange(this.range.start, this.range.end, { filter: e.size ? (t) => t.resourceId == null || !e.has(t.resourceId) : null }), this.selectedId && !this.instances.some((e) => e.instanceId === this.selectedId) && (this.selectedId = null);
		}
		this.title = this._computeTitle(), this._applyScale();
		let i = this.el;
		i.className = `ck-root${e.readOnly ? " ck-readonly" : ""}${this.loading ? " ck-loading" : ""}${e.cls ? ` ${e.cls}` : ""}`, i.dataset.theme = e.theme, i.style.height = typeof e.height == "number" ? `${e.height}px` : e.height, We(i, () => {
			this.toolbarEl.hidden = e.showToolbar === !1, e.showToolbar !== !1 && this.toolbarEl.replaceChildren(...[Ye(this)].flat(2).filter(Boolean));
			let t = e.showSidebar && this.sidebarOpen;
			this.sidebarEl.hidden = !t, t && this.sidebarEl.replaceChildren(...[ct(this)].flat(2).filter(Boolean));
		});
		let a = this._getView(this.view);
		this.viewEl.firstChild !== a.el && this.viewEl.replaceChildren(a.el), this.viewEl.dataset.view = this.view, a.render();
	}
	_computeScale() {
		let e = this.config.scale;
		if (e === "auto") {
			let e = this.el.clientWidth || 0;
			return e < 1200 ? 1 : Math.round(Math.min(1.5, Math.max(1, e / 1400)) * 100) / 100;
		}
		return Number(e) > 0 ? Number(e) : 1;
	}
	_applyScale() {
		let e = this._computeScale(), t = this.config, n = (t) => Math.round(t * e);
		this.scale = e, this.metrics = {
			hourHeight: n(t.hourHeight),
			rowHeight: n(t.rowHeight),
			laneHeight: n(t.laneHeight),
			resourceColumnWidth: n(t.resourceColumnWidth),
			monthLane: n(22),
			monthHeader: n(28),
			allDayLane: n(24)
		}, this.el.style.setProperty("--ck-scale", String(e));
	}
	_checkRange() {
		let { start: e, end: t } = this.range, n = `${this.view}|${+e}|${+t}`;
		n !== this._rangeKey && (this._rangeKey = n, this.emit("rangeChange", {
			start: e,
			end: t,
			view: this.view,
			calendar: this
		}), typeof this.config.eventSource == "function" && this._load({
			start: e,
			end: t,
			view: this.view
		}));
	}
	async _load(e) {
		let t = ++this._loadSeq;
		this._loadAbort?.abort();
		let n = typeof AbortController < "u" ? new AbortController() : null;
		this._loadAbort = n, this._setLoading(!0);
		try {
			let r = await this.config.eventSource({
				...e,
				signal: n?.signal,
				calendar: this
			});
			if (t !== this._loadSeq || r == null) return;
			let i = Array.isArray(r) ? { events: r } : r;
			this.project.loadData({
				events: i.events || [],
				...i.resources ? { resources: i.resources } : {}
			}, { keepHistory: !0 }), this.emit("load", {
				...e,
				calendar: this
			});
		} catch (n) {
			if (t !== this._loadSeq) return;
			this.emit("loadError", {
				...e,
				error: n,
				calendar: this
			});
		} finally {
			t === this._loadSeq && this._setLoading(!1);
		}
	}
	_setLoading(e) {
		this.loading !== e && (this.loading = e, this.el.classList.toggle("ck-loading", e), this.emit("loading", {
			loading: e,
			calendar: this
		}));
	}
	async _replay(e) {
		let { project: t } = this, n = e === "undo" ? t.peekUndo() : t.peekRedo();
		if (!n || this.readOnly) return !1;
		let r = e === "undo" ? [...n.ops].reverse().map((e) => t._inverse(e)) : n.ops;
		for (let n of r) {
			if (n.store !== "events") continue;
			let r = this._replayPayload(n, e);
			for (let n of [...this._listeners.get("beforeEventChange") || []]) if (await n(r) === !1) return e === "undo" ? t.dropUndo() : t.dropRedo(), !1;
		}
		return (e === "undo" ? t.peekUndo() : t.peekRedo()) === n && (e === "undo" ? t.undo() : t.redo(), this.emit("eventChange", {
			type: e,
			source: e,
			label: n.label,
			project: t,
			calendar: this
		}), !0);
	}
	_replayPayload(e, t) {
		let n = {
			source: t,
			project: this.project,
			calendar: this
		}, r = (e) => ({
			...e,
			instanceId: String(e.id),
			masterId: e.id,
			isOccurrence: !1,
			occurrenceKey: null
		});
		if (e.type === "add") return {
			...n,
			type: "create",
			event: null,
			changes: { ...e.record }
		};
		if (e.type === "remove") return {
			...n,
			type: "remove",
			event: r(e.record),
			changes: {}
		};
		let { before: i, after: a } = e, o = {};
		for (let e of [
			"start",
			"end",
			"resourceId",
			"title",
			"allDay"
		]) {
			let t = i[e], n = a[e];
			(t instanceof Date && n instanceof Date ? +t != +n : t !== n) && (o[e] = n);
		}
		let s = +a.end - a.start == +i.end - i.start, c = Object.keys(o).every((e) => e === "start" || e === "end" || e === "resourceId") ? s ? "move" : "resize" : "update";
		return {
			...n,
			type: c,
			event: r(i),
			changes: o
		};
	}
	_openEditor(e) {
		this.hideTooltip(), this._editor?.destroy();
		let t = () => {
			this._editor?.destroy(), this._editor = null, this.el.focus({ preventScroll: !0 });
		}, n = new _t(this, e, {
			onClose: t,
			onSave: async (n) => {
				let r;
				if (e.isNew) r = await this.commitChange({
					type: "create",
					instance: null,
					changes: n
				});
				else {
					let t = e.instance, i = (n.rrule || null) !== (t.rrule || null), a = { ...n };
					t.isOccurrence && !i && delete a.rrule, r = await this.commitChange({
						type: "update",
						instance: t,
						changes: a,
						allowThis: !i
					});
				}
				r && t();
			},
			onDelete: async (e) => {
				await this.commitChange({
					type: "remove",
					instance: e
				}) && t();
			}
		});
		this._editor = n, this.el.appendChild(n.el), this.emit("editorOpen", {
			editor: n,
			calendar: this,
			...e
		});
	}
	_onKeyDown(e) {
		if (this._editor || this._modal) return;
		let t = e.target.tagName;
		if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
		let n = e.metaKey || e.ctrlKey, r = e.key.toLowerCase();
		if (n && r === "z") e.preventDefault(), e.shiftKey ? this.redo() : this.undo();
		else if (n && r === "y") e.preventDefault(), this.redo();
		else if (n && r === "s" && this.crudManager) e.preventDefault(), this.crudManager.sync().catch(() => {});
		else if ((e.key === "Delete" || e.key === "Backspace") && this.selectedId && !this.readOnly) {
			let t = this.instances.find((e) => e.instanceId === this.selectedId);
			t && (e.preventDefault(), this.commitChange({
				type: "remove",
				instance: t
			}));
		} else e.key === "Escape" && this.setSelected(null);
	}
};
//#endregion
export { It as Calendar, Pe as CrudManager, Pt as DEFAULTS, H as EVENT_COLORS, n as Emitter, _t as EventEditor, et as MINI_DEFAULTS, at as MiniMonth, Ae as Project, vt as askScope, it as buildMiniMonth, G as canMove, Xe as canReassign, K as canResize, Me as createFetchTransport, Ne as createMemoryTransport, r as dates, F as describeRRule, Ue as escapeHtml, he as expandRecurring, Z as findRowIndex, z as h, I as isPhantomId, X as layoutDayRow, bt as layoutLanes, yt as layoutTimeGridColumn, kt as listRange, L as newPhantomId, de as nthWeekdayOfMonth, me as occurrenceStarts, M as parseByDay, N as parseRRule, U as resolveColor, P as stringifyRRule };

//# sourceMappingURL=chronokit.js.map