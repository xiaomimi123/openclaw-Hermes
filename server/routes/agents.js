// /api/agents/* Agent 工作目录查询
// 原 server/index.js 第 720-744 行（含 getAgentWorkspace 辅助）。

import { Router } from 'express'
import { state } from '../lib/state.js'
import { authMiddleware } from '../lib/auth.js'
import { expandHomePath } from '../lib/path-utils.js'

const router = Router()

// Agent 工作目录缓存（60 秒过期）
const agentWorkspaceCache = new Map()

async function getAgentWorkspace(agentId) {
  if (agentWorkspaceCache.has(agentId)) {
    const cached = agentWorkspaceCache.get(agentId)
    if (Date.now() - cached.timestamp < 60000) {
      return cached.workspace
    }
  }

  if (!state.gateway?.isConnected) {
    return null
  }

  try {
    const result = await state.gateway.call('agents.files.list', { agentId })
    const workspace = result?.workspace || result?.dir || result?.path
    if (workspace) {
      agentWorkspaceCache.set(agentId, { workspace, timestamp: Date.now() })
    }
    return workspace
  } catch (e) {
    console.error('[Files] Failed to get agent workspace:', e.message)
    return null
  }
}

router.get('/api/agents/workspace', authMiddleware, async (req, res) => {
  try {
    const agentId = req.query.agentId || 'main'

    if (!state.gateway?.isConnected) {
      return res.status(503).json({ ok: false, error: { message: 'Gateway not connected' } })
    }

    const workspace = await getAgentWorkspace(agentId)

    if (!workspace) {
      return res.status(404).json({ ok: false, error: { message: 'Could not determine agent workspace' } })
    }

    res.json({
      ok: true,
      agentId,
      workspace,
      expandedPath: expandHomePath(workspace),
    })
  } catch (err) {
    console.error('[Agents] Workspace error:', err)
    res.status(500).json({ ok: false, error: { message: err.message } })
  }
})

export { getAgentWorkspace }
export default router
