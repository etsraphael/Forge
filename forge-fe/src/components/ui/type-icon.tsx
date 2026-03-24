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
  size?: 'sm' | 'default'
  className?: string
}

export function TypeIcon({ type, size = 'default', className }: TypeIconProps) {
  const config = typeConfig[type] ?? typeConfig['system']
  const Icon = config.icon

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        size === 'sm' ? 'size-5 rounded-md' : 'size-8',
        config.color,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3' : 'size-4'} />
    </span>
  )
}
