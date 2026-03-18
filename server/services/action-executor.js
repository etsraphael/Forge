import { v4 as uuidv4 } from 'uuid'

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'type',
  'column_id',
  'priority',
  'description',
]
const VALID_COLUMNS = ['ideas', 'todo', 'in-progress', 'review', 'shipped']
const VALID_PRIORITIES = ['high', 'medium', 'low']
const VALID_TYPES = [
  'automation',
  'creator-research',
  'competitive',
  'review',
  'system',
]

function validateEnums({ column_id, priority, type }) {
  const errors = []
  if (column_id && !VALID_COLUMNS.includes(column_id))
    errors.push(`Invalid column_id "${column_id}"`)
  if (priority && !VALID_PRIORITIES.includes(priority))
    errors.push(`Invalid priority "${priority}"`)
  if (type && !VALID_TYPES.includes(type)) errors.push(`Invalid type "${type}"`)
  return errors
}

/**
 * Execute a parsed task action against the database.
 * @param {object} db - better-sqlite3 database instance
 * @param {object} action - Parsed action object
 * @param {string} projectId - Project ID from the chat session
 * @returns {{ success: boolean, action: string, task?: object, deletedTask?: object, error?: string }}
 */
export function executeAction(db, action, projectId = 'default') {
  try {
    switch (action.action) {
      case 'create_task':
        return createTask(db, action, projectId)
      case 'update_task':
        return updateTask(db, action)
      case 'delete_task':
        return deleteTask(db, action)
      default:
        return {
          success: false,
          action: action.action,
          error: `Unknown action: ${action.action}`,
        }
    }
  } catch (err) {
    return {
      success: false,
      action: action.action,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function createTask(db, action, projectId) {
  const {
    title,
    type = 'automation',
    column_id = 'ideas',
    priority = 'medium',
    description = '',
  } = action

  if (!title) {
    return { success: false, action: 'create_task', error: 'Title is required' }
  }

  const enumErrors = validateEnums({ column_id, priority, type })
  if (enumErrors.length > 0) {
    return {
      success: false,
      action: 'create_task',
      error: enumErrors.join('; '),
    }
  }

  const id = uuidv4()
  const row = db
    .prepare('SELECT COUNT(*) as count FROM board_tasks WHERE column_id = ?')
    .get(column_id)
  const sort_order = row.count

  db.prepare(
    'INSERT INTO board_tasks (id, title, type, column_id, priority, description, sort_order, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    title,
    type,
    column_id,
    priority,
    description,
    sort_order,
    projectId,
  )

  const task = db.prepare('SELECT * FROM board_tasks WHERE id = ?').get(id)
  return { success: true, action: 'create_task', task }
}

function updateTask(db, action) {
  const { task_id, updates } = action
  if (!task_id) {
    return {
      success: false,
      action: 'update_task',
      error: 'task_id is required',
    }
  }

  const task = db.prepare('SELECT * FROM board_tasks WHERE id = ?').get(task_id)
  if (!task) {
    return {
      success: false,
      action: 'update_task',
      error: `Task not found: ${task_id}`,
    }
  }

  if (!updates || typeof updates !== 'object') {
    return {
      success: false,
      action: 'update_task',
      error: 'updates object is required',
    }
  }

  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k)),
  )

  if (Object.keys(filtered).length === 0) {
    return { success: true, action: 'update_task', task }
  }

  const enumErrors = validateEnums(filtered)
  if (enumErrors.length > 0) {
    return {
      success: false,
      action: 'update_task',
      error: enumErrors.join('; '),
    }
  }

  if (filtered.column_id && filtered.column_id !== task.column_id) {
    const row = db
      .prepare('SELECT COUNT(*) as count FROM board_tasks WHERE column_id = ?')
      .get(filtered.column_id)
    filtered.sort_order = row.count
  }

  const setClauses = Object.keys(filtered)
    .map((k) => `${k} = ?`)
    .join(', ')
  const values = [...Object.values(filtered), task_id]

  db.prepare(
    `UPDATE board_tasks SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`,
  ).run(...values)

  const updated = db
    .prepare('SELECT * FROM board_tasks WHERE id = ?')
    .get(task_id)
  return { success: true, action: 'update_task', task: updated }
}

function deleteTask(db, action) {
  const { task_id } = action
  if (!task_id) {
    return {
      success: false,
      action: 'delete_task',
      error: 'task_id is required',
    }
  }

  const task = db.prepare('SELECT * FROM board_tasks WHERE id = ?').get(task_id)
  if (!task) {
    return {
      success: false,
      action: 'delete_task',
      error: `Task not found: ${task_id}`,
    }
  }

  db.prepare('DELETE FROM board_tasks WHERE id = ?').run(task_id)
  return {
    success: true,
    action: 'delete_task',
    deletedTask: { id: task.id, title: task.title },
  }
}
