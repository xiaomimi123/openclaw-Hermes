// /agents 页面：网格展示所有 Agent 卡片，激活态高亮，点击查看打开 SOUL.md 详情。

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentCard } from '@/components/agents/AgentCard'
import { useAgentStore } from '@/stores/agent-store'
import { getAgent, type AgentDetail } from '@/services/agents-api'

export function AgentList() {
  const { agents, loading, error, activeAgentId, activating, fetch, activate } = useAgentStore()
  const [detail, setDetail] = useState<AgentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activateNote, setActivateNote] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleActivate = useCallback(
    async (id: string) => {
      const res = await activate(id)
      setActivateNote({ ok: res.ok, message: res.message })
      setTimeout(() => setActivateNote(null), 4000)
    },
    [activate],
  )

  const handleView = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const d = await getAgent(id)
      setDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">我的 Agent</h1>
            <p className="text-sm text-muted-foreground">
              5 个预置 Agent 各有专长。激活后 OpenClaw 会按所选 Agent 的人格行动。
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetch} disabled={loading}>
            <RefreshCw className={loading ? 'mr-1 h-3.5 w-3.5 animate-spin' : 'mr-1 h-3.5 w-3.5'} />
            刷新
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {activateNote && (
          <div
            data-testid="agent-activate-toast"
            className={
              activateNote.ok
                ? 'flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : 'flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
            }
          >
            {activateNote.ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            <span>{activateNote.message}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {loading && agents.length === 0 && (
            <div className="col-span-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          )}
          {!loading && agents.length === 0 && (
            <div className="col-span-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              没有可用 Agent。检查 server/database.js 种子是否正确初始化。
            </div>
          )}
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              active={a.id === activeAgentId}
              activating={activating === a.id}
              onActivate={() => handleActivate(a.id)}
              onViewDetail={() => handleView(a.id)}
            />
          ))}
        </div>
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{detail.emoji ?? '🤖'}</span>
                  {detail.name}
                </DialogTitle>
                <DialogDescription>{detail.description}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] rounded-md border bg-muted/20 p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {detailLoading && <div className="text-xs text-muted-foreground">加载 SOUL.md…</div>}
                  {!detailLoading && detail.soulMarkdown && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.soulMarkdown}</ReactMarkdown>
                  )}
                  {!detailLoading && !detail.soulMarkdown && (
                    <div className="text-xs text-muted-foreground">SOUL.md 不可读</div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
