import { useState } from 'react'
import { Play, Calendar, Clock, RotateCw } from 'lucide-react'

import { tasks as initialTasks } from '@/mock'
import { relativeTime } from '@/lib/format'
import type { Task, TaskType } from '@/types'
import { TypeIcon } from '@/components/ui/type-icon'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

const filters: { key: TaskType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'creator-research', label: 'Creator Research' },
  { key: 'competitive', label: 'Competitive' },
  { key: 'review', label: 'Reviews' },
]

export default function Tasks() {
  const [taskData, setTaskData] = useState<Task[]>(initialTasks)
  const [activeFilter, setActiveFilter] = useState<TaskType | 'all'>('all')

  const filteredTasks =
    activeFilter === 'all'
      ? taskData
      : taskData.filter((t) => t.type === activeFilter)

  function handleRunNow(taskId: string) {
    setTaskData((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: 'running' as const } : t,
      ),
    )
    setTimeout(() => {
      setTaskData((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'active' as const,
                lastRun: new Date().toISOString(),
              }
            : t,
        ),
      )
    }, 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>

      {/* Filter pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={activeFilter === f.key ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Task list */}
      <div className="mt-6 space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
          >
            <TypeIcon type={task.type} className="mt-0.5 shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{task.name}</span>
                <StatusBadge status={task.status}>{task.status}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {task.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {task.schedule}
                </span>
                <span className="inline-flex items-center gap-1">
                  <RotateCw className="size-3" />
                  Last: {task.lastRun ? relativeTime(task.lastRun) : 'Never'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  Next:{' '}
                  {task.nextRun === '—' ? '—' : relativeTime(task.nextRun)}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={task.status === 'running'}
              onClick={() => handleRunNow(task.id)}
            >
              <Play className="size-3.5" />
              Run Now
            </Button>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks match this filter.
          </p>
        )}
      </div>
    </div>
  )
}
