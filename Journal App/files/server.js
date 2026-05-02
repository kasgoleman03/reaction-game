/* ═══════════════════════════════════════════
   DAILY JOURNAL — SERVER
   Express + SQLite (better-sqlite3)
   ═══════════════════════════════════════════ */

const express = require("express");
const path    = require("path");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const app  = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));


/* ── Database setup ──
   Stored in a single file: journal.db (created automatically on first run).
   Schema:
     id         TEXT PRIMARY KEY    (UUID-ish, generated server-side)
     title      TEXT
     body       TEXT
     mood       TEXT                ('peaceful' | 'accomplished' | etc.)
     status     TEXT                ('draft' | 'published')
     created_at INTEGER             (ms epoch — when entry was started)
     updated_at INTEGER             (ms epoch — last save)
*/

const db = new Database(path.join(__dirname, "journal.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    mood       TEXT,
    status     TEXT NOT NULL DEFAULT 'draft',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);


/* ── Helpers ── */

function newId() {
  // Short, sortable, collision-resistant for a single-user app
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function rowToEntry(row) {
  return {
    id:        row.id,
    title:     row.title,
    body:      row.body,
    mood:      row.mood,
    status:    row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


/* ═══════════════════════════════════════════
   ROUTES
   ═══════════════════════════════════════════ */

/* List all entries (drafts + published), newest first */
app.get("/api/entries", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM entries ORDER BY updated_at DESC, id DESC")
    .all();
  res.json(rows.map(rowToEntry));
});


/* Get a single entry */
app.get("/api/entries/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM entries WHERE id = ?")
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(rowToEntry(row));
});


/* Create a new entry (always starts as a draft) */
app.post("/api/entries", (req, res) => {
  const now = Date.now();
  const id  = newId();

  const { title = "", body = "", mood = null } = req.body || {};

  db.prepare(`
    INSERT INTO entries (id, title, body, mood, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?)
  `).run(id, title, body, mood, now, now);

  const row = db.prepare("SELECT * FROM entries WHERE id = ?").get(id);
  res.status(201).json(rowToEntry(row));
});


/* Update an entry — used by auto-save and by the publish action */
app.patch("/api/entries/:id", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM entries WHERE id = ?")
    .get(req.params.id);

  if (!existing) return res.status(404).json({ error: "Not found" });

  const title  = req.body.title  !== undefined ? req.body.title  : existing.title;
  const body   = req.body.body   !== undefined ? req.body.body   : existing.body;
  const mood   = req.body.mood   !== undefined ? req.body.mood   : existing.mood;
  const status = req.body.status !== undefined ? req.body.status : existing.status;
  const now    = Date.now();

  db.prepare(`
    UPDATE entries
       SET title = ?, body = ?, mood = ?, status = ?, updated_at = ?
     WHERE id = ?
  `).run(title, body, mood, status, now, req.params.id);

  const row = db.prepare("SELECT * FROM entries WHERE id = ?").get(req.params.id);
  res.json(rowToEntry(row));
});


/* Delete an entry (used to discard empty drafts) */
app.delete("/api/entries/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM entries WHERE id = ?")
    .run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});


/* Beacon endpoint — sendBeacon can only POST, so we expose a dedicated
   path the editor's unload handler can hit synchronously. */
app.post("/api/entries/:id/beacon", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM entries WHERE id = ?")
    .get(req.params.id);

  if (!existing) return res.status(404).end();

  const title  = req.body.title  !== undefined ? req.body.title  : existing.title;
  const body   = req.body.body   !== undefined ? req.body.body   : existing.body;
  const mood   = req.body.mood   !== undefined ? req.body.mood   : existing.mood;
  const now    = Date.now();

  db.prepare(`
    UPDATE entries
       SET title = ?, body = ?, mood = ?, updated_at = ?
     WHERE id = ?
  `).run(title, body, mood, now, req.params.id);

  res.status(204).end();
});


/* ── Start ── */

app.listen(PORT, () => {
  console.log(`📓  Daily Journal running at http://localhost:${PORT}`);
});
