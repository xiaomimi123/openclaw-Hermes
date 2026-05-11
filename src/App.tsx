// App 根：登录闸 + RouterProvider + 主题。
// 本地后端 auth 启用时先弹 LoginGate，登录拿到 token 后才进主界面。

import { RouterProvider } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { router } from '@/router'
import { LoginGate } from '@/components/auth/LoginGate'

export default function App() {
  useTheme()
  const { authEnabled, needsLogin, checking, error, login } = useAuth()

  // 还在拉 /api/auth/config 中：占位
  if (authEnabled === null) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        正在连接本地后端…
      </div>
    )
  }

  if (needsLogin) {
    return <LoginGate onLogin={login} checking={checking} error={error} />
  }

  return <RouterProvider router={router} />
}
