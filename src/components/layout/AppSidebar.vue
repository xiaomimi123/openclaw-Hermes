<script setup lang="ts">
import { h, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NMenu, NText, NIcon, NDivider, NTooltip } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  GridOutline,
  ChatboxEllipsesOutline,
  ChatbubblesOutline,
  BookOutline,
  CalendarOutline,
  SparklesOutline,
  GitNetworkOutline,
  ExtensionPuzzleOutline,
  CogOutline,
  PulseOutline,
  FolderOutline,
  PeopleOutline,
  BusinessOutline,
  StorefrontOutline,
  ConstructOutline,
  TerminalOutline,
  DesktopOutline,
  ArchiveOutline,
  SettingsOutline,
  CodeSlashOutline,
  CloudOutline,
  WalletOutline,
  PersonCircleOutline,
  LogOutOutline,
} from '@vicons/ionicons5'
import { routes } from '@/router/routes'
import { useHermesConnectionStore } from '@/stores/hermes/connection'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useLingjingBillingStore } from '@/stores/lingjing-billing'

defineProps<{ collapsed: boolean }>()

const route = useRoute()
const router = useRouter()
const connStore = useHermesConnectionStore()
const authStore = useAuthStore()
const wsStore = useWebSocketStore()
const billingStore = useLingjingBillingStore()

const iconMap: Record<string, unknown> = {
  GridOutline,
  ChatboxEllipsesOutline,
  ChatbubblesOutline,
  BookOutline,
  CalendarOutline,
  SparklesOutline,
  GitNetworkOutline,
  ExtensionPuzzleOutline,
  CogOutline,
  PulseOutline,
  FolderOutline,
  PeopleOutline,
  BusinessOutline,
  StorefrontOutline,
  ConstructOutline,
  TerminalOutline,
  DesktopOutline,
  ArchiveOutline,
  SettingsOutline,
  CodeSlashOutline,
  CloudOutline,
}

function renderIcon(iconName: string) {
  const icon = iconMap[iconName]
  if (!icon) return undefined
  return () => h(NIcon, null, { default: () => h(icon as any) })
}

interface SectionDef {
  key: string
  label: string
}

const SECTIONS: SectionDef[] = [
  { key: 'use', label: '使用' },
  { key: 'build', label: '构建' },
  { key: 'system', label: '系统' },
]

const menuOptions = computed<MenuOption[]>(() => {
  const mainRoute = routes.find((r) => r.path === '/')
  if (!mainRoute?.children) return []

  const currentGateway = connStore.currentGateway
  const visible = mainRoute.children.filter((child) => {
    if (child.meta?.hidden) return false
    const gateway = child.meta?.gateway as string | undefined
    return gateway === currentGateway
  })

  // 把可见路由按 section 分组(默认 'use')
  const grouped = new Map<string, typeof visible>()
  for (const child of visible) {
    const section = (child.meta?.section as string | undefined) || 'use'
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section)!.push(child)
  }

  const opts: MenuOption[] = []
  for (const sec of SECTIONS) {
    const items = grouped.get(sec.key)
    if (!items || items.length === 0) continue
    opts.push({
      type: 'group',
      label: sec.label,
      key: `__group_${sec.key}`,
      children: items.map((child) => ({
        label: child.meta?.title || (child.meta?.titleKey as string),
        key: child.name as string,
        icon: child.meta?.icon ? renderIcon(child.meta.icon as string) : undefined,
      })),
    })
  }

  // 收集没匹配 section 的(未来兜底)
  for (const [secKey, items] of grouped) {
    if (SECTIONS.find((s) => s.key === secKey)) continue
    if (!items.length) continue
    opts.push({
      type: 'group',
      label: secKey,
      key: `__group_${secKey}`,
      children: items.map((child) => ({
        label: child.meta?.title || (child.meta?.titleKey as string),
        key: child.name as string,
        icon: child.meta?.icon ? renderIcon(child.meta.icon as string) : undefined,
      })),
    })
  }

  return opts
})

