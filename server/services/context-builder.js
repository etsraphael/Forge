import { getFirstGitHubService } from './github.js'
import { getFirstLocalGitService } from './local-git.js'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const githubCache = {
  repo: { data: null, ts: 0 },
  commits: { data: null, ts: 0 },
  issues: { data: null, ts: 0 },
  prs: { data: null, ts: 0 },
}

const localGitCache = {
  repo: { data: null, ts: 0 },
  commits: { data: null, ts: 0 },
  tree: { data: null, ts: 0 },
}

const PREAMBLE_MINIMAL =
  'You are a helpful AI assistant in Forge, a project management dashboard. ' +
  "The user's task board and code repositories are available if needed — the user can ask about them.\n\n"

const PREAMBLE_FULL =
  'You are a helpful AI assistant integrated into Forge, a project management and automation dashboard. ' +
  "You have access to the user's task board (read and write) and connected code repositories (GitHub and/or local git). " +
  'Use this context to answer questions about tasks, issues, pull requests, code, and project structure. ' +
  'You can also create, update, and delete tasks on the board when the user asks. ' +
  'Be concise and specific when referencing items.\n\n'

const columnLabels = {
  'in-progress': 'In Progress',
  todo: 'To Do',
  review: 'Review',
  ideas: 'Ideas',
  shipped: 'Shipped',
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// --- Baseline context (always included with classification path) ---

async function buildBaselineContext(db) {
  const parts = []

  // Task board summary counts
  const counts = db
    .prepare(
      'SELECT column_id, COUNT(*) as count FROM board_tasks GROUP BY column_id',
    )
    .all()
  if (counts.length > 0) {
    const summary = counts
      .map((c) => `${c.count} ${columnLabels[c.column_id] || c.column_id}`)
      .join(', ')
    parts.push(`**Task Board:** ${summary}`)
  }

  // Repo identity (GitHub or local git)
  const github = getFirstGitHubService(db)
  if (github) {
    try {
      const repo = await github.getRepository()
      parts.push(
        `**Repository:** ${repo.fullName}` +
          (repo.description ? ` — ${repo.description}` : '') +
          (repo.language ? ` (${repo.language})` : ''),
      )
    } catch {
      // GitHub unavailable — fall through to local git
    }
  }
  if (!github) {
    const localGit = getFirstLocalGitService(db)
    if (localGit) {
      try {
        const repo = localGit.getRepository()
        parts.push(
          `**Repository:** ${repo.name} (${repo.currentBranch} branch)`,
        )
      } catch {
        // Local git unavailable
      }
    }
  }

  return parts.length > 0 ? parts.join('\n') + '\n\n' : ''
}

// --- Task context builders ---

function buildFilteredTaskContext(db) {
  const activeTasks = db
    .prepare(
      `SELECT id, title, type, column_id, priority, description
       FROM board_tasks
       WHERE column_id IN ('in-progress', 'todo', 'review')
       ORDER BY
         CASE column_id WHEN 'in-progress' THEN 1 WHEN 'todo' THEN 2 WHEN 'review' THEN 3 END,
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
         sort_order ASC
       LIMIT 20`,
    )
    .all()

  // Counts for excluded columns
  const excluded = db
    .prepare(
      `SELECT column_id, COUNT(*) as count FROM board_tasks
       WHERE column_id IN ('ideas', 'shipped') GROUP BY column_id`,
    )
    .all()

  if (activeTasks.length === 0 && excluded.length === 0) return ''

  const columns = {}
  for (const task of activeTasks) {
    const col = task.column_id
    if (!columns[col]) columns[col] = []
    columns[col].push(task)
  }

  let text = '## Your Task Board\n\n'
  for (const col of ['in-progress', 'todo', 'review']) {
    const colTasks = columns[col]
    if (!colTasks || colTasks.length === 0) continue

    text += `### ${columnLabels[col]} (${colTasks.length})\n`
    for (const t of colTasks) {
      let desc = ''
      if (t.priority === 'high' && t.description) {
        desc = ` — "${t.description.slice(0, 120)}${t.description.length > 120 ? '…' : ''}"`
      } else if (t.priority === 'medium' && t.description) {
        desc = ` — "${t.description.slice(0, 60)}${t.description.length > 60 ? '…' : ''}"`
      }
      text += `- [${t.id}] ${t.title} (${t.priority})${desc}\n`
    }
    text += '\n'
  }

  // Summary of excluded columns
  const excludedParts = excluded.map(
    (e) => `${e.count} ${columnLabels[e.column_id] || e.column_id}`,
  )
  if (excludedParts.length > 0) {
    text += `Also: ${excludedParts.join(', ')} (not shown)\n\n`
  }

  return text
}

function buildTaskCommandContext(db, task) {
  const siblings = db
    .prepare(
      'SELECT id, title, priority FROM board_tasks WHERE column_id = ? AND id != ? ORDER BY sort_order LIMIT 5',
    )
    .all(task.column_id, task.id)

  let text =
    'You are an AI assistant in Forge, a project management tool. You are running a command on a specific task.\n\n'

  if (siblings.length > 0) {
    text += `Other tasks in "${columnLabels[task.column_id] || task.column_id}": `
    text += siblings.map((s) => s.title).join(', ') + '\n\n'
  }

  return text
}

// --- Task CRUD instructions for the AI ---

function buildTaskCrudInstructions() {
  return `## Task Actions

You can create, update, and delete tasks on the board. When the user asks you to do so, respond conversationally first, then append a forge-action block at the very end of your response.

**Format:** Use a fenced block with \`~~~forge-action\` to wrap a single JSON action.

### Create a task
~~~forge-action
{"action":"create_task","title":"Task title","description":"Optional description","priority":"medium","column_id":"todo","type":"automation"}
~~~

- **priority**: "high", "medium", or "low" (default: "medium")
- **column_id**: "ideas", "todo", "in-progress", "review", or "shipped" (default: "ideas")
- **type**: "automation", "creator-research", "competitive", "review", or "system" (default: "automation")

### Update a task
~~~forge-action
{"action":"update_task","task_id":"<id from board>","updates":{"priority":"high","column_id":"in-progress"}}
~~~

- Use the task ID shown in the board context (e.g., the UUID).
- Allowed update fields: title, type, column_id, priority, description.

### Delete a task
~~~forge-action
{"action":"delete_task","task_id":"<id from board>"}
~~~

**Rules:**
- Only emit ONE action per response.
- Always write your conversational reply BEFORE the action block.
- Only emit an action block when the user explicitly asks to create, update, move, or delete a task.
- Do NOT emit action blocks for read-only questions about tasks.

`
}

// --- GitHub context builders (per-section, independently cached) ---

function getCached(key) {
  const entry = githubCache[key]
  if (entry.data && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}

function setCache(key, data) {
  githubCache[key] = { data, ts: Date.now() }
}

async function fetchRepoContext(github) {
  const cached = getCached('repo')
  if (cached) return cached

  const repo = await github.getRepository()
  const text =
    `## Connected Repository: ${repo.fullName}\n` +
    `Description: ${repo.description || 'No description'}\n` +
    `Primary language: ${repo.language || 'Unknown'}\n\n`

  setCache('repo', text)
  return text
}

async function fetchCommitsContext(github) {
  const cached = getCached('commits')
  if (cached) return cached

  const commits = await github.getRecentCommits(5)
  if (commits.length === 0) return ''

  let text = '### Recent Commits\n'
  for (const c of commits) {
    text += `- ${c.sha} ${c.message} (${formatRelativeTime(c.date)})\n`
  }
  text += '\n'

  setCache('commits', text)
  return text
}

async function fetchIssuesContext(github) {
  const cached = getCached('issues')
  if (cached) return cached

  const [repo, issues] = await Promise.all([
    github.getRepository(),
    github.getIssues({ state: 'open', perPage: 10 }),
  ])

  if (issues.length === 0) return ''

  let text = `### Open Issues (${repo.openIssuesCount} total, showing ${issues.length} most recent)\n`
  for (const i of issues) {
    const labels = i.labels.length > 0 ? ` [${i.labels.join(', ')}]` : ''
    text += `- #${i.number} ${i.title}${labels}\n`
  }
  text += '\n'

  setCache('issues', text)
  return text
}

async function fetchPRsContext(github) {
  const cached = getCached('prs')
  if (cached) return cached

  const pulls = await github.getPullRequests({ state: 'open', perPage: 5 })
  if (pulls.length === 0) return ''

  let text = `### Open Pull Requests (${pulls.length})\n`
  for (const p of pulls) {
    const draft = p.draft ? ' (draft)' : ''
    text += `- #${p.number} ${p.title} by @${p.user}${draft} (${p.head} → ${p.base})\n`
  }
  text += '\n'

  setCache('prs', text)
  return text
}

async function fetchFilteredGitHubContext(db, flags) {
  const github = getFirstGitHubService(db)
  if (!github) return ''

  try {
    const fetches = []
    if (flags.repo) fetches.push(fetchRepoContext(github))
    if (flags.commits) fetches.push(fetchCommitsContext(github))
    if (flags.issues) fetches.push(fetchIssuesContext(github))
    if (flags.prs) fetches.push(fetchPRsContext(github))

    const parts = await Promise.all(fetches)
    return parts.join('')
  } catch (err) {
    console.error('Failed to fetch GitHub context:', err.message)
    return ''
  }
}

// --- Local Git context builders (per-section, independently cached) ---

function getLocalCached(key) {
  const entry = localGitCache[key]
  if (entry.data && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}

function setLocalCache(key, data) {
  localGitCache[key] = { data, ts: Date.now() }
}

function fetchLocalRepoContext(localGit) {
  const cached = getLocalCached('repo')
  if (cached) return cached

  const repo = localGit.getRepository()
  const text =
    `## Local Repository: ${repo.name}\n` +
    `Path: ${repo.fullPath}\n` +
    `Branch: ${repo.currentBranch}\n` +
    `Remote: ${repo.remoteUrl || 'None'}\n` +
    `Commits: ${repo.totalCommits}\n\n`

  setLocalCache('repo', text)
  return text
}

function fetchLocalCommitsContext(localGit) {
  const cached = getLocalCached('commits')
  if (cached) return cached

  const commits = localGit.getRecentCommits(5)
  if (commits.length === 0) return ''

  let text = '### Recent Local Commits\n'
  for (const c of commits) {
    text += `- ${c.sha} ${c.message} (${formatRelativeTime(c.date)})\n`
  }
  text += '\n'

  setLocalCache('commits', text)
  return text
}

function fetchLocalTreeContext(localGit) {
  const cached = getLocalCached('tree')
  if (cached) return cached

  const tree = localGit.getTree('')
  if (tree.length === 0) return ''

  let text = '### Project Structure\n'
  for (const entry of tree) {
    const icon = entry.type === 'dir' ? '📁' : '📄'
    text += `- ${icon} ${entry.name}\n`
  }
  text += '\n'

  setLocalCache('tree', text)
  return text
}

function fetchFilteredLocalGitContext(db, flags) {
  const localGit = getFirstLocalGitService(db)
  if (!localGit) return ''

  try {
    const parts = []
    if (flags.repo) parts.push(fetchLocalRepoContext(localGit))
    if (flags.commits) parts.push(fetchLocalCommitsContext(localGit))
    if (flags.repo) parts.push(fetchLocalTreeContext(localGit))
    return parts.join('')
  } catch (err) {
    console.error('Failed to fetch local git context:', err.message)
    return ''
  }
}

// --- Main entry point ---

/**
 * Build selective system context for the AI.
 * @param {object} db - Database instance
 * @param {object} [options]
 * @param {object} [options.classification] - Output from classifyIntent() (LLM-based)
 * @param {object} [options.relevance] - Output from detectRelevance() (keyword-based, legacy)
 * @param {'chat'|'task-command'} [options.mode] - Context mode
 * @param {object} [options.task] - The specific task (for task-command mode)
 */
export async function buildContext(
  db,
  { classification, relevance, mode, task } = {},
) {
  // Task-command mode: lightweight context only
  if (mode === 'task-command' && task) {
    return buildTaskCommandContext(db, task)
  }

  // LLM classification-based path: baseline always included, detailed sections gated by intent
  if (classification) {
    const baseline = await buildBaselineContext(db)
    const fetches = []
    if (classification.tasks) fetches.push(buildFilteredTaskContext(db))
    if (classification.github) {
      fetches.push(
        fetchFilteredGitHubContext(db, {
          repo: true,
          commits: true,
          issues: true,
          prs: true,
        }),
      )
      fetches.push(fetchFilteredLocalGitContext(db, { repo: true, commits: true }))
    }
    const parts = await Promise.all(fetches)
    const crudInstructions = classification.tasks
      ? buildTaskCrudInstructions()
      : ''
    return PREAMBLE_FULL + baseline + parts.join('') + crudInstructions
  }

  // No relevance provided (backward compat): include everything
  if (!relevance) {
    const [taskCtx, githubCtx, localGitCtx] = await Promise.all([
      buildFilteredTaskContext(db),
      fetchFilteredGitHubContext(db, {
        repo: true,
        commits: true,
        issues: true,
        prs: true,
      }),
      fetchFilteredLocalGitContext(db, { repo: true, commits: true }),
    ])
    if (!taskCtx && !githubCtx && !localGitCtx) return ''
    return (
      PREAMBLE_FULL +
      taskCtx +
      buildTaskCrudInstructions() +
      githubCtx +
      localGitCtx
    )
  }

  // Keyword relevance-based path (legacy fallback)
  const needsTasks = relevance.tasks
  const gh = relevance.github
  const anyRepo = gh && (gh.repo || gh.commits || gh.issues || gh.prs)

  if (!needsTasks && !anyRepo) {
    return PREAMBLE_MINIMAL
  }

  const fetches = []
  if (needsTasks) fetches.push(buildFilteredTaskContext(db))
  if (anyRepo) {
    fetches.push(fetchFilteredGitHubContext(db, gh))
    fetches.push(fetchFilteredLocalGitContext(db, gh))
  }

  const parts = await Promise.all(fetches)
  const crudInstructions = needsTasks ? buildTaskCrudInstructions() : ''
  return PREAMBLE_FULL + parts.join('') + crudInstructions
}
