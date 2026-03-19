import { Router } from 'express'
import { LocalGitService, getLocalGitService } from '../services/local-git.js'

const router = Router()

// POST /api/local-git/test — validate path is a git repo before saving
router.post('/test', (req, res) => {
  const { path: repoPath } = req.body
  if (!repoPath) {
    return res.status(400).json({ error: 'path is required' })
  }

  const service = new LocalGitService(repoPath)
  const result = service.testConnection()
  res.json(result)
})

// Middleware for :connectorId routes — resolves connector and attaches service
function resolveConnector(req, res, next) {
  const db = req.app.get('db')
  const service = getLocalGitService(db, req.params.connectorId)
  if (!service) {
    return res
      .status(404)
      .json({ error: 'Local Git connector not found or not enabled' })
  }
  req.localGit = service
  next()
}

// GET /api/local-git/:connectorId/repo
router.get('/:connectorId/repo', resolveConnector, (req, res) => {
  try {
    const repo = req.localGit.getRepository()
    res.json(repo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/local-git/:connectorId/files — directory listing
router.get('/:connectorId/files', resolveConnector, (req, res) => {
  try {
    const { path: dirPath } = req.query
    const tree = req.localGit.getTree(dirPath || '')
    res.json(tree)
  } catch (err) {
    res
      .status(err.message.includes('not allowed') ? 403 : 500)
      .json({ error: err.message })
  }
})

// GET /api/local-git/:connectorId/files/content
router.get('/:connectorId/files/content', resolveConnector, (req, res) => {
  try {
    const { path: filePath } = req.query
    if (!filePath) {
      return res.status(400).json({ error: 'path query parameter is required' })
    }
    const content = req.localGit.getFileContent(filePath)
    res.json(content)
  } catch (err) {
    res
      .status(err.message.includes('not allowed') ? 403 : 500)
      .json({ error: err.message })
  }
})

// GET /api/local-git/:connectorId/commits
router.get('/:connectorId/commits', resolveConnector, (req, res) => {
  try {
    const { count } = req.query
    const commits = req.localGit.getRecentCommits(
      count ? Number(count) : undefined,
    )
    res.json(commits)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
