import { useState } from 'react'
import { ChevronDown, Check, FolderOpen } from 'lucide-react'

import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  color: string
}

const projects: Project[] = [
  { id: '1', name: 'LiftOff', color: 'bg-primary' },
  { id: '2', name: 'Personal Site', color: 'bg-green' },
  { id: '3', name: 'Freelance', color: 'bg-amber' },
]

interface ProjectSwitcherProps {
  className?: string
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(projects[0])

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
      >
        <span className={cn('size-2 rounded-full', selected.color)} />
        <span className="font-medium text-foreground">{selected.name}</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelected(project)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              >
                <span className={cn('size-2 rounded-full', project.color)} />
                <span className="text-foreground">{project.name}</span>
                {project.id === selected.id && (
                  <Check className="ml-auto size-3.5 text-primary" />
                )}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <FolderOpen className="size-3.5" />
              All Projects
            </button>
          </div>
        </>
      )}
    </div>
  )
}
