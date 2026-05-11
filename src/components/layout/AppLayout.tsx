// 主布局：TitleBar 顶 + Sidebar 左 + Outlet 中 + StatusBar 底。
// Outlet 由 react-router-dom 注入当前路由的页面。

import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import { StatusBar } from './StatusBar'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
