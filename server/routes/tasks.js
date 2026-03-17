import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /api/tasks
router.get("/", (req, res) => {
  const db = req.app.get("db");
  const { project_id } = req.query;
  let tasks;
  if (project_id) {
    tasks = db
      .prepare("SELECT * FROM board_tasks WHERE project_id = ? ORDER BY column_id, sort_order ASC")
      .all(project_id);
  } else {
    tasks = db
      .prepare("SELECT * FROM board_tasks ORDER BY column_id, sort_order ASC")
      .all();
  }
  res.json(tasks);
});

// POST /api/tasks
router.post("/", (req, res) => {
  const { title, type = "automation", column_id = "ideas", priority = "medium", description = "", project_id = "default" } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const db = req.app.get("db");
  const id = uuidv4();

  // Place at end of target column
  const row = db
    .prepare("SELECT COUNT(*) as count FROM board_tasks WHERE column_id = ?")
    .get(column_id);
  const sort_order = row.count;

  db.prepare(
    "INSERT INTO board_tasks (id, title, type, column_id, priority, description, sort_order, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, title, type, column_id, priority, description, sort_order, project_id);

  const task = db.prepare("SELECT * FROM board_tasks WHERE id = ?").get(id);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id
router.patch("/:id", (req, res) => {
  const db = req.app.get("db");
  const { id } = req.params;

  const task = db.prepare("SELECT * FROM board_tasks WHERE id = ?").get(id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const allowed = ["title", "type", "column_id", "priority", "description", "sort_order"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(updates).length === 0) {
    return res.json(task);
  }

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), id];

  db.prepare(
    `UPDATE board_tasks SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`
  ).run(...values);

  const updated = db.prepare("SELECT * FROM board_tasks WHERE id = ?").get(id);
  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
  const db = req.app.get("db");
  db.prepare("DELETE FROM board_tasks WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// PUT /api/tasks/reorder — batch update column + order for multiple tasks
router.put("/reorder", (req, res) => {
  const { tasks } = req.body; // [{ id, column_id, sort_order }]
  if (!Array.isArray(tasks)) return res.status(400).json({ error: "tasks array required" });

  const db = req.app.get("db");
  const update = db.prepare(
    "UPDATE board_tasks SET column_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?"
  );
  const reorderAll = db.transaction(() => {
    for (const { id, column_id, sort_order } of tasks) {
      update.run(column_id, sort_order, id);
    }
  });
  reorderAll();
  res.status(204).end();
});

export default router;
