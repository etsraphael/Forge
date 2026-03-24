import { cn } from '@/lib/utils'

const priorityConfig = {
  high: { color: 'bg-red', label: 'High' },
  medium: { color: 'bg-amber', label: 'Medium' },
  low: { color: 'bg-green', label: 'Low' },
} as const

type Priority = keyof typeof priorityConfig

interface PriorityDotProps {
  priority: Priority
  showLabel?: boolean
  className?: string
}

export function PriorityDot({
  priority,
  showLabel = false,
  className,
}: PriorityDotProps) {
  const config = priorityConfig[priority]

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', config.color)}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </span>
  )
}
