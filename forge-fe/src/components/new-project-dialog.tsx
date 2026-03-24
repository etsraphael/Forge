import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'
import { PROJECT_COLORS } from '@/lib/constants'
import { useProject } from '@/contexts/project-context'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
}

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const { createProject } = useProject()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0].value)
  const [saving, setSaving] = useState(false)

  function handleClose() {
    setName('')
    setColor(PROJECT_COLORS[0].value)
    onClose()
  }

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createProject(name.trim(), color)
      handleClose()
    } catch {
      // keep dialog open on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <Dialog.Title className="text-base font-semibold text-foreground">
              New Project
            </Dialog.Title>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Project name"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Color
                </label>
                <div className="flex gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        'size-7 cursor-pointer rounded-full transition-all',
                        c.value,
                        color === c.value
                          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                          : 'opacity-60 hover:opacity-100',
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || saving}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  name.trim() && !saving
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'cursor-not-allowed bg-primary/40 text-primary-foreground/50',
                )}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
