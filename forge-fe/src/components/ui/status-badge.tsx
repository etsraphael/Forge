import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        active: 'bg-green-dim text-green',
        pending: 'bg-amber-dim text-amber',
        error: 'bg-red-dim text-red',
        idle: 'bg-muted text-muted-foreground',
        running: 'bg-blue-dim text-blue',
        approved: 'bg-green-dim text-green',
        rejected: 'bg-red-dim text-red',
        scheduled: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      status: 'idle',
    },
  },
)

type StatusBadgeProps = VariantProps<typeof statusBadgeVariants> & {
  className?: string
  children: React.ReactNode
  dot?: boolean
}

export function StatusBadge({
  status,
  className,
  children,
  dot = true,
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}
