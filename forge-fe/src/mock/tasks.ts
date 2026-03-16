import type { Task } from '@/types'

export const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Fitness Creator Scan',
    type: 'creator-research',
    schedule: 'Every 6 hours',
    lastRun: '2026-03-16T06:00:00Z',
    nextRun: '2026-03-16T12:00:00Z',
    status: 'active',
    description:
      'Scans Instagram, TikTok, and YouTube for fitness creators matching brand criteria.',
  },
  {
    id: 'task-2',
    name: 'Competitor Price Monitor',
    type: 'competitive',
    schedule: 'Daily at 9 AM',
    lastRun: '2026-03-16T09:00:00Z',
    nextRun: '2026-03-17T09:00:00Z',
    status: 'active',
    description:
      'Monitors competitor pricing pages and alerts on changes above 5%.',
  },
  {
    id: 'task-3',
    name: 'Weekly Content Review',
    type: 'review',
    schedule: 'Mondays at 8 AM',
    lastRun: '2026-03-09T08:00:00Z',
    nextRun: '2026-03-16T08:00:00Z',
    status: 'scheduled',
    description:
      'Aggregates creator content from the past week for quality review.',
  },
  {
    id: 'task-4',
    name: 'Outreach Email Generator',
    type: 'automation',
    schedule: 'On approval',
    lastRun: '2026-03-15T14:15:00Z',
    nextRun: '—',
    status: 'idle',
    description:
      'Generates personalized outreach emails when a creator batch is approved.',
  },
  {
    id: 'task-5',
    name: 'Database Backup',
    type: 'system',
    schedule: 'Daily at 2 AM',
    lastRun: '2026-03-16T02:00:00Z',
    nextRun: '2026-03-17T02:00:00Z',
    status: 'active',
    description: 'Backs up PostgreSQL database to S3-compatible storage.',
  },
  {
    id: 'task-6',
    name: 'Lifestyle Creator Scan',
    type: 'creator-research',
    schedule: 'Every 12 hours',
    lastRun: null,
    nextRun: '2026-03-16T18:00:00Z',
    status: 'error',
    description:
      'Scans platforms for lifestyle creators. Last run failed due to rate limiting.',
  },
]
