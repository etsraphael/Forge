import type { ActivityAction } from '@/types'

export function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const absDiff = Math.abs(diffMs)
  const isFuture = diffMs < 0

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let label: string
  if (seconds < 60) label = 'just now'
  else if (minutes < 60) label = `${minutes}m`
  else if (hours < 24) label = `${hours}h`
  else if (days < 7) label = `${days}d`
  else label = new Date(isoString).toLocaleDateString()

  if (label === 'just now') return label
  return isFuture ? `in ${label}` : `${label} ago`
}

const actionStatusMap: Record<
  ActivityAction,
  | 'active'
  | 'pending'
  | 'error'
  | 'idle'
  | 'running'
  | 'approved'
  | 'rejected'
  | 'scheduled'
> = {
  approved: 'approved',
  rejected: 'rejected',
  completed: 'active',
  started: 'running',
  failed: 'error',
  scheduled: 'scheduled',
}

export function actionToStatus(action: ActivityAction) {
  return actionStatusMap[action]
}
