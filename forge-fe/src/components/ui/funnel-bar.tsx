import { cn } from '@/lib/utils'

interface FunnelSegment {
  label: string
  value: number
  color: string
}

interface FunnelBarProps {
  segments: FunnelSegment[]
  className?: string
}

export function FunnelBar({ segments, className }: FunnelBarProps) {
  const total = segments[0]?.value ?? 0

  return (
    <div className={cn('space-y-3', className)}>
      {segments.map((segment) => {
        const pct = total > 0 ? (segment.value / total) * 100 : 0
        return (
          <div key={segment.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="font-medium text-foreground">
                {segment.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  segment.color,
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
