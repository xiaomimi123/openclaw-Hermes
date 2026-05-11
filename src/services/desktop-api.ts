// 远程桌面 API。走本地 Express /api/desktop/*（Phase 1 已经从 index.js 抽到
// routes/desktop.js）。不走 OpenClaw RPC（OpenClaw 这个 Gateway 版本 desktop.*
// 方法都 unknown）。
//
// 本地实现：Linux 端用 Xvfb + x11vnc + ffmpeg 推 MJPEG 流；Windows 端用 PowerShell
// 截屏。frontend 用 SSE 拉帧渲染。MVP 阶段只暴露管理（list/create/destroy），
// 不内置 viewer（VNC 实现复杂，建议外接 RealVNC/TigerVNC）。

import { http } from './http-client'

export interface DesktopSession {
  id: string
  nodeId?: string
  nodeName?: string
  platform?: 'linux' | 'windows' | 'macos' | string
  status?: 'creating' | 'ready' | 'connected' | 'disconnected' | 'error'
  width?: number
  height?: number
  display?: string
  vncPort?: number
  isExternalDisplay?: boolean
  createdAt?: number
  lastActivityAt?: number
}

export interface DesktopDisplay {
  display: string
  number: number
}

export async function listDesktopSessions(): Promise<DesktopSession[]> {
  const res = await http<{ ok: boolean; sessions?: DesktopSession[] }>('/api/desktop/list')
  return res.sessions ?? []
}

export async function listDesktopDisplays(): Promise<{ displays: DesktopDisplay[]; platform: string }> {
  const res = await http<{ ok: boolean; displays?: DesktopDisplay[]; platform?: string }>(
    '/api/desktop/displays',
  )
  return { displays: res.displays ?? [], platform: res.platform ?? 'unknown' }
}

export interface CreateDesktopParams {
  nodeId?: string
  width?: number
  height?: number
  password?: string
  display?: string // 使用现有 :n 而非新启 Xvfb
}

export async function createDesktopSession(params: CreateDesktopParams = {}): Promise<DesktopSession> {
  const res = await http<{ ok: boolean; sessionId: string } & DesktopSession>('/api/desktop/create', {
    method: 'POST',
    body: params,
  })
  return { ...res, id: res.sessionId }
}

export async function destroyDesktopSession(sessionId: string): Promise<void> {
  await http('/api/desktop/destroy', {
    method: 'POST',
    body: { sessionId },
  })
}
