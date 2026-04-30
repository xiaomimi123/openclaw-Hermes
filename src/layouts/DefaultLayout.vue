<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent } from 'naive-ui'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useWebSocketStore } from '@/stores/websocket'
import { useHermesConnectionStore } from '@/stores/hermes/connection'
import { useLingjingBillingStore } from '@/stores/lingjing-billing'

const collapsed = ref(false)
const wsStore = useWebSocketStore()
const connStore = useHermesConnectionStore()
const billingStore = useLingjingBillingStore()
const route = useRoute()
const router = useRouter()

const isOpenClaw = computed(() => connStore.currentGateway === 'openclaw')

onMounted(() => {
  // 如果用户直接访问 /hermes/* 但当前网关是 openclaw(或反之),
  // 顺着路由自动切换网关 —— 不要把用户重定向到默认页面,体验更顺。
  const routeGateway = route.meta?.gateway as 'openclaw' | 'hermes' | undefined
  if (routeGateway && routeGateway !== connStore.currentGateway) {
    connStore.switchGateway(routeGateway)
    // switchGateway 会触发下面的 watch,由它处理连接逻辑
  } else {
    // gateway 已经一致,直接连接对应的后端
    if (isOpenClaw.value) {
      wsStore.connect()
    } else {
      connStore.connect()
    }
  }
  billingStore.startPolling()
})

watch(isOpenClaw, (val) => {
  if (val) {
    wsStore.connect()
    connStore.disconnect()
  } else {
    wsStore.disconnect()
    connStore.connect()
  }
  const currentGateway = val ? 'openclaw' : 'hermes'
  const routeGateway = route.meta?.gateway as string | undefined
  if (routeGateway && routeGateway !== currentGateway) {
    router.push(val ? '/' : '/hermes/chat')
  }
})

onUnmounted(() => {
  wsStore.disconnect()
  billingStore.stopPolling()
})
</script>

<template>
  <NLayout has-sider position="absolute" class="app-layout-root">
    <NLayoutSider
      class="app-layout-sider"
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      :native-scrollbar="false"
      style="height: 100vh;"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <AppSidebar :collapsed="collapsed" />
    </NLayoutSider>

    <NLayout class="app-layout-main">
      <NLayoutHeader bordered class="app-layout-header">
        <AppHeader />
      </NLayoutHeader>

      <NLayoutContent
        class="app-layout-content"
        :native-scrollbar="false"
        content-style="padding: 24px;"
      >
        <div class="page-container">
          <RouterView v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.app-layout-root {
  inset: 0;
  height: 100vh;
  overflow: hidden;
}

.app-layout-main {
  height: 100vh;
  overflow: hidden;
}

.app-layout-header {
  height: var(--header-height);
  padding: 0 24px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 12;
  background: var(--bg-card);
}

.app-layout-content {
  height: calc(100vh - var(--header-height));
}

:deep(.app-layout-content .n-layout-scroll-container) {
  height: 100%;
}
</style>
