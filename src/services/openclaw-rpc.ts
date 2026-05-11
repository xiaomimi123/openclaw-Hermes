// OpenClaw RPC 客户端。所有调用走 Express /api/rpc 转发（白名单内方法）。
// Phase 4 MVP：仅暴露 chat 必需 5 方法。完整版（20+ 方法）从 src-vue-backup/api/rpc-client.ts
// 按需逐步移植——RPC 方法名带 fallback alias 链，新方法不在白名单时返回 ok:false（前端可识别）。

import { http, HttpError } from './http-client'

interface RpcEnvelope<T> {
  ok: boolean
  payload?: T
  error?: { message: string }
}

/**
 * 调用单个 RPC 方法。
 * @throws HttpError 网络/系统错误（500、5xx 等）
 * @returns { ok: false, message } 业务错误（unknown method 等，前端可做 fallback）
 */
export async function callRPC<T = unknown>(
  method: string,
  params?: object,
): Promise<{ ok: true; payload: T } | { ok: false; message: string }> {
  try {
    const env = await http<RpcEnvelope<T>>('/api/rpc', {
      method: 'POST',
      body: { method, params },
    })
    if (env.ok && env.payload !== undefined) return { ok: true, payload: env.payload }
    if (env.ok) return { ok: true, payload: undefined as T }
    return { ok: false, message: env.error?.message ?? `RPC ${method} failed` }
  } catch (e) {
    if (e instanceof HttpError) {
      // 网络/系统错误，向上抛
      throw e
    }
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * 调用 RPC，从候选方法名顺序尝试，第一个非业务错误的返回即用。
 * 用于兼容不同 Gateway 版本的方法重命名（如 'sessions.send' vs 'session.send'）。
 */
export async function callRPCWithFallback<T = unknown>(
  methodCandidates: string[],
  paramsCandidates: object[],
): Promise<T> {
  let lastErr = 'no candidate matched'
  for (const method of methodCandidates) {
    for (const params of paramsCandidates) {
      const res = await callRPC<T>(method, params)
      if (res.ok) return res.payload
      // 业务错误（unknown method 等），尝试下一组
      lastErr = res.message
    }
  }
  throw new Error(lastErr)
}

// ============ Chat-related RPC ============

export interface ChatSendParams {
  sessionKey: string
  message: string
  model?: string
  idempotencyKey?: string
}

export interface ChatMessageRow {
  id?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp?: string | number
  [k: string]: unknown
}

export const openClaw = {
  /** 获取 Gateway 当前状态 */
  status() {
    return callRPC('status')
  },

  /** 发送聊天消息（含 fallback 方法链） */
  async sendChat(params: ChatSendParams): Promise<unknown> {
    const idempotencyKey =
      params.idempotencyKey || `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const model = params.model?.trim()
    const basePayload: Record<string, unknown> = {
      sessionKey: params.sessionKey,
      message: params.message,
      idempotencyKey,
    }
    if (model) basePayload.modelRef = model

    return callRPCWithFallback(
      ['sessions.send', 'session.send', 'chat.send'],
      [
        basePayload,
        { ...basePayload, input: params.message },
        { key: params.sessionKey, message: params.message, idempotencyKey, ...(model ? { modelRef: model } : {}) },
        { sessionKey: params.sessionKey, text: params.message, idempotencyKey },
      ],
    )
  },

  /** 拉取历史消息 */
  async listChatHistory(sessionKey: string): Promise<ChatMessageRow[]> {
    const payload = await callRPCWithFallback<unknown>(
      ['chat.history', 'sessions.history', 'session.history', 'sessions.get', 'session.get'],
      [{ sessionKey }, { key: sessionKey }, { session: sessionKey }],
    )
    return normalizeHistory(payload)
  },

  /** 列出所有会话（前端会话切换器用） */
  async listSessions(): Promise<unknown[]> {
    const payload = await callRPCWithFallback<unknown>(
      ['sessions.list', 'session.list', 'sessions'],
      [{}],
    )
    if (Array.isArray(payload)) return payload
    const rec = payload as Record<string, unknown>
    const list = rec?.items ?? rec?.list ?? rec?.sessions ?? rec?.data
    return Array.isArray(list) ? list : []
  },

  /** 中断当前 run（PRD 中按需，Phase 4 留接口占位） */
  async abortActiveRun(sessionKey: string): Promise<void> {
    await callRPCWithFallback(
      ['sessions.abort', 'session.abort', 'chat.abort'],
      [{ sessionKey }, { key: sessionKey }, { session: sessionKey }],
    )
  },

  // ============ Session 管理 ============

  /** 创建新会话（OpenClaw 称 'spawn'） */
  async spawnSession(params: { agentId?: string; channel?: string; peer?: string; label?: string }): Promise<{ sessionKey: string }> {
    const result = await callRPCWithFallback<{ sessionKey?: string; key?: string }>(
      ['sessions.spawn', 'session.spawn'],
      [
        {
          ...(params.agentId ? { agentId: params.agentId } : {}),
          ...(params.channel ? { channel: params.channel } : {}),
          ...(params.peer ? { peer: params.peer } : {}),
          ...(params.label ? { label: params.label } : {}),
        },
      ],
    )
    const sessionKey =
      result?.sessionKey ||
      result?.key ||
      `agent:${params.agentId || 'main'}:${params.channel || 'main'}:dm:${params.peer || `web-${Date.now()}`}`
    return { sessionKey }
  },

  /** 删除会话 */
  async deleteSession(sessionKey: string): Promise<void> {
    await callRPCWithFallback(
      ['sessions.delete', 'session.delete'],
      [{ key: sessionKey }, { sessionKey }],
    )
  },

  /** 重置会话（清空历史） */
  async resetSession(sessionKey: string): Promise<void> {
    await callRPCWithFallback(
      ['sessions.reset', 'session.reset'],
      [{ key: sessionKey, reason: 'reset' }, { key: sessionKey }, { sessionKey }],
    )
  },

  // ============ 模型管理 ============

  /** 列出可用模型 */
  async listModels(): Promise<ModelInfo[]> {
    const payload = await callRPCWithFallback<unknown>(
      ['models.list', 'model.list'],
      [{}],
    )
    return normalizeModelList(payload)
  },

  /** 设置某会话使用的模型 */
  async setAgentModel(sessionKey: string, model: string): Promise<void> {
    await callRPC('agent.model.set', { sessionKey, model })
  },
}

// ============ Types ============

export interface ModelInfo {
  id: string
  name?: string
  provider?: string
  description?: string
  [k: string]: unknown
}

function normalizeModelList(payload: unknown): ModelInfo[] {
  let list: unknown[] = []
  if (Array.isArray(payload)) list = payload
  else if (payload && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>
    for (const key of ['models', 'items', 'list', 'data', 'entries']) {
      const arr = rec[key]
      if (Array.isArray(arr)) { list = arr; break }
    }
  }
  return list
    .map((item): ModelInfo | null => {
      if (typeof item === 'string') return { id: item, name: item }
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const id = (r.id ?? r.ref ?? r.model ?? r.name) as string | undefined
      if (!id || typeof id !== 'string') return null
      return {
        id,
        name: typeof r.name === 'string' ? r.name : id,
        provider: typeof r.provider === 'string' ? r.provider : undefined,
        description: typeof r.description === 'string' ? r.description : undefined,
        ...r,
      }
    })
    .filter((m): m is ModelInfo => m !== null)
}

function normalizeHistory(payload: unknown): ChatMessageRow[] {
  if (Array.isArray(payload)) return payload as ChatMessageRow[]
  const rec = payload as Record<string, unknown> | null
  if (!rec) return []
  const candidates = ['messages', 'history', 'items', 'list', 'data']
  for (const key of candidates) {
    const arr = rec[key]
    if (Array.isArray(arr)) return arr as ChatMessageRow[]
  }
  return []
}
