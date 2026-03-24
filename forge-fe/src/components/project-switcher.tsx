import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useProject } from '@/contexts/project-context'
import { NewProjectDialog } from './new-project-dialog'

interface ProjectSwitcherProps {
  className?: string
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const { projects, selectedProject, setSelectedProject } = useProject()
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!selectedProject) return null

  return (
    <>
      <div ref={ref} className={cn('relative', className)}>
        <button
          onClick={() => setOpen(!open)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
        >
          <span
            className={cn('size-2 rounded-full', selectedProject.color)}
          />
          <span className="font-medium text-foreground">
            {selectedProject.name}
          </span>
          <ChevronDown
            className={cn(
              'size-3.5 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProject(project)
                  setOpen(false)
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              >
                <span
                  className={cn('size-2 rounded-full', project.color)}
                />
                <span className="flex-1 text-left text-foreground">
                  {project.name}
                </span>
                {project.id === selectedProject.id && (
                  <Check className="size-3.5 text-primary" />
                )}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => {
                setOpen(false)
                setDialogOpen(true)
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <Plus className="size-3.5" />
              New Project
            </button>
          </div>
        )}
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
