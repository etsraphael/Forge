import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

export function initDB() {
  const dbPath = process.env.FORGE_DB || path.join(rootDir, 'forge.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'bg-primary',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL DEFAULT 'default',
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model TEXT,
      provider TEXT,
      tokens_used INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_settings (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session
      ON chat_messages(session_id, created_at);

    CREATE TABLE IF NOT EXISTS board_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'automation',
      column_id TEXT NOT NULL DEFAULT 'ideas',
      priority TEXT NOT NULL DEFAULT 'medium',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      project_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_board_tasks_column
      ON board_tasks(column_id, sort_order);
  `)

  // Seed default project if table is empty
  const projectCount = db
    .prepare('SELECT COUNT(*) as count FROM projects')
    .get()
  if (projectCount.count === 0) {
    db.prepare(
      "INSERT INTO projects (id, name, color) VALUES ('default', 'Forge', 'bg-primary')",
    ).run()
  }

  // Seed initial tasks if table is empty
  const taskCount = db
    .prepare('SELECT COUNT(*) as count FROM board_tasks')
    .get()
  if (taskCount.count === 0) {
    const insertTask = db.prepare(
      'INSERT INTO board_tasks (id, title, type, column_id, priority, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    const seedTasks = [
      [
        'bt-1',
        'Explore TikTok Shop integration',
        'creator-research',
        'ideas',
        'low',
        'Research feasibility of TikTok Shop for creator partnerships',
        0,
      ],
      [
        'bt-2',
        'AI-powered outreach personalization',
        'automation',
        'ideas',
        'medium',
        'Use LLMs to draft personalized outreach messages',
        1,
      ],
      [
        'bt-3',
        'Competitor pricing alerts',
        'competitive',
        'ideas',
        'low',
        'Automated alerts when competitors change pricing',
        2,
      ],
      [
        'bt-4',
        'Build creator scoring model',
        'creator-research',
        'todo',
        'high',
        'Score creators by engagement, relevance, and audience fit',
        0,
      ],
      [
        'bt-5',
        'Set up weekly performance digest',
        'automation',
        'todo',
        'medium',
        'Automated email summary of campaign performance',
        1,
      ],
      [
        'bt-6',
        'Audit approval workflow',
        'review',
        'todo',
        'medium',
        'Review current approval flow for bottlenecks',
        2,
      ],
      [
        'bt-7',
        'Fitness creator pipeline',
        'creator-research',
        'in-progress',
        'high',
        'Discover and screen fitness creators for Q2 campaign',
        0,
      ],
      [
        'bt-8',
        'Competitor price monitor',
        'competitive',
        'in-progress',
        'high',
        'Track Rival Co and BrandSync pricing changes daily',
        1,
      ],
      [
        'bt-9',
        'Database backup automation',
        'system',
        'in-progress',
        'medium',
        'Set up nightly backups with retention policy',
        2,
      ],
      [
        'bt-10',
        'Q1 campaign report',
        'review',
        'review',
        'high',
        'Compile results from Q1 creator campaigns',
        0,
      ],
      [
        'bt-11',
        'Outreach email templates',
        'automation',
        'review',
        'medium',
        'Review new outreach templates before launch',
        1,
      ],
      [
        'bt-12',
        'Lifestyle creator scan',
        'creator-research',
        'shipped',
        'medium',
        'Identified 45 lifestyle creators for brand partnerships',
        0,
      ],
      [
        'bt-13',
        'Approval queue redesign',
        'review',
        'shipped',
        'high',
        'Redesigned approval flow with bulk actions',
        1,
      ],
    ]
    const seedAll = db.transaction(() => {
      for (const task of seedTasks) insertTask.run(...task)
    })
    seedAll()
  }

  return db
}
