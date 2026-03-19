import type { ReactNode } from 'react'
import { CheckCircle2, Pencil, Trash2, AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { TaskActionResult } from '@/types'
import { PriorityDot } from '@/components/ui/priority-dot'

const columnLabels: Record<string, string> = {
  ideas: 'Ideas',
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  shipped: 'Shipped',
}

function TaskCard({
  icon,
  borderColor,
  task,
}: {
  icon: ReactNode
  borderColor: string
  task: NonNullable<TaskActionResult['task']>
}) {
  return (
    <div
      className={cn(
        'mt-2 flex items-center gap-2 rounded-lg border px-3 py-2',
        borderColor,
      )}
    >
      {icon}
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
        <span className="truncate font-medium text-foreground">
          {task.title}
        </span>
        <PriorityDot priority={task.priority} />
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            'bg-muted text-muted-foreground',
          )}
        >
          {columnLabels[task.column_id] ?? task.column_id}
        </span>
      </div>
    </div>
  )
}

interface TaskActionCardProps {
  result: TaskActionResult
}

export function TaskActionCard({ result }: TaskActionCardProps) {
  if (!result.success) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        <AlertCircle className="size-3.5 shrink-0" />
        <span>Failed: {result.error}</span>
      </div>
    )
  }

  if (result.action === 'create_task' && result.task) {
    return (
      <TaskCard
        icon={<CheckCircle2 className="size-3.5 shrink-0 text-green" />}
        borderColor="border-green/30 bg-green/10"
        task={result.task}
      />
    )
  }

  if (result.action === 'update_task' && result.task) {
    return (
      <TaskCard
        icon={<Pencil className="size-3.5 shrink-0 text-blue" />}
        borderColor="border-blue/30 bg-blue/10"
        task={result.task}
      />
    )
  }

  if (result.action === 'delete_task' && result.deletedTask) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <Trash2 className="size-3.5 shrink-0" />
        <span className="truncate line-through">
          {result.deletedTask.title}
        </span>
        <span className="shrink-0 text-[10px]">deleted</span>
      </div>
    )
  }

  return null
}
