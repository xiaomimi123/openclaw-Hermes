// MVP 对话页：顶部 sessionKey 条 + 中间消息流（ScrollArea）+ 底部 ChatInput。
// 后续 Phase 5+ 替换：左侧会话列表（ResizablePanel）、ModelSelector 选模型、历史拉取按钮等。

import { useCallback, useEffect, useRef } from 'react'
import { RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'

export function ChatPage() {
  const {
    sessionKey,
    messages,
    sending,
    error,
    model,
    sseConnected,
    send,
    fetchHistory,
    abort,
    setSessionKey,
    clear,
    setError,
  } = useChat()

  const bottomRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const handleClear = useCallback(() => {
    clear()
  }, [clear])

  return (
    <div className="flex h-full flex-col">
      {/* 顶部 sessionKey 条 */}
      <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">会话 Key</span>
        <Input
          data-testid="chat-session-key"
          value={sessionKey}
          onChange={(e) => setSessionKey(e.target.value)}
          placeholder="会话标识，如 agent:default:main"
          className="h-8 max-w-md font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={fetchHistory}
          disabled={!sessionKey || sending}
          data-testid="chat-fetch-history"
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          拉历史
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          disabled={messages.length === 0}
          data-testid="chat-clear"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          清空
        </Button>
        <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground" title="SSE 连接状态">
          {sseConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span>事件流已连接</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
              <span>事件流未连接</span>
            </>
          )}
        </div>
      </div>

      {/* 错误条 */}
      {error && (
        <div
          data-testid="chat-error"
          className="flex items-center justify-between border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs text-destructive"
        >
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <ScrollArea className="flex-1" data-testid="chat-history">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <div>还没有消息。在下方输入框开始对话。</div>
            <div className="text-[11px]">提示：先填会话 Key（OpenClaw session.create 创建），再发送</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* 输入框 */}
      <ChatInput
        onSend={send}
        onAbort={abort}
        sending={sending}
        model={model}
        disabled={!sessionKey}
      />
    </div>
  )
}
