const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

// ---- DATABASE (creates assessments.db next to this file) ----
const db = new Database(path.join(__dirname, "assessments.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS assessments (
    trainer    TEXT PRIMARY KEY COLLATE NOCASE,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const listAll = db.prepare("SELECT trainer, updated_at FROM assessments ORDER BY trainer");
const getOne  = db.prepare("SELECT data FROM assessments WHERE trainer = ?");
const upsert  = db.prepare(`
  INSERT INTO assessments (trainer, data, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(trainer) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);
const remove  = db.prepare("DELETE FROM assessments WHERE trainer = ?");

// ---- API ----
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/assessments", (req, res) => res.json(listAll.all()));

app.get("/api/assessments/:trainer", (req, res) => {
  const row = getOne.get(req.params.trainer.trim());
  row ? res.json(JSON.parse(row.data)) : res.status(404).json({ error: "Not found" });
});

app.put("/api/assessments/:trainer", (req, res) => {
  const name = req.params.trainer.trim();
  if (!name) return res.status(400).json({ error: "Trainer name required" });
  upsert.run(name, JSON.stringify(req.body), new Date().toISOString());
  res.json({ ok: true });
});

app.delete("/api/assessments/:trainer", (req, res) => {
  remove.run(req.params.trainer.trim());
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));