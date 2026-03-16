import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'

import type { BoardTask, BoardColumn } from '@/types'
import { boardColumns, boardTasks as initialTasks } from '@/mock'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TaskDetailModal } from './task-detail-modal'

export function KanbanBoard() {
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  const getColumnTasks = useCallback(
    (columnId: BoardColumn) =>
      tasks
        .filter((t) => t.column === columnId)
        .sort((a, b) => a.order - b.order),
    [tasks],
  )

  function findColumnOfTask(taskId: string): BoardColumn | undefined {
    return tasks.find((t) => t.id === taskId)?.column
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeTaskId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnOfTask(activeTaskId)

    // Determine target column: either directly a column id or the column of the hovered task
    const isOverColumn = boardColumns.some((c) => c.id === overId)
    const overColumn = isOverColumn
      ? (overId as BoardColumn)
      : findColumnOfTask(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    // Move task to new column
    setTasks((prev) => {
      const targetTasks = prev.filter(
        (t) => t.column === overColumn && t.id !== activeTaskId,
      )
      const newOrder = targetTasks.length

      return prev.map((t) =>
        t.id === activeTaskId
          ? { ...t, column: overColumn, order: newOrder }
          : t,
      )
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTaskId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnOfTask(activeTaskId)
    const isOverColumn = boardColumns.some((c) => c.id === overId)

    // If dropped on a column directly (not on a task), we're done — already moved in handleDragOver
    if (isOverColumn) return

    const overColumn = findColumnOfTask(overId)
    if (!activeColumn || !overColumn || activeColumn !== overColumn) return

    // Reorder within same column
    setTasks((prev) => {
      const columnTasks = prev
        .filter((t) => t.column === activeColumn)
        .sort((a, b) => a.order - b.order)

      const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)

      if (oldIndex === newIndex) return prev

      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      const reorderedWithOrder = reordered.map((t, i) => ({
        ...t,
        order: i,
      }))

      const otherTasks = prev.filter((t) => t.column !== activeColumn)
      return [...otherTasks, ...reorderedWithOrder]
    })
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {boardColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onTaskClick={setSelectedTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </>
  )
}
