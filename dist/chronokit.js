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
var F = (e, t) => new Date(e.getFullYear(), e.getMonth(), e.getDate(), t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds());
function ue(e, t, n, r) {
	if (r > 0) {
		let i = 1 + (n - new Date(e, t, 1).getDay() + 7) % 7 + (r - 1) * 7;
		return i <= m(e, t) ? new Date(e, t, i) : null;
	}
	let i = m(e, t), a = i - (new Date(e, t, i).getDay() - n + 7) % 7 + (r + 1) * 7;
	return a >= 1 ? new Date(e, t, a) : null;
}
function de(e, t, n) {
	switch (t.freq) {
		case "DAILY": {
			let r = p(d(e), n * t.interval);
			return t.byDay && !t.byDay.some((e) => M(e).weekday === r.getDay()) ? {
				periodStart: r,
				dates: []
			} : {
				periodStart: r,
				dates: [F(r, e)]
			};
		}
		case "WEEKLY": {
			let r = p(g(e, 1), n * 7 * t.interval), i = t.byDay ? t.byDay.map((e) => M(e).code) : [O[e.getDay()]];
			return {
				periodStart: r,
				dates: [...new Set(i)].map((e) => oe.indexOf(e)).sort((e, t) => e - t).map((t) => F(p(r, t), e))
			};
		}
		case "MONTHLY": {
			let r = h(_(e), n * t.interval), i = r.getFullYear(), a = r.getMonth(), o = [];
			if (t.byDay) for (let e of t.byDay) {
				let { n: t, weekday: n } = M(e);
				if (t) {
					let e = ue(i, a, n, t);
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
			return o = o.sort((e, t) => e - t).map((t) => F(t, e)), {
				periodStart: r,
				dates: o
			};
		}
		case "YEARLY": {
			let r = e.getFullYear() + n * t.interval, i = new Date(r, e.getMonth(), e.getDate()), a = i.getMonth() === e.getMonth();
			return {
				periodStart: new Date(r, 0, 1),
				dates: a ? [F(i, e)] : []
			};
		}
		default: return null;
	}
}
function fe(e, t, n) {
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
function* pe(e, t, { before: n = null, after: r = null, maxPeriods: i = 5e4 } = {}) {
	let a = N(t);
	if (!a) {
		yield l(e);
		return;
	}
	let o = 0, s = r ? fe(e, a, r) : 0;
	for (let t = s; t < s + i; t++) {
		let { periodStart: r, dates: i } = de(e, a, t);
		if (n && r >= n || a.until && r > a.until) return;
		for (let t of i) if (!(t < e) && (a.until && t > a.until || n && t >= n || (yield t, o++, a.count && o >= a.count))) return;
	}
}
function me(e, t, n) {
	let r = N(e.rrule), i = e.end - e.start;
	if (!r) return e.start < n && (e.end > t || i === 0 && e.start >= t) ? [{
		start: l(e.start),
		end: l(e.end),
		key: D(e.start)
	}] : [];
	let a = new Set(e.exceptionDates || []), o = new Date(t.getTime() - i), s = [];
	for (let c of pe(e.start, r, {
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
function he(e, t, n) {
	let r = 0;
	for (let i of pe(e, t, { before: n })) r++;
	return r;
}
function ge(e, t) {
	let n = N(e);
	if (!n || !t) return n;
	let r = { ...n };
	return n.byDay && (r.byDay = n.byDay.map((e) => {
		let { n, weekday: r } = M(e), i = O[((r + t) % 7 + 7) % 7];
		return n ? `${n}${i}` : i;
	})), n.byMonthDay && (r.byMonthDay = n.byMonthDay.map((e) => e > 0 ? Math.min(31, Math.max(1, e + t)) : e)), r;
}
var _e = {
	DAILY: ["day", "days"],
	WEEKLY: ["week", "weeks"],
	MONTHLY: ["month", "months"],
	YEARLY: ["year", "years"]
}, ve = {
	1: "first",
	2: "second",
	3: "third",
	4: "fourth",
	5: "fifth",
	"-1": "last"
}, ye = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR"
];
function I(e, t, n) {
	let r = N(e);
	if (!r) return "Does not repeat";
	let i = (e, t = "short") => k(new Date(2024, 0, 7 + O.indexOf(e)), { weekday: t }, n), a, o = (r.byDay || []).map((e) => M(e));
	if (r.freq === "DAILY" && o.length === 5 && ye.every((e) => o.some((t) => t.code === e)) && r.interval === 1) a = "Every weekday";
	else if (a = r.interval === 1 ? `Every ${_e[r.freq][0]}` : `Every ${r.interval} ${_e[r.freq][1]}`, r.freq === "WEEKLY") {
		let e = o.length ? o.map((e) => e.code) : t ? [O[t.getDay()]] : [];
		e.length && (a += ` on ${oe.filter((t) => e.includes(t)).map((e) => i(e)).join(", ")}`);
	} else r.freq === "MONTHLY" ? o.length && o[0].n ? a += ` on the ${ve[o[0].n] || `${o[0].n}th`} ${i(o[0].code, "long")}` : r.byMonthDay ? a += ` on day ${r.byMonthDay.join(", ")}` : t && (a += ` on day ${t.getDate()}`) : r.freq === "YEARLY" && t && (a += ` on ${k(t, {
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
var be = 0, xe = "_new_", L = (e) => typeof e == "string" && e.startsWith("_new_"), R = () => `${xe}${++be}`, z = ["resources", "events"];
function B(e) {
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
		id: e.id ?? R(),
		title: e.title ?? "",
		start: t,
		end: n,
		allDay: r,
		resourceId: e.resourceId ?? null,
		color: e.color ?? null,
		notes: e.notes ?? "",
		rrule: i,
		exceptionDates: i ? [...new Set((e.exceptionDates || []).map(Se))].sort() : [],
		recurringEventId: e.recurringEventId ?? null,
		originalDateKey: e.originalDateKey ?? null
	};
	return delete a.duration, Object.freeze(a);
}
function Se(e) {
	if (e instanceof Date) return D(e);
	let t = String(e);
	return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : D(c(t));
}
function V(e) {
	return Object.freeze({
		...e,
		id: e.id ?? R(),
		name: e.name ?? ""
	});
}
var Ce = () => {
	let e = {};
	for (let t of z) e[t] = {
		added: /* @__PURE__ */ new Set(),
		updated: /* @__PURE__ */ new Map(),
		removed: /* @__PURE__ */ new Map()
	};
	return e;
};
function we(e, t) {
	let n = /* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)]), r = [];
	for (let i of n) {
		let n = e[i], a = t[i];
		(n instanceof Date && a instanceof Date ? +n != +a : Array.isArray(n) && Array.isArray(a) ? n.join() !== a.join() : n !== a) && r.push(i);
	}
	return r;
}
var Te = (e, t) => t ? e.map((e) => D(p(c(e), t))) : e, Ee = /* @__PURE__ */ new Set([
	"id",
	"rrule",
	"exceptionDates",
	"recurringEventId",
	"originalDateKey"
]), De = class extends n {
	constructor({ events: e = [], resources: t = [], undoLimit: n = 100 } = {}) {
		super(), this._events = /* @__PURE__ */ new Map(), this._resources = /* @__PURE__ */ new Map(), this._resourceOrder = [], this._undo = [], this._redo = [], this._tx = null, this._replaying = !1, this._changes = Ce(), this._cache = {}, this.undoLimit = n, this.version = 0, this.subscribe = (e) => this.on("change", e), this.getVersion = () => this.version, this.loadData({
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
			if (n.rrule) for (let r of me(n, e, t)) a.push({
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
	loadData({ events: e, resources: t } = {}) {
		if (t) {
			this._resources.clear(), this._resourceOrder = [];
			for (let e of t) {
				let t = V(e);
				this._resources.set(t.id, t), this._resourceOrder.push(t.id);
			}
		}
		if (e) {
			this._events.clear();
			for (let t of e) {
				let e = B(t);
				this._events.set(e.id, e);
			}
		}
		this._undo = [], this._redo = [], this._changes = Ce(), this._bump({ type: "load" });
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
		let t = B({
			...e,
			id: e.id ?? R()
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
		let r = B({
			...n,
			...t,
			id: e
		});
		return we(n, r).length ? (this._do({
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
			for (let [e, t] of Object.entries(r)) Ee.has(e) || (n[e] = t);
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
		let s = i - e.start, l = a - i, u = y(i, e.start), d = "rrule" in t, p = (e) => d ? t.rrule : u ? P(ge(e, u)) : e;
		if (n === "all" || o) {
			let e = new Date(r.start.getTime() + s);
			return this.updateEvent(r.id, {
				...t,
				start: e,
				end: new Date(e.getTime() + l),
				rrule: p(r.rrule),
				exceptionDates: Te(t.exceptionDates ?? r.exceptionDates, u)
			});
		}
		return this.transaction(() => {
			let n = N(r.rrule), o = he(r.start, n, e.start), s = { ...n };
			delete s.count, s.until = /* @__PURE__ */ new Date(e.start.getTime() - 1e3), this.updateEvent(r.id, {
				rrule: P(s),
				exceptionDates: r.exceptionDates.filter((t) => t < e.occurrenceKey)
			});
			let c = { ...n };
			n.count && (c.count = Math.max(1, n.count - o));
			let l = {};
			for (let [e, t] of Object.entries(r)) Ee.has(e) || (l[e] = t);
			return this.addEvent({
				...l,
				...t,
				start: i,
				end: a,
				rrule: d ? t.rrule : P(u ? ge(c, u) : c),
				exceptionDates: Te(r.exceptionDates.filter((t) => t >= e.occurrenceKey), u)
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
		let n = V({
			...e,
			id: e.id ?? R()
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
		let r = V({
			...n,
			...t,
			id: e
		});
		return we(n, r).length ? (this._do({
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
			for (let t of we(e.before, e.after)) n.add(t);
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
		return z.some((e) => {
			let t = this._changes[e];
			return t.added.size || t.updated.size || t.removed.size;
		});
	}
	getChanges(e = (e) => e.toISOString()) {
		return this._serializeChanges(this._changes, e);
	}
	_serializeChanges(e, t) {
		let n = (e) => e instanceof Date ? t(e) : e, r = {};
		for (let t of z) {
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
		return this._changes = Ce(), e;
	}
	_restoreChanges(e) {
		for (let t of z) {
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
		for (let t of z) {
			let n = e[t];
			if (!n) continue;
			let r = t === "events" ? this._events : this._resources;
			for (let e of n.rows || []) {
				let { $phantomId: n, ...i } = e, a = i.id;
				n != null && r.has(n) && a != null && a !== n && this._remapId(t, n, a), a ??= n;
				let o = r.get(a);
				if (!o) continue;
				let s = t === "events" ? B({
					...o,
					...i,
					id: a
				}) : V({
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
}, Oe = (e) => Array.isArray(e) ? e : e && Array.isArray(e.rows) ? e.rows : void 0;
function ke({ loadUrl: e, syncUrl: t, headers: n = {}, fetchOptions: r = {} } = {}) {
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
function Ae({ data: e = {
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
					n === "events" && L(c.resourceId) && s[c.resourceId] && (c.resourceId = s[c.resourceId]), n === "events" && L(c.recurringEventId) && s[c.recurringEventId] && (c.recurringEventId = s[c.recurringEventId]), i[n].set(t, {
						...c,
						id: t
					}), o.push({
						$phantomId: r,
						id: t
					});
				}
				for (let e of r.updated || []) {
					let t = { ...e };
					n === "events" && L(t.resourceId) && s[t.resourceId] && (t.resourceId = s[t.resourceId], o.push({
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
var je = class extends n {
	constructor(e, t = {}) {
		super(), this.project = e, this.serializeDate = t.serializeDate ?? ((e) => e.toISOString()), this.transport = t.transport ?? ke(t), this.autoSyncDelay = t.autoSyncDelay ?? 800, this.status = "idle", this.lastError = null, this._inflight = null, this._queued = !1, this._timer = null, this._unsub = null, t.autoSync && this.setAutoSync(!0);
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
				resources: Oe(t?.resources),
				events: Oe(t?.events)
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
}, Me = "http://www.w3.org/2000/svg", Ne = /* @__PURE__ */ new Set([
	"svg",
	"path",
	"g",
	"circle",
	"rect",
	"line",
	"polyline"
]), Pe = /* @__PURE__ */ new Set([
	"value",
	"checked",
	"disabled",
	"selected",
	"indeterminate",
	"readOnly",
	"multiple"
]), Fe = /* @__PURE__ */ new Set([
	"opacity",
	"zIndex",
	"flex",
	"flexGrow",
	"flexShrink",
	"fontWeight",
	"lineHeight",
	"order"
]);
function Ie(e, t) {
	for (let n of t) n != null && n !== !1 && n !== !0 && (Array.isArray(n) ? Ie(e, n) : n instanceof Node ? e.appendChild(n) : e.appendChild(document.createTextNode(String(n))));
	return e;
}
function Le(e, t) {
	for (let [n, r] of Object.entries(t)) r != null && r !== !1 && (n.startsWith("--") ? e.style.setProperty(n, String(r)) : e.style[n] = typeof r == "number" && !Fe.has(n) ? `${r}px` : r);
}
function H(e, t = null, ...n) {
	let r = Ne.has(e), i = r ? document.createElementNS(Me, e) : document.createElement(e), a = null;
	if (t) for (let [e, n] of Object.entries(t)) n != null && n !== !1 && (e === "class" ? r ? i.setAttribute("class", n) : i.className = n : e === "style" ? typeof n == "string" ? i.style.cssText = n : Le(i, n) : e === "dataset" ? Object.assign(i.dataset, n) : e === "html" ? i.innerHTML = n : e.startsWith("on") && typeof n == "function" ? i.addEventListener(e.slice(2).toLowerCase(), n) : Pe.has(e) ? (a ??= []).push([e, n]) : i.setAttribute(e, n === !0 ? "" : String(n)));
	if (Ie(i, n), a) for (let [e, t] of a) i[e] = t;
	return i;
}
function U(e, t = 16) {
	return H("svg", {
		viewBox: "0 0 16 16",
		width: t,
		height: t,
		"aria-hidden": "true"
	}, H("path", {
		d: e,
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "1.6",
		"stroke-linecap": "round",
		"stroke-linejoin": "round"
	}));
}
var W = {
	prev: "M10 3 5 8l5 5",
	next: "M6 3l5 5-5 5",
	close: "M4 4l8 8M12 4l-8 8",
	undo: "M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2",
	redo: "M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2",
	minus: "M3 8h10",
	plus: "M3 8h10M8 3v10",
	sidebar: "M2.5 3.5h11v9h-11zM6 3.5v9",
	repeat: "M11.5 2.5 13.5 4.5 11.5 6.5M13.5 4.5H5a2.5 2.5 0 0 0-2.5 2.5v.5M4.5 13.5 2.5 11.5 4.5 9.5M2.5 11.5H11a2.5 2.5 0 0 0 2.5-2.5v-.5"
};
function Re(e) {
	let t = document.createElement("template");
	return t.innerHTML = e, t.content;
}
var ze = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, Be = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ze[e]);
function Ve(e, t) {
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
var He = (e) => typeof requestAnimationFrame == "function" ? requestAnimationFrame(e) : setTimeout(e, 16), Ue = (e) => typeof cancelAnimationFrame == "function" ? cancelAnimationFrame(e) : clearTimeout(e), We = {
	day: "Day",
	week: "Week",
	month: "Month",
	timeline: "Timeline"
};
function Ge(e) {
	let t = () => e.sync().catch(() => {});
	return e.status === "syncing" || e.status === "loading" ? H("span", { class: "ck-sync ck-sync-busy" }, e.status === "loading" ? "Loading…" : "Saving…") : e.status === "error" ? H("button", {
		type: "button",
		class: "ck-sync ck-sync-error",
		title: e.lastError?.message,
		"data-key": "sync",
		onClick: t
	}, "Not saved · Retry") : e.hasChanges ? H("button", {
		type: "button",
		class: "ck-sync ck-sync-dirty",
		title: "Save changes (Ctrl+S)",
		"data-key": "sync",
		onClick: t
	}, "Unsaved changes") : H("span", { class: "ck-sync ck-sync-ok" }, "All changes saved");
}
function Ke(e) {
	let { project: t, config: n } = e, r = typeof n.toolbarItems == "function" ? n.toolbarItems(e) : n.toolbarItems, i = (e, t, n, r, i = {}) => H("button", {
		type: "button",
		class: "ck-icon-btn",
		"aria-label": t,
		title: t,
		"data-key": e,
		onClick: r,
		...i
	}, U(n));
	return [
		n.showSidebar && i("sidebar", "Toggle sidebar", W.sidebar, () => e.toggleSidebar(), {
			class: "ck-icon-btn ck-sidebar-toggle",
			"aria-pressed": String(e.sidebarOpen)
		}),
		H("button", {
			type: "button",
			class: "ck-btn",
			"data-key": "today",
			onClick: () => e.today()
		}, "Today"),
		H("div", { class: "ck-nav" }, i("prev", "Previous", W.prev, () => e.prev()), i("next", "Next", W.next, () => e.next())),
		H("h2", {
			class: "ck-title",
			"aria-live": "polite"
		}, e.title),
		H("span", { class: "ck-spacer" }),
		r,
		e.crudManager && Ge(e.crudManager),
		H("div", { class: "ck-group" }, i("undo", t.canUndo ? `Undo ${t.undoLabel?.toLowerCase()} (Ctrl+Z)` : "Nothing to undo", W.undo, () => t.undo(), {
			disabled: !t.canUndo,
			"aria-label": "Undo"
		}), i("redo", t.canRedo ? `Redo ${t.redoLabel?.toLowerCase()} (Ctrl+Shift+Z)` : "Nothing to redo", W.redo, () => t.redo(), {
			disabled: !t.canRedo,
			"aria-label": "Redo"
		})),
		e.view === "timeline" && H("div", { class: "ck-group" }, i("zoom-out", "Zoom out", W.minus, () => e.setZoom(e.zoom / 1.5)), i("zoom-in", "Zoom in", W.plus, () => e.setZoom(e.zoom * 1.5))),
		n.views.length > 1 && H("div", {
			class: "ck-segmented",
			role: "tablist",
			"aria-label": "View"
		}, n.views.map((t) => H("button", {
			type: "button",
			role: "tab",
			"aria-selected": String(e.view === t),
			class: e.view === t ? "ck-on" : "",
			"data-key": `view-${t}`,
			onClick: () => e.setView(t)
		}, We[t] || t)))
	];
}
//#endregion
//#region src/ui/content.js
var G = {
	cobalt: "#2b59c3",
	teal: "#138a7e",
	plum: "#8a4fb0",
	amber: "#b7760d",
	rose: "#c2416b",
	green: "#3e8e41",
	coral: "#d0613c",
	slate: "#5a6b85"
}, K = (e) => e && G[e] || e || null, qe = () => {
	let e = U(W.repeat, 11);
	return e.setAttribute("class", "ck-icon-repeat"), e.removeAttribute("aria-hidden"), e.setAttribute("role", "img"), e.setAttribute("aria-label", "Repeats"), e;
};
function q(e, t, n, r = !1) {
	let { locale: i, config: a } = e, o = e.resourcesById.get(t.resourceId) || null, s = t.allDay ? "" : n === "month" ? A(t.start, i) : j(t.start, t.end, i);
	if (a.eventRenderer) {
		let r = a.eventRenderer({
			event: t,
			resource: o,
			view: n,
			timeText: s,
			calendar: e
		});
		if (r != null && r !== !1) return typeof r == "string" ? Re(r) : r;
	}
	let c = t.isOccurrence || t.recurringEventId, l = t.title || "Untitled";
	if (r) {
		let e = s ? H("span", { class: "ck-ev-time" }, n === "month" ? s : A(t.start, i)) : null;
		return H("span", { class: "ck-ev-line" }, n === "month" && e, H("span", { class: "ck-ev-title" }, l), n !== "month" && e, c && qe());
	}
	let u = a.showResourceInEvents && o && n !== "timeline";
	return [
		H("span", { class: "ck-ev-title" }, l, c && qe()),
		s && H("span", { class: "ck-ev-time" }, s),
		u && H("span", { class: "ck-ev-meta" }, o.name)
	];
}
function Je(e, t) {
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
		H("div", { class: "ck-tooltip-title" }, t.title || "Untitled"),
		H("div", { class: "ck-tooltip-row" }, o),
		t.rrule && H("div", { class: "ck-tooltip-row" }, I(t.rrule, t.start, n)),
		r && H("div", { class: "ck-tooltip-row" }, r.name),
		s.map((e) => {
			let n = (e.options || []).find((n) => (n?.value ?? n) === t[e.name]);
			return H("div", { class: "ck-tooltip-row" }, H("span", { class: "ck-tooltip-label" }, e.label), " ", String(n?.label ?? t[e.name]));
		}),
		c && H("div", { class: "ck-tooltip-notes" }, c)
	];
}
function J(e, t, n, r, i) {
	let a = ["ck-event", n];
	return t.instanceId === e.selectedId && a.push("ck-selected"), {
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
			n.key === "Enter" && (n.preventDefault(), e.openEditor(t));
		},
		onFocus: () => e.setSelected(t.instanceId)
	};
}
//#endregion
//#region src/ui/Sidebar.js
function Ye(e) {
	let { locale: t, config: n, project: r } = e, i = `${e.date.getFullYear()}-${e.date.getMonth()}`;
	e._miniKey !== i && (e._miniKey = i, e._miniCursor = _(e.date));
	let a = e._miniCursor, o = p(a, -((a.getDay() - n.weekStartsOn + 7) % 7)), s = Array.from({ length: 42 }, (e, t) => p(o, t)), c = /* @__PURE__ */ new Date(), { start: l, end: u } = e.range, f = `${r.version}|${+o}`;
	if (e._busyKey !== f) {
		let t = /* @__PURE__ */ new Set();
		for (let e of r.getEventsInRange(o, p(o, 42))) for (let n = d(e.start); n < e.end; n = p(n, 1)) t.add(+n);
		e._busyKey = f, e._busy = t;
	}
	let m = (t) => {
		e._miniCursor = h(a, t), e.refresh();
	};
	return H("div", { class: "ck-mini" }, H("div", { class: "ck-mini-head" }, H("span", { class: "ck-mini-title" }, k(a, {
		month: "long",
		year: "numeric"
	}, t)), H("button", {
		type: "button",
		class: "ck-icon-btn",
		"aria-label": "Previous month",
		"data-key": "mini-prev",
		onClick: () => m(-1)
	}, U(W.prev, 14)), H("button", {
		type: "button",
		class: "ck-icon-btn",
		"aria-label": "Next month",
		"data-key": "mini-next",
		onClick: () => m(1)
	}, U(W.next, 14))), H("div", { class: "ck-mini-grid" }, s.slice(0, 7).map((e) => H("span", {
		class: "ck-mini-dow",
		"aria-hidden": "true"
	}, k(e, { weekday: "narrow" }, t))), s.map((n) => {
		let r = ["ck-mini-day"];
		return n.getMonth() !== a.getMonth() && r.push("ck-other-month"), n >= l && n < u && r.push("ck-in-range"), v(n, c) && r.push("ck-today"), e._busy.has(+n) && r.push("ck-busy"), H("button", {
			type: "button",
			class: r.join(" "),
			"aria-label": k(n, { dateStyle: "full" }, t),
			"data-key": `mini-${+n}`,
			onClick: () => e.setDate(n)
		}, n.getDate());
	})));
}
function Xe(e) {
	let t = e.project.resources;
	if (!t.length) return null;
	let n = e.hiddenResources, r = n.size === 0;
	return H("div", { class: "ck-filter" }, H("div", { class: "ck-filter-head" }, H("span", null, e.config.resourceLabel), H("button", {
		type: "button",
		class: "ck-link",
		"data-key": "filter-all",
		onClick: () => e.setHiddenResources(r ? t.map((e) => e.id) : [])
	}, r ? "Hide all" : "Show all")), H("ul", { class: "ck-filter-list" }, t.map((t) => H("li", null, H("label", {
		class: "ck-filter-item",
		style: { "--ck-res": K(t.color) || "var(--ck-accent)" }
	}, H("input", {
		type: "checkbox",
		checked: !n.has(t.id),
		"data-key": `res-${t.id}`,
		onChange: () => e.setResourceVisible(t.id, n.has(t.id))
	}), H("span", {
		class: "ck-filter-box",
		"aria-hidden": "true"
	}), H("span", { class: "ck-filter-name" }, t.name))))));
}
function Ze(e) {
	let t = typeof e.config.sidebarItems == "function" ? e.config.sidebarItems(e) : e.config.sidebarItems;
	return [
		Ye(e),
		Xe(e),
		t
	];
}
//#endregion
//#region src/ui/EventEditor.js
var Qe = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
], $e = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR"
], et = {
	1: "first",
	2: "second",
	3: "third",
	4: "fourth",
	"-1": "last"
}, tt = {
	DAILY: "days",
	WEEKLY: "weeks",
	MONTHLY: "months",
	YEARLY: "years"
};
function nt(e) {
	let t = Math.ceil(e.getDate() / 7), n = e.getDate() + 7 > m(e.getFullYear(), e.getMonth());
	return t >= 5 || n && t === 4 ? -1 : t;
}
function rt(e, t) {
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
	return a.freq = r.freq === "DAILY" && i.length === 5 && $e.every((e) => i.some((t) => t.code === e)) ? "WEEKDAYS" : r.freq, r.freq === "WEEKLY" && i.length && (a.byDay = i.map((e) => e.code)), r.freq === "MONTHLY" && i.length && i[0].n && (a.monthly = "weekday"), r.count ? (a.ends = "count", a.count = r.count) : r.until && (a.ends = "until", a.until = D(r.until)), a;
}
function it(e, t) {
	if (e.freq === "NONE") return null;
	let n = e.freq === "WEEKDAYS" ? {
		freq: "DAILY",
		byDay: $e
	} : {
		freq: e.freq,
		interval: Math.max(1, +e.interval || 1)
	};
	if (e.freq === "WEEKLY" && (n.byDay = e.byDay.length ? e.byDay : [O[t.getDay()]]), e.freq === "MONTHLY" && e.monthly === "weekday" && (n.byDay = [`${nt(t)}${O[t.getDay()]}`]), e.ends === "count" && (n.count = Math.max(1, +e.count || 1)), e.ends === "until" && e.until) {
		let t = c(e.until);
		t && (t.setHours(23, 59, 59), n.until = t);
	}
	return P(n);
}
var at = (e) => new Date(2024, 0, 7 + O.indexOf(e)), ot = class {
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
			repeat: rt(a.rrule, a.start),
			extra: s
		}, this.el = H("div", {
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
			rrule: t ? it(e.repeat, t) : null
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
		i && (i.textContent = t && n ? I(t, n, this.cal.locale) : "");
		let a = this.el.querySelector("button[type=\"submit\"]");
		a && (a.disabled = !!e), this.el.querySelector(".ck-editor")?.style.setProperty("--ck-ev", this.swatch());
	}
	swatch() {
		let e = this.form;
		return e.color ? G[e.color] || e.color : this.cal.colorOf({
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
		if (t || this.cal.readOnly) return;
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
		Ve(this.el, () => this.el.replaceChildren(this.build())), this.updateDerived();
	}
	build() {
		let e = this.cal, { locale: t, readOnly: n } = e, r = e.project.resources, i = this.form, { instance: a, isNew: o } = this.state, { start: s, rrule: c } = this.values, l = a && (a.isOccurrence || a.rrule), u = i.repeat, d = (e, t, n = "") => H("label", { class: `ck-field${n}` }, H("span", null, e), t), f = (e, t) => H("input", {
			"data-key": e,
			...t
		}), p = (e, t, n, r) => H("select", {
			"data-key": e,
			value: t,
			onChange: (e) => r(e.target.value)
		}, n.map(([e, t]) => H("option", { value: e }, t))), m = H("div", { class: "ck-field-row ck-when" }, d("Starts", H("span", { class: "ck-inline" }, f("startDate", {
			type: "date",
			value: i.startDate,
			required: !0,
			onChange: (e) => this.changeStartDate(e.target.value)
		}), !i.allDay && f("startTime", {
			type: "time",
			value: i.startTime,
			required: !0,
			onInput: (e) => this.set({ startTime: e.target.value })
		}))), d("Ends", H("span", { class: "ck-inline" }, f("endDate", {
			type: "date",
			value: i.endDate,
			required: !0,
			onInput: (e) => this.set({ endDate: e.target.value })
		}), !i.allDay && f("endTime", {
			type: "time",
			value: i.endTime,
			required: !0,
			onInput: (e) => this.set({ endTime: e.target.value })
		}))), H("label", { class: "ck-check" }, f("allDay", {
			type: "checkbox",
			checked: i.allDay,
			onChange: (e) => this.set({ allDay: e.target.checked }, !0)
		}), "All day")), h = H("div", {
			class: "ck-swatches",
			role: "radiogroup",
			"aria-label": "Color"
		}, H("button", {
			type: "button",
			role: "radio",
			"data-key": "color-auto",
			"aria-checked": String(!i.color),
			class: `ck-swatch ck-swatch-auto${i.color ? "" : " ck-on"}`,
			title: "Use the assignee's color",
			"aria-label": "Assignee's color",
			onClick: () => this.set({ color: "" }, !0)
		}), Object.entries(G).map(([e, t]) => H("button", {
			type: "button",
			role: "radio",
			"data-key": `color-${e}`,
			"aria-checked": String(i.color === e),
			"aria-label": e,
			title: e,
			class: `ck-swatch${i.color === e ? " ck-on" : ""}`,
			style: { background: t },
			onClick: () => this.set({ color: e }, !0)
		}))), g = H("div", { class: "ck-field-row" }, r.length > 0 && d("Assigned to", p("resourceId", i.resourceId, [["", "Unassigned"], ...r.map((e) => [String(e.id), e.name])], (e) => this.set({ resourceId: e }))), H("div", { class: "ck-field" }, H("span", null, "Color"), h)), _ = H("fieldset", { class: "ck-repeat" }, d("Repeat", p("freq", u.freq, [
			["NONE", "Does not repeat"],
			["DAILY", "Daily"],
			["WEEKDAYS", "Every weekday (Mon–Fri)"],
			["WEEKLY", "Weekly"],
			["MONTHLY", "Monthly"],
			["YEARLY", "Yearly"]
		], (e) => this.setRepeat({ freq: e }))), tt[u.freq] && d("Every", H("span", { class: "ck-inline" }, f("interval", {
			type: "number",
			min: "1",
			max: "99",
			value: u.interval,
			onInput: (e) => {
				u.interval = e.target.value, this.updateDerived();
			}
		}), H("span", { class: "ck-unit" }, tt[u.freq])), " ck-field-narrow"), u.freq === "WEEKLY" && H("div", { class: "ck-field ck-field-wide" }, H("span", null, "On"), H("div", { class: "ck-daypicks" }, Qe.map((e) => {
			let n = u.byDay.includes(e);
			return H("button", {
				type: "button",
				"data-key": `day-${e}`,
				"aria-pressed": String(n),
				class: `ck-daypick${n ? " ck-on" : ""}`,
				title: k(at(e), { weekday: "long" }, t),
				onClick: () => this.setRepeat({ byDay: n ? u.byDay.filter((t) => t !== e) : [...u.byDay, e] })
			}, k(at(e), { weekday: "narrow" }, t));
		}))), u.freq === "MONTHLY" && s && d("On", p("monthly", u.monthly, [["day", `Day ${s.getDate()}`], ["weekday", `The ${et[nt(s)]} ${k(s, { weekday: "long" }, t)}`]], (e) => this.setRepeat({ monthly: e })), " ck-field-wide"), u.freq !== "NONE" && d("Ends", H("span", { class: "ck-inline" }, p("ends", u.ends, [
			["never", "Never"],
			["count", "After"],
			["until", "On date"]
		], (e) => this.setRepeat({ ends: e })), u.ends === "count" && [f("count", {
			type: "number",
			min: "1",
			max: "999",
			value: u.count,
			onInput: (e) => {
				u.count = e.target.value, this.updateDerived();
			}
		}), H("span", { class: "ck-unit" }, "times")], u.ends === "until" && f("until", {
			type: "date",
			value: u.until,
			onInput: (e) => {
				u.until = e.target.value, this.updateDerived();
			}
		})), " ck-field-wide"), H("p", {
			class: "ck-hint",
			"aria-live": "polite"
		}, c && s ? I(c, s, t) : "")), v = e.config.editorFields, y = v.length > 0 && H("div", { class: "ck-field-grid" }, v.map((e) => {
			let t = i.extra[e.name], n = (t) => {
				i.extra[e.name] = t.target.value;
			}, r;
			return r = e.type === "select" ? H("select", {
				"data-key": `x-${e.name}`,
				value: String(t ?? ""),
				onChange: n
			}, H("option", { value: "" }, "—"), (e.options || []).map((e) => H("option", { value: String(e?.value ?? e) }, String(e?.label ?? e)))) : e.type === "textarea" ? H("textarea", {
				"data-key": `x-${e.name}`,
				rows: "2",
				value: t ?? "",
				onInput: n
			}) : f(`x-${e.name}`, {
				type: e.type || "text",
				placeholder: e.placeholder,
				value: t ?? "",
				onInput: n
			}), d(e.label, r, e.type === "textarea" ? " ck-field-wide" : "");
		})), b = d("Notes", H("textarea", {
			"data-key": "notes",
			rows: "3",
			placeholder: "Agenda, links, call notes",
			value: i.notes,
			onInput: (e) => i.notes = e.target.value
		}), " ck-field-wide");
		return H("form", {
			class: "ck-dialog ck-editor",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": o ? "New event" : "Edit event",
			novalidate: !0,
			style: { "--ck-ev": this.swatch() },
			onSubmit: (e) => this.submit(e),
			onKeydown: (e) => {
				e.key === "Escape" && (e.stopPropagation(), this.onClose());
			}
		}, H("div", { class: "ck-editor-head" }, H("input", {
			class: "ck-editor-title",
			"data-key": "title",
			placeholder: "Add a title",
			"aria-label": "Title",
			value: i.title,
			disabled: n,
			onInput: (e) => i.title = e.target.value
		}), H("button", {
			type: "button",
			class: "ck-icon-btn",
			"aria-label": "Close",
			onClick: () => this.onClose()
		}, U(W.close))), H("div", { class: "ck-editor-body" }, m, H("p", {
			class: "ck-error",
			role: "alert",
			hidden: !0
		}), g, _, y, b), H("div", { class: "ck-dialog-foot" }, !o && !n && H("button", {
			type: "button",
			class: "ck-btn ck-btn-danger",
			onClick: () => this.onDelete(a)
		}, l ? "Delete…" : "Delete"), H("span", { class: "ck-spacer" }), H("button", {
			type: "button",
			class: "ck-btn",
			onClick: () => this.onClose()
		}, "Cancel"), !n && H("button", {
			type: "submit",
			class: "ck-btn ck-btn-primary"
		}, o ? "Create event" : "Save changes")));
	}
	destroy() {
		this.el.remove();
	}
};
function st(e, { kind: t = "edit", allowThis: n = !0 } = {}) {
	return new Promise((r) => {
		let i = n ? "this" : "future", a = t === "delete" ? "Delete" : "Change", o, s = (e) => {
			o.remove(), r(e);
		}, c = (e, t) => H("label", null, H("input", {
			type: "radio",
			name: "ck-scope",
			checked: i === e,
			onChange: () => i = e
		}), ` ${t}`), l = H("form", {
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
		}, H("h2", { class: "ck-dialog-title" }, `${a} recurring event`), H("div", { class: "ck-scope-options" }, n && c("this", "This event"), c("future", "This and following events"), c("all", "All events in the series")), H("div", { class: "ck-dialog-foot" }, H("span", { class: "ck-spacer" }), H("button", {
			type: "button",
			class: "ck-btn",
			onClick: () => s(null)
		}, "Cancel"), H("button", {
			type: "submit",
			class: `ck-btn ${t === "delete" ? "ck-btn-danger-solid" : "ck-btn-primary"}`
		}, t === "delete" ? "Delete" : "Save")));
		o = H("div", {
			class: "ck-overlay",
			onPointerdown: (e) => e.target === e.currentTarget && s(null)
		}, l), e.appendChild(o), setTimeout(() => l.querySelector("input:checked")?.focus(), 0);
	});
}
//#endregion
//#region src/core/layout.js
function ct(e, t, n, { minDurationMinutes: r = 20 } = {}) {
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
function Y(e, t, n) {
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
function lt(e) {
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
function X(e, t) {
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
function Z(e, { onStart: t, onMove: n, onEnd: r, onCancel: i, threshold: a = 4, scrollEl: o = null } = {}) {
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
var ut = 24, dt = (e) => e.allDay || e.end - e.start >= 864e5, ft = class {
	constructor(e) {
		this.cal = e, this.el = H("div", { class: "ck-tg" }), this.scrollEl = H("div", {
			class: "ck-tg-scroll",
			onScroll: () => this._top = this.scrollEl.scrollTop
		}), this._top = null, this.colEls = [], this.ghost = null;
	}
	render() {
		let e = this.cal, { config: t, instances: n, locale: r, readOnly: i } = e, a = e.range.days, o = a.length, { hourHeight: s, dayStartHour: c, dayEndHour: l, workingHours: u, workingDays: d } = t;
		this.days = a, this.n = o, this.rowStart = a[0], this.winStartMin = c * 60, this.winEndMin = l * 60;
		let f = (e) => this.px(e), p = /* @__PURE__ */ new Date(), m = [], h = [];
		for (let e of n) (dt(e) ? m : h).push(e);
		let g = Y(m, this.rowStart, o), _ = H("div", { class: "ck-tg-head" }, H("div", { class: "ck-tg-gutter" }), a.map((t) => H("button", {
			type: "button",
			class: `ck-tg-dayhead${v(t, p) ? " ck-today" : ""}${t.getDay() === 0 || t.getDay() === 6 ? " ck-weekend" : ""}`,
			title: k(t, { dateStyle: "full" }, r),
			onClick: () => e.goToDay(t)
		}, H("span", { class: "ck-tg-dow" }, k(t, { weekday: o === 1 ? "long" : "short" }, r)), H("span", { class: "ck-tg-dom" }, t.getDate())))), y = Math.max(1, g.laneCount) * ut + 8;
		this.allDayInner = H("div", {
			class: "ck-tg-allday-inner",
			style: { height: y }
		}, g.segments.map((t) => {
			let n = t.item, r = [
				"ck-event-bar",
				t.continuesBefore && "ck-cont-before",
				t.continuesAfter && "ck-cont-after"
			].filter(Boolean).join(" ");
			return H("div", J(e, n, r, {
				left: `calc(${t.startCol / o * 100}% + 2px)`,
				width: `calc(${(t.endCol - t.startCol + 1) / o * 100}% - 4px)`,
				top: t.lane * ut + 4
			}, (e) => this.onAllDayDown(e, n, "move")), q(e, n, "week", !0), n.allDay && !i && !t.continuesAfter && H("span", {
				class: "ck-resize ck-resize-x ck-resize-end",
				onPointerdown: (e) => this.onAllDayDown(e, n, "end")
			}));
		})), this.allDayEl = H("div", {
			class: "ck-tg-allday-cells",
			style: { height: Math.min(y, 104) },
			onPointerdown: (e) => this.onAllDayBackgroundDown(e),
			onDblclick: (e) => this.onAllDayDoubleClick(e)
		}, a.map((e, t) => H("div", {
			class: "ck-tg-allday-cell",
			style: {
				left: `${t / o * 100}%`,
				width: `${100 / o}%`
			}
		})), this.allDayInner);
		let b = H("div", { class: "ck-tg-allday" }, H("div", { class: "ck-tg-gutter ck-tg-allday-label" }, "All day"), this.allDayEl), C = [];
		for (let e = c + 1; e < l; e++) C.push(H("span", {
			class: "ck-tg-hour",
			style: { top: f(e * 60) }
		}, k(new Date(2e3, 0, 1, e), { hour: "numeric" }, r)));
		let w = x(p);
		this.colEls = a.map((t) => {
			let n = S(t, this.winStartMin), r = S(t, this.winEndMin), a = ct(h.filter((e) => e.start < r && e.end > n), n, r), c = !d.includes(t.getDay()), l = v(t, p);
			return H("div", {
				class: `ck-tg-col${c ? " ck-offday" : ""}${l ? " ck-today" : ""}`,
				onPointerdown: (e) => this.onColumnDown(e),
				onDblclick: (e) => this.onColumnDoubleClick(e)
			}, !c && u && u.start * 60 > this.winStartMin && H("div", {
				class: "ck-nonwork",
				style: {
					top: 0,
					height: f(u.start * 60)
				}
			}), !c && u && u.end * 60 < this.winEndMin && H("div", {
				class: "ck-nonwork",
				style: {
					top: f(u.end * 60),
					bottom: 0
				}
			}), a.map((t) => {
				let n = t.item, r = t.startMin / 60 * s, a = Math.max(18, (t.endMin - t.startMin) / 60 * s - 2), c = a < 38;
				return H("div", J(e, n, `ck-event-timed${c ? " ck-short" : ""}`, {
					top: r,
					height: a,
					left: `calc(${t.left * 100}% + 1px)`,
					width: `calc(${t.width * 100}% - ${t.left + t.width >= .999 ? 6 : 2}px)`
				}, (e) => this.onTimedDown(e, n, "move")), q(e, n, o === 1 ? "day" : "week", c), !i && !t.continuesBefore && H("span", {
					class: "ck-resize ck-resize-y ck-resize-start",
					onPointerdown: (e) => this.onTimedDown(e, n, "start")
				}), !i && !t.continuesAfter && H("span", {
					class: "ck-resize ck-resize-y ck-resize-end",
					onPointerdown: (e) => this.onTimedDown(e, n, "end")
				}));
			}), l && w >= this.winStartMin && w <= this.winEndMin && H("div", {
				class: "ck-now",
				style: { top: f(w) }
			}));
		});
		let T = H("div", {
			class: "ck-tg-body",
			style: { height: (this.winEndMin - this.winStartMin) / 60 * s }
		}, H("div", { class: "ck-tg-gutter ck-tg-hours" }, C), H("div", { class: "ck-tg-cols" }, this.colEls));
		this.ghost = null, this.el.style.setProperty("--ck-hour", `${s}px`), this.scrollEl.replaceChildren(T), this.el.replaceChildren(_, b, this.scrollEl), this.scrollEl.scrollTop = this._top ?? Math.max(0, (t.scrollToHour - c) * s - 8);
		let E = this.scrollEl.offsetWidth - this.scrollEl.clientWidth;
		_.style.paddingRight = b.style.paddingRight = `${E > 0 ? E : 0}px`;
	}
	px(e) {
		return (e - this.winStartMin) / 60 * this.cal.config.hourHeight;
	}
	hitTimed(e, t) {
		let n = this.colEls, r = n.findIndex((t) => {
			let n = t.getBoundingClientRect();
			return e >= n.left && e < n.right;
		});
		r === -1 && (r = e < n[0].getBoundingClientRect().left ? 0 : this.n - 1);
		let i = n[r].getBoundingClientRect(), a = T(this.winStartMin + (t - i.top) / this.cal.config.hourHeight * 60, this.winStartMin, this.winEndMin);
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
		this.ghost = H("div", {
			class: `ck-event ck-event-timed ck-ghost${t ? "" : " ck-ghost-create"}`,
			style: {
				top: this.px(a),
				height: Math.max(16, this.px(o) - this.px(a) - 2),
				left: 1,
				width: "calc(100% - 6px)",
				"--ck-ev": t ? this.cal.colorOf(t) : "var(--ck-accent)"
			}
		}, H("span", { class: "ck-ev-title" }, t?.title || "New event"), H("span", { class: "ck-ev-time" }, j(e.start, e.end, this.cal.locale))), this.colEls[n].appendChild(this.ghost);
	}
	showAllDayGhost(e, t) {
		this.clearGhost();
		let n = Y([{
			start: e.start,
			end: e.end
		}], this.rowStart, this.n).segments[0];
		n && (this.ghost = H("div", {
			class: "ck-event ck-event-bar ck-ghost",
			style: {
				left: `calc(${n.startCol / this.n * 100}% + 2px)`,
				width: `calc(${(n.endCol - n.startCol + 1) / this.n * 100}% - 4px)`,
				top: 4,
				"--ck-ev": t ? this.cal.colorOf(t) : "var(--ck-accent)"
			}
		}, H("span", { class: "ck-ev-title" }, t?.title || "New event")), this.allDayInner.appendChild(this.ghost));
	}
	onTimedDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, a = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let { snapMinutes: o } = r.config, s = this.hitTimed(e.clientX, e.clientY), c = (S(s.day, s.minutes) - t.start) / i, l = (t.end - t.start) / i, u = null;
		Z(e, {
			scrollEl: this.scrollEl,
			onStart: () => !r.readOnly && a.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (r.readOnly) return;
				let i = this.hitTimed(e.clientX, e.clientY), { start: a, end: s } = t;
				n === "move" ? (a = S(i.day, C(i.minutes - c, o)), s = f(a, l)) : n === "end" ? (s = S(i.day, C(i.minutes, o)), s < f(a, o) && (s = f(a, o))) : (a = S(i.day, C(i.minutes, o)), a > f(s, -o) && (a = f(s, -o))), u = {
					start: a,
					end: s
				}, this.showTimedGhost(u, t);
			},
			onEnd: async (e, i) => {
				if (this.clearGhost(), a.classList.remove("ck-is-dragging"), !i) return r.eventClick(t, e);
				u && (+u.start != +t.start || +u.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: u.start,
						end: u.end
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
		if (e.button !== 0 || t.readOnly || e.pointerType === "touch" || e.target.closest(".ck-event")) return;
		let { snapMinutes: n } = t.config, r = this.hitTimed(e.clientX, e.clientY), i = w(r.minutes, n), a = null;
		Z(e, {
			scrollEl: this.scrollEl,
			onMove: (e) => {
				let t = C(this.hitTimed(e.clientX, e.clientY).minutes, n);
				a = {
					start: S(r.day, Math.min(i, t)),
					end: S(r.day, Math.max(i + n, t))
				}, this.showTimedGhost(a, null);
			},
			onEnd: (e, n) => {
				this.clearGhost(), n && a && t.openCreate({
					start: a.start,
					end: a.end,
					allDay: !1
				});
			},
			onCancel: () => this.clearGhost()
		});
	}
	onColumnDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event")) return;
		let n = this.hitTimed(e.clientX, e.clientY), r = w(n.minutes, 30);
		t.openCreate({
			start: S(n.day, r),
			end: S(n.day, r + t.config.defaultEventDuration),
			allDay: !1
		});
	}
	onAllDayDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, i = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let a = this.hitAllDay(e.clientX), o = null;
		Z(e, {
			onStart: () => !r.readOnly && i.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (r.readOnly) return;
				let i = this.hitAllDay(e.clientX), { start: s, end: c } = t;
				if (n === "move") s = p(t.start, i - a), c = p(t.end, i - a);
				else if (t.allDay) {
					let e = y(t.start, this.rowStart);
					c = p(this.rowStart, Math.max(i, e) + 1);
				}
				o = {
					start: s,
					end: c
				}, this.showAllDayGhost(o, t);
			},
			onEnd: async (e, a) => {
				if (this.clearGhost(), i.classList.remove("ck-is-dragging"), !a) return r.eventClick(t, e);
				o && (+o.start != +t.start || +o.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: o.start,
						end: o.end
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
		Z(e, {
			onMove: (e) => {
				let t = this.hitAllDay(e.clientX);
				r = {
					start: p(this.rowStart, Math.min(n, t)),
					end: p(this.rowStart, Math.max(n, t) + 1)
				}, this.showAllDayGhost(r, null);
			},
			onEnd: (e, n) => {
				this.clearGhost(), n && r && t.openCreate({
					start: r.start,
					end: r.end,
					allDay: !0
				});
			},
			onCancel: () => this.clearGhost()
		});
	}
	onAllDayDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event")) return;
		let n = this.hitAllDay(e.clientX);
		t.openCreate({
			start: p(this.rowStart, n),
			end: p(this.rowStart, n + 1),
			allDay: !0
		});
	}
	destroy() {
		this.el.remove();
	}
}, pt = (e, t, n = 7) => {
	let r = d(e), i = n === 1 ? r : p(r, -((r.getDay() - t + 7) % 7));
	return Array.from({ length: n }, (e, t) => p(i, t));
}, Q = 22, mt = 28, ht = class {
	constructor(e) {
		this.cal = e, this.headEl = H("div", { class: "ck-month-head" }), this.gridEl = H("div", {
			class: "ck-month-grid",
			onPointerdown: (e) => this.onGridDown(e),
			onDblclick: (e) => this.onGridDoubleClick(e)
		}), this.el = H("div", { class: "ck-month" }, this.headEl, this.gridEl), this.cellEls = /* @__PURE__ */ new Map();
	}
	render() {
		let e = this.cal, { instances: t, locale: n, readOnly: r, config: i } = e, { gridStart: a, weeks: o, month: s } = e.range.grid;
		this.gridStart = a, this.weeks = o;
		let c = /* @__PURE__ */ new Date(), l = this.gridEl.clientHeight, u = l ? l / o : 110, d = Math.max(1, Math.floor((u - mt - 4) / Q));
		this.headEl.replaceChildren(...Array.from({ length: 7 }, (e, t) => H("div", { class: "ck-month-dow" }, k(p(a, t), { weekday: "short" }, n)))), this.cellEls = /* @__PURE__ */ new Map();
		let f = [];
		for (let l = 0; l < o; l++) {
			let o = p(a, l * 7), { segments: u, laneCount: m } = Y(t, o, 7), h = m > d ? d - 1 : d, g = Array(7).fill(0);
			for (let e of u) if (e.lane >= h) for (let t = e.startCol; t <= e.endCol; t++) g[t]++;
			let _ = Array.from({ length: 7 }, (t, r) => {
				let a = p(o, r), l = ["ck-month-cell"];
				a.getMonth() !== s && l.push("ck-other-month"), i.workingDays.includes(a.getDay()) || l.push("ck-offday");
				let u = H("div", { class: l.join(" ") }, H("button", {
					type: "button",
					class: `ck-month-date${v(a, c) ? " ck-today" : ""}`,
					title: k(a, { dateStyle: "full" }, n),
					onClick: () => e.goToDay(a)
				}, a.getDate() === 1 ? k(a, {
					month: "short",
					day: "numeric"
				}, n) : a.getDate()), g[r] > 0 && H("button", {
					type: "button",
					class: "ck-more",
					style: { top: mt + h * Q },
					onClick: () => e.goToDay(a)
				}, `${g[r]} more`));
				return this.cellEls.set(+a, u), u;
			}), y = u.filter((e) => e.lane < h).map((t) => {
				let n = t.item, i = n.allDay || n.end - n.start >= 864e5 || t.endCol > t.startCol, a = [
					i ? "ck-event-bar" : "ck-event-line",
					t.continuesBefore && "ck-cont-before",
					t.continuesAfter && "ck-cont-after"
				].filter(Boolean).join(" ");
				return H("div", J(e, n, a, {
					left: `calc(${t.startCol / 7 * 100}% + 3px)`,
					width: `calc(${(t.endCol - t.startCol + 1) / 7 * 100}% - 6px)`,
					top: mt + t.lane * Q
				}, (e) => this.onEventDown(e, n, "move")), q(e, n, "month", !0), i && n.allDay && !r && !t.continuesAfter && H("span", {
					class: "ck-resize ck-resize-x ck-resize-end",
					onPointerdown: (e) => this.onEventDown(e, n, "end")
				}));
			});
			f.push(H("div", { class: "ck-month-row" }, _, H("div", { class: "ck-month-events" }, y)));
		}
		this.gridEl.style.gridTemplateRows = `repeat(${o}, 1fr)`, this.gridEl.replaceChildren(...f);
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
		let a = this.hitDay(e.clientX, e.clientY), o = null, s = () => {
			this.highlight(null), i.classList.remove("ck-is-dragging");
		};
		Z(e, {
			onStart: () => !r.readOnly && i.classList.add("ck-is-dragging"),
			onMove: (e) => {
				if (r.readOnly) return;
				let i = this.hitDay(e.clientX, e.clientY), { start: s, end: c } = t;
				if (n === "move") {
					let e = y(i, a);
					s = p(t.start, e), c = p(t.end, e);
				} else c = p(d(i < d(t.start) ? t.start : i), 1);
				o = {
					start: s,
					end: c
				}, this.highlight(o);
			},
			onEnd: async (e, i) => {
				if (s(), !i) return r.eventClick(t, e);
				o && (+o.start != +t.start || +o.end != +t.end) && await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: {
						start: o.start,
						end: o.end
					}
				});
			},
			onCancel: s
		});
	}
	onGridDown(e) {
		let t = this.cal;
		if (e.button !== 0 || t.readOnly || e.pointerType === "touch" || e.target.closest(".ck-event, .ck-more, .ck-month-date")) return;
		let n = this.hitDay(e.clientX, e.clientY), r = null;
		Z(e, {
			onMove: (e) => {
				let t = this.hitDay(e.clientX, e.clientY);
				r = {
					start: n < t ? n : t,
					end: p(n < t ? t : n, 1)
				}, this.highlight(r);
			},
			onEnd: (e, n) => {
				this.highlight(null), n && r && t.openCreate({
					start: r.start,
					end: r.end,
					allDay: !0
				});
			},
			onCancel: () => this.highlight(null)
		});
	}
	onGridDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event, .ck-more, .ck-month-date")) return;
		let n = this.hitDay(e.clientX, e.clientY), r = (t.config.workingHours?.start ?? 9) * 60;
		t.openCreate({
			start: S(n, r),
			end: S(n, r + t.config.defaultEventDuration),
			allDay: !1
		});
	}
	destroy() {
		this.el.remove();
	}
};
function gt(e, t) {
	let n = new Date(e.getFullYear(), e.getMonth(), 1), r = p(n, -((n.getDay() - t + 7) % 7)), i = new Date(e.getFullYear(), e.getMonth() + 1, 0);
	return {
		gridStart: r,
		weeks: Math.ceil((y(i, r) + 1) / 7),
		month: e.getMonth()
	};
}
//#endregion
//#region src/ui/views/TimelineView.js
var _t = 300, $ = "__unassigned__", vt = (e = "") => e.split(/\s+/).filter(Boolean).slice(0, 2).map((e) => e[0].toUpperCase()).join(""), yt = class {
	constructor(e) {
		this.cal = e, this.innerEl = H("div", { class: "ck-tl-inner" }), this.scrollEl = H("div", {
			class: "ck-tl-scroll",
			onScroll: () => this.onScroll()
		}, this.innerEl), this.el = H("div", { class: "ck-tl" }, this.scrollEl), this.rows = [], this.ghost = null, this._scrolledFor = null, this._zoom = null, this._window = null, this._rafId = 0, this._pos = null;
	}
	get pxPerHour() {
		return this.cal.zoom;
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
		let e = this.cal, { config: t, instances: n, locale: r } = e, { workingHours: i, workingDays: a, rowHeight: o, laneHeight: s, resourceColumnWidth: c, timelineDays: l } = t;
		this.rangeStart = e.range.start, this.rangeEnd = e.range.end, this.days = l;
		let u = this.pxPerHour, d = l * 24 * u;
		this.totalW = d;
		let f = /* @__PURE__ */ new Date(), m = /* @__PURE__ */ new Map();
		for (let e of n) {
			let t = e.resourceId == null ? $ : e.resourceId;
			m.has(t) || m.set(t, []), m.get(t).push(e);
		}
		let h = e.visibleResources.map((e) => ({
			key: e.id,
			resource: e,
			items: m.get(e.id) || []
		}));
		m.has($) && t.showUnassigned && h.unshift({
			key: $,
			resource: null,
			items: m.get($)
		});
		let g = 0;
		for (let e of h) {
			let { placed: t, laneCount: n } = lt(e.items);
			e.placed = t, e.height = Math.max(o, n * s + 8), e.top = g, g += e.height;
		}
		this.rows = h, this.offsets = h.map((e) => e.top);
		let _ = g, y = [
			1,
			2,
			3,
			6,
			12,
			24
		].find((e) => e * u >= 48) || 24, b = Array.from({ length: l }, (e, t) => p(this.rangeStart, t)), x = [];
		if (y < 24) for (let e = 0; e < l * 24; e += y) x.push(e);
		let S = H("div", { class: "ck-tl-header" }, H("div", { class: "ck-tl-corner" }, t.resourceLabel), H("div", {
			class: "ck-tl-scale",
			style: { width: d }
		}, H("div", { class: "ck-tl-days" }, b.map((t) => H("button", {
			type: "button",
			class: `ck-tl-day${v(t, f) ? " ck-today" : ""}`,
			style: { width: 24 * u },
			onClick: () => e.goToDay(t)
		}, H("span", { class: "ck-tl-day-label" }, k(t, {
			weekday: "short",
			day: "numeric",
			month: u < 12 ? void 0 : "short"
		}, r))))), x.length > 0 && H("div", { class: "ck-tl-hours" }, x.map((e) => H("span", {
			class: "ck-tl-hour",
			style: {
				left: e * u,
				width: y * u
			}
		}, k(new Date(2e3, 0, 1, e % 24), { hour: "numeric" }, r)))))), C = H("div", {
			class: "ck-tl-bg",
			style: {
				left: c,
				width: d
			}
		}, b.map((e, t) => {
			let n = t * 24 * u;
			return a.includes(e.getDay()) ? i ? [H("div", {
				class: "ck-nonwork",
				style: {
					left: n,
					width: i.start * u
				}
			}), H("div", {
				class: "ck-nonwork",
				style: {
					left: n + i.end * u,
					width: (24 - i.end) * u
				}
			})] : null : H("div", {
				class: "ck-nonwork ck-nonwork-day",
				style: {
					left: n,
					width: 24 * u
				}
			});
		}), f >= this.rangeStart && f < this.rangeEnd && H("div", {
			class: "ck-now ck-now-v",
			style: { left: this.xOf(f) }
		}));
		this.rowsLayer = H("div", { class: "ck-tl-rows" }), this.bodyEl = H("div", {
			class: "ck-tl-body",
			style: {
				height: Math.max(_, 1),
				"--ck-tick": `${y * u}px`,
				"--ck-day": `${24 * u}px`
			},
			onPointerdown: (e) => this.onLaneDown(e),
			onDblclick: (e) => this.onLaneDoubleClick(e)
		}, C, this.rowsLayer, h.length === 0 && H("div", { class: "ck-empty" }, "No people to show. Add someone, or turn people back on in the filter.")), this.ghost = null, this.el.style.setProperty("--ck-res-w", `${c}px`), this.innerEl.style.width = `${c + d}px`;
		let w = this.scrollEl, T = this._pos ? this._pos.left : w.scrollLeft, E = this._pos ? this._pos.top : w.scrollTop;
		if (this._zoom && this._zoom !== u) {
			let e = w.clientWidth - c;
			T = Math.max(0, (T + e / 2) / this._zoom * u - e / 2);
		}
		if (this._zoom = u, this.innerEl.replaceChildren(S, this.bodyEl), w.scrollTop = E, w.scrollLeft = T, this._scrolledFor !== +this.rangeStart) {
			this._scrolledFor = +this.rangeStart;
			let e = f >= this.rangeStart && f < this.rangeEnd ? f : this.rangeStart, t = new Date(e.getFullYear(), e.getMonth(), e.getDate(), i?.start ?? 8);
			w.scrollLeft = Math.max(0, this.xOf(t) - 24);
		}
		this._pos = {
			left: w.scrollLeft,
			top: w.scrollTop
		}, this._window = null, this.renderRows();
	}
	onScroll() {
		this.el.isConnected && (this._pos = {
			left: this.scrollEl.scrollLeft,
			top: this.scrollEl.scrollTop
		}), !this._rafId && (this._rafId = He(() => {
			this._rafId = 0, this.renderRows();
		}));
	}
	renderRows() {
		let e = this.cal, { rows: t, offsets: n } = this, r = this.scrollEl, i = r.scrollTop, a = r.clientHeight || 800, o = r.scrollLeft, s = Math.max(0, X(n, i - _t)), c = Math.max(s, X(n, i + a + _t)), l = `${s}:${c}:${Math.round(o)}`;
		if (this._window === l) return;
		this._window = l;
		let { laneHeight: u, resourceColumnWidth: d } = e.config, f = this.rangeStart, p = this.rangeEnd, m = [];
		for (let n = s; n <= c && n < t.length; n++) {
			let r = t[n], i = r.resource, a = H("div", {
				class: "ck-tl-res",
				style: { "--ck-res": K(i?.color) || "var(--ck-muted)" }
			}, i ? [
				H("span", {
					class: "ck-avatar",
					"aria-hidden": "true"
				}, i.avatar ? H("img", {
					src: i.avatar,
					alt: ""
				}) : vt(i.name)),
				H("span", { class: "ck-tl-res-text" }, H("span", { class: "ck-tl-res-name" }, i.name), i.role && H("span", { class: "ck-tl-res-role" }, i.role)),
				H("span", {
					class: "ck-tl-res-count",
					title: `${r.items.length} this period`
				}, r.items.length || "")
			] : H("span", { class: "ck-tl-res-text" }, H("span", { class: "ck-tl-res-name" }, "Unassigned"), H("span", { class: "ck-tl-res-role" }, "Drag onto a person to assign"))), s = r.placed.map(({ item: t, lane: n }) => {
				let r = t.start < f ? f : t.start, i = t.end > p ? p : t.end, a = this.xOf(r), s = Math.max(6, this.xOf(i) - a - 2), c = Math.max(0, Math.min(o - a, s - 60)), l = [
					"ck-event-tl",
					s < 56 && "ck-narrow",
					t.start < f && "ck-cont-before",
					t.end > p && "ck-cont-after"
				].filter(Boolean).join(" ");
				return H("div", J(e, t, l, {
					left: d + a + 1,
					width: s,
					top: 4 + n * u,
					height: u - 4,
					paddingLeft: c ? c + 10 : null
				}, (e) => this.onEventDown(e, t, "move")), q(e, t, "timeline", u < 40), !e.readOnly && t.start >= f && H("span", {
					class: "ck-resize ck-resize-x ck-resize-start",
					onPointerdown: (e) => this.onEventDown(e, t, "start")
				}), !e.readOnly && t.end <= p && H("span", {
					class: "ck-resize ck-resize-x ck-resize-end",
					onPointerdown: (e) => this.onEventDown(e, t, "end")
				}));
			});
			m.push(H("div", {
				class: `ck-tl-row${r.key === $ ? " ck-tl-unassigned" : ""}`,
				style: {
					top: r.top,
					height: r.height
				},
				dataset: { row: String(n) }
			}, a, s));
		}
		this.rowsLayer.replaceChildren(...m);
	}
	hit(e, t) {
		let n = this.bodyEl.getBoundingClientRect(), r = this.cal.config.resourceColumnWidth, i = T(e - n.left - r, 0, this.totalW), a = T(X(this.offsets, t - n.top), 0, Math.max(0, this.rows.length - 1));
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
		let { laneHeight: r, resourceColumnWidth: i } = this.cal.config;
		this.ghost = H("div", {
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
		}, H("span", { class: "ck-ev-title" }, t?.title || "New event"), H("span", { class: "ck-ev-time" }, j(e.start, e.end, this.cal.locale))), this.bodyEl.appendChild(this.ghost);
	}
	onEventDown(e, t, n) {
		if (e.button !== 0) return;
		e.stopPropagation();
		let r = this.cal, a = e.currentTarget.closest(".ck-event");
		r.hideTooltip(), r.setSelected(t.instanceId);
		let { snapMinutes: o } = r.config, s = this.hit(e.clientX, e.clientY).time - t.start, c = t.end - t.start, l = this.rows.findIndex((e) => e.key === (t.resourceId ?? $)), u = null, d = (e) => {
			for (let n of this.rowsLayer.querySelectorAll(".ck-event")) n.dataset.instance === t.instanceId && n.classList.toggle("ck-is-dragging", e);
			a.classList.toggle("ck-is-dragging", e);
		};
		Z(e, {
			scrollEl: this.scrollEl,
			onStart: () => !r.readOnly && d(!0),
			onMove: (e) => {
				if (r.readOnly) return;
				let a = this.hit(e.clientX, e.clientY), { start: f, end: p } = t, m = l, h = t.resourceId;
				n === "move" ? (f = this.snapTime(new Date(a.time - s)), p = new Date(f.getTime() + c), m = a.rowIdx, h = this.resourceIdOf(a.row)) : n === "end" ? (p = this.snapTime(a.time), p - f < o * 6e4 && (p = new Date(f.getTime() + o * i))) : (f = this.snapTime(a.time), p - f < o * 6e4 && (f = new Date(p.getTime() - o * i))), u = {
					start: f,
					end: p,
					rowIdx: m,
					resourceId: h
				}, this.showGhost(u, t), d(!0);
			},
			onEnd: async (e, i) => {
				if (this.clearGhost(), d(!1), !i) return r.eventClick(t, e);
				if (!u || +u.start == +t.start && +u.end == +t.end && u.resourceId === t.resourceId) return;
				let a = {
					start: u.start,
					end: u.end
				};
				u.resourceId !== t.resourceId && (a.resourceId = u.resourceId), await r.commitChange({
					type: n === "move" ? "move" : "resize",
					instance: t,
					changes: a
				});
			},
			onCancel: () => {
				this.clearGhost(), d(!1);
			}
		});
	}
	onLaneDown(e) {
		let t = this.cal;
		if (e.button !== 0 || t.readOnly || e.pointerType === "touch" || e.target.closest(".ck-event, .ck-tl-res") || !this.rows.length) return;
		let { snapMinutes: n } = t.config, r = this.hit(e.clientX, e.clientY), a = new Date(this.rangeStart.getTime() + w((r.time - this.rangeStart) / i, n) * i), o = null;
		Z(e, {
			scrollEl: this.scrollEl,
			onMove: (e) => {
				let t = this.snapTime(this.hit(e.clientX, e.clientY).time), s = t < a ? t : a, c = t < a ? new Date(a.getTime() + n * i) : t;
				c <= s && (c = new Date(s.getTime() + n * i)), o = {
					start: s,
					end: c,
					rowIdx: r.rowIdx,
					resourceId: this.resourceIdOf(r.row)
				}, this.showGhost(o, null);
			},
			onEnd: (e, n) => {
				this.clearGhost(), n && o && t.openCreate({
					start: o.start,
					end: o.end,
					allDay: !1,
					resourceId: o.resourceId
				});
			},
			onCancel: () => this.clearGhost()
		});
	}
	onLaneDoubleClick(e) {
		let t = this.cal;
		if (t.readOnly || e.target.closest(".ck-event, .ck-tl-res") || !this.rows.length) return;
		let n = this.hit(e.clientX, e.clientY), r = new Date(this.rangeStart.getTime() + w((n.time - this.rangeStart) / i, 30) * i);
		t.openCreate({
			start: r,
			end: new Date(r.getTime() + t.config.defaultEventDuration * i),
			allDay: !1,
			resourceId: this.resourceIdOf(n.row)
		});
	}
	destroy() {
		this.el.remove();
	}
}, bt = [
	"day",
	"week",
	"month",
	"timeline"
], xt = G.cobalt, St = {
	view: "week",
	views: bt,
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
	cls: ""
};
function Ct(e, t, n) {
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
var wt = class extends n {
	constructor(e = {}) {
		super();
		let { appendTo: t, project: n, crudManager: r, listeners: i, date: a, ...o } = e;
		if (this.config = {
			...St,
			...o
		}, this.project = n instanceof De ? n : new De(n || {}), this._ownsCrud = !1, r instanceof je) this.crudManager = r;
		else if (r) {
			let { autoLoad: e = !0, autoSync: t = !0, ...n } = r;
			this.crudManager = new je(this.project, {
				autoSync: t,
				...n
			}), this._ownsCrud = !0, e && this.crudManager.load().catch(() => {});
		} else this.crudManager = null;
		for (let [e, t] of Object.entries(i || {})) this.on(e, t);
		if (this._view = bt.includes(this.config.view) ? this.config.view : "week", this._date = d(a && c(a) || /* @__PURE__ */ new Date()), this.hiddenResources = /* @__PURE__ */ new Set(), this.sidebarOpen = !0, this.zoom = this.config.timelineHourWidth, this.selectedId = null, this._views = {}, this._editor = null, this._modal = 0, this._tipTimer = 0, this._rafId = 0, this._cacheKey = null, this.toolbarEl = H("div", { class: "ck-toolbar" }), this.sidebarEl = H("aside", { class: "ck-sidebar" }), this.viewEl = H("div", { class: "ck-view" }), this.tooltipEl = H("div", {
			class: "ck-tooltip",
			role: "tooltip",
			hidden: !0
		}), this.el = H("div", {
			class: "ck-root",
			tabindex: "-1",
			onKeydown: (e) => this._onKeyDown(e),
			onPointerdown: (e) => {
				this.hideTooltip(), e.target.closest(".ck-event, .ck-overlay") || this.setSelected(null);
			}
		}, this.toolbarEl, H("div", { class: "ck-main" }, this.sidebarEl, this.viewEl), this.tooltipEl), this.tooltipEl.hidden = !0, this._offProject = this.project.on("change", () => this.refresh()), this._offCrud = this.crudManager ? this.crudManager.on("status", () => this.refresh()) : null, this._clock = setInterval(() => this.refresh(), 6e4), typeof ResizeObserver < "u") {
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
		Ue(this._rafId), clearInterval(this._clock), clearTimeout(this._tipTimer), this._ro?.disconnect(), this._offProject?.(), this._offCrud?.(), this._ownsCrud && this.crudManager.destroy(), this._editor?.destroy(), this.el.remove(), this.emit("destroy"), this._listeners.clear();
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
		return !bt.includes(e) || e === this._view ? this : (this._view = e, this.emit("viewChange", {
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
		let { view: t, date: n } = this;
		return t === "day" ? this.setDate(p(n, e)) : t === "month" ? this.setDate(h(n, e)) : t === "timeline" ? this.setDate(p(n, e * this.config.timelineDays)) : this.setDate(p(n, e * 7));
	}
	next() {
		return this.shift(1);
	}
	prev() {
		return this.shift(-1);
	}
	today() {
		return this.setDate(/* @__PURE__ */ new Date());
	}
	goToDay(e) {
		return this.setDate(e), this.config.views.includes("day") && this.setView("day"), this;
	}
	setConfig(e) {
		return Object.assign(this.config, e), "timelineHourWidth" in e && (this.zoom = e.timelineHourWidth), "view" in e && (this._view = e.view), this._cacheKey = null, this.renderNow();
	}
	setZoom(e) {
		return this.zoom = T(e, 6, 180), this.renderNow();
	}
	toggleSidebar(e = !this.sidebarOpen) {
		return this.sidebarOpen = e, this.renderNow();
	}
	setResourceVisible(e, t) {
		return t ? this.hiddenResources.delete(e) : this.hiddenResources.add(e), this._cacheKey = null, this.renderNow();
	}
	setHiddenResources(e) {
		return this.hiddenResources = new Set(e), this._cacheKey = null, this.renderNow();
	}
	refresh() {
		return this._rafId ||= He(() => {
			this._rafId = 0, this._render();
		}), this;
	}
	renderNow() {
		return this._rafId &&= (Ue(this._rafId), 0), this._render(), this;
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
	openCreate(e) {
		if (this.readOnly) return this;
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
		return K(e.color) || K(this.resourcesById.get(e.resourceId)?.color) || xt;
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
		this.openEditor(e);
	}
	async commitChange({ type: e, instance: t, changes: n = {}, allowThis: r = !0 }) {
		if (this.readOnly) return !1;
		let i = {
			type: e,
			event: t,
			changes: n,
			project: this.project,
			calendar: this
		};
		for (let e of [...this._listeners.get("beforeEventChange") || []]) if (await e(i) === !1) return !1;
		let a = "all";
		if (t?.isOccurrence && (this._modal++, a = await st(this.el, {
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
		if (t.pointerType === "touch" || document.body.classList.contains("ck-body-dragging") || this._editor) return;
		clearTimeout(this._tipTimer);
		let { clientX: n, clientY: r } = t;
		this._tipTimer = setTimeout(() => {
			let t = this.tooltipEl;
			t.replaceChildren(...[Je(this, e)].flat(2).filter(Boolean)), t.style.setProperty("--ck-ev", this.colorOf(e)), t.style.left = `${Math.min(n + 14, window.innerWidth - 300)}px`, t.style.top = `${Math.min(r + 16, window.innerHeight - 180)}px`, t.hidden = !1;
		}, 450);
	}
	hideTooltip() {
		clearTimeout(this._tipTimer), this.tooltipEl && !this.tooltipEl.hidden && (this.tooltipEl.hidden = !0);
	}
	_computeRange() {
		let { view: e, date: t } = this, { weekStartsOn: n, timelineDays: r } = this.config;
		if (e === "day") return {
			start: t,
			end: p(t, 1),
			days: [t]
		};
		if (e === "month") {
			let e = gt(t, n);
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
		let i = pt(t, n, 7);
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
		}, r) : e === "month" ? k(t, {
			month: "long",
			year: "numeric"
		}, r) : Ct(n.start, p(n.end, -1), r);
	}
	_getView(e) {
		let t = e;
		return this._views[t] || (e === "month" ? this._views[t] = new ht(this) : e === "timeline" ? this._views[t] = new yt(this) : this._views[t] = new ft(this)), this._views[t];
	}
	_render() {
		if (!this.el.isConnected && !this.el.parentNode) return;
		let { config: e, project: t } = this;
		this.range = this._computeRange();
		let n = t.resources;
		this.resourcesById = new Map(n.map((e) => [e.id, e])), this.visibleResources = n.filter((e) => !this.hiddenResources.has(e.id));
		let r = `${t.version}|${+this.range.start}|${+this.range.end}|${[...this.hiddenResources].join(",")}`;
		if (r !== this._cacheKey) {
			this._cacheKey = r;
			let e = this.hiddenResources;
			this.instances = t.getEventsInRange(this.range.start, this.range.end, { filter: e.size ? (t) => t.resourceId == null || !e.has(t.resourceId) : null }), this.selectedId && !this.instances.some((e) => e.instanceId === this.selectedId) && (this.selectedId = null);
		}
		this.title = this._computeTitle();
		let i = this.el;
		i.className = `ck-root${e.readOnly ? " ck-readonly" : ""}${e.cls ? ` ${e.cls}` : ""}`, i.dataset.theme = e.theme, i.style.height = typeof e.height == "number" ? `${e.height}px` : e.height, Ve(i, () => {
			this.toolbarEl.replaceChildren(...[Ke(this)].flat(2).filter(Boolean));
			let t = e.showSidebar && this.sidebarOpen;
			this.sidebarEl.hidden = !t, t && this.sidebarEl.replaceChildren(...[Ze(this)].flat(2).filter(Boolean));
		});
		let a = this._getView(this.view);
		this.viewEl.firstChild !== a.el && this.viewEl.replaceChildren(a.el), this.viewEl.dataset.view = this.view, a.render();
	}
	_openEditor(e) {
		this.hideTooltip(), this._editor?.destroy();
		let t = () => {
			this._editor?.destroy(), this._editor = null, this.el.focus({ preventScroll: !0 });
		}, n = new ot(this, e, {
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
		if (n && r === "z") e.preventDefault(), e.shiftKey ? this.project.redo() : this.project.undo();
		else if (n && r === "y") e.preventDefault(), this.project.redo();
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
export { wt as Calendar, je as CrudManager, St as DEFAULTS, G as EVENT_COLORS, n as Emitter, ot as EventEditor, De as Project, st as askScope, ke as createFetchTransport, Ae as createMemoryTransport, r as dates, I as describeRRule, Be as escapeHtml, me as expandRecurring, X as findRowIndex, H as h, L as isPhantomId, Y as layoutDayRow, lt as layoutLanes, ct as layoutTimeGridColumn, R as newPhantomId, ue as nthWeekdayOfMonth, pe as occurrenceStarts, M as parseByDay, N as parseRRule, K as resolveColor, P as stringifyRRule };

//# sourceMappingURL=chronokit.js.map