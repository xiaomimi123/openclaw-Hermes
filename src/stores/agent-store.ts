// Agent store。列表从本地后端拉，activeAgentId 持久化。

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { listAgents, activateAgent, type AgentSummary } from '@/services/agents-api'

interface AgentState {
  agents: AgentSummary[]
  loading: boolean
  error: string | null
  activeAgentId: string | null
  activating: string | null

  fetch: () => Promise<void>
  activate: (id: string) => Promise<{ ok: boolean; soulInjected: boolean; message: string }>
  getActive: () => AgentSummary | undefined
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],
      loading: false,
      error: null,
      activeAgentId: null,
      activating: null,

      async fetch() {
        set({ loading: true, error: null })
        try {
          const agents = await listAgents()
          set({ agents, loading: false })
        } catch (e) {
          set({ error: e instanceof Error ? e.message : String(e), loading: false })
        }
      },

      async activate(id) {
        set({ activating: id, error: null })
        try {
          const res = await activateAgent(id)
          set((s) => ({
            activeAgentId: id,
            // 同步更新列表里的 usageCount/lastUsedAt
            agents: s.agents.map((a) => (a.id === id ? res.agent : a)),
            activating: null,
          }))
          return { ok: res.ok, soulInjected: res.soulInjected, message: res.message }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          set({ error: message, activating: null })
          return { ok: false, soulInjected: false, message }
        }
      },

      getActive() {
        const id = get().activeAgentId
        if (!id) return undefined
        return get().agents.find((a) => a.id === id)
      },
    }),
    {
      name: 'lingjing-agents',
      partialize: (s) => ({ activeAgentId: s.activeAgentId }),
    },
  ),
)
