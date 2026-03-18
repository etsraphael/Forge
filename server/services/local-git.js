import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const MAX_FILE_SIZE = 1024 * 1024 // 1MB

/**
 * Run a git command in the given repo directory.
 * Uses execFileSync (array args) to prevent shell injection.
 */
function execGit(repoPath, args) {
  return execFileSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf-8',
    timeout: 10_000,
  }).trim()
}

/**
 * Resolve a relative path within a repo root, preventing traversal attacks.
 * Blocks access to the .git directory.
 */
function safePath(repoPath, relativePath) {
  const realRoot = fs.realpathSync(repoPath)
  const resolved = path.resolve(realRoot, relativePath || '')
  const realResolved = fs.realpathSync(resolved)

  if (
    realResolved !== realRoot &&
    !realResolved.startsWith(realRoot + path.sep)
  ) {
    throw new Error('Path traversal not allowed')
  }

  // Block .git directory access
  const relFromRoot = path.relative(realRoot, realResolved)
  if (relFromRoot === '.git' || relFromRoot.startsWith('.git' + path.sep)) {
    throw new Error('Access to .git directory is not allowed')
  }

  return realResolved
}

export class LocalGitService {
  constructor(repoPath) {
    this.repoPath = repoPath
  }

  testConnection() {
    try {
      if (!fs.existsSync(this.repoPath)) {
        return { valid: false, error: 'Path does not exist' }
      }
      if (!fs.statSync(this.repoPath).isDirectory()) {
        return { valid: false, error: 'Path is not a directory' }
      }
      execGit(this.repoPath, ['rev-parse', '--git-dir'])

      const repoName = path.basename(this.repoPath)
      let branch = ''
      try {
        branch = execGit(this.repoPath, ['branch', '--show-current'])
      } catch {
        branch = 'detached HEAD'
      }

      return { valid: true, repoName, branch }
    } catch (err) {
      return { valid: false, error: err.message || 'Not a git repository' }
    }
  }

  getRepository() {
    const repoName = path.basename(this.repoPath)

    let currentBranch
    try {
      currentBranch = execGit(this.repoPath, ['branch', '--show-current'])
    } catch {
      currentBranch = 'detached HEAD'
    }

    let remoteUrl = null
    try {
      remoteUrl = execGit(this.repoPath, ['remote', 'get-url', 'origin'])
    } catch {
      // No remote configured
    }

    let lastCommitDate = null
    try {
      lastCommitDate = execGit(this.repoPath, ['log', '-1', '--format=%aI'])
    } catch {
      // Empty repo
    }

    let totalCommits = 0
    try {
      totalCommits = parseInt(
        execGit(this.repoPath, ['rev-list', '--count', 'HEAD']),
        10,
      )
    } catch {
      // Empty repo
    }

    return {
      name: repoName,
      fullPath: this.repoPath,
      currentBranch,
      remoteUrl,
      lastCommitDate,
      totalCommits,
    }
  }

  getTree(dirPath = '') {
    const resolved = safePath(this.repoPath, dirPath)

    const entries = fs.readdirSync(resolved, { withFileTypes: true })
    const relBase = path.relative(fs.realpathSync(this.repoPath), resolved)

    return entries
      .filter((e) => e.name !== '.git')
      .map((e) => {
        const entryPath = relBase ? path.join(relBase, e.name) : e.name
        const type = e.isDirectory() ? 'dir' : 'file'
        let size = 0
        if (e.isFile()) {
          try {
            size = fs.statSync(path.join(resolved, e.name)).size
          } catch {
            // Permission denied or similar
          }
        }
        return { name: e.name, type, path: entryPath, size }
      })
  }

  getFileContent(filePath) {
    if (!filePath) throw new Error('filePath is required')

    const resolved = safePath(this.repoPath, filePath)
    const stat = fs.statSync(resolved)

    if (!stat.isFile()) {
      // It's a directory — return listing
      return {
        type: 'directory',
        entries: this.getTree(filePath),
      }
    }

    if (stat.size > MAX_FILE_SIZE) {
      return {
        type: 'file',
        name: path.basename(resolved),
        path: filePath,
        size: stat.size,
        content: null,
        error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB, limit is 1MB)`,
      }
    }

    // Binary detection: check for null bytes in first 8KB
    const buf = Buffer.alloc(Math.min(8192, stat.size))
    const fd = fs.openSync(resolved, 'r')
    try {
      fs.readSync(fd, buf, 0, buf.length, 0)
    } finally {
      fs.closeSync(fd)
    }

    if (buf.includes(0)) {
      return {
        type: 'file',
        name: path.basename(resolved),
        path: filePath,
        size: stat.size,
        content: null,
        binary: true,
      }
    }

    const content = fs.readFileSync(resolved, 'utf-8')
    return {
      type: 'file',
      name: path.basename(resolved),
      path: filePath,
      size: stat.size,
      content,
    }
  }

  getRecentCommits(count = 10) {
    let output
    try {
      output = execGit(this.repoPath, [
        'log',
        `--format=%H%n%s%n%an%n%aI`,
        `-n`,
        String(count),
      ])
    } catch {
      return []
    }

    if (!output) return []

    const lines = output.split('\n')
    const commits = []
    for (let i = 0; i + 3 < lines.length; i += 4) {
      commits.push({
        sha: lines[i].slice(0, 7),
        message: lines[i + 1],
        author: lines[i + 2],
        date: lines[i + 3],
      })
    }
    return commits
  }
}

/**
 * Create a LocalGitService from a stored connector ID.
 */
export function getLocalGitService(db, connectorId) {
  const row = db
    .prepare('SELECT * FROM provider_settings WHERE id = ?')
    .get(connectorId)
  if (!row) return null

  const config = JSON.parse(row.config || '{}')
  if (config.category !== 'repository' || row.provider !== 'local-git')
    return null
  if (!config.path) return null

  return new LocalGitService(config.path)
}

/**
 * Get the first enabled local-git connector's service, or null.
 */
export function getFirstLocalGitService(db) {
  const rows = db
    .prepare(
      'SELECT * FROM provider_settings WHERE enabled = 1 ORDER BY created_at ASC',
    )
    .all()
  for (const row of rows) {
    const config = JSON.parse(row.config || '{}')
    if (
      config.category === 'repository' &&
      row.provider === 'local-git' &&
      config.path
    ) {
      return new LocalGitService(config.path)
    }
  }
  return null
}
