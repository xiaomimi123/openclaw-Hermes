// useChat：编排 RPC 发送 + SSE 事件接收 + chat-store 状态更新。
// MVP 流程：
//   1. 用户提交文本 → 本地立即 append user message + 一条 streaming assistant 占位
//   2. POST /api/rpc 发送（异步）
//   3. /api/events SSE 监听 chat:* 事件，appendToLastAssistant 流式追加
//   4. 收到 chat:done / chat:replied 终态 → finalizeLastAssistant
//
// 不在 Phase 4 处理：agent phase 状态机、工具调用进度、watchdog 兜底（Phase 5）

import { useCallback, useEffect, useRef } from 'react'
import { openClaw } from '@/services/openclaw-rpc'
import { useChatStore, type ChatMessage } from '@/stores/chat-store'
import { useEventStream, type AgentEvent } from '@/hooks/useEventStream'

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useChat() {
  const store = useChatStore()
  const { events, connected } = useEventStream()
  const lastSeenSeqRef = useRef<number>(-1)
  const lastSeenIndexRef = useRef<number>(-1)

  // 监听 SSE 事件中的 chat 流
  useEffect(() => {
    if (events.length === 0) return
    // 仅处理新事件（避免组件重渲染时重放历史）
    for (let i = lastSeenIndexRef.current + 1; i < events.length; i++) {
      handleEvent(events[i])
    }
    lastSeenIndexRef.current = events.length - 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length])

  function handleEvent(evt: AgentEvent) {
    const name = evt.event ?? evt.type
    const payload = (evt.payload ?? {}) as Record<string, unknown>

    // 仅处理本会话事件
    const evtSessionKey = (payload.sessionKey ?? payload.key ?? payload.session) as string | undefined
    if (evtSessionKey && evtSessionKey !== store.sessionKey) return

    switch (name) {
      case 'chat:partial':
      case 'chat:delta':
      case 'chat:token': {
        const delta = (payload.delta ?? payload.chunk ?? payload.text ?? payload.content) as string | undefined
        if (typeof delta === 'string' && delta.length > 0) {
          store.appendToLastAssistant(delta)
        }
        break
      }
      case 'chat:replied':
      case 'chat:done':
      case 'chat:complete': {
        // 最终内容（如果有），覆盖 streaming
        const full = (payload.content ?? payload.text ?? payload.message) as string | undefined
        if (typeof full === 'string' && full.length > 0) {
          // 简单实现：用 full 替换 last assistant 内容
          const msgs = useChatStore.getState().messages
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant') {
            useChatStore.setState({
              messages: [...msgs.slice(0, -1), { ...last, content: full, streaming: false }],
            })
          }
        } else {
          store.finalizeLastAssistant()
        }
        store.setSending(false)
        break
      }
      case 'chat:error':
      case 'error': {
        const message = (payload.message ?? payload.error) as string | undefined
        store.setError(typeof message === 'string' ? message : 'Unknown chat error')
        store.finalizeLastAssistant()
        store.setSending(false)
        break
      }
      default:
        // 其他 event 留给 Phase 5（tool progress 等）
        break
    }
  }

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const sessionKey = useChatStore.getState().sessionKey
      if (!sessionKey) {
        store.setError('请先输入会话 Key')
        return
      }
      const idempotencyKey = uuid()
      const userMsg: ChatMessage = {
        id: idempotencyKey,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      }
      const assistantPlaceholder: ChatMessage = {
        id: `${idempotencyKey}-reply`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        streaming: true,
      }
      store.addMessage(userMsg)
      store.addMessage(assistantPlaceholder)
      store.setSending(true)
      store.setError(null)
      try {
        await openClaw.sendChat({
          sessionKey,
          message: trimmed,
          model: useChatStore.getState().model ?? undefined,
          idempotencyKey,
        })
        // 不立即 setSending(false) — 等 SSE 终态事件
      } catch (e) {
        store.setError(e instanceof Error ? e.message : String(e))
        store.removeMessageById(assistantPlaceholder.id)
        store.setSending(false)
      }
    },
    [store],
  )

  const fetchHistory = useCallback(async () => {
    const sessionKey = useChatStore.getState().sessionKey
    if (!sessionKey) return
    try {
      const rows = await openClaw.listChatHistory(sessionKey)
      const messages: ChatMessage[] = rows
        .filter((r) => typeof r.content === 'string' && r.content.length > 0)
        .map((r, idx) => ({
          id: typeof r.id === 'string' ? r.id : `hist-${idx}-${Date.now()}`,
          role: r.role,
          content: r.content,
          timestamp:
            typeof r.timestamp === 'string'
              ? r.timestamp
              : typeof r.timestamp === 'number'
                ? new Date(r.timestamp).toISOString()
                : new Date().toISOString(),
        }))
      store.setMessages(messages)
    } catch (e) {
      store.setError(e instanceof Error ? e.message : String(e))
    }
  }, [store])

  const abort = useCallback(async () => {
    const sessionKey = useChatStore.getState().sessionKey
    if (!sessionKey) return
    try {
      await openClaw.abortActiveRun(sessionKey)
      store.finalizeLastAssistant()
      store.setSending(false)
    } catch (e) {
      store.setError(e instanceof Error ? e.message : String(e))
    }
  }, [store])

  return {
    sessionKey: store.sessionKey,
    messages: store.messages,
    sending: store.sending,
    error: store.error,
    model: store.model,
    sseConnected: connected,
    send,
    fetchHistory,
    abort,
    setSessionKey: store.setSessionKey,
    setModel: store.setModel,
    clear: store.clear,
    setError: store.setError,
  }
}
