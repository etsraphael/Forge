// ── Projects ──

export interface Project {
  id: string
  name: string
  color: string
}

// ── Approvals ──

export type ApprovalItemStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovalItem {
  id: string
  name: string
  platform: string
  followers: string
  engagement: string
  matchScore: number
  status: ApprovalItemStatus
}

export interface Approval {
  id: string
  title: string
  source: string
  createdAt: string
  priority: 'high' | 'medium' | 'low'
  items: ApprovalItem[]
}

// ── Tasks ──

export type TaskStatus = 'active' | 'idle' | 'error' | 'running' | 'scheduled'
export type TaskType =
  | 'creator-research'
  | 'competitive'
  | 'review'
  | 'system'
  | 'automation'

export interface Task {
  id: string
  name: string
  type: TaskType
  schedule: string
  lastRun: string | null
  nextRun: string
  status: TaskStatus
  description: string
}

// ── Board (Kanban) ──

export type BoardColumn =
  | 'ideas'
  | 'todo'
  | 'in-progress'
  | 'review'
  | 'shipped'

export type TaskPriority = 'high' | 'medium' | 'low'

export interface BoardTask {
  id: string
  title: string
  type: TaskType
  column: BoardColumn
  priority: TaskPriority
  description: string
  order: number
}

export interface BoardColumnDef {
  id: BoardColumn
  title: string
  color: string
}

// ── Task Actions (from Chat) ──

export interface TaskActionResult {
  success: boolean
  action: 'create_task' | 'update_task' | 'delete_task'
  task?: {
    id: string
    title: string
    type: string
    column_id: string
    priority: TaskPriority
    description: string
  }
  deletedTask?: { id: string; title: string }
  error?: string
}

// ── Activity ──

export type ActivityAction =
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'started'
  | 'failed'
  | 'scheduled'

export interface ActivityEntry {
  id: string
  action: ActivityAction
  subject: string
  detail: string
  timestamp: string
}

// ── Insights ──

export interface PipelineStage {
  label: string
  value: number
  color: string
}

export interface CompetitorChange {
  id: string
  competitor: string
  change: string
  severity: 'high' | 'medium' | 'low'
  detectedAt: string
}

export interface WeeklyStats {
  tasksRun: number
  approvalRate: number
  avgResponseTime: string
  creatorsFound: number
}
