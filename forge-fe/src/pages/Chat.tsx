import { useState, useEffect, useRef } from 'react'
import { Send, Bot } from 'lucide-react'

import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
}

interface Model {
  id: string
  label: string
  tag: string
  available: boolean
}

const MODELS: Model[] = [
  { id: 'llama3.2', label: 'Llama 3.2', tag: 'Local', available: true },
  { id: 'qwen2.5', label: 'Qwen 2.5', tag: 'Local', available: true },
  { id: 'deepseek-r1', label: 'DeepSeek R1', tag: 'Local', available: true },
  { id: 'gpt-4o', label: 'GPT-4o', tag: 'API', available: false },
  { id: 'claude', label: 'Claude Sonnet', tag: 'API', available: false },
]

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content:
      "Hey! I'm your Forge AI assistant. I can help you with tasks, answer questions about your projects, or just chat. What's on your mind?",
    model: 'llama3.2',
  },
]

/* ─── Model Selector ─── */
interface ModelSelectorProps {
  selected: string
  onChange: (id: string) => void
}

function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = MODELS.find((m) => m.id === selected)!

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative self-start">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-light hover:text-foreground"
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            current.available ? 'bg-green' : 'bg-muted-foreground',
          )}
        />
        {current.label}
        <span className="opacity-50">{current.tag}</span>
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
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 min-w-[200px] rounded-xl border border-border bg-card p-1.5 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
          {MODELS.map((m) => (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => {
                if (m.available) {
                  onChange(m.id)
                  setOpen(false)
                }
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-xs transition-colors',
                m.available
                  ? 'cursor-pointer hover:bg-surface-hover'
                  : 'cursor-default opacity-40',
                m.id === selected && 'bg-surface-hover',
              )}
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  m.available ? 'bg-green' : 'bg-muted-foreground',
                )}
              />
              <span className="flex-1 text-left text-foreground">
                {m.label}
              </span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px]',
                  m.available
                    ? 'bg-green-dim text-green'
                    : 'text-muted-foreground',
                )}
              >
                {m.available ? m.tag : 'Not configured'}
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
  const [model, setModel] = useState('llama3.2')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim()) return
    const text = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "This is a placeholder response. Once connected to Ollama at localhost:11434, I'll stream real completions from your local models.",
          model,
        },
      ])
    }, 800)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-3',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {msg.role === 'assistant' && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-500">
                <Bot className="size-4 text-white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[72%] px-4 py-3 sm:max-w-[60%]',
                msg.role === 'user'
                  ? 'rounded-[18px_18px_4px_18px] bg-primary text-primary-foreground'
                  : 'rounded-[18px_18px_18px_4px] border border-border bg-card',
              )}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
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
      <div className="flex flex-col gap-2.5 border-t border-border pb-2 pt-4">
        <ModelSelector selected={model} onChange={setModel} />

        <div className="flex items-center gap-2.5">
          <div className="flex flex-1 items-center rounded-xl border border-border bg-card px-4 py-3 transition-colors focus-within:border-primary/50">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask anything about your project…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl transition-all',
              input.trim()
                ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_var(--color-accent-glow)] hover:opacity-90'
                : 'cursor-default bg-card text-muted-foreground',
            )}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
