// 路由表。v1 范围按 PRD §5.7 + §5.8 简化版（核心区 4 + 底部 2）。
// 所有页面在 Phase 3 用 PlaceholderPage 占位，Phase 4+ 替换。

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ChatPage } from '@/pages/chat/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: 'chat', element: <ChatPage /> },
      {
        path: 'tasks',
        element: (
          <PlaceholderPage
            title="任务中心"
            description="10 个预置任务模板 + 执行历史 + 操作审批"
            phase="Phase 5 接入"
          />
        ),
      },
      {
        path: 'tasks/:id',
        element: (
          <PlaceholderPage
            title="任务执行"
            description="单个任务的逐步执行 + 流式状态"
            phase="Phase 5 接入"
          />
        ),
      },
      {
        path: 'agents',
        element: (
          <PlaceholderPage
            title="我的 Agent"
            description="5 个预置 Agent（文件管家/文档/数据/写作/代码）+ 切换"
            phase="Phase 7 接入"
          />
        ),
      },
      {
        path: 'account',
        element: (
          <PlaceholderPage
            title="灵境账号"
            description="登录态、余额、用量"
            phase="Phase 6 接入"
          />
        ),
      },
      {
        path: 'account/usage',
        element: (
          <PlaceholderPage
            title="用量明细"
            description="本月消息数、tokens、费用"
            phase="Phase 6 接入"
          />
        ),
      },
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="设置"
            description="主题、语言、Gateway、快捷键"
            phase="Phase 6 接入"
          />
        ),
      },
      {
        path: '*',
        element: (
          <PlaceholderPage
            title="页面未找到"
            description="路径不存在或尚未接入"
          />
        ),
      },
    ],
  },
])
