import type { ActivityEntry } from '@/types'

export const activity: ActivityEntry[] = [
  {
    id: 'act-1',
    action: 'completed',
    subject: 'Fitness Creator Scan',
    detail: 'Found 3 new creators matching criteria',
    timestamp: '2026-03-16T08:30:00Z',
  },
  {
    id: 'act-2',
    action: 'approved',
    subject: 'Draft DM — Mike Torres',
    detail: 'Outreach message approved for sending',
    timestamp: '2026-03-16T07:45:00Z',
  },
  {
    id: 'act-3',
    action: 'failed',
    subject: 'Lifestyle Creator Scan',
    detail: 'Rate limit exceeded on Instagram API',
    timestamp: '2026-03-16T06:12:00Z',
  },
  {
    id: 'act-4',
    action: 'started',
    subject: 'Competitor Price Monitor',
    detail: 'Scheduled daily run initiated',
    timestamp: '2026-03-16T09:00:00Z',
  },
  {
    id: 'act-5',
    action: 'rejected',
    subject: 'Competitor Y new feature launch',
    detail: 'Marked as not relevant to current strategy',
    timestamp: '2026-03-15T16:30:00Z',
  },
  {
    id: 'act-6',
    action: 'completed',
    subject: 'Database Backup',
    detail: 'Backup completed — 2.4 GB archived',
    timestamp: '2026-03-16T02:05:00Z',
  },
  {
    id: 'act-7',
    action: 'scheduled',
    subject: 'Weekly Content Review',
    detail: 'Queued for Monday 8 AM',
    timestamp: '2026-03-15T12:00:00Z',
  },
]
