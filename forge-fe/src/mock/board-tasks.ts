import type { BoardColumnDef, BoardTask } from '@/types'

export const boardColumns: BoardColumnDef[] = [
  { id: 'ideas', title: 'Ideas', color: '#a78bfa' },
  { id: 'todo', title: 'To Do', color: '#6c5ce7' },
  { id: 'in-progress', title: 'In Progress', color: '#38bdf8' },
  { id: 'review', title: 'Review', color: '#fbbf24' },
  { id: 'shipped', title: 'Shipped', color: '#34d399' },
]

export const boardTasks: BoardTask[] = [
  // Ideas
  {
    id: 'bt-1',
    title: 'Explore TikTok Shop integration',
    type: 'creator-research',
    column: 'ideas',
    priority: 'low',
    description: 'Research feasibility of TikTok Shop for creator partnerships',
    order: 0,
  },
  {
    id: 'bt-2',
    title: 'AI-powered outreach personalization',
    type: 'automation',
    column: 'ideas',
    priority: 'medium',
    description: 'Use LLMs to draft personalized outreach messages',
    order: 1,
  },
  {
    id: 'bt-3',
    title: 'Competitor pricing alerts',
    type: 'competitive',
    column: 'ideas',
    priority: 'low',
    description: 'Automated alerts when competitors change pricing',
    order: 2,
  },

  // To Do
  {
    id: 'bt-4',
    title: 'Build creator scoring model',
    type: 'creator-research',
    column: 'todo',
    priority: 'high',
    description: 'Score creators by engagement, relevance, and audience fit',
    order: 0,
  },
  {
    id: 'bt-5',
    title: 'Set up weekly performance digest',
    type: 'automation',
    column: 'todo',
    priority: 'medium',
    description: 'Automated email summary of campaign performance',
    order: 1,
  },
  {
    id: 'bt-6',
    title: 'Audit approval workflow',
    type: 'review',
    column: 'todo',
    priority: 'medium',
    description: 'Review current approval flow for bottlenecks',
    order: 2,
  },

  // In Progress
  {
    id: 'bt-7',
    title: 'Fitness creator pipeline',
    type: 'creator-research',
    column: 'in-progress',
    priority: 'high',
    description: 'Discover and screen fitness creators for Q2 campaign',
    order: 0,
  },
  {
    id: 'bt-8',
    title: 'Competitor price monitor',
    type: 'competitive',
    column: 'in-progress',
    priority: 'high',
    description: 'Track Rival Co and BrandSync pricing changes daily',
    order: 1,
  },
  {
    id: 'bt-9',
    title: 'Database backup automation',
    type: 'system',
    column: 'in-progress',
    priority: 'medium',
    description: 'Set up nightly backups with retention policy',
    order: 2,
  },

  // Review
  {
    id: 'bt-10',
    title: 'Q1 campaign report',
    type: 'review',
    column: 'review',
    priority: 'high',
    description: 'Compile results from Q1 creator campaigns',
    order: 0,
  },
  {
    id: 'bt-11',
    title: 'Outreach email templates',
    type: 'automation',
    column: 'review',
    priority: 'medium',
    description: 'Review new outreach templates before launch',
    order: 1,
  },

  // Shipped
  {
    id: 'bt-12',
    title: 'Lifestyle creator scan',
    type: 'creator-research',
    column: 'shipped',
    priority: 'medium',
    description: 'Identified 45 lifestyle creators for brand partnerships',
    order: 0,
  },
  {
    id: 'bt-13',
    title: 'Approval queue redesign',
    type: 'review',
    column: 'shipped',
    priority: 'high',
    description: 'Redesigned approval flow with bulk actions',
    order: 1,
  },
]
