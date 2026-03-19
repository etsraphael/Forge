import { useState, useEffect, useRef } from 'react'
import { Send, Bot, Trash2, Plus, MessageSquare, Menu, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/chat/markdown-content'
import { TaskActionCard } from '@/components/chat/task-action-card'
import type { TaskActionResult } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  taskAction?: TaskActionResult
}

let msgCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`
}

function stripActionBlocks(content: string): string {
  return content.replace(/~~~forge-action[\s\S]*?~~~/g, '').trim()
}

interface Model {
  id: string
  label: string
  available: boolean
}

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: nextMsgId(),
    role: 'assistant',
    content:
      "Hey! I'm your Forge AI assistant. I can help you with tasks, answer questions about your projects, or just chat. What's on your mind?",
  },
]

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/* ─── Session Sidebar ─── */
interface SessionSidebarProps {
  sessions: ChatSession[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  open: boolean
  onClose: () => void
}

function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  open,
  onClose,
}: SessionSidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'flex w-56 shrink-0 flex-col border-r border-border bg-background',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            History
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onNew}
              title="New chat"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close sidebar"
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground md:hidden"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-center font-mono text-[11px] text-muted-foreground/60">
              No history yet
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  'group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  s.id === activeId
                    ? 'bg-surface-hover text-foreground'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                )}
              >
                <MessageSquare className="mt-0.5 size-3 shrink-0 opacity-50" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs leading-snug">
                    {s.title ?? 'Untitled'}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] opacity-50">
                    {relativeTime(s.updated_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(s.id)
                  }}
                  title="Delete"
                  className="mt-0.5 shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

/* ─── Model Selector ─── */
interface ModelSelectorProps {
  selected: string
  models: Model[]
  loading: boolean
  ollamaDown: boolean
  onChange: (id: string) => void
}

function ModelSelector({
  selected,
  models,
  loading,
  ollamaDown,
  onChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = models.find((m) => m.id === selected)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buttonLabel = loading
    ? 'Loading models…'
    : ollamaDown
      ? 'Ollama not running'
      : (current?.label ?? 'Select model')

  return (
    <div ref={ref} className="relative self-start">
      <button
        onClick={() => !loading && !ollamaDown && setOpen(!open)}
        disabled={loading || ollamaDown}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors',
          !loading &&
            !ollamaDown &&
            'hover:border-border-light hover:text-foreground',
          ollamaDown && 'border-red-500/40 text-red-400',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            loading
              ? 'bg-muted-foreground animate-pulse'
              : ollamaDown
                ? 'bg-red-400'
                : 'bg-green',
          )}
        />
        {buttonLabel}
        {!loading && !ollamaDown && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('transition-transform', open && 'rotate-180')}
          >
            <path d="M2 4L5 7L8 4" />
          </svg>
        )}
      </button>

      {open && models.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1.5 min-w-[200px] rounded-xl border border-border bg-card p-1.5 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-xs transition-colors cursor-pointer hover:bg-surface-hover',
                m.id === selected && 'bg-surface-hover',
              )}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-green" />
              <span className="flex-1 text-left text-foreground">
                {m.label}
              </span>
              <span className="rounded bg-green-dim px-1.5 py-0.5 text-[10px] text-green">
                Local
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Chat Page ─── */
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [ollamaDown, setOllamaDown] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/chat/models')
      .then((r) => r.json())
      .then(
        (
          data: {
            provider: string
            status: string
            models: { id: string; name: string }[]
          }[],
        ) => {
          const fetched: Model[] = data.flatMap((entry) =>
            entry.status === 'online'
              ? entry.models.map((m) => ({
                  id: m.id,
                  label: m.name,
                  available: true,
                }))
              : [],
          )
          if (fetched.length === 0) setOllamaDown(true)
          setModels(fetched)
          if (fetched.length > 0) setModel(fetched[0].id)
        },
      )
      .catch(() => setOllamaDown(true))
      .finally(() => setLoadingModels(false))
  }, [])

  useEffect(() => {
    fetch('/api/chat/sessions')
      .then((r) => r.json())
      .then((data: ChatSession[]) => setSessions(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function loadSession(id: string) {
    fetch(`/api/chat/sessions/${id}/messages`)
      .then((r) => r.json())
      .then(
        (
          rows: {
            role: 'user' | 'assistant' | 'system'
            content: string
            model?: string
          }[],
        ) => {
          setMessages(
            rows
              .filter((r) => r.role !== 'system')
              .map((r) => ({
                id: nextMsgId(),
                role: r.role as 'user' | 'assistant',
                content: r.content,
                model: r.model,
              })),
          )
          setActiveSessionId(id)
        },
      )
      .catch(() => {})
  }

  function deleteSession(id: string) {
    fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (activeSessionId === id) startNewChat()
      })
      .catch(() => {})
  }

  function startNewChat() {
    setMessages(INITIAL_MESSAGES)
    setActiveSessionId(null)
    setInput('')
  }

  async function handleSend() {
    if (!input.trim() || isGenerating || !model) return
    const text = input.trim()
    const history = [
      ...messages,
      { id: nextMsgId(), role: 'user' as const, content: text },
    ]
    setMessages(history)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsGenerating(true)

    setMessages((prev) => [
      ...prev,
      { id: nextMsgId(), role: 'assistant', content: '', model },
    ])

    try {
      const res = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          session_id: activeSessionId ?? undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let savedSessionId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event: Record<string, unknown>
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue // skip malformed line
          }
          if (event.type === 'error') {
            throw new Error(event.error as string)
          } else if (event.type === 'session' && event.session_id) {
            savedSessionId = event.session_id as string
            setActiveSessionId(event.session_id as string)
            // Prepend new session to sidebar if it's new
            if (!activeSessionId) {
              const title = text.slice(0, 60)
              setSessions((prev) => [
                {
                  id: event.session_id as string,
                  title,
                  updated_at: new Date().toISOString(),
                },
                ...prev,
              ])
            } else {
              // Update updated_at for existing session
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === event.session_id
                    ? { ...s, updated_at: new Date().toISOString() }
                    : s,
                ),
              )
            }
          } else if (event.type === 'token' && event.token) {
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + (event.token as string) },
              ]
            })
          } else if (event.type === 'task_action') {
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: stripActionBlocks(last.content),
                  taskAction: {
                    success: event.success,
                    action: event.action,
                    task: event.task,
                    deletedTask: event.deletedTask,
                    error: event.error,
                  } as TaskActionResult,
                },
              ]
            })
          }
        }
      }

      // Move the active session to top of list after completion
      if (savedSessionId) {
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === savedSessionId)
          if (idx <= 0) return prev
          const updated = [...prev]
          const [item] = updated.splice(idx, 1)
          return [{ ...item, updated_at: new Date().toISOString() }, ...updated]
        })
      }
    } catch {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            content: 'Error: could not reach the server. Is it running?',
          },
        ]
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const canSend = !!input.trim() && !isGenerating && !!model && !ollamaDown

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={(id) => {
          loadSession(id)
          setSidebarOpen(false)
        }}
        onDelete={deleteSession}
        onNew={() => {
          startNewChat()
          setSidebarOpen(false)
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Chat panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sidebar toggle */}
        <div className="flex items-center border-b border-border px-3 py-2 md:hidden">
          <button
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Menu className="size-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            Chat
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 md:gap-4 md:px-4 md:py-5">
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500 md:size-9 md:rounded-xl">
                  <Bot className="size-3 text-white md:size-4" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] px-3 py-2.5 sm:max-w-[72%] sm:px-4 sm:py-3 md:max-w-[60%]',
                  msg.role === 'user'
                    ? 'rounded-[18px_18px_4px_18px] bg-primary text-primary-foreground'
                    : 'rounded-[18px_18px_18px_4px] border border-border bg-card',
                )}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </p>
                ) : (
                  <div className="chat-markdown">
                    <MarkdownContent content={msg.content} />
                    {isGenerating && i === messages.length - 1 && (
                      <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-muted-foreground align-middle" />
                    )}
                    {msg.taskAction && (
                      <TaskActionCard result={msg.taskAction} />
                    )}
                  </div>
                )}
                {msg.model && (
                  <span
                    className={cn(
                      'mt-1.5 block font-mono text-[10px]',
                      msg.role === 'user'
                        ? 'text-primary-foreground/50'
                        : 'text-muted-foreground',
                    )}
                  >
                    {msg.model}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex flex-col gap-2 border-t border-border px-3 pb-2 pt-3 md:gap-2.5 md:px-4 md:pt-4">
          <ModelSelector
            selected={model}
            models={models}
            loading={loadingModels}
            ollamaDown={ollamaDown}
            onChange={setModel}
          />

          <div className="flex items-end gap-2.5">
            <div className="flex flex-1 items-end rounded-xl border border-border bg-card px-4 py-3 transition-colors focus-within:border-primary/50">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  const ta = e.target
                  ta.style.height = 'auto'
                  ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                placeholder="Ask anything about your project…"
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                style={{ maxHeight: 200 }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl transition-all',
                canSend
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_var(--color-accent-glow)] hover:opacity-90'
                  : 'cursor-default bg-card text-muted-foreground',
              )}
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
