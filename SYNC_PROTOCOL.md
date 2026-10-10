# Sync protocol

`CrudManager` talks to your backend with two requests. Any server stack works (Node, PHP, Java, .NET, Python); you only need to accept and return the JSON shapes below. A working Express example lives in `examples/express-server.js`.

## 1. Load

`GET {loadUrl}` (query parameters from `crud.load(params)` are appended)

Response:

```json
{
  "success": true,
  "resources": [
    { "id": "r1", "name": "Maya Fernandes", "role": "Account executive", "color": "cobalt" }
  ],
  "events": [
    {
      "id": 101,
      "title": "Product demo: Globex",
      "start": "2026-10-05T04:30:00.000Z",
      "end": "2026-10-05T05:30:00.000Z",
      "allDay": false,
      "resourceId": "r1",
      "rrule": null,
      "exceptionDates": [],
      "customer": "Globex"
    }
  ]
}
```

`resources` and `events` may also be wrapped as `{ "rows": [...] }`. Omit a key to leave that store untouched.

## 2. Sync

`POST {syncUrl}` with a JSON body containing only what changed since the last successful sync. Resources are always listed before events so the server can resolve new resources first.

```json
{
  "resources": {
    "added": [{ "$phantomId": "_new_7", "name": "New hire" }]
  },
  "events": {
    "added": [
      { "$phantomId": "_new_8", "title": "Kickoff", "start": "…", "end": "…", "resourceId": "_new_7" }
    ],
    "updated": [
      { "id": 101, "start": "2026-10-05T05:30:00.000Z", "end": "2026-10-05T06:30:00.000Z" }
    ],
    "removed": [{ "id": 102 }]
  }
}
```

- **added** rows have no `id`; they carry a temporary `$phantomId`. A phantom id may also appear as another row's `resourceId` or `recurringEventId` in the same request; map it to the id you create.
- **updated** rows contain the `id` plus only the fields that changed.
- **removed** rows contain only the `id`.
- Dates are ISO-8601 in UTC by default. Change with `new CrudManager(project, { serializeDate: (d) => … })`.

Response: return the real ids for every added row, plus any fields the server changed or computed.

```json
{
  "success": true,
  "resources": { "rows": [{ "$phantomId": "_new_7", "id": 58 }] },
  "events": {
    "rows": [
      { "$phantomId": "_new_8", "id": 2051, "resourceId": 58 },
      { "id": 101, "updatedAt": "2026-10-09T12:00:00Z" }
    ],
    "removed": []
  }
}
```

The client swaps phantom ids for real ids everywhere: the records, references between them, the undo history and any edits made while the request was in flight. `removed` in a response lets the server delete records on the client (for example, when another user deleted them).

## Errors

Return a non-2xx status or `{ "success": false, "message": "Deal is locked" }`. The client keeps every change, shows "Not saved · Retry" in the toolbar and fires `syncFail`. Edits made during a failed request are merged with the failed batch and sent on the next attempt.

## Recurring events on the server

A recurring series is one row with an `rrule` (RFC 5545 subset: `FREQ`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`, `BYMONTHDAY`) and `exceptionDates` (local `YYYY-MM-DD` keys of skipped occurrences). An occurrence that was edited on its own is a normal row with `recurringEventId` (the series id) and `originalDateKey`. Store these fields as-is; the client expands occurrences itself.

## Not using REST?

Pass your own transport and keep the same shapes:

```js
new CrudManager(project, {
  transport: {
    load: (params) => myCrmSdk.schedule.get(params),
    sync: (changes) => myCrmSdk.schedule.applyChanges(changes),
  },
});
```
