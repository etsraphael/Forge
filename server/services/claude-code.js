import { spawn } from 'child_process'
import { v4 as uuid } from 'uuid'
import { getFirstLocalGitService } from './local-git.js'

/** In-memory map of executionId → AbortController for cancellation */
const activeExecutions = new Map()

/**
 * Start executing a task's description as a Claude Code prompt.
 * Returns an object with { executionId, stream } where stream is an async generator
 * yielding parsed JSON messages from Claude Code's stream-json output.
 */
export function executeTask(db, taskId) {
  const task = db.prepare('SELECT * FROM board_tasks WHERE id = ?').get(taskId)
  if (!task) {
    throw Object.assign(new Error('Task not found'), { status: 404 })
  }
  if (!task.description || !task.description.trim()) {
    throw Object.assign(new Error('Task has no description to execute'), {
      status: 400,
    })
  }

  const localGit = getFirstLocalGitService(db)
  if (!localGit) {
    throw Object.assign(
      new Error(
        'No local git connector configured. Add one in the Connectors page.',
      ),
      { status: 400 },
    )
  }

  const repoPath = localGit.repoPath
  const executionId = uuid()
  const prompt = `Task: ${task.title}\n\n${task.description}`

  // Persist execution record
  db.prepare(
    `INSERT INTO task_executions (id, task_id, status, prompt)
     VALUES (?, ?, 'running', ?)`,
  ).run(executionId, taskId, prompt)

  const controller = new AbortController()
  activeExecutions.set(executionId, controller)

  const stream = spawnClaudeStream(repoPath, prompt, controller.signal)

  return { executionId, stream }
}

/**
 * Cancel a running execution.
 */
export function cancelExecution(executionId) {
  const controller = activeExecutions.get(executionId)
  if (!controller) return false
  controller.abort()
  activeExecutions.delete(executionId)
  return true
}

/**
 * Mark an execution as completed/failed in the DB and clean up.
 */
export function finalizeExecution(db, executionId, { status, output, error }) {
  db.prepare(
    `UPDATE task_executions
     SET status = ?, output = ?, error = ?, completed_at = datetime('now')
     WHERE id = ?`,
  ).run(status, output || '', error || null, executionId)
  activeExecutions.delete(executionId)
}

/**
 * Spawn claude CLI and yield parsed stream-json messages.
 */
async function* spawnClaudeStream(cwd, prompt, signal) {
  const child = spawn(
    'claude',
    [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ],
    {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal,
    },
  )

  let buffer = ''
  const messageQueue = []
  let resolve = null
  let exitError = null

  function enqueue(item) {
    if (resolve) {
      const r = resolve
      resolve = null
      r(item)
    } else {
      messageQueue.push(item)
    }
  }

  function waitForMessage() {
    if (messageQueue.length > 0) {
      return Promise.resolve(messageQueue.shift())
    }
    return new Promise((r) => {
      resolve = r
    })
  }

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete line
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = JSON.parse(trimmed)
        enqueue({ type: 'message', data: msg })
      } catch {
        // non-JSON line, skip
      }
    }
  })

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim()
    if (text) {
      enqueue({ type: 'stderr', data: text })
    }
  })

  child.on('error', (err) => {
    exitError = err
    enqueue({ type: 'end' })
  })

  child.on('close', (code) => {
    // flush remaining buffer
    if (buffer.trim()) {
      try {
        const msg = JSON.parse(buffer.trim())
        enqueue({ type: 'message', data: msg })
      } catch {
        // ignore
      }
    }
    if (code !== 0 && code !== null) {
      exitError = new Error(`claude exited with code ${code}`)
    }
    enqueue({ type: 'end' })
  })

  // Yield messages as they arrive
  while (true) {
    const item = await waitForMessage()
    if (item.type === 'end') break
    yield item
  }

  if (exitError) {
    throw exitError
  }
}