const activeKey = computed(() => route.name as string)

function handleSelect(key: string) {
  router.push({ name: key })
}

const balance = computed(() => billingStore.balanceUsd)
const memberId = computed(() => authStore.memberId)

function goSettings() {
  router.push({ name: 'Settings' })
}

async function handleLogout() {
  wsStore.disconnect()
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="lingjing-sidebar">
    <div class="brand-area" :class="{ 'brand-area-collapsed': collapsed }">
      <NText
        strong
        :style="{
          fontSize: '20px',
          fontWeight: 300,
          letterSpacing: collapsed ? '0' : '0.4em',
          paddingLeft: collapsed ? '0' : '0.4em',
          whiteSpace: 'nowrap',
          color: 'var(--n-text-color)',
        }"
      >
        {{ collapsed ? '灵' : '灵境' }}
      </NText>
    </div>

    <div class="menu-scroll">
      <NMenu
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :indent="20"
        @update:value="handleSelect"
      />
    </div>

    <NDivider class="account-divider" />

    <div class="account-area" :class="{ 'account-area-collapsed': collapsed }">
      <template v-if="!collapsed">
        <div class="account-row info">
          <NIcon size="16" class="row-icon"><WalletOutline /></NIcon>
          <span class="row-label">余额</span>
          <span class="row-value">$ {{ balance }}</span>
        </div>

        <button class="account-row action" @click="goSettings">
          <NIcon size="16" class="row-icon"><SettingsOutline /></NIcon>
          <span class="row-label">设置</span>
        </button>

        <div class="account-row info">
          <NIcon size="16" class="row-icon"><PersonCircleOutline /></NIcon>
          <span class="row-label">编号</span>
          <span class="row-value">NO. {{ memberId }}</span>
        </div>

        <button class="account-row action" @click="handleLogout">
          <NIcon size="16" class="row-icon"><LogOutOutline /></NIcon>
          <span class="row-label">退出登录</span>
        </button>
      </template>

      <template v-else>
        <NTooltip placement="right">
          <template #trigger>
            <button class="icon-only-btn" @click="goSettings">
              <NIcon size="18"><SettingsOutline /></NIcon>
            </button>
          </template>
          设置
        </NTooltip>
        <NTooltip placement="right">
          <template #trigger>
            <button class="icon-only-btn" @click="handleLogout">
              <NIcon size="18"><LogOutOutline /></NIcon>
            </button>
          </template>
          退出登录
        </NTooltip>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lingjing-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.brand-area {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 20px 24px;
  height: 60px;
}

.brand-area-collapsed {
  justify-content: center;
  padding: 20px 0;
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 4px;
}

/* 让 group label(使用 / 构建)更克制、更小 */
.menu-scroll :deep(.n-menu-item-group .n-menu-item-group-title) {
  padding-left: 24px;
  padding-right: 12px;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--n-text-color-3, #98989d);
  font-weight: 500;
  text-transform: uppercase;
  margin-top: 12px;
  margin-bottom: 4px;
}

.account-divider {
  margin: 0 !important;
}

.account-area {
  padding: 8px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-area-collapsed {
  align-items: center;
  padding: 8px 0 14px;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--n-text-color);
  width: 100%;
  background: transparent;
  border: none;
  cursor: default;
  text-align: left;
  font-family: inherit;
}

.account-row.action {
  cursor: pointer;
  transition: background 0.12s ease;
}

.account-row.action:hover {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.04));
}

.account-row.action:active {
  background: var(--n-color-pressed, rgba(0, 0, 0, 0.06));
}

.row-icon {
  flex-shrink: 0;
  opacity: 0.78;
}

.row-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-value {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  font-size: 12.5px;
}

.icon-only-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--n-text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 2px 0;
  transition: background 0.12s ease;
}

.icon-only-btn:hover {
  background: var(--n-color-hover, rgba(0, 0, 0, 0.04));
}
</style>
