// App 根：挂 RouterProvider + 主题初始化。
// i18n 在 main.tsx 顶部 import 触发初始化（react-i18next 单例）。

import { RouterProvider } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { router } from '@/router'

export default function App() {
  // 仅触发主题应用（dark class），不读取返回值
  useTheme()
  return <RouterProvider router={router} />
}
