import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
  className,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none',
        'prose-headings:text-foreground prose-headings:font-semibold',
        'prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-1.5',
        'prose-a:text-blue prose-a:no-underline hover:prose-a:underline',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-code:text-blue prose-code:font-mono prose-code:text-xs',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
        'prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:my-2',
        'prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground',
        'prose-th:text-foreground prose-td:text-foreground/80',
        'prose-li:text-foreground/90',
        'prose-hr:border-border',
        'prose-ul:my-1.5 prose-ol:my-1.5',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
