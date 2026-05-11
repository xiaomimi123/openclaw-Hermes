# 灵境 AI 桌面智能体 — Mac 开发文档

> **文档版本**：v2.0（全新版本，非 v1.x 增量）
> **开发平台**：macOS（Apple Silicon / Intel）
> **目标周期**：2 周 MVP
> **核心方向**：fork OpenClaw-Admin → 改造为灵境品牌的 Mac 桌面应用 → 集成灵境 API 中转

---

## 目录

1. [产品定义](#1-产品定义)
2. [核心决策（不再讨论）](#2-核心决策不再讨论)
3. [技术栈](#3-技术栈)
4. [Mac 开发环境准备](#4-mac-开发环境准备)
5. [项目初始化](#5-项目初始化)
6. [改造对照表](#6-改造对照表)
7. [2 周开发路线图](#7-2-周开发路线图)
8. [灵境云端 API 清单](#8-灵境云端-api-清单)
9. [Mac 跨平台规范](#9-mac-跨平台规范)
10. [打包发布](#10-打包发布)
11. [关键风险](#11-关键风险)
12. [立即行动项](#12-立即行动项)
13. [Claude 协作规则](#13-claude-协作规则)

---

## 1. 产品定义

### 1.1 一句话说明

> 灵境是一款 Mac 桌面 AI 智能体应用：用户登录灵境账号即可使用强大的 OpenClaw 智能体能力（对话、技能、自动任务等），所有 AI 调用通过灵境云端中转，按账户余额扣费。

### 1.2 v1.0 必做（核心闭环）

✅ **登录 / 注册**
✅ **AI 对话**（默认智能体，OpenClaw 原生聊天界面）
✅ **余额展示与实时扣费**
✅ **历史对话**（OpenClaw 原生 sessions 改造）
✅ **设置页**（账号信息、退出登录、修改密码）
✅ **技能列表展示**（OpenClaw 原生 skills，**仅展示和切换，不做付费**）

### 1.3 v1.0 不做（明确推迟）

❌ **技能商场付费 / 购买流程**（有第一批付费用户后再加，不在 MVP 范围）
❌ 多智能体管理
❌ 智能体工坊（office）
❌ 虚拟公司（myworld）
❌ 远程桌面 / 远程终端
❌ 频道接入（飞书 / 钉钉 / 企微）
❌ 文件浏览器
❌ 系统监控
❌ 任务计划（Cron）
❌ Windows 版本

**MVP 阶段把上面这些菜单全部注释掉**（保留代码，v1.1 再恢复）。

### 1.4 主界面布局

参考 LastAI 的设计，**两栏式**：

```
┌─────────────────────────────────────────────────────────┐
│  ⓛ 灵境            ●云端模式      智能体 ▼   - □ ✕    │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ 使用     │                                              │
│ 💬 对话  │                                              │
│ 📜 历史  │           [对话区域]                         │
│          │                                              │
│ 构建     │      （OpenClaw 原生聊天界面）              │
│ 🔧 技能  │                                              │
│          │                                              │
│ ──────── │                                              │
│ 💰 ¥xx   │                                              │
│ ⚙ 设置  │                                              │
│ 👤 NO.6  │  ┌───────────────────────────────────────┐  │
│          │  │ 给灵境发消息...                        │  │
└──────────┴──┴───────────────────────────────────────┴──┘
```

**关键设计**：
- 左侧栏 220-260px，深度改造自 OpenClaw 原生侧边栏
- 右侧占满剩余空间，是 OpenClaw 原生聊天界面（最小改动）
- 左侧底部是灵境账号区（余额、编号、设置）
- 不做单独的"右侧信息栏"

### 1.5 用户体验流程

#### 首次使用

```
1. 从官网下载 .dmg（一个文件）
2. 双击打开 dmg → 拖应用到 Applications（标准 Mac 安装）
3. 启动应用 → 显示欢迎页（3-5 秒，后台启动 Gateway）
4. 进入登录页：邮箱 + 密码 + "立即注册"
5. 用户登录 OR 完成 3 步注册
6. 直接进入主界面：左侧已显示余额、编号；右侧聊天框光标已聚焦
7. 第一次对话扣费 → 余额实时更新
```

**目标耗时**：从下载到发出第一句话 ≤ 90 秒。

#### 第二次使用

```
1. 双击 Dock 图标启动
2. 自动检测本地 token → 跳过登录
3. 直接进主界面
4. 立刻可对话
```

**目标耗时**：5-10 秒。

---

## 2. 核心决策（不再讨论）

以下决策**不再变更**。开发过程中遇到任何"是不是该换方案"的疑问，先回到这一节确认。

| 决策项 | 选定方案 | 不再考虑 |
|------|---------|---------|
| **架构** | fork OpenClaw-Admin 深度改造 | 嵌入方案、自研壳子、其他开源项目 fork |
| **技术栈** | Vue 3 + TS + Vite + Naive UI（继承） | React、Svelte、原生 HTML、切换 UI 库 |
| **桌面壳** | Electron 36+ | Tauri、WebView2、纯网页 |
| **开发平台** | Mac 优先（不做 Windows） | 双平台同步、Linux |
| **登录方式** | 邮箱 + 密码 | 扫码、OAuth、用户名 |
| **MVP 范围** | 见 1.2 节 | 任何超出 1.2 范围的功能 |
| **工期** | 2 周 | 延展、超前做 v1.1 功能 |
| **技能商场付费** | **v1.0 不做**，仅展示技能列表 | 任何在 MVP 加付费的提议 |

---

## 3. 技术栈

### 3.1 继承自 OpenClaw-Admin（不变）

| 技术 | 版本 | 角色 |
|------|------|------|
| Vue | 3.5.x | 前端框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 7.x | 构建工具 |
| Pinia | 3.x | 状态管理 |
| Vue Router | 4.x | 路由 |
| Naive UI | 2.43.x | UI 组件库 |
| Express | 5.x | 后端服务 |
| WebSocket(ws) | 8.x | 实时通信 |
| better-sqlite3 | 12.x | 本地数据库 |

### 3.2 新增依赖

| 技术 | 用途 |
|------|------|
| Electron 36+ | 桌面壳 |
| electron-builder 25+ | 打包 dmg |
| axios | 调用灵境云端 HTTPS API |

### 3.3 不引入的东西

为保持简洁，明确**不引入**以下技术：

- ❌ Tailwind CSS（用 Naive UI 自带样式系统）
- ❌ 其他 React / Vue UI 库
- ❌ 状态管理替代品（如 Vuex 4、Zustand）
- ❌ 测试框架（MVP 不写自动化测试，靠手动测试）
- ❌ Docker（Mac 本地开发不需要）

---

## 4. Mac 开发环境准备

### 4.1 必装清单

**Day 1 开始前必须装好**：

#### Node.js

```bash
# 推荐用 nvm 管理 Node 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# 重启终端后
nvm install 20
nvm use 20

# 验证
node -v   # v20.x.x
npm -v    # 10.x.x
```

**重要**：**不要用 Node 21+**，原生模块（better-sqlite3、node-pty）兼容性差。**用 Node 20 LTS**。

#### Xcode Command Line Tools

```bash
xcode-select --install
```

这是编译原生模块（better-sqlite3 等）的必需品。**不装这个 npm install 一定报错**。

#### Git

```bash
# Mac 自带，但建议升级
brew install git
git --version  # 应该 ≥ 2.40
```

#### 推荐 IDE

- **Cursor** 或 **VS Code**：写代码用
- **GitHub Desktop**：图形化 Git 操作（命令行不熟也能用）

### 4.2 验证环境

跑一遍检查清单：

```bash
node -v                   # v20.x
npm -v                    # 10.x+
git --version             # 2.40+
xcode-select -p           # 应该输出路径
which python3             # 有路径（编译某些原生模块要用）
```

**任何一项不对，先解决再继续**。

### 4.3 Apple Silicon vs Intel

```bash
# 查看架构
node -p "process.arch"
# arm64 = Apple Silicon (M1/M2/M3/M4)
# x64   = Intel
```

**两种架构都支持，但要确保 Node 和原生模块的架构一致**。

如果你是 Apple Silicon Mac：
- 用 ARM 版的 Node（默认）
- 不要在 Rosetta 终端里跑 npm install（会装成 x64 版本）
- 验证：`node -p "process.arch"` 输出 `arm64`

---

## 5. 项目初始化

### 5.1 fork 与 clone

```bash
# 1. 在浏览器访问 https://github.com/itq5/OpenClaw-Admin
#    点击右上角 Fork 按钮，fork 到自己账号

# 2. clone 到本地（替换 <你的用户名>）
cd ~/Projects   # 或你习惯的目录
git clone https://github.com/<你的用户名>/OpenClaw-Admin.git lingjing-desktop
cd lingjing-desktop

# 3. 添加 upstream，方便后续同步原作者更新
git remote add upstream https://github.com/itq5/OpenClaw-Admin.git
git remote -v   # 验证

# 4. 创建开发分支
git checkout -b dev-lingjing
```

### 5.2 安装依赖（第一个坑可能在这里）

```bash
npm install
```

**如果遇到 better-sqlite3 / node-pty 编译错误**：

```bash
# 1. 确认 Xcode CLT 装了
xcode-select --install

# 2. 清理重装
rm -rf node_modules package-lock.json
npm install

# 3. 如果还报错，单独编译原生模块
npm rebuild better-sqlite3
npm rebuild node-pty
```

### 5.3 跑通基线版本

```bash
npm run dev:all
```

这会同时启动前端（:3000）和后端（:3001）。

浏览器访问 `http://localhost:3000`，用 `admin` / `admin` 登录。

**应该能看到 OpenClaw-Admin 的原始界面**（仪表盘、对话、智能体等）。

**注意**：完整功能需要连接 OpenClaw Gateway。如果没有 Gateway，部分功能不可用——这是预期的，**今天先确认 UI 能加载就行**，Gateway 拿到后再连。

### 5.4 配置环境变量

复制 `.env.example` 为 `.env`（如果存在），或新建 `.env`：

```bash
# .env (开发环境)
VITE_APP_TITLE=灵境
VITE_APP_VERSION=1.0.0
PORT=3000
DEV_PORT=3001
AUTH_USERNAME=admin
AUTH_PASSWORD=admin

# Gateway 连接（拿到 Gateway 后填）
OPENCLAW_WS_URL=ws://localhost:18789
OPENCLAW_AUTH_TOKEN=

# 灵境云端 API（向云端同事拿）
LINGJING_API_BASE=https://api.lingjing.com
LINGJING_OPENAI_BASE=https://api.lingjing.com/v1
```

**敏感信息不要提交到 Git**：把 `.env` 加到 `.gitignore`。

### 5.5 项目目录改造规划

```
lingjing-desktop/
├── electron/                  ← 【新增】Electron 主进程
│   ├── main.ts                ← 主进程入口
│   ├── preload.ts             ← preload 脚本
│   ├── start-services.ts      ← 启动 server + Gateway 子进程
│   └── safe-storage.ts        ← token 加密存取
├── src/
│   ├── api/
│   │   ├── lingjing/          ← 【新增】灵境云端 API
│   │   │   ├── auth.ts        ← 登录/注册
│   │   │   ├── billing.ts     ← 余额查询
│   │   │   └── client.ts      ← axios 封装
│   │   └── ...                ← 保留原有
│   ├── stores/
│   │   ├── lingjing-auth.ts   ← 【新增】灵境账号 store
│   │   ├── lingjing-billing.ts← 【新增】余额 store
│   │   └── ...                ← 保留原有
│   ├── views/
│   │   ├── lingjing/          ← 【新增】灵境特有页面
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   └── Welcome.vue    ← 启动欢迎页
│   │   └── ...                ← 保留原有
│   ├── i18n/messages/
│   │   ├── zh-CN.ts           ← 替换品牌文案
│   │   └── en-US.ts           ← 替换品牌文案
│   ├── layouts/
│   │   └── DefaultLayout.vue  ← 改造侧边栏
│   ├── router/
│   │   └── routes.ts          ← MVP 路由（隐藏多余菜单）
│   └── assets/lingjing/       ← 【新增】灵境品牌资源
│       ├── logo.svg
│       └── icon.png
├── build/                     ← 【新增】electron-builder 配置
│   ├── icon.icns              ← Mac 图标
│   └── entitlements.mac.plist ← Mac 权限配置
├── server/                    ← 保留原有
└── package.json               ← 加 Electron 依赖和脚本
```

**核心原则**：
- 🟢 灵境新功能放 `lingjing/` 子目录，便于隔离
- 🟡 原 OpenClaw 文件改动控制最小（只改 i18n、路由、布局）
- 🔴 不重构原有的 components / composables（能用就用）

---

## 6. 改造对照表

| 文件 / 模块 | 处理 | 说明 |
|------------|------|------|
| `src/i18n/messages/zh-CN.ts` | 🔄 改造 | "OpenClaw" → "灵境" 全文替换 |
| `src/i18n/messages/en-US.ts` | 🔄 改造 | 同上 |
| `src/views/Login.vue` | ⏸ 替换 | 替换为 `src/views/lingjing/Login.vue` |
| `src/stores/auth.ts` | 🔄 大改 | 对接灵境云端登录 |
| `src/stores/model.ts` | 🔄 改造 | 默认指向灵境中转，禁用模型管理 UI |
| `src/stores/config.ts` | 🔄 改造 | 注入灵境 token |
| `src/layouts/DefaultLayout.vue` | 🔄 改造 | 侧边栏底部加灵境账号区 |
| `src/router/routes.ts` | 🔄 改造 | 注释掉非 MVP 路由 |
| `src/views/Dashboard.vue` | ⏸ 跳过 | MVP 不做仪表盘，登录后直接到 chat |
| `src/views/chat/` | 🟢 保留 | OpenClaw 原生聊天，最小改动 |
| `src/views/sessions/` | 🟢 保留 | 改名"历史对话" |
| `src/views/skills/` | 🟢 保留 | **仅展示，不做付费**，复用原界面 |
| `src/views/settings/` | 🔄 改造 | 加"灵境账号"区，删除多余配置项 |
| `src/views/agents/` | ⏸ 隐藏 | 路由注释 |
| `src/views/office/` | ⏸ 隐藏 | 路由注释 |
| `src/views/myworld/` | ⏸ 隐藏 | 路由注释 |
| `src/views/remote-desktop/` | ⏸ 隐藏 | 路由注释 |
| `src/views/terminal/` | ⏸ 隐藏 | 路由注释 |
| `src/views/files/` | ⏸ 隐藏 | 路由注释 |
| `src/views/system/` | ⏸ 隐藏 | 路由注释 |
| `src/views/cron/` | ⏸ 隐藏 | 路由注释 |
| `src/views/channels/` | ⏸ 隐藏 | 路由注释 |
| `src/views/memory/` | ⏸ 隐藏 | 路由注释 |
| `package.json` | 🔄 改造 | 加 Electron 依赖、脚本、build 字段 |
| `vite.config.ts` | 🟡 微调 | 适配 Electron 路径 |
| `electron/main.ts` | 🟢 新增 | 主进程入口 |
| `electron/preload.ts` | 🟢 新增 | IPC API |
| `src/views/lingjing/Login.vue` | 🟢 新增 | 灵境登录页 |
| `src/views/lingjing/Register.vue` | 🟢 新增 | 3 步注册 |
| `src/views/lingjing/Welcome.vue` | 🟢 新增 | 启动欢迎页 |
| `src/stores/lingjing-auth.ts` | 🟢 新增 | 灵境账号 store |
| `src/stores/lingjing-billing.ts` | 🟢 新增 | 余额 store |
| `src/api/lingjing/*` | 🟢 新增 | 云端 API 封装 |

**总览**：约 60% 保留 / 新增、25% 改造、15% 隐藏。

---

## 7. 2 周开发路线图

### 7.1 总体节奏

| 周 | 主要目标 | 完成标志 |
|----|---------|---------|
| **W1（5 天）** | fork + Electron 包装 + 品牌换皮 + 灵境登录 | 能启动 dmg、能用灵境账号登录、看到灵境品牌界面 |
| **W2（5 天）** | 模型对接 + 体验打磨 + 打包发布 | 完整闭环：注册 → 对话 → 扣费 → 余额变化，dmg 可分发 |

### 7.2 W1：基础架构 + 灵境登录

#### W1 Day 1：环境 + fork + 跑通

**目标**：在你 Mac 上能跑起来原版 OpenClaw-Admin

**任务**：
- 装好 Mac 开发环境（4.1 节）
- fork OpenClaw-Admin 并 clone（5.1 节）
- 安装依赖、跑通基线版本（5.2、5.3 节）
- **联系 OpenClaw 作者**（root@itq5.com 或微信群）拿 Gateway Mac 二进制和部署文档

**完成标志**：
- 浏览器访问 `http://localhost:3000` 能看到原版 OpenClaw-Admin 登录页和主界面
- 拿到 Gateway 部署方法（即使二进制还没拿到，至少知道怎么获取）

**Day 1 不动任何代码**。

#### W1 Day 2：项目地图 + Electron 框架

**目标**：理解项目结构，搭好 Electron 主进程

**任务**：

**上午（2-3 小时）**：让 Claude 帮你做项目地图分析。话术：

```
我 fork 了 OpenClaw-Admin（Vue 3 + TS + Vite + Naive UI + Express）。
请帮我做项目地图分析，输出 markdown 报告：

1. src/ 各目录职责
2. 入口文件链路：main.ts → 路由注册 → Pinia store 注册
3. src/stores/auth.ts 当前认证流程（用文字描述）
4. src/stores/model.ts、src/stores/config.ts 当前的模型/API Key 管理逻辑
5. src/i18n/messages/ 文件结构和品牌文案位置
6. server/ 后端代码做了什么

不要改任何代码，只输出分析报告。
```

**下午（3-4 小时）**：搭 Electron 框架。

```bash
npm install --save-dev electron electron-builder
npm install --save axios
```

让 Claude 帮你创建：
- `electron/main.ts`（主进程）
- `electron/preload.ts`（IPC）
- 修改 `package.json`：加 `main` 字段、`scripts` 段、`build` 段（仅 mac 配置）
- 修改 `vite.config.ts` 兼容 Electron

**Claude 话术**：

```
我有一个 Vue 3 + Vite 项目（前端 :3000，后端 Express :3001）。
现在用 Electron 包装它，目标平台只做 Mac（不考虑 Windows）。

请帮我做：
1. electron/main.ts：启动时 spawn server 子进程，server 就绪后创建 BrowserWindow 加载 :3000，before-quit 时 kill 子进程
2. electron/preload.ts：先暴露空的安全 IPC API（预留扩展）
3. 修改 package.json：加 Electron 依赖、scripts（electron:dev, electron:build, dist:mac）、build 字段（仅 mac 段，输出 dmg + zip）
4. 修改 vite.config.ts：兼容 Electron 模式（base 路径处理）

要求：
- 用 path.join，不允许硬编码路径分隔符
- 用 app.getPath('userData')，不允许硬编码 ~/Library
- 启动时检测 server 端口监听才创建窗口（避免白屏）
- 详细注释

输出完整代码。
```

**完成标志**：`npm run electron:dev` 能弹出 Electron 窗口加载原版 OpenClaw-Admin 界面。

#### W1 Day 3：欢迎页 + 启动优化

**目标**：解决"启动慢、白屏"问题

**任务**：

1. 新建 `src/views/lingjing/Welcome.vue`：
   - 灵境 logo
   - "正在启动 AI 引擎..." 文字
   - Naive UI 的 NSpin 加载动画
2. 改造 `electron/main.ts`：
   - 启动立刻创建 400×300 小窗口加载欢迎页（< 1 秒响应）
   - **后台并行**启动后端 server
   - server 就绪后创建主窗口（1400×900）
   - 主窗口 `ready-to-show` 后销毁欢迎窗口

**完成标志**：
- 双击 Electron 应用 1 秒内看到欢迎页
- 5 秒内进入主界面
- 没有白屏

#### W1 Day 4：品牌换皮

**目标**：界面看起来完全是"灵境"

**任务**：

**1. i18n 文案替换**

打开 `src/i18n/messages/zh-CN.ts`，把所有 "OpenClaw" 替换为 "灵境"。同时调整其他文案让它符合灵境品牌（比如"AI 智能体管理平台" → "你的 AI 创客助手"）。

**2. 主题色定制**

参考 Naive UI 文档，使用 `themeOverrides`。新建 `src/composables/useLingjingTheme.ts`：

```typescript
import { GlobalThemeOverrides } from 'naive-ui'

export const lingjingThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1F4E79',         // 灵境主色（你定）
    primaryColorHover: '#2E75B6',
    primaryColorPressed: '#0F3050',
    // ...
  }
}
```

在 App.vue 的 NConfigProvider 上应用这个 themeOverrides。

**3. 替换品牌资源**

- 把灵境 logo 放到 `src/assets/lingjing/logo.svg`
- 替换 `public/favicon.ico`
- 替换 `index.html` 的 `<title>` 为"灵境"
- 替换 `package.json` 的 `name` 和 `productName`

**4. 应用名称**

```bash
# package.json
"name": "lingjing-desktop",
"productName": "灵境",
```

**完成标志**：所有可见的 "OpenClaw" 字样消失，界面是灵境配色。

#### W1 Day 5：左侧栏改造 + MVP 路由

**目标**：左侧栏只显示 MVP 必需的菜单

**任务**：

**1. 改造 `src/router/routes.ts`**

注释掉所有 MVP 不要的路由（office、myworld、remote-desktop、terminal、files、system、cron、channels、memory、agents）。

保留：chat（对话）、sessions（历史对话）、skills（技能列表）、settings（设置）。

**2. 改造 `src/layouts/DefaultLayout.vue`**

侧边栏菜单按 MVP 范围渲染。**底部新增灵境账号区**：

```
─────────────────
💰 ¥ -- 余额
👤 NO.--- 创客编号
⚙ 设置
[退出登录]
```

数据先用占位符（`--`），W2 接通真实数据。

**3. 默认路由调整**

未登录跳 `/login`，已登录默认跳 `/chat`（不去 dashboard）。

**完成标志**：左侧栏看起来和你的截图一致，菜单清爽，只有 4 个一级菜单 + 底部账号区。

**W1 周末复盘**：
- Gateway 拿到了吗？协议确认了吗？
- 实际工时 vs 预估？哪天超时了？
- 启动时间是否在 5 秒内？
- 把发现的问题列下来，进入 W2 时心里有数

### 7.3 W2：灵境登录 + 模型对接 + 发布

#### W2 Day 1：灵境登录页

**目标**：能用邮箱+密码登录灵境

**任务**：

**1. 新建 `src/views/lingjing/Login.vue`**

要点：
- Naive UI 的 NCard、NInput、NCheckbox、NButton
- 邮箱框 + 密码框（带眼睛图标）
- "30 天免登录"勾选框（默认勾选）
- "立即注册" 链接
- 邮箱框默认填上次登录的邮箱（从 localStorage 读取，邮箱不敏感可以明文存）
- 回车键触发登录
- 登录中按钮显示 loading

**2. 新建 `src/api/lingjing/client.ts`**

axios 封装：
- baseURL 指向灵境云端
- 请求拦截器自动加 Authorization: Bearer {token}
- 响应拦截器处理 401（token 过期）跳登录页

**3. 新建 `src/api/lingjing/auth.ts`**

封装：
- `login(email, password)`
- `register(email, code, password)`
- `sendVerifyCode(email)`
- `verifyToken(token)`

**4. 改造 `src/stores/auth.ts`**

- 删掉 OpenClaw 原有的 admin/admin 逻辑
- 改为对接灵境 API
- token 用 Electron safeStorage 加密存储（通过 IPC 调用主进程）

**5. 改造 `electron/preload.ts`**

暴露：
- `safeStorage.encrypt(text)`
- `safeStorage.decrypt(buffer)`

**6. 路由守卫**

未登录跳 `/login`。

**完成标志**：能用灵境账号登录（即使后端 mock 也能跑通流程），token 加密保存到本地。

#### W2 Day 2：3 步注册

**目标**：新用户注册流程跑通

**任务**：

**1. 新建 `src/views/lingjing/Register.vue`**

3 步设计（用 Naive UI 的 NSteps）：

**Step 1（邮箱）**：
- 邮箱输入框
- "获取验证码" 按钮（点击后发送验证码邮件）

**Step 2（验证码 + 密码）**：
- 6 位验证码输入框（自动跳焦点）
- 60 秒倒计时
- 密码输入框（带强度提示：弱/中/强）
- "我同意《用户协议》" 勾选框
- "完成注册" 按钮

**Step 3（欢迎页）**：
- ✓ 大对勾图标
- **醒目展示创客编号**（大字号 + 复制按钮）
- "编号已发送到你的邮箱备份" 提示
- "新人 ¥10 免费额度已到账"（如果有）
- "开始使用" 按钮 → 自动登录跳主界面

**完成标志**：新邮箱能完成 3 步注册并自动登录到主界面。

#### W2 Day 3：模型对接灵境中转 ⭐关键里程碑

**目标**：所有 AI 调用走灵境云端，按 token 扣费

**任务**：

**1. 改造 `src/stores/model.ts`**

- 删除原有"用户填 API Key"逻辑
- 写死灵境的中转地址作为唯一可用模型源
- 模型管理 UI 改为只读展示（用户看到可用模型，不能添加/删除/修改）

**2. 改造 `src/stores/config.ts`**

- 启动时从 `lingjing-auth` store 拿 token
- 自动注入到 OpenClaw Gateway 的请求头
- 用户切换账号时自动更新 Gateway 配置

**3. 新建 `src/stores/lingjing-billing.ts`**

```typescript
state: {
  balance: 0,
  recentUsage: []
}

actions: {
  fetchBalance()         // 启动时拉一次
  startBalancePolling()  // 每 30 秒轮询（或用 WebSocket 推送）
  stopBalancePolling()
}
```

**4. 侧边栏底部余额联动**

`DefaultLayout.vue` 监听 `lingjing-billing.balance`，对话扣费后实时更新数字。

**5. 测试完整流程**

- 登录 → 进主界面
- 看到真实余额（从灵境云端拉的）
- 发送对话消息
- AI 流式返回
- 余额减少（左侧栏数字变化）

**完成标志（W2 关键里程碑）**：

> **登录灵境账号 → 在右侧聊天 → 每次对话从灵境扣费 → 左侧余额实时变化。**
>
> **这一步跑通意味着商业模式跑通了。这是整个项目最关键的时刻。**

#### W2 Day 4：体验打磨

**目标**：用户体验经得住考验

**任务**：

**异常处理**：
- token 过期 → 自动跳登录页，邮箱默认填上次的
- Gateway 启动失败 → 友好提示 + 自动重试，不弹英文报错
- 网络断开 → 顶部显示离线状态条
- 余额不足 → 输入框上方黄色提示 "余额不足，[去充值]"，按钮跳浏览器

**细节优化**：
- 按钮 hover、加载状态、转场动画
- Mac 快捷键：CommandOrControl+Enter 发送、CommandOrControl+, 设置
- 应用菜单：File、Edit、View、Window、Help（Mac 原生菜单栏）
- Dock 图标右键菜单：退出灵境、关于
- 关闭主窗口时（Mac 习惯）保留 Dock 图标，不退出应用

**设置页改造**：
- 新建"灵境账号"区域：头像、昵称、邮箱、创客编号、退出登录按钮
- "修改密码"按钮跳浏览器到网页端
- 删除多余配置项（API Key 管理、Gateway URL 这种用户不需要看到的）

**技能列表（仅展示）**：
- `src/views/skills/` 简化为列表展示
- 显示 OpenClaw 原生技能（OpenClaw 自带的能力）
- **不做付费购买、不做安装/卸载**，保持简单

**完成标志**：完整体验"首次使用流程"，每一步都顺滑。

#### W2 Day 5：打包发布

**目标**：dmg 可以分发给真实用户

**任务**：

**1. 完善 electron-builder 配置**

`package.json` 的 `build` 字段：

```json
{
  "appId": "com.lingjing.desktop",
  "productName": "灵境",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "server/**/*",
    "node_modules/**/*"
  ],
  "extraResources": [
    "data/**/*"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      { "target": "dmg", "arch": ["arm64", "x64"] },
      { "target": "zip", "arch": ["arm64", "x64"] }
    ],
    "icon": "build/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "dmg": {
    "title": "灵境",
    "icon": "build/icon.icns"
  }
}
```

**2. 准备图标**

- 准备 1024×1024 的 PNG
- 用 `iconutil` 或在线工具转成 `.icns`：

```bash
# 创建 iconset 目录
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# 转换
iconutil -c icns icon.iconset
mv icon.icns build/icon.icns
```

**3. 准备 entitlements**

新建 `build/entitlements.mac.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

**4. 打包**

```bash
npm run build              # Vue 应用构建到 dist/
npm run dist:mac           # electron-builder 打包成 dmg
```

输出在 `release/` 目录。**会有两个 dmg**：

- `灵境-1.0.0-arm64.dmg`（Apple Silicon 用）
- `灵境-1.0.0-x64.dmg`（Intel 用）

**5. 测试 dmg**

- 在你自己 Mac 上：双击 dmg → 拖到 Applications → 启动 → 完整跑一遍
- 找 1-2 个朋友（最好不同架构 Mac）测试
- **代码签名先不做**：用户首次启动会看到"无法验证开发者"，需要去"系统设置 → 隐私与安全性 → 仍要打开"

**6. 写一页用户文档**

用 markdown 写：
- 如何下载安装
- 如何处理"无法验证开发者"警告（截图）
- 如何注册和登录
- 常见问题

**完成标志**：dmg 在你和朋友的 Mac 上能完整运行，从安装到对话流程顺畅。

---

## 8. 灵境云端 API 清单

桌面端开发开始前必须确认。**和云端开发同事开 30 分钟会逐项核对**。

### 8.1 必需接口（W2 必须可用）

| 接口 | 用途 | 何时用 |
|------|------|------|
| `POST /api/auth/login` | 邮箱+密码登录 | W2 Day 1 |
| `POST /api/auth/send-code` | 发送注册验证码 | W2 Day 2 |
| `POST /api/auth/register` | 邮箱+验证码+密码注册（返回创客编号） | W2 Day 2 |
| `POST /api/auth/verify-token` | Token 验证/续签 | W2 Day 1 |
| `POST /api/auth/logout` | 撤销 token | W2 Day 4 |
| `GET /api/user/profile` | 用户信息（昵称、头像、创客编号） | W2 Day 1 |
| `GET /api/billing/balance` | 余额查询 | W2 Day 3 |
| `POST /v1/chat/completions` | OpenAI 兼容对话接口 | W2 Day 3 |
| WebSocket `/ws/billing` 或 SSE | 余额变化推送（也可改成轮询） | W2 Day 3 |
| `GET /api/billing/recharge-url` | 充值跳转 URL（点"去充值"用） | W2 Day 4 |

### 8.2 不需要的接口（v1.0 砍掉）

- ❌ 技能列表（用 OpenClaw 原生）
- ❌ 技能购买跳转
- ❌ 技能授权凭证
- ❌ 我的技能列表

**这些等有付费用户后再做**。

### 8.3 行动项

**项目第 1 天**：
1. 把 8.1 节的清单发给云端同事
2. 逐项确认：✅已有 / 🔴缺失
3. 缺失的接口立即排进云端排期，必须 W2 前完成

---

## 9. Mac 跨平台规范

虽然只做 Mac，但写代码时仍遵循跨平台原则——**未来加 Windows 才不会推倒重来**。

### 9.1 路径处理

```typescript
// ✅ 永远用 path.join
import path from 'node:path'
const file = path.join(userDir, 'data', 'config.json')

// ✅ 用户数据用 Electron API
import { app } from 'electron'
const dataDir = app.getPath('userData')
// Mac 自动是: ~/Library/Application Support/灵境
```

### 9.2 平台判断

```typescript
import { platform } from 'node:process'

if (platform === 'darwin') {
  // Mac 特定逻辑
}
```

### 9.3 快捷键

```typescript
// ✅ 用 CommandOrControl，跨平台自动映射
accelerator: 'CommandOrControl+Enter'

// ❌ 不要写死 Cmd 或 Ctrl
```

### 9.4 应用菜单（Mac 特有）

Mac 必须有原生菜单栏，否则不专业。最少要有：

```typescript
const template = [
  // App menu (Mac 必备)
  {
    label: '灵境',
    submenu: [
      { role: 'about', label: '关于灵境' },
      { type: 'separator' },
      { role: 'hide', label: '隐藏灵境' },
      { role: 'hideOthers', label: '隐藏其他' },
      { role: 'unhide', label: '显示全部' },
      { type: 'separator' },
      { role: 'quit', label: '退出灵境' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' }
    ]
  },
  {
    label: '窗口',
    submenu: [
      { role: 'minimize', label: '最小化' },
      { role: 'close', label: '关闭' }
    ]
  }
]
```

### 9.5 关闭窗口行为（Mac 习惯）

```typescript
// Mac: 关闭主窗口不退出应用，保留 Dock 图标
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Mac: 点 Dock 图标重新打开窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
```

### 9.6 原生模块的 Mac 处理

OpenClaw-Admin 用了 `better-sqlite3`、`node-pty`、`ssh2`。

**首次安装报错的处理**：

```bash
# 1. 装 Xcode CLT
xcode-select --install

# 2. 验证 Node 架构（Apple Silicon 应该是 arm64）
node -p "process.arch"

# 3. 重建原生模块
npm rebuild

# 4. Electron 模式重建
npx electron-rebuild
```

**重要**：每次升级 Electron 版本后必须跑 `npx electron-rebuild`，否则原生模块加载失败。

---

## 10. 打包发布

### 10.1 打包命令

```bash
# 开发模式
npm run electron:dev

# 生产打包
npm run dist:mac
```

输出：`release/灵境-1.0.0-arm64.dmg`、`release/灵境-1.0.0-x64.dmg`

### 10.2 安装包大小预估

- 基础 Electron 框架：约 100 MB
- Vue 应用 + 依赖：约 30 MB
- 原生模块编译产物：约 10 MB
- OpenClaw Gateway 二进制（如内嵌）：约 50-100 MB
- **总计**：150-250 MB（这是 Electron 应用的正常大小）

### 10.3 代码签名（v1.0 可选）

**不做**：用户看到"灵境.app 无法打开"，需要去系统设置允许。

**做了**：用户双击直接打开，无任何警告。

**做的成本**：
- Apple Developer 账号 $99/年
- 配置 electron-builder 自动签名 + 公证
- 学习成本约 1 天

**建议**：v1.0 先不做，等有 50+ 真实付费用户再做（届时有营收支持成本）。

### 10.4 发布渠道

**v1.0 推荐**：
- 自建官网下载页（最简单）
- 社群直接发 dmg 链接

**未来可考虑**：
- Mac App Store（需要严格审核，限制多）
- Homebrew Cask（开源项目流行，需要维护）

---

## 11. 关键风险

启动期识别的关键风险已全部消除（Gateway 已落地、原生模块编译验证通过、主题/启动/签名/工期等也均有了可执行的方案），正常进入开发节奏。后续若出现新风险，按"识别 → 评估严重度 → 应对方案"的格式补回本节。

---

## 12. 立即行动项

### 今天（本日内必做）

**第 1 件事**：

对照本文 8.1 节 API 清单，和云端同事开 30 分钟对齐会。

**第 2 件事**：

按 4.1 节装好 Mac 开发环境，按 5.1-5.3 节 fork + clone + 跑通基线。**今天到此为止，不写任何代码**。

### 本周内（W1）

完成 W1 全部任务：fork + Electron 包装 + 欢迎页 + 品牌换皮 + 左侧栏改造。

### W1 周末

完整复盘 W1 进度。如果有超期，调整 W2 计划（必要时砍功能）。

---

## 13. Claude 协作规则

### 13.1 项目根目录建立 AGENTS.md

把下面这段保存为项目根目录的 `AGENTS.md`，每次让 Claude 改代码前要它先读：

```markdown
# 灵境 Mac 桌面应用 AGENTS.md

## 项目简介
基于 fork OpenClaw-Admin（MIT 协议）二次开发的 Mac 桌面 AI 应用。
通过 Electron 包装 Vue 3 应用，集成灵境云端 API 中转。

## 商业目标
用户登录灵境 → 调用 OpenClaw 能力 → 按 token 扣费。
v1.0 不做技能商场付费。

## 技术栈
- Vue 3.5 + TypeScript 5 + Vite 7
- Naive UI 2.43（不切换其他 UI 库）
- Pinia 3
- Electron 36+
- electron-builder

## 开发平台
- macOS（Apple Silicon / Intel）
- v1.0 不做 Windows

## 跨平台铁律
1. path.join 拼路径，不硬编码 / 或 \
2. app.getPath('userData') 取数据目录
3. process.platform 判断平台
4. CommandOrControl 写快捷键
5. electron-builder build 字段保留 mac 段（未来加 win）

## 目录约定
- 灵境新增功能放 src/views/lingjing/、src/stores/lingjing-*.ts、src/api/lingjing/
- 不在原 OpenClaw 文件混入大量灵境逻辑
- 必改的原文件：i18n、路由、布局

## 代码风格
- Vue 3 Composition API + <script setup lang="ts">
- 2 空格缩进、单引号、尾随逗号、无分号
- @/ 别名导入

## 禁止事项
- ❌ 引入 React、Svelte 等其他前端框架
- ❌ 切换 UI 库（保持 Naive UI）
- ❌ 引入 Tailwind 等 CSS 框架
- ❌ localStorage 存敏感信息（用 safeStorage）
- ❌ 前端硬编码灵境 API 地址（用 .env）
- ❌ 在 v1.0 阶段做技能商场付费功能（v1.1 再加）

## MVP 范围
详见开发文档 1.2 节。
非 MVP 的菜单（office、myworld、remote-desktop 等）路由注释，代码保留。
```

### 13.2 与 Claude 协作的话术模板

每次让 Claude 改代码用这个结构：

```
【背景】
项目：灵境 Mac 桌面应用（fork OpenClaw-Admin，Vue 3 + TS + Electron）
开发平台：macOS（Apple Silicon）
当前进度：W2 Day 1，正在做灵境登录改造

【任务】
新建 src/views/lingjing/Login.vue：灵境邮箱+密码登录页

【要求】
1. 用 Naive UI 的 NCard、NInput、NCheckbox、NButton
2. 邮箱框默认填 localStorage 里上次登录的邮箱
3. 密码框带显示/隐藏图标（Naive UI 自带）
4. "30 天免登录"勾选框默认勾选
5. 回车键触发登录
6. 登录中按钮显示 loading
7. 调用 src/stores/lingjing-auth.ts 的 login action
8. 登录成功跳转 /chat
9. 登录失败 NMessage 提示"邮箱或密码错误"

【边界】
- 只创建 Login.vue
- 不改 router/routes.ts（我自己改）
- 不改 lingjing-auth store（已存在）

【完成标志】
打开 /login 看到页面，能输入，能点登录（即使后端没接通也能看到 UI）
```

### 13.3 五条铁律

1. **先做工程结构再写代码**：让 Claude 先输出目录/接口定义，确认后再写实现
2. **每天结束写开发日志**：让 Claude 总结今日改动 + 待办
3. **bug 改 3 次还不对就停下**：架构问题不是 AI 能解决的，去 GitHub Issues 找方案
4. **关键文件立即 git commit**：commit message 让 Claude 帮写
5. **承认 AI 边界**：代码签名、Apple 公证、商务、法律——这些事提前准备外包

---

## 附录：版本说明

### v2.0（本版本）— Mac 专用 + 砍掉付费技能商场

**变更原因**：
- 用户决定先在 Mac 上开发（开发机就是 Mac）
- 砍掉技能商场付费功能（无付费用户前不需要）
- 简化 MVP 范围，工期从 3 周压缩到 2 周

**主要内容**：
- 全新 Mac 开发文档，不是 v1.x 增量
- 2 周 MVP 路线图（W1 + W2，每天颗粒度）
- 完整的 Mac 开发环境准备（4.1 节）
- 完整的 dmg 打包流程（10 节）
- 砍掉技能购买、授权、付费跳转所有相关内容
- 砍掉 Windows 适配章节

### v1.x — 历史版本（已废弃）

v1.0 / v1.1 / v1.2 仅作历史参考，不再使用。

---

**文档结束**

执行过程中遇到任何方向变更需求，先回到第 2 节"核心决策（不再讨论）"对照确认。
真正的迭代通过新版本（v2.1、v2.2）记录变化，不要中途推翻。