import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  X,
  ListTree,
  PenLine,
  Search,
  Lightbulb,
  Code,
  Loader2,
  Pencil,
  Trash2,
  Terminal,
  Square,
  type LucideIcon,
} from 'lucide-react'

import type { BoardTask, TaskType, TaskPriority, ExecutionStatus } from '@/types'
import { cn } from '@/lib/utils'
import { PriorityDot } from '@/components/ui/priority-dot'
import { TypeIcon } from '@/components/ui/type-icon'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/chat/markdown-content'

interface AiCommand {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

const aiCommands: AiCommand[] = [
  {
    id: 'subtasks',
    label: 'Generate subtasks',
    icon: ListTree,
    description: 'Break into smaller steps',
  },
  {
    id: 'draft',
    label: 'Draft content',
    icon: PenLine,
    description: 'Generate a first draft',
  },
  {
    id: 'research',
    label: 'Research & summarize',
    icon: Search,
    description: 'Research and find key insights',
  },
  {
    id: 'next-steps',
    label: 'Suggest next steps',
    icon: Lightbulb,
    description: 'Get AI recommendations',
  },
  {
    id: 'code',
    label: 'Generate code',
    icon: Code,
    description: 'Write implementation code',
  },
]

const columnLabels: Record<string, string> = {
  ideas: 'Ideas',
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  shipped: 'Shipped',
}

const taskTypes: TaskType[] = [
  'creator-research',
  'competitive',
  'review',
  'system',
  'automation',
]

const taskTypeLabels: Record<TaskType, string> = {
  'creator-research': 'Creator Research',
  competitive: 'Competitive',
  review: 'Review',
  system: 'System',
  automation: 'Automation',
}

const priorities: TaskPriority[] = ['high', 'medium', 'low']

interface TaskDetailModalProps {
  task: BoardTask | null
  onClose: () => void
  onUpdate?: (task: BoardTask) => void
  onDelete?: (taskId: string) => void
}

export function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const [runningCommand, setRunningCommand] = useState<string | null>(null)
  const [commandOutput, setCommandOutput] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<TaskType>('automation')
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | 'idle'>('idle')
  const [executionOutput, setExecutionOutput] = useState<Array<{ type: string; content: string }>>([])
  const [executionId, setExecutionId] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll execution output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [executionOutput])

  const handleExecute = useCallback(async () => {
    if (!task) return
    setExecutionStatus('running')
    setExecutionOutput([])
    setExecutionId(null)

    try {
      const response = await fetch(`/api/tasks/${task.id}/execute`, {
        method: 'POST',
      })

      if (!response.ok) {
        const err = await response.json()
        setExecutionOutput([{ type: 'error', content: err.error || 'Failed to start execution' }])
        setExecutionStatus('failed')
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop()!

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'execution_start') {
              setExecutionId(event.execution_id)
              setExecutionOutput((prev) => [
                ...prev,
                { type: 'system', content: 'Execution started...' },
              ])
            } else if (event.type === 'assistant' && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === 'text' && block.text) {
                  setExecutionOutput((prev) => [
                    ...prev,
                    { type: 'assistant', content: block.text },
                  ])
                }
              }
            } else if (event.type === 'tool_use') {
              setExecutionOutput((prev) => [
                ...prev,
                { type: 'tool', content: `Using tool: ${event.tool?.name || event.name || 'unknown'}` },
              ])
            } else if (event.type === 'result') {
              if (event.result) {
                setExecutionOutput((prev) => [
                  ...prev,
                  { type: 'result', content: event.result },
                ])
              }
            } else if (event.type === 'done') {
              setExecutionStatus('completed')
            } else if (event.type === 'error') {
              setExecutionOutput((prev) => [
                ...prev,
                { type: 'error', content: event.error || 'Unknown error' },
              ])
              setExecutionStatus('failed')
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // If we exited the loop without explicit done/error
      setExecutionStatus((prev) => (prev === 'running' ? 'completed' : prev))
    } catch (err) {
      setExecutionOutput((prev) => [
        ...prev,
        { type: 'error', content: err instanceof Error ? err.message : 'Connection failed' },
      ])
      setExecutionStatus('failed')
    }
  }, [task])

  const handleCancelExecution = useCallback(async () => {
    if (!task) return
    try {
      await fetch(`/api/tasks/${task.id}/execute/cancel`, { method: 'POST' })
      setExecutionStatus('cancelled')
    } catch {
      // ignore
    }
  }, [task])

  if (!task) return null

  function startEditing() {
    setEditTitle(task!.title)
    setEditDescription(task!.description)
    setEditType(task!.type)
    setEditPriority(task!.priority)
    setCommandOutput(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
  }

  async function handleSave() {
    if (!task) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          type: editType,
          priority: editPriority,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated: BoardTask = {
        ...task,
        title: editTitle,
        description: editDescription,
        type: editType,
        priority: editPriority,
      }
      onUpdate?.(updated)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setIsDeleting(true)
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      onDelete?.(task.id)
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRunCommand(cmd: AiCommand) {
    setRunningCommand(cmd.id)
    setCommandOutput(null)

    try {
      const res = await fetch('/api/chat/task-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task!.id, command: cmd.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCommandOutput(`**Error:** ${data.error || 'Something went wrong'}`)
      } else {
        setCommandOutput(data.content)
      }
    } catch {
      setCommandOutput(
        '**Error:** Failed to reach the server. Is the backend running?',
      )
    } finally {
      setRunningCommand(null)
    }
  }

  function handleClose() {
    setRunningCommand(null)
    setCommandOutput(null)
    setIsEditing(false)
    setExecutionStatus('idle')
    setExecutionOutput([])
    setExecutionId(null)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6 pb-4">
              <div className="flex-1 space-y-1 pr-4">
                {isEditing ? (
                  <input
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <TypeIcon type={task.type} size="sm" />
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {task.title}
                    </Dialog.Title>
                  </div>
                )}
                {!isEditing && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <PriorityDot priority={task.priority} showLabel />
                    <span>&middot;</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {columnLabels[task.column]}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={startEditing}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Edit task"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
                <Dialog.Close
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {isEditing ? (
                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Type
                    </label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as TaskType)}
                    >
                      {taskTypes.map((t) => (
                        <option key={t} value={t}>
                          {taskTypeLabels[t]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Priority
                    </label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={editPriority}
                      onChange={(e) =>
                        setEditPriority(e.target.value as TaskPriority)
                      }
                    >
                      {priorities.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </label>
                    <textarea
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Description */}
                  {task.description ? (
                    <MarkdownContent content={task.description} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <em>No description</em>
                    </p>
                  )}

                  {/* Execute with Claude Code */}
                  {task.description && (
                    <div className="mt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Execute
                      </h3>
                      <div className="mt-3">
                        {executionStatus === 'running' ? (
                          <button
                            onClick={handleCancelExecution}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                          >
                            <Square className="size-4" />
                            Cancel Execution
                          </button>
                        ) : (
                          <button
                            onClick={handleExecute}
                            disabled={runningCommand !== null}
                            className={cn(
                              'flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors',
                              'hover:bg-primary/20',
                              'disabled:pointer-events-none disabled:opacity-50',
                            )}
                          >
                            <Terminal className="size-4" />
                            Execute with Claude Code
                          </button>
                        )}
                      </div>

                      {/* Execution Output */}
                      {executionOutput.length > 0 && (
                        <div
                          ref={outputRef}
                          className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-zinc-950 p-4 font-mono text-sm"
                        >
                          {executionStatus === 'completed' && (
                            <div className="mb-2 text-xs font-medium text-emerald-400">
                              Completed
                            </div>
                          )}
                          {executionStatus === 'failed' && (
                            <div className="mb-2 text-xs font-medium text-red-400">
                              Failed
                            </div>
                          )}
                          {executionStatus === 'cancelled' && (
                            <div className="mb-2 text-xs font-medium text-yellow-400">
                              Cancelled
                            </div>
                          )}
                          {executionOutput.map((entry, i) => (
                            <div
                              key={i}
                              className={cn(
                                'whitespace-pre-wrap break-words',
                                entry.type === 'error' && 'text-red-400',
                                entry.type === 'system' && 'text-zinc-500',
                                entry.type === 'tool' && 'text-yellow-400',
                                entry.type === 'assistant' && 'text-zinc-200',
                                entry.type === 'result' && 'text-emerald-400',
                              )}
                            >
                              {entry.content}
                            </div>
                          ))}
                          {executionStatus === 'running' && (
                            <div className="mt-1 flex items-center gap-2 text-zinc-500">
                              <Loader2 className="size-3 animate-spin" />
                              Running...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Commands */}
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      AI Commands
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {aiCommands.map((cmd) => {
                        const Icon = cmd.icon
                        const isRunning = runningCommand === cmd.id
                        return (
                          <button
                            key={cmd.id}
                            disabled={
                              runningCommand !== null ||
                              executionStatus === 'running'
                            }
                            onClick={() => handleRunCommand(cmd)}
                            className={cn(
                              'flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left transition-colors',
                              'hover:border-primary/40 hover:bg-muted/50',
                              'disabled:pointer-events-none disabled:opacity-50',
                              isRunning && 'border-primary/40 bg-muted/50',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isRunning ? (
                                <Loader2 className="size-4 animate-spin text-primary" />
                              ) : (
                                <Icon className="size-4 text-primary" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {cmd.label}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {cmd.description}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* AI Output */}
                  {(commandOutput || runningCommand) && (
                    <div className="mt-4 rounded-lg border border-border bg-background p-4">
                      {runningCommand ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Running AI command…
                        </div>
                      ) : (
                        <MarkdownContent content={commandOutput!} />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </button>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !editTitle.trim()}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
