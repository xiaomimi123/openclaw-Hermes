// 远程桌面页（MVP）。
//
// 走本地 Express /api/desktop/*（Phase 1 routes/desktop.js）。
// Linux：Xvfb + x11vnc + ffmpeg；Windows：PowerShell 截屏。
// MVP 只暴露 session 管理（list/create/destroy）。
// VNC 实时帧流（SSE MJPEG）解析 + canvas 渲染太大，留 v1.1+。

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Monitor,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  listDesktopSessions,
  listDesktopDisplays,
  createDesktopSession,
  destroyDesktopSession,
  type DesktopSession,
  type DesktopDisplay,
} from '@/services/desktop-api'

export function DesktopPage() {
  const [sessions, setSessions] = useState<DesktopSession[]>([])
  const [displays, setDisplays] = useState<DesktopDisplay[]>([])
  const [platform, setPlatform] = useState<string>('unknown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sess, disp] = await Promise.all([listDesktopSessions(), listDesktopDisplays()])
      setSessions(sess)
      setDisplays(disp.displays)
      setPlatform(disp.platform)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleDestroy = useCallback(
    async (sessionId: string) => {
      if (!window.confirm('销毁会话？相关 Xvfb / x11vnc / ffmpeg 进程都会停止。')) return
      try {
        await destroyDesktopSession(sessionId)
        showToast('已销毁')
        reload()
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e))
      }
    },
    [reload, showToast],
  )

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">远程桌面</h1>
            <p className="text-sm text-muted-foreground">
              本地 Express 起 Xvfb / x11vnc / ffmpeg，给 Agent 一个隔离的虚拟桌面环境。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
              <RefreshCw className={loading ? 'mr-1 h-3.5 w-3.5 animate-spin' : 'mr-1 h-3.5 w-3.5'} />
              刷新
            </Button>
            <Button size="sm" onClick={() => setOpening(true)} data-testid="desktop-create">
              <Plus className="mr-1 h-3.5 w-3.5" /> 新建
            </Button>
          </div>
        </div>

        {/* 平台 + 现有 :n 显示 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主机信息</CardTitle>
            <CardDescription>仅 Linux 主机可用 Xvfb 虚拟显示，Windows 走原生截屏</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">平台</div>
              <div className="font-mono">{platform}</div>
            </div>
            <div>
              <div className="text-muted-foreground">已有 X11 显示</div>
              <div className="flex flex-wrap gap-1 font-mono">
                {displays.length === 0 ? (
                  <span className="text-muted-foreground">无（macOS / Windows 正常）</span>
                ) : (
                  displays.map((d) => (
                    <code key={d.display} className="rounded bg-muted px-1.5 py-0.5">
                      {d.display}
                    </code>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 提示：viewer 暂不内置 */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-amber-900 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">v1.0 不内置 VNC viewer</div>
              <div className="mt-1">
                创建 session 后用外部 VNC 客户端（macOS 系统自带 / TigerVNC / RealVNC）连
                <code className="mx-1 rounded bg-amber-100/50 px-1 font-mono text-[10px] dark:bg-amber-900/50">
                  vnc://127.0.0.1:&lt;vncPort&gt;
                </code>
                。内嵌 viewer（MJPEG 流 / canvas 渲染）v1.1 实现。
              </div>
            </div>
          </CardContent>
        </Card>

        {(error || toast) && (
          <div
            className={
              error
                ? 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'
                : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
            }
          >
            {toast ?? error}
          </div>
        )}

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 p-12 text-center text-sm text-muted-foreground">
              <Monitor className="h-8 w-8 opacity-50" />
              <div>没有活跃会话</div>
              <div className="text-xs">点右上「新建」起一个虚拟桌面</div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <Card key={s.id} data-testid="desktop-session" data-session-id={s.id} className="flex flex-row items-center gap-3 p-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.nodeName ?? s.nodeId ?? s.id.slice(0, 8)}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {s.platform} · {s.width}×{s.height}
                    </code>
                    {s.display && <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{s.display}</code>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>状态 {s.status ?? '—'}</span>
                    {s.vncPort && <span>· VNC :{s.vncPort}</span>}
                    {s.createdAt && <span>· 创建 {new Date(s.createdAt).toLocaleTimeString('zh-CN')}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleDestroy(s.id)} className="text-destructive" title="销毁">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <CreateDialog
          open={opening}
          onClose={() => setOpening(false)}
          onCreated={(s) => {
            setOpening(false)
            reload()
            showToast(`已创建 ${s.id.slice(0, 8)}（VNC :${s.vncPort ?? '?'}）`)
          }}
          existingDisplays={displays}
        />
      </div>
    </div>
  )
}

function CreateDialog({
  open,
  onClose,
  onCreated,
  existingDisplays,
}: {
  open: boolean
  onClose: () => void
  onCreated: (s: DesktopSession) => void
  existingDisplays: DesktopDisplay[]
}) {
  const [width, setWidth] = useState(1280)
  const [height, setHeight] = useState(800)
  const [useExisting, setUseExisting] = useState(false)
  const [display, setDisplay] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && useExisting && !display && existingDisplays[0]) {
      setDisplay(existingDisplays[0].display)
    }
  }, [open, useExisting, display, existingDisplays])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)
      try {
        const s = await createDesktopSession({
          width: Number(width) || 1280,
          height: Number(height) || 800,
          password: password || undefined,
          display: useExisting ? display : undefined,
        })
        onCreated(s)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setSubmitting(false)
      }
    },
    [width, height, useExisting, display, password, onCreated],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建桌面会话</DialogTitle>
          <DialogDescription>
            起一个 Xvfb 虚拟显示 + x11vnc 服务，给 Agent 操作用
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">宽（px）</label>
              <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">高（px）</label>
              <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">VNC 密码（可选）</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空则无密码" />
          </div>
          {existingDisplays.length > 0 && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={useExisting}
                onChange={(e) => setUseExisting(e.target.checked)}
                className="h-4 w-4"
              />
              <span>使用已有 X11 显示（不启 Xvfb）</span>
              {useExisting && existingDisplays.length > 1 && (
                <select
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className="ml-2 rounded border bg-transparent px-2 py-1 text-xs"
                >
                  {existingDisplays.map((d) => (
                    <option key={d.display} value={d.display}>
                      {d.display}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={submitting} data-testid="desktop-submit">
              {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
