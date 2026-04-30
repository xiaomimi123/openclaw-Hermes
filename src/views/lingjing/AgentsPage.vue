<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NSpin, NTag, NButton, NIcon, useMessage } from 'naive-ui'
import { PersonCircleOutline, AddOutline } from '@vicons/ionicons5'
import { useWebSocketStore } from '@/stores/websocket'

interface AgentRow {
  id: string
  name: string
  emoji?: string
  model?: string
  isDefault: boolean
}

const message = useMessage()
const wsStore = useWebSocketStore()

const agents = ref<AgentRow[]>([])
const loading = ref(false)
const lastError = ref('')
const defaultId = ref<string>('')

onMounted(loadAgents)

async function loadAgents() {
  loading.value = true
  lastError.value = ''
  try {
    const result = await wsStore.rpc.listAgents()
    const list = (result as any)?.agents || []
    defaultId.value = (result as any)?.defaultId || ''
    agents.value = list.map((a: any) => ({
      id: a.id,
      name: a.identity?.name || a.name || a.id,
      emoji: a.identity?.emoji,
      model: a.model,
      isDefault: a.id === defaultId.value,
    }))
  } catch (err: any) {
    lastError.value = err?.message || '加载智能体列表失败'
    message.error(lastError.value)
  } finally {
    loading.value = false
  }
}

function handleNew() {
  message.info('新建智能体功能正在开发中')
}

function handleEdit(agent: AgentRow) {
  message.info(`编辑 ${agent.name}(功能开发中)`)
}
</script>

<template>
  <div class="agents-page">
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1 class="page-title">多智能体</h1>
          <p class="page-subtitle">
            管理你的 AI 助手。每个智能体有独立的人设、记忆和工具配置
          </p>
        </div>
        <NButton type="primary" size="medium" @click="handleNew">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          新建智能体
        </NButton>
      </div>
    </header>

    <NSpin :show="loading">
      <div v-if="!loading && agents.length === 0" class="empty-card">
        <NIcon size="32" class="empty-icon">
          <PersonCircleOutline />
        </NIcon>
        <p class="empty-text">{{ lastError || '还没有智能体,点击右上角新建一个' }}</p>
        <NButton v-if="lastError" size="small" @click="loadAgents">重试</NButton>
      </div>

      <div v-else class="agent-grid">
        <div
          v-for="agent in agents"
          :key="agent.id"
          class="agent-card"
          @click="handleEdit(agent)"
        >
          <div class="agent-avatar">
            <span v-if="agent.emoji" class="agent-emoji">{{ agent.emoji }}</span>
            <NIcon v-else size="24" class="agent-icon-placeholder">
              <PersonCircleOutline />
            </NIcon>
          </div>
          <div class="agent-body">
            <div class="agent-name-row">
              <span class="agent-name">{{ agent.name }}</span>
              <NTag
                v-if="agent.isDefault"
                size="small"
                :bordered="false"
                type="success"
                round
              >
                默认
              </NTag>
            </div>
            <div class="agent-meta">
              <span class="meta-item">ID {{ agent.id }}</span>
              <span v-if="agent.model" class="meta-item">{{ agent.model }}</span>
            </div>
          </div>
        </div>
      </div>
    </NSpin>

    <p class="page-footnote">
      智能体由 OpenClaw 管理。每个智能体有独立的工作空间(workspace)、记忆(memory)和会话(sessions)。
    </p>
  </div>
</template>

<style scoped>
.agents-page {
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
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.empty-icon {
  color: var(--n-text-color-disabled);
}

.empty-text {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.agent-card {
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

.agent-card:hover {
  border-color: var(--n-text-color-3);
}

.agent-card:active {
  transform: scale(0.99);
}

.agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--n-action-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.agent-emoji {
  font-size: 22px;
}

.agent-icon-placeholder {
  color: var(--n-text-color-3);
}

.agent-body {
  flex: 1;
  min-width: 0;
}

.agent-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.agent-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.meta-item {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}
</style>
