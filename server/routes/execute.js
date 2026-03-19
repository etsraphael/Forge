import { Router } from 'express'
import {
  executeTask,
  cancelExecution,
  finalizeExecution,
} from '../services/claude-code.js'

const router = Router()

// POST /api/tasks/:id/execute  (SSE streaming)
router.post('/:id/execute', async (req, res) => {
  const db = req.app.get('db')
  const taskId = req.params.id

  let executionId
  let stream

  try {
    const result = executeTask(db, taskId)
    executionId = result.executionId
    stream = result.stream
  } catch (err) {
    const status = err.status || 500
    return res.status(status).json({ error: err.message })
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  send({ type: 'execution_start', execution_id: executionId, task_id: taskId })

  // Cancel on client disconnect
  req.on('close', () => {
    cancelExecution(executionId)
  })

  let fullOutput = ''

  try {
    for await (const item of stream) {
      if (item.type === 'message') {
        const msg = item.data
        send(msg)

        // Accumulate text output for persistence
        if (msg.type === 'assistant' && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              fullOutput += block.text
            }
          }
        } else if (msg.type === 'result' && msg.result) {
          fullOutput += '\n\n--- Result ---\n' + msg.result
        }
      } else if (item.type === 'stderr') {
        send({ type: 'stderr', content: item.data })
      }
    }

    finalizeExecution(db, executionId, {
      status: 'completed',
      output: fullOutput,
    })
    send({ type: 'done', execution_id: executionId })
  } catch (err) {
    const errorMsg = err.name === 'AbortError' ? 'Cancelled' : err.message
    const status = err.name === 'AbortError' ? 'cancelled' : 'failed'

    finalizeExecution(db, executionId, {
      status,
      output: fullOutput,
      error: errorMsg,
    })
    send({ type: 'error', error: errorMsg, execution_id: executionId })
  }

  res.end()
})

// POST /api/tasks/:id/execute/cancel
router.post('/:id/execute/cancel', (req, res) => {
  const db = req.app.get('db')
  const taskId = req.params.id

  // Find the running execution for this task
  const execution = db
    .prepare(
      `SELECT id FROM task_executions
       WHERE task_id = ? AND status = 'running'
       ORDER BY started_at DESC LIMIT 1`,
    )
    .get(taskId)

  if (!execution) {
    return res.status(404).json({ error: 'No running execution found' })
  }

  const cancelled = cancelExecution(execution.id)
  if (cancelled) {
    finalizeExecution(db, execution.id, {
      status: 'cancelled',
      error: 'Cancelled by user',
    })
    res.json({ ok: true, execution_id: execution.id })
  } else {
    res.status(404).json({ error: 'Execution not found or already finished' })
  }
})

// GET /api/tasks/:id/executions
router.get('/:id/executions', (req, res) => {
  const db = req.app.get('db')
  const taskId = req.params.id

  const executions = db
    .prepare(
      `SELECT id, task_id, status, prompt, output, error, started_at, completed_at
       FROM task_executions
       WHERE task_id = ?
       ORDER BY started_at DESC
       LIMIT 20`,
    )
    .all(taskId)

  res.json(executions)
})

export default router
