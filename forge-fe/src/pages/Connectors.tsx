import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BrainCircuit,
  ChevronDown,
  Github,
  GitBranch,
  Lock,
  Plus,
  Search,
  Trash2,
  Power,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnectorCategory = 'llm' | 'repository'

interface Connector {
  id: string
  provider: string
  enabled: boolean
  config: Record<string, string> & { category: ConnectorCategory }
}

interface ProviderStatus {
  provider: string
  status: 'online' | 'offline' | 'error'
  models: {
    id: string
    name: string
    parameterSize?: string
    family?: string
    quantization?: string
  }[]
  error?: string
}

interface FieldDef {
  key: string
  label: string
  placeholder: string
  type?: string
}

interface Template {
  id: string
  label: string
  fields: FieldDef[]
  oauth?: boolean
}

const TEMPLATES: Record<ConnectorCategory, Template[]> = {
  llm: [
    {
      id: 'ollama',
      label: 'Ollama',
      fields: [
        {
          key: 'baseUrl',
          label: 'Base URL',
          placeholder: 'http://localhost:11434',
        },
      ],
    },
    {
      id: 'lmstudio',
      label: 'LM Studio',
      fields: [
        {
          key: 'baseUrl',
          label: 'Base URL',
          placeholder: 'http://localhost:1234',
        },
        {
          key: 'apiKey',
          label: 'API Key',
          placeholder: 'lm-studio',
          type: 'password',
        },
      ],
    },
  ],
  repository: [
    {
      id: 'github',
      label: 'GitHub',
      fields: [],
      oauth: true,
    },
    {
      id: 'local-git',
      label: 'Local Git',
      fields: [
        {
          key: 'path',
          label: 'Repository Path',
          placeholder: '/home/user/projects/myrepo',
        },
      ],
    },
  ],
}

const CATEGORY_META: Record<
  ConnectorCategory,
  {
    label: string
    icon: React.ElementType
    description: string
    color: string
    iconBg: string
  }
> = {
  llm: {
    label: 'LLM Providers',
    icon: BrainCircuit,
    description: 'Local and remote language model servers',
    color: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
  },
  repository: {
    label: 'Code Repositories',
    icon: GitBranch,
    description: 'Git repos the LLM can read and analyze',
    color: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
  },
}

interface AddFormProps {
  category: ConnectorCategory
  onSave: (provider: string, config: Record<string, string>) => Promise<void>
  onCancel: () => void
}

interface GitHubRepo {
  fullName: string
  private: boolean
  description: string | null
  language: string | null
  updatedAt: string
}

