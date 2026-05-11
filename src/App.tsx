// 灵境 React 重构 · Phase 2 脚手架占位
// Phase 3 将替换为 RouterProvider + AppLayout（侧栏 + 路由）

export default function App() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="text-4xl font-semibold tracking-tight">灵境</div>
      <div className="mt-4 text-sm text-muted-foreground">
        React 重构 · Phase 2 脚手架就绪
      </div>
      <div className="mt-8 max-w-md rounded-lg border bg-card p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-medium text-foreground">Stack</div>
        <ul className="space-y-1">
          <li>· React 18 + TypeScript</li>
          <li>· Vite 7 + @vitejs/plugin-react</li>
          <li>· Tailwind CSS 3 + shadcn/ui 配置</li>
          <li>· zustand + react-router-dom v6（Phase 3 接入）</li>
        </ul>
      </div>
    </div>
  )
}
