import {
  Workflow,
  Radar,
  BarChart3,
  Clock,
  CheckCircle,
  UserSearch,
  ListTodo,
} from 'lucide-react'

import { pipeline, competitorChanges, weeklyStats } from '@/mock'
import { relativeTime } from '@/lib/format'
import { FunnelBar } from '@/components/ui/funnel-bar'
import { MetricCard } from '@/components/ui/metric-card'
import { PriorityDot } from '@/components/ui/priority-dot'

export default function Insights() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Insights</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Creator Pipeline */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-foreground">
              <Workflow className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Creator Pipeline</h2>
            </div>
            <FunnelBar segments={pipeline} className="mt-4" />
          </div>

          {/* Weekly Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-foreground">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Weekly Summary</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <MetricCard
                label="Tasks Run"
                value={weeklyStats.tasksRun}
                icon={ListTodo}
              />
              <MetricCard
                label="Approval Rate"
                value={`${weeklyStats.approvalRate}%`}
                icon={CheckCircle}
                trend={{ value: '+5%', positive: true }}
              />
              <MetricCard
                label="Avg Response"
                value={weeklyStats.avgResponseTime}
                icon={Clock}
              />
              <MetricCard
                label="Creators Found"
                value={weeklyStats.creatorsFound}
                icon={UserSearch}
                trend={{ value: '+8', positive: true }}
              />
            </div>
          </div>
        </div>

        {/* Right column — Competitive Radar */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-foreground">
            <Radar className="size-4 text-muted-foreground" />
            <h2 className="font-semibold">Competitive Radar</h2>
          </div>
          <div className="mt-4 space-y-4">
            {competitorChanges.map((change) => (
              <div
                key={change.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
              >
                <PriorityDot
                  priority={change.severity}
                  className="mt-1.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    {change.competitor}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {change.change}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(change.detectedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
