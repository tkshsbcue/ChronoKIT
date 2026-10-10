// Minimal backend for the ChronoKit sync protocol (see SYNC_PROTOCOL.md).
// Run:  npm i express && node examples/express-server.js
// Replace the in-memory Maps with your CRM's database calls.

import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

const db = {
  resources: new Map([
    ['r1', { id: 'r1', name: 'Maya Fernandes', role: 'Account executive', color: 'cobalt' }],
    ['r2', { id: 'r2', name: 'Jonah Weiss', role: 'Account executive', color: 'teal' }],
  ]),
  events: new Map(),
};
let nextId = 1;

app.get('/api/schedule', (req, res) => {
  // e.g. filter by req.query.teamId here
  res.json({ success: true, resources: [...db.resources.values()], events: [...db.events.values()] });
});

app.post('/api/schedule/sync', (req, res) => {
  const idMap = {}; // phantom id -> real id, shared across stores
  const response = { success: true };
  const resolve = (v) => (typeof v === 'string' && v in idMap ? idMap[v] : v);

  try {
    for (const store of ['resources', 'events']) {
      const block = req.body[store];
      if (!block) continue;
      const rows = [];

      for (const { $phantomId, ...fields } of block.added || []) {
        const id = `${store === 'events' ? 'ev' : 'res'}_${nextId++}`;
        idMap[$phantomId] = id;
        if (store === 'events') {
          fields.resourceId = resolve(fields.resourceId);
          fields.recurringEventId = resolve(fields.recurringEventId);
        }
        db[store].set(id, { ...fields, id });
        rows.push({ $phantomId, id, ...(store === 'events' ? { resourceId: fields.resourceId } : {}) });
      }

      for (const row of block.updated || []) {
        const current = db[store].get(row.id);
        if (!current) continue; // deleted by someone else; you could return it in `removed`
        if ('resourceId' in row) row.resourceId = resolve(row.resourceId);
        db[store].set(row.id, { ...current, ...row });
      }

      for (const { id } of block.removed || []) db[store].delete(id);

      if (rows.length) response[store] = { rows };
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(3001, () => console.log('Schedule API on http://localhost:3001'));
