import { cn } from '@/lib/utils'
import { CURRENT_PROJECT } from '@/lib/constants'

interface ProjectSwitcherProps {
  className?: string
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', CURRENT_PROJECT.color)} />
      <span className="font-medium text-foreground">
        {CURRENT_PROJECT.name}
      </span>
    </div>
  )
}
