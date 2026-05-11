// 灵境本地后端的 /api/agents 客户端（Phase 7 接入）。

import { http } from './http-client'

export interface AgentSummary {
  id: string
  name: string
  emoji?: string
  description?: string
  soulPath: string
  category: 'system' | 'user' | 'market'
  enabled: boolean
  usageCount: number
  lastUsedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface AgentDetail extends AgentSummary {
  soulMarkdown?: string
}

export interface ActivateResult {
  ok: boolean
  agent: AgentSummary
  writeResult?: unknown
  soulInjected: boolean
  message: string
}

export async function listAgents(): Promise<AgentSummary[]> {
  const res = await http<{ ok: boolean; agents?: AgentSummary[] }>('/api/agents')
  return res.agents ?? []
}

export async function getAgent(id: string): Promise<AgentDetail | null> {
  const res = await http<{ ok: boolean; agent?: AgentDetail }>(`/api/agents/${encodeURIComponent(id)}`)
  return res.agent ?? null
}

export async function activateAgent(id: string): Promise<ActivateResult> {
  return http<ActivateResult>(`/api/agents/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
  })
}
