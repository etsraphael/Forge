import {
  Search,
  BarChart3,
  FileCheck,
  Settings,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const typeConfig: Record<string, { icon: LucideIcon; color: string }> = {
  'creator-research': { icon: Search, color: 'text-blue bg-blue-dim' },
  competitive: { icon: BarChart3, color: 'text-amber bg-amber-dim' },
  review: { icon: FileCheck, color: 'text-green bg-green-dim' },
  system: { icon: Settings, color: 'text-muted-foreground bg-muted' },
  automation: { icon: Zap, color: 'text-primary bg-accent-glow' },
}

interface TypeIconProps {
  type: string
  className?: string
}

export function TypeIcon({ type, className }: TypeIconProps) {
  const config = typeConfig[type] ?? typeConfig['system']
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg',
        config.color,
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}
