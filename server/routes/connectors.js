import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { GitHubService } from '../services/github.js'
import { LocalGitService } from '../services/local-git.js'

const router = Router()

// GET /api/connectors?category=llm|repository|external
router.get('/', (req, res) => {
  const db = req.app.get('db')
  const { category } = req.query
  const rows = db
    .prepare('SELECT * FROM provider_settings ORDER BY created_at ASC')
    .all()

  const connectors = rows.map((r) => ({
    ...r,
    config: JSON.parse(r.config || '{}'),
    enabled: r.enabled === 1,
  }))

  if (category) {
    return res.json(connectors.filter((c) => c.config.category === category))
  }
  res.json(connectors)
})

// POST /api/connectors
router.post('/', (req, res) => {
  const { provider, category, config = {}, enabled = true } = req.body
  if (!provider) return res.status(400).json({ error: 'provider is required' })
  if (!category) return res.status(400).json({ error: 'category is required' })

  const db = req.app.get('db')
  const id = uuidv4()
  const configJson = JSON.stringify({ ...config, category })

  db.prepare(
    "INSERT INTO provider_settings (id, provider, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
  ).run(id, provider, configJson, enabled ? 1 : 0)

  const row = db.prepare('SELECT * FROM provider_settings WHERE id = ?').get(id)
  res.status(201).json({
    ...row,
    config: JSON.parse(row.config),
    enabled: row.enabled === 1,
  })
})

// PATCH /api/connectors/:id
router.patch('/:id', (req, res) => {
  const db = req.app.get('db')
  const { id } = req.params

  const row = db.prepare('SELECT * FROM provider_settings WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Connector not found' })

  const existing = JSON.parse(row.config || '{}')
  const { provider, enabled, config } = req.body

  const newProvider = provider !== undefined ? provider : row.provider
  const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : row.enabled
  const newConfig = JSON.stringify(
    config !== undefined
      ? { ...config, category: existing.category }
      : existing,
  )

  db.prepare(
    "UPDATE provider_settings SET provider = ?, config = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(newProvider, newConfig, newEnabled, id)

  const updated = db
    .prepare('SELECT * FROM provider_settings WHERE id = ?')
    .get(id)
  res.json({
    ...updated,
    config: JSON.parse(updated.config),
    enabled: updated.enabled === 1,
  })
})

// GET /api/connectors/:id/status — live connection check
router.get('/:id/status', async (req, res) => {
  const db = req.app.get('db')
  const row = db
    .prepare('SELECT * FROM provider_settings WHERE id = ?')
    .get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Connector not found' })

  const config = JSON.parse(row.config || '{}')

  if (config.category === 'repository' && row.provider === 'github') {
    if (!config.token || !config.repo) {
      return res.json({
        status: 'error',
        detail: 'Missing token or repo in config',
      })
    }
    const service = new GitHubService(config.token, config.repo)
    const result = await service.testConnection()
    if (result.valid) {
      return res.json({
        status: 'online',
        detail: `Connected as @${result.user} to ${result.repoInfo.fullName}`,
      })
    }
    return res.json({ status: 'error', detail: result.error })
  }

  if (config.category === 'repository' && row.provider === 'local-git') {
    if (!config.path) {
      return res.json({ status: 'error', detail: 'Missing path in config' })
    }
    const service = new LocalGitService(config.path)
    const result = service.testConnection()
    if (result.valid) {
      return res.json({
        status: 'online',
        detail: `Local repo: ${result.repoName} (${result.branch})`,
      })
    }
    return res.json({ status: 'error', detail: result.error })
  }

  if (config.category === 'llm') {
    // For LLM connectors, try reaching the base URL
    try {
      const baseUrl = config.baseUrl || 'http://localhost:11434'
      const response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) {
        return res.json({ status: 'online', detail: `Reachable at ${baseUrl}` })
      }
      return res.json({
        status: 'offline',
        detail: `Not reachable at ${baseUrl}`,
      })
    } catch {
      return res.json({ status: 'offline', detail: 'Connection failed' })
    }
  }

  res.json({ status: 'offline', detail: 'Unknown connector type' })
})

// DELETE /api/connectors/:id
router.delete('/:id', (req, res) => {
  const db = req.app.get('db')
  db.prepare('DELETE FROM provider_settings WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
