<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpace, NTooltip, NIcon, NText } from 'naive-ui'
import { SunnyOutline, MoonOutline, LogOutOutline, ExpandOutline, ContractOutline } from '@vicons/ionicons5'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useWideModeStore } from '@/stores/wideMode'
import { useHermesConnectionStore } from '@/stores/hermes/connection'
import { ConnectionState } from '@/api/types'
import GatewaySwitcher from '@/components/common/GatewaySwitcher.vue'

const route = useRoute()
const router = useRouter()
const { isDark, toggle } = useTheme()
const authStore = useAuthStore()
const wsStore = useWebSocketStore()
const wideModeStore = useWideModeStore()
const connStore = useHermesConnectionStore()

const pageTitle = computed(() => {
  return (route.meta.title as string) || (route.meta.titleKey as string) || ''
})

const isOpenClaw = computed(() => connStore.currentGateway === 'openclaw')

// "●云端模式" 状态指示:云端账号已登录 + 当前 gateway 状态
const cloudStatus = computed(() => {
  if (!authStore.isAuthenticated) {
    return { text: '未登录', color: '#8E8E93', dot: '#8E8E93' }
  }
  if (isOpenClaw.value) {
    if (wsStore.state === ConnectionState.CONNECTED) {
      return { text: '云端模式', color: 'currentColor', dot: '#34C759' }
    }
    if (wsStore.state === ConnectionState.CONNECTING || wsStore.state === ConnectionState.RECONNECTING) {
      return { text: '连接中…', color: '#8E8E93', dot: '#FFCC00' }
    }
    return { text: '云端模式', color: 'currentColor', dot: '#34C759' }
  }
  return { text: '工坊模式', color: 'currentColor', dot: '#34C759' }
})

async function handleLogout() {
  wsStore.disconnect()
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="app-header-wrap">
    <div class="header-left">
      <NText class="page-title">{{ pageTitle }}</NText>
    </div>

    <NSpace :size="10" align="center" class="header-right">
      <div class="cloud-status">
        <span class="cloud-dot" :style="{ background: cloudStatus.dot }" />
        <span class="cloud-label" :style="{ color: cloudStatus.color }">
          {{ cloudStatus.text }}
        </span>
      </div>

      <GatewaySwitcher />

      <NTooltip>
        <template #trigger>
          <NButton quaternary circle @click="toggle">
            <template #icon>
              <NIcon :component="isDark ? SunnyOutline : MoonOutline" />
            </template>
          </NButton>
        </template>
        {{ isDark ? '切换到浅色' : '切换到深色' }}
      </NTooltip>

      <NTooltip>
        <template #trigger>
          <NButton quaternary circle @click="wideModeStore.toggle">
            <template #icon>
              <NIcon :component="wideModeStore.isWideMode ? ContractOutline : ExpandOutline" />
            </template>
          </NButton>
        </template>
        {{ wideModeStore.isWideMode ? '退出宽屏' : '宽屏模式' }}
      </NTooltip>

      <NTooltip>
        <template #trigger>
          <NButton quaternary circle @click="handleLogout">
            <template #icon>
              <NIcon :component="LogOutOutline" />
            </template>
          </NButton>
        </template>
        退出登录
      </NTooltip>
    </NSpace>
  </div>
</template>

<style scoped>
.app-header-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  letter-spacing: 0.02em;
}

.header-right {
  display: flex;
}

.cloud-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--n-action-color, rgba(0, 0, 0, 0.04));
  font-size: 12px;
  user-select: none;
}

.cloud-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
}

.cloud-label {
  font-weight: 500;
  letter-spacing: 0.02em;
}

:root[data-theme='dark'] .cloud-status {
  background: rgba(255, 255, 255, 0.06);
}
</style>
