import type { PipelineStage, CompetitorChange, WeeklyStats } from '@/types'

export const pipeline: PipelineStage[] = [
  { label: 'Discovered', value: 342, color: 'bg-chart-1' },
  { label: 'Screened', value: 185, color: 'bg-chart-2' },
  { label: 'Shortlisted', value: 64, color: 'bg-chart-3' },
  { label: 'Approved', value: 28, color: 'bg-chart-4' },
  { label: 'Contacted', value: 12, color: 'bg-chart-5' },
]

export const competitorChanges: CompetitorChange[] = [
  {
    id: 'cc-1',
    competitor: 'Rival Co',
    change: 'Dropped Pro plan price by 20%',
    severity: 'high',
    detectedAt: '2026-03-16T09:15:00Z',
  },
  {
    id: 'cc-2',
    competitor: 'BrandSync',
    change: 'Launched AI outreach feature',
    severity: 'high',
    detectedAt: '2026-03-15T11:00:00Z',
  },
  {
    id: 'cc-3',
    competitor: 'CreatorHub',
    change: 'Added TikTok Shop integration',
    severity: 'medium',
    detectedAt: '2026-03-14T15:30:00Z',
  },
  {
    id: 'cc-4',
    competitor: 'Rival Co',
    change: 'Updated terms of service',
    severity: 'low',
    detectedAt: '2026-03-13T08:00:00Z',
  },
]

export const weeklyStats: WeeklyStats = {
  tasksRun: 47,
  approvalRate: 82,
  avgResponseTime: '1.4h',
  creatorsFound: 23,
}
