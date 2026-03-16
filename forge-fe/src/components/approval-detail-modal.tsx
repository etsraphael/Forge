import { Dialog } from '@base-ui/react/dialog'
import { X, Check, XIcon } from 'lucide-react'

import type { Approval, ApprovalItemStatus } from '@/types'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import { PriorityDot } from '@/components/ui/priority-dot'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'

interface ApprovalDetailModalProps {
  approval: Approval | null
  onClose: () => void
  onItemAction: (itemId: string, action: ApprovalItemStatus) => void
  onBulkAction: (action: ApprovalItemStatus) => void
}

export function ApprovalDetailModal({
  approval,
  onClose,
  onItemAction,
  onBulkAction,
}: ApprovalDetailModalProps) {
  if (!approval) return null

  const pendingItems = approval.items.filter((i) => i.status === 'pending')

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    {approval.title}
                  </Dialog.Title>
                  <PriorityDot priority={approval.priority} showLabel />
                </div>
                <p className="text-sm text-muted-foreground">
                  {approval.source} &middot; {relativeTime(approval.createdAt)}
                </p>
              </div>
              <Dialog.Close
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={onClose}
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            {/* Items */}
            <div className="max-h-80 space-y-2 overflow-y-auto p-6">
              {approval.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <StatusBadge status={item.status}>
                        {item.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>{item.platform}</span>
                      {item.followers !== '—' && (
                        <span>{item.followers} followers</span>
                      )}
                      {item.engagement !== '—' && (
                        <span>{item.engagement} eng.</span>
                      )}
                      <span
                        className={cn(
                          'font-medium',
                          item.matchScore >= 90
                            ? 'text-green'
                            : item.matchScore >= 80
                              ? 'text-amber'
                              : 'text-muted-foreground',
                        )}
                      >
                        {item.matchScore}% match
                      </span>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-green hover:bg-green-dim"
                        onClick={() => onItemAction(item.id, 'approved')}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-red hover:bg-red-dim"
                        onClick={() => onItemAction(item.id, 'rejected')}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            {pendingItems.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  {pendingItems.length} pending item
                  {pendingItems.length !== 1 && 's'}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onBulkAction('rejected')}
                  >
                    Reject All
                  </Button>
                  <Button size="sm" onClick={() => onBulkAction('approved')}>
                    Approve All
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
