import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// GET /api/projects
router.get('/', (req, res) => {
  const db = req.app.get('db')
  const projects = db
    .prepare('SELECT * FROM projects ORDER BY created_at ASC')
    .all()
  res.json(projects)
})

// POST /api/projects
router.post('/', (req, res) => {
  const { name, color = 'bg-primary' } = req.body
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required' })
  }

  const db = req.app.get('db')
  const id = uuidv4()
  db.prepare('INSERT INTO projects (id, name, color) VALUES (?, ?, ?)').run(
    id,
    name.trim(),
    color,
  )
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  res.status(201).json(project)
})

// PATCH /api/projects/:id
router.patch('/:id', (req, res) => {
  const db = req.app.get('db')
  const { id } = req.params

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  const allowed = ['name', 'color']
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k)),
  )

  if (Object.keys(updates).length === 0) {
    return res.json(project)
  }

  const setClauses = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ')
  const values = [...Object.values(updates), id]

  db.prepare(
    `UPDATE projects SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`,
  ).run(...values)

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  res.json(updated)
})

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params
  if (id === 'default') {
    return res.status(400).json({ error: 'Cannot delete the default project' })
  }

  const db = req.app.get('db')
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  res.status(204).end()
})

export default router
