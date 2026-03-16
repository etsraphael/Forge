import { KanbanBoard } from '@/components/board/kanban-board'

export default function Tasks() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Drag tasks between columns to update their status.
      </p>
      <div className="mt-6">
        <KanbanBoard />
      </div>
    </div>
  )
}
