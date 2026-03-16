import { useState } from 'react'
import { ClipboardList, ListTodo, CheckCircle, Clock } from 'lucide-react'

import { approvals as initialApprovals, activity, weeklyStats } from '@/mock'
import { relativeTime, actionToStatus } from '@/lib/format'
import type { Approval, ApprovalItemStatus } from '@/types'
import { MetricCard } from '@/components/ui/metric-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityDot } from '@/components/ui/priority-dot'
import { ApprovalDetailModal } from '@/components/approval-detail-modal'

export default function Overview() {
  const [approvalData, setApprovalData] = useState<Approval[]>(initialApprovals)
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null,
  )

  const totalPending = approvalData.reduce(
    (sum, a) => sum + a.items.filter((i) => i.status === 'pending').length,
    0,
  )

  function handleItemAction(itemId: string, action: ApprovalItemStatus) {
    setApprovalData((prev) =>
      prev.map((a) => ({
        ...a,
        items: a.items.map((i) =>
          i.id === itemId ? { ...i, status: action } : i,
        ),
      })),
    )
    setSelectedApproval((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, status: action } : i,
            ),
          }
        : null,
    )
  }

  function handleBulkAction(action: ApprovalItemStatus) {
    if (!selectedApproval) return
    const pendingIds = selectedApproval.items
      .filter((i) => i.status === 'pending')
      .map((i) => i.id)

    setApprovalData((prev) =>
      prev.map((a) => ({
        ...a,
        items: a.items.map((i) =>
          pendingIds.includes(i.id) ? { ...i, status: action } : i,
        ),
      })),
    )
    setSelectedApproval((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.status === 'pending' ? { ...i, status: action } : i,
            ),
          }
        : null,
    )
  }

  return (
    <div>
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Good morning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You have {totalPending} item{totalPending !== 1 && 's'} awaiting
          review.
        </p>
      </div>

      {/* Metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Pending Reviews"
          value={totalPending}
          icon={ClipboardList}
        />
        <MetricCard label="Tasks Today" value={6} icon={ListTodo} />
        <MetricCard
          label="Approval Rate"
          value={`${weeklyStats.approvalRate}%`}
          icon={CheckCircle}
          trend={{ value: '+5%', positive: true }}
        />
        <MetricCard
          label="Avg Response Time"
          value={weeklyStats.avgResponseTime}
          icon={Clock}
          trend={{ value: '-0.3h', positive: true }}
        />
      </div>

      {/* Two-column body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Approval Queue */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Approval Queue</h2>
            {totalPending > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {totalPending}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {approvalData.map((approval) => {
              const pending = approval.items.filter(
                (i) => i.status === 'pending',
              ).length
              const approved = approval.items.filter(
                (i) => i.status === 'approved',
              ).length
              const rejected = approval.items.filter(
                (i) => i.status === 'rejected',
              ).length

              return (
                <button
                  key={approval.id}
                  onClick={() => setSelectedApproval(approval)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={approval.priority} />
                      <span className="font-medium text-foreground">
                        {approval.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(approval.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {approval.source} &middot; {approval.items.length} items
                    </span>
                    <div className="flex gap-2">
                      {pending > 0 && (
                        <StatusBadge status="pending" dot={false}>
                          {pending} pending
                        </StatusBadge>
                      )}
                      {approved > 0 && (
                        <StatusBadge status="approved" dot={false}>
                          {approved} approved
                        </StatusBadge>
                      )}
                      {rejected > 0 && (
                        <StatusBadge status="rejected" dot={false}>
                          {rejected} rejected
                        </StatusBadge>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-foreground">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={actionToStatus(entry.action)}>
                    {entry.action}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(entry.timestamp)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  {entry.subject}
                </p>
                <p className="text-sm text-muted-foreground">{entry.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <ApprovalDetailModal
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onItemAction={handleItemAction}
        onBulkAction={handleBulkAction}
      />
    </div>
  )
}
