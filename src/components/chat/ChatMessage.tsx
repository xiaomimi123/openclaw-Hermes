// 单条对话消息渲染。Markdown + 代码高亮 + 复制按钮。
// 用户消息右对齐，AI 消息左对齐（不用气泡背景色——Claude.ai 风格）。

import { useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import type { ChatMessage as ChatMessageType } from '@/stores/chat-store'

interface ChatMessageProps {
  message: ChatMessageType
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }, [text])
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handle}
      className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
      aria-label="复制代码"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { isDark } = useTheme()
  const isUser = message.role === 'user'

  return (
    <div
      data-testid="chat-message"
      data-role={message.role}
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Body */}
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-full break-words',
            isUser ? 'text-right' : 'text-left',
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: {
                inline?: boolean
                className?: string
                children?: React.ReactNode
              } & React.HTMLAttributes<HTMLElement>) {
                const text = String(children ?? '').replace(/\n$/, '')
                const match = /language-(\w+)/.exec(className || '')
                if (inline || !match) {
                  return (
                    <code
                      className={cn(
                        'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]',
                        className,
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }
                return (
                  <div className="group relative my-2 overflow-hidden rounded-md border">
                    <div className="flex items-center justify-between border-b bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                      <span className="font-mono">{match[1]}</span>
                    </div>
                    <SyntaxHighlighter
                      language={match[1]}
                      style={isDark ? oneDark : oneLight}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '0.75rem', background: 'transparent', fontSize: '0.85em' }}
                    >
                      {text}
                    </SyntaxHighlighter>
                    <CopyButton text={text} />
                  </div>
                )
              },
            }}
          >
            {message.content || (message.streaming ? '…' : '')}
          </ReactMarkdown>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {message.streaming && <span className="mr-2 text-primary">正在生成…</span>}
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
        </div>
      </div>
    </div>
  )
}