function GitHubOAuthForm({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (config: Record<string, string>) => void
  onCancel: () => void
  saving: boolean
}) {
  const [oauthToken, setOauthToken] = useState<string | null>(null)
  const [githubUser, setGithubUser] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repoSearch, setRepoSearch] = useState('')
  const popupRef = useRef<Window | null>(null)
  const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanupPopup = useCallback(() => {
    if (popupPollRef.current) {
      clearInterval(popupPollRef.current)
      popupPollRef.current = null
    }
    popupRef.current = null
  }, [])

  // Listen for OAuth postMessage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'github-oauth-success') {
        setOauthToken(event.data.token)
        setOauthLoading(false)
        setError(null)
        cleanupPopup()
      } else if (event.data?.type === 'github-oauth-error') {
        setOauthLoading(false)
        setError(event.data.error || 'Authorization failed')
        cleanupPopup()
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      cleanupPopup()
    }
  }, [cleanupPopup])

  // Fetch repos once we have a token
  useEffect(() => {
    if (!oauthToken) return
    setReposLoading(true)
    fetch('/api/github/oauth/repos?per_page=100', {
      headers: { Authorization: `Bearer ${oauthToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setGithubUser(data.user)
        setRepos(data.repos || [])
      })
      .catch(() => setError('Failed to load repositories'))
      .finally(() => setReposLoading(false))
  }, [oauthToken])

  const handleConnect = async () => {
    setOauthLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/github/oauth/authorize')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setOauthLoading(false)
        return
      }
      const popup = window.open(
        data.url,
        'github-oauth',
        'width=600,height=700',
      )
      popupRef.current = popup

      // Poll for popup closed without completing auth
      popupPollRef.current = setInterval(() => {
        if (popup && popup.closed) {
          cleanupPopup()
          setOauthLoading((loading) => {
            if (loading) setError('Authorization window was closed')
            return false
          })
        }
      }, 500)
    } catch {
      setError('Failed to start authorization')
      setOauthLoading(false)
    }
  }

  const handleSave = () => {
    if (oauthToken && selectedRepo) {
      onSave({ token: oauthToken, repo: selectedRepo })
    }
  }

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()),
  )

  return (
    <div className="space-y-3 p-4">
      {!oauthToken ? (
        /* Not connected — show Connect button */
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            type="button"
            onClick={handleConnect}
            disabled={oauthLoading}
            className="flex items-center gap-2 rounded-lg bg-[#24292f] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {oauthLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Github className="size-4" />
            )}
            {oauthLoading ? 'Authorizing…' : 'Connect GitHub'}
          </button>
          <p className="text-xs text-muted-foreground">
            Sign in with GitHub to select a repository
          </p>
        </div>
      ) : (
        /* Connected — show user + repo selector */
        <>
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400">
            <CheckCircle2 className="size-3.5 shrink-0" />
            Connected as @{githubUser}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Select repository
            </label>
            {reposLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading repositories…
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Search repositories…"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background">
                  {filteredRepos.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No repositories found
                    </p>
                  ) : (
                    filteredRepos.map((r) => (
                      <button
                        key={r.fullName}
                        type="button"
                        onClick={() => setSelectedRepo(r.fullName)}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50',
                          selectedRepo === r.fullName &&
                            'bg-primary/10 text-primary',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">
                              {r.fullName}
                            </span>
                            {r.private && (
                              <Lock className="size-3 shrink-0 text-muted-foreground" />
                            )}
                          </div>
                          {r.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {r.description}
                            </p>
                          )}
                        </div>
                        {r.language && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {r.language}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          <XCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !oauthToken || !selectedRepo}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save connector'}
        </button>
      </div>
    </div>
  )
}

function AddForm({ category, onSave, onCancel }: AddFormProps) {
  const templates = TEMPLATES[category]
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleTemplateChange = (id: string) => {
    const t = templates.find((t) => t.id === id)!
    setSelectedTemplate(t)
    setFields({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(selectedTemplate.id, fields)
    setSaving(false)
  }

  const handleOAuthSave = async (config: Record<string, string>) => {
    setSaving(true)
    await onSave(selectedTemplate.id, config)
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/20"
    >
      {/* Template picker */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2.5">
        <span className="mr-2 text-xs text-muted-foreground">Provider:</span>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTemplateChange(t.id)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-all',
              selectedTemplate.id === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OAuth flow for GitHub */}
      {selectedTemplate.oauth ? (
        <GitHubOAuthForm
          onSave={handleOAuthSave}
          onCancel={onCancel}
          saving={saving}
        />
      ) : (
        <>
          {/* Fields */}
          <div className="space-y-3 p-4">
            {selectedTemplate.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {f.label}
                </label>
                <input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={fields[f.key] ?? ''}
                  onChange={(e) =>
                    setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/10 px-4 py-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save connector'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

interface CategorySectionProps {
  category: ConnectorCategory
  connectors: Connector[]
  onAdd: (
    category: ConnectorCategory,
    provider: string,
    config: Record<string, string>,
  ) => Promise<void>
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  providerStatuses?: ProviderStatus[]
  connectorStatuses?: Record<string, { status: string; detail: string }>
}

function CategorySection({
  category,
  connectors,
  onAdd,
  onToggle,
  onDelete,
  providerStatuses,
  connectorStatuses,
}: CategorySectionProps) {
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const meta = CATEGORY_META[category]
  const Icon = meta.icon

  const handleSave = async (
    provider: string,
    config: Record<string, string>,
  ) => {
    await onAdd(category, provider, config)
    setAdding(false)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              meta.iconBg,
            )}
          >
            <Icon className={cn('size-4', meta.color)} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {meta.label}
            </h2>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            adding
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {adding ? <X className="size-3" /> : <Plus className="size-3" />}
          {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-4 pb-4">
          <AddForm
            category={category}
            onSave={handleSave}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Connector list */}
      {connectors.length > 0 ? (
        <div className="border-t border-border">
          {connectors.map((c, i) => {
            const detail =
              c.config.baseUrl ?? c.config.url ?? c.config.path ?? c.config.repo
            const ps = providerStatuses?.find((p) => p.provider === c.provider)
            const cs = connectorStatuses?.[c.id]
            const isExpanded = expandedId === c.id
            const resolvedStatus = cs?.status ?? ps?.status
            const statusDot =
              resolvedStatus === 'online'
                ? 'bg-green-500'
                : resolvedStatus === 'offline'
                  ? 'bg-amber-500'
                  : resolvedStatus === 'error'
                    ? 'bg-red-500'
                    : c.enabled
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/40'
            return (
              <div
                key={c.id}
                className={cn(
                  i < connectors.length - 1 && 'border-b border-border',
                )}
              >
                <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        statusDot,
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {c.provider.replace(/-/g, ' ')}
                        </span>
                        {ps?.status === 'online' && ps.models.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : c.id)
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                          >
                            {ps.models.length} model
                            {ps.models.length !== 1 && 's'}
                            <ChevronDown
                              className={cn(
                                'size-2.5 transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </button>
                        )}
                        {resolvedStatus === 'online' && cs?.detail && (
                          <span className="text-[10px] font-medium text-green-400">
                            {cs.detail}
                          </span>
                        )}
                        {resolvedStatus === 'offline' && (
                          <span className="text-[10px] font-medium text-amber-400">
                            Offline
                          </span>
                        )}
                        {resolvedStatus === 'error' && (
                          <span className="text-[10px] font-medium text-red-400">
                            {cs?.detail || 'Error'}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <p className="truncate text-xs text-muted-foreground">
                          {detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 ml-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                        c.enabled
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {c.enabled ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => onToggle(c.id, !c.enabled)}
                      title={c.enabled ? 'Disable' : 'Enable'}
                      className={cn(
                        'ml-1 rounded-md p-1.5 transition-colors',
                        c.enabled
                          ? 'text-green-400 hover:bg-green-500/10'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Power className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(c.id)}
                      title="Delete"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded model list */}
                {isExpanded && ps && ps.models.length > 0 && (
                  <div className="border-t border-border/50 bg-muted/10 px-4 py-2">
                    {ps.models.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 py-1.5 text-xs"
                      >
                        <span className="size-1 shrink-0 rounded-full bg-violet-400/60" />
                        <span className="font-medium text-foreground">
                          {m.name}
                        </span>
                        {m.parameterSize && (
                          <span className="text-muted-foreground">
                            {m.parameterSize}
                          </span>
                        )}
                        {m.quantization && (
                          <span className="text-muted-foreground/60">
                            {m.quantization}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        !adding && (
          <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-6">
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-xl',
                meta.iconBg,
              )}
            >
              <Icon className={cn('size-5', meta.color, 'opacity-50')} />
            </div>
            <p className="text-xs text-muted-foreground">
              No {meta.label.toLowerCase()} configured
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-1 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" />
              Add one now
            </button>
          </div>
        )
      )}

      {/* Auto-detected providers */}
      {providerStatuses &&
        providerStatuses.length > 0 &&
        (() => {
          const configuredNames = new Set(connectors.map((c) => c.provider))
          const unmatched = providerStatuses.filter(
            (ps) => ps.status === 'online' && !configuredNames.has(ps.provider),
          )
          if (unmatched.length === 0) return null
          return (
            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Auto-detected
              </p>
              {unmatched.map((ps) => {
                const isExpanded = expandedId === `auto-${ps.provider}`
                return (
                  <div key={ps.provider}>
                    <div className="flex items-center gap-3 py-2">
                      <div className="size-1.5 shrink-0 rounded-full bg-green-500" />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {ps.provider}
                        </span>
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-green-400">
                          Online
                        </span>
                        {ps.models.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedId(
                                isExpanded ? null : `auto-${ps.provider}`,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                          >
                            {ps.models.length} model
                            {ps.models.length !== 1 && 's'}
                            <ChevronDown
                              className={cn(
                                'size-2.5 transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && ps.models.length > 0 && (
                      <div className="mb-1 ml-4 rounded-lg bg-muted/10 px-3 py-1.5">
                        {ps.models.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 py-1.5 text-xs"
                          >
                            <span className="size-1 shrink-0 rounded-full bg-violet-400/60" />
                            <span className="font-medium text-foreground">
                              {m.name}
                            </span>
                            {m.parameterSize && (
                              <span className="text-muted-foreground">
                                {m.parameterSize}
                              </span>
                            )}
                            {m.quantization && (
                              <span className="text-muted-foreground/60">
                                {m.quantization}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
    </div>
  )
}

export default function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([])
  const [connectorStatuses, setConnectorStatuses] = useState<
    Record<string, { status: string; detail: string }>
  >({})

  useEffect(() => {
    fetch('/api/connectors')
      .then((r) => r.json())
      .then((data: Connector[]) => {
        setConnectors(data)
        // Fetch status for each enabled repository connector
        data
          .filter((c) => c.config.category === 'repository' && c.enabled)
          .forEach((c) => {
            fetch(`/api/connectors/${c.id}/status`)
              .then((r) => r.json())
              .then((s) =>
                setConnectorStatuses((prev) => ({
                  ...prev,
                  [c.id]: s,
                })),
              )
              .catch(console.error)
          })
      })
      .catch(console.error)
    fetch('/api/chat/models')
      .then((r) => r.json())
      .then(setProviderStatuses)
      .catch(console.error)
  }, [])

  const byCategory = (cat: ConnectorCategory) =>
    connectors.filter((c) => c.config.category === cat)

  const handleAdd = async (
    category: ConnectorCategory,
    provider: string,
    config: Record<string, string>,
  ) => {
    const res = await fetch('/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, category, config }),
    })
    const created: Connector = await res.json()
    setConnectors((prev) => [...prev, created])
  }

  const handleToggle = (id: string, enabled: boolean) => {
    fetch(`/api/connectors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
      .then((r) => r.json())
      .then((updated: Connector) =>
        setConnectors((prev) => prev.map((c) => (c.id === id ? updated : c))),
      )
      .catch(console.error)
  }

  const handleDelete = (id: string) => {
    fetch(`/api/connectors/${id}`, { method: 'DELETE' })
      .then(() => setConnectors((prev) => prev.filter((c) => c.id !== id)))
      .catch(console.error)
  }

  const totalActive = connectors.filter((c) => c.enabled).length

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure integrations for LLM providers and code repositories.
          </p>
        </div>
        {connectors.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-green-500" />
            {totalActive} of {connectors.length} active
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {(['llm', 'repository'] as ConnectorCategory[]).map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            connectors={byCategory(cat)}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onDelete={handleDelete}
            providerStatuses={cat === 'llm' ? providerStatuses : undefined}
            connectorStatuses={
              cat === 'repository' ? connectorStatuses : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
