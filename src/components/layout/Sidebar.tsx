// 侧栏导航。按 PRD §5.8 v1 结构：核心区 + 底部。
// 路由切换用 react-router-dom 的 <NavLink>，活跃态用 aria-current 触发样式。

import { NavLink } from 'react-router-dom'
import {
  MessageSquare,
  Rocket,
  Bot,
  User,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const CORE_NAV: NavItem[] = [
  { to: '/chat', label: '对话', icon: MessageSquare },
  { to: '/tasks', label: '任务中心', icon: Rocket },
  { to: '/agents', label: '我的 Agent', icon: Bot },
]

const BOTTOM_NAV: NavItem[] = [
  { to: '/account', label: '灵境账号', icon: User },
  { to: '/settings', label: '设置', icon: Settings },
]

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          灵
        </div>
        <div className="text-sm font-semibold">灵境</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          核心
        </div>
        {CORE_NAV.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t p-2">
        {BOTTOM_NAV.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </div>
    </aside>
  )
}
