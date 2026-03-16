import { useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import { TypeIcon } from '@/components/ui/type-icon'
import { PriorityDot } from '@/components/ui/priority-dot'
import type { BoardTask } from '@/types'

interface KanbanCardProps {
  task: BoardTask
  isDragOverlay?: boolean
  onClick?: (task: BoardTask) => void
}

export function KanbanCard({ task, isDragOverlay, onClick }: KanbanCardProps) {
  const didDrag = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { onDragStart: () => (didDrag.current = true) },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleClick() {
    if (didDrag.current) {
      didDrag.current = false
      return
    }
    onClick?.(task)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-lg shadow-primary/10 ring-1 ring-primary/30',
      )}
    >
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {task.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
        {task.description}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <TypeIcon type={task.type} size="sm" />
        <PriorityDot priority={task.priority} showLabel />
      </div>
    </div>
  )
}
