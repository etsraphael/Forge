import { useState, useCallback, useEffect } from 'react'
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
import { boardColumns } from '@/mock'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TaskDetailModal } from './task-detail-modal'

interface RawTask {
  id: string
  title: string
  type: string
  column_id: string
  priority: string
  description: string
  sort_order: number
}

function mapTask(raw: RawTask): BoardTask {
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type as BoardTask['type'],
    column: raw.column_id as BoardColumn,
    priority: raw.priority as BoardTask['priority'],
    description: raw.description,
    order: raw.sort_order,
  }
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<BoardTask[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data: RawTask[]) => setTasks(data.map(mapTask)))
      .catch(console.error)
  }, [])

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

    const isOverColumn = boardColumns.some((c) => c.id === overId)
    const overColumn = isOverColumn
      ? (overId as BoardColumn)
      : findColumnOfTask(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

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

    if (isOverColumn) {
      persistReorder(tasks)
      return
    }

    const overColumn = findColumnOfTask(overId)
    if (!activeColumn || !overColumn || activeColumn !== overColumn) return

    setTasks((prev) => {
      const columnTasks = prev
        .filter((t) => t.column === activeColumn)
        .sort((a, b) => a.order - b.order)

      const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)

      if (oldIndex === newIndex) return prev

      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      const reorderedWithOrder = reordered.map((t, i) => ({ ...t, order: i }))

      const otherTasks = prev.filter((t) => t.column !== activeColumn)
      const next = [...otherTasks, ...reorderedWithOrder]
      persistReorder(next)
      return next
    })
  }

  function persistReorder(currentTasks: BoardTask[]) {
    const payload = currentTasks.map((t) => ({
      id: t.id,
      column_id: t.column,
      sort_order: t.order,
    }))
    fetch('/api/tasks/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: payload }),
    }).catch(console.error)
  }

  async function handleAddTask(columnId: BoardColumn) {
    const columnTasks = tasks.filter((t) => t.column === columnId)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New task',
        column_id: columnId,
        sort_order: columnTasks.length,
      }),
    })
    if (!res.ok) return
    const raw: RawTask = await res.json()
    const newTask = mapTask(raw)
    setTasks((prev) => [...prev, newTask])
    setSelectedTask(newTask)
  }

  function handleTaskUpdate(updated: BoardTask) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
  }

  function handleTaskDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTask(null)
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
              onAddTask={handleAddTask}
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
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
    </>
  )
}
