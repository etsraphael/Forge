import { useState, useEffect } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'
import { PROJECT_COLORS } from '@/lib/constants'
import { useProject } from '@/contexts/project-context'

export default function Settings() {
  const { selectedProject, updateProject, deleteProject } = useProject()

  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (selectedProject) {
      setName(selectedProject.name)
      setColor(selectedProject.color)
      setSaved(false)
    }
  }, [selectedProject])

  if (!selectedProject) return null

  const hasChanges =
    name.trim() !== selectedProject.name || color !== selectedProject.color
  const canSave = name.trim() && hasChanges && !saving

  async function handleSave() {
    if (!canSave || !selectedProject) return
    setSaving(true)
    try {
      await updateProject(selectedProject.id, {
        name: name.trim(),
        color,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // keep form state on error
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedProject || deleting) return
    setDeleting(true)
    try {
      await deleteProject(selectedProject.id)
      setDeleteOpen(false)
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false)
    }
  }

  const isDefault = selectedProject.id === 'default'

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Project details */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">
          Project Details
        </h2>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Project name"
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

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              canSave
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'cursor-not-allowed bg-primary/40 text-primary-foreground/50',
            )}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && (
            <span className="text-xs text-green-500">Saved</span>
          )}
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 rounded-xl border border-red/40 bg-card p-5">
        <h2 className="text-base font-semibold text-red">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete this project and all of its data.
        </p>
        <button
          onClick={() => setDeleteOpen(true)}
          disabled={isDefault || saving}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            isDefault || saving
              ? 'cursor-not-allowed bg-red/20 text-red/40'
              : 'bg-red text-white hover:opacity-90',
          )}
        >
          Delete Project
        </button>
        {isDefault && (
          <p className="text-xs text-muted-foreground">
            The default project cannot be deleted.
          </p>
        )}
      </section>

      {/* Delete confirmation dialog */}
      <Dialog.Root open={deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(false)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
              <Dialog.Title className="text-base font-semibold text-foreground">
                Delete Project
              </Dialog.Title>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete{' '}
                <span className="font-medium text-foreground">
                  {selectedProject.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    deleting
                      ? 'cursor-not-allowed bg-red/40 text-white/50'
                      : 'bg-red text-white hover:opacity-90',
                  )}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
