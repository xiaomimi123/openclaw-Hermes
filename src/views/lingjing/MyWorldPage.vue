<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NSpin, NButton, NIcon, NEmpty, NTag } from 'naive-ui'
import { AddOutline, BusinessOutline, PeopleOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { useOfficeStore } from '@/stores/office'

// 灵境 MyWorld 是 OpenClaw /office 场景的灵境品牌入口 ——
// 数据共用 useOfficeStore,新建/进入都跳到 /office 真正的协作页面
const router = useRouter()
const officeStore = useOfficeStore()

const loading = computed(() => officeStore.loading)
const lastError = computed(() => officeStore.error)

const rooms = computed(() =>
  officeStore.scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    agentCount: s.agents?.length ?? 0,
    active: s.status === 'active',
  })),
)

onMounted(() => {
  officeStore.loadOfficeData?.()
})

function handleNew() {
  // /office 自带 Wizard,跳过去顺便打开 wizard
  officeStore.showWizard?.()
  router.push('/office')
}

function handleEnter(roomId: string) {
  // 选中场景后跳过去
  officeStore.activateScenario?.(roomId)
  router.push('/office')
}
</script>

<template>
  <div class="myworld-page">
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1 class="page-title">虚拟公司</h1>
          <p class="page-subtitle">
            模拟一家公司:多个 AI 智能体协作完成项目,你来当老板
          </p>
        </div>
        <NButton type="primary" size="medium" @click="handleNew">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          新建虚拟公司
        </NButton>
      </div>
    </header>

    <NSpin :show="loading">
      <div v-if="!loading && rooms.length === 0" class="empty-card">
        <NEmpty :description="lastError || '还没有虚拟公司,创建一个让 AI 团队为你工作'">
          <template #icon>
            <NIcon size="44" :depth="3">
              <BusinessOutline />
            </NIcon>
          </template>
          <template v-if="lastError" #extra>
            <NButton size="small" @click="loadRooms">重试</NButton>
          </template>
        </NEmpty>
      </div>

      <div v-else class="room-grid">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          @click="handleEnter(room.id)"
        >
          <div class="room-icon">
            <NIcon size="20"><BusinessOutline /></NIcon>
          </div>
          <div class="room-body">
            <div class="room-name-row">
              <span class="room-name">{{ room.name }}</span>
              <NTag v-if="room.active" size="small" :bordered="false" type="success" round>
                运行中
              </NTag>
            </div>
            <p v-if="room.description" class="room-desc">{{ room.description }}</p>
            <div class="room-meta">
              <NIcon size="13"><PeopleOutline /></NIcon>
              <span>{{ room.agentCount ?? 0 }} 位智能体</span>
            </div>
          </div>
        </div>
      </div>
    </NSpin>

    <p class="page-footnote">
      在虚拟公司中,你可以创建多个智能体扮演不同角色(产品、研发、运营等),让它们围绕一个项目协作。
    </p>
  </div>
</template>

<style scoped>
.myworld-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 8px 48px;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.page-head {
  margin-bottom: 24px;
}

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 500;
  color: var(--n-text-color);
  margin: 0 0 6px;
  letter-spacing: -0.2px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0;
  max-width: 460px;
}

.empty-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 60px 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.room-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease;
}

.room-card:hover {
  border-color: var(--n-text-color-3);
}

.room-card:active {
  transform: scale(0.99);
}

.room-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--n-action-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--n-text-color-3);
}

.room-body {
  flex: 1;
  min-width: 0;
}

.room-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.room-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.room-desc {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin: 0 0 6px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.room-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--n-text-color-disabled);
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}
</style>
