import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { BoardColumnDef, BoardTask } from '@/types'
import { KanbanCard } from './kanban-card'

interface KanbanColumnProps {
  column: BoardColumnDef
  tasks: BoardTask[]
  onTaskClick?: (task: BoardTask) => void
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const taskIds = tasks.map((t) => t.id)

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex flex-1 flex-col gap-2 rounded-xl bg-muted/30 p-2"
          style={{ minHeight: 120 }}
        >
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4">
              <span className="text-xs text-muted-foreground">
                Drag tasks here
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
