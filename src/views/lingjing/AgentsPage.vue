<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NSpin, NTag, NButton, NIcon, NModal, NInput, NSpace, NForm, NFormItem,
  NPopconfirm, useMessage, useDialog,
} from 'naive-ui'
import { PersonCircleOutline, AddOutline, TrashOutline } from '@vicons/ionicons5'
import { useWebSocketStore } from '@/stores/websocket'

interface AgentRow {
  id: string
  name: string
  emoji?: string
  model?: string
  workspace?: string
  isDefault: boolean
}

const message = useMessage()
const dialog = useDialog()
const wsStore = useWebSocketStore()

const agents = ref<AgentRow[]>([])
const loading = ref(false)
const lastError = ref('')
const defaultId = ref<string>('')

// 编辑/新建 modal
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const formAgentId = ref('')
const formName = ref('')
const formWorkspace = ref('')
const submitting = ref(false)

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
      workspace: a.workspace,
      isDefault: a.id === defaultId.value,
    }))
  } catch (err: any) {
    lastError.value = err?.message || '加载智能体列表失败'
    message.error(lastError.value)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modalMode.value = 'create'
  formAgentId.value = ''
  formName.value = ''
  formWorkspace.value = ''
  showModal.value = true
}

function openEdit(agent: AgentRow) {
  modalMode.value = 'edit'
  formAgentId.value = agent.id
  formName.value = agent.name
  formWorkspace.value = agent.workspace || ''
  showModal.value = true
}

async function handleSubmit() {
  const name = formName.value.trim()
  if (!name) {
    message.warning('请填写名称')
    return
  }
  submitting.value = true
  try {
    if (modalMode.value === 'create') {
      const ws = formWorkspace.value.trim() ||
        `${'~'}/.openclaw/workspaces/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const r = await wsStore.rpc.createAgent({ name, workspace: ws })
      message.success(`已创建 ${r.name}`)
    } else {
      await wsStore.rpc.updateAgent({
        agentId: formAgentId.value,
        name,
        ...(formWorkspace.value.trim() ? { workspace: formWorkspace.value.trim() } : {}),
      })
      message.success(`已更新 ${name}`)
    }
    showModal.value = false
    await loadAgents()
  } catch (err: any) {
    message.error(err?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!formAgentId.value) return
  if (formAgentId.value === defaultId.value) {
    message.warning('默认智能体不能删除,请先在 OpenClaw 里切换默认')
    return
  }
  dialog.warning({
    title: '确认删除',
    content: `删除 "${formName.value}" 后,关联的会话将解绑。此操作不可撤销,确认继续?`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      submitting.value = true
      try {
        await wsStore.rpc.deleteAgent(formAgentId.value)
        message.success('已删除')
        showModal.value = false
        await loadAgents()
      } catch (err: any) {
        message.error(err?.message || '删除失败')
      } finally {
        submitting.value = false
      }
    },
  })
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
        <NButton type="primary" size="medium" @click="openCreate">
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
          @click="openEdit(agent)"
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

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="modalMode === 'create' ? '新建智能体' : `编辑 ${formName}`"
      style="width: 480px;"
      :bordered="false"
      :segmented="{ content: 'soft' }"
    >
      <NForm label-placement="left" label-width="78" :show-feedback="false">
        <NFormItem label="名称" required>
          <NInput v-model:value="formName" placeholder="例如:研究助手" maxlength="40" show-count />
        </NFormItem>
        <NFormItem label="工作目录">
          <NInput
            v-model:value="formWorkspace"
            :placeholder="modalMode === 'create' ? '留空使用默认 ~/.openclaw/workspaces/<name>' : ''"
          />
        </NFormItem>
        <p v-if="modalMode === 'edit'" class="modal-id-hint">ID {{ formAgentId }}</p>
        <p class="modal-id-hint">头像 / 人设需在 AGENTS.md 中编辑(/memory 页面)</p>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton
            v-if="modalMode === 'edit'"
            type="error"
            ghost
            size="medium"
            :disabled="submitting"
            @click="handleDelete"
          >
            <template #icon><NIcon><TrashOutline /></NIcon></template>
            删除
          </NButton>
          <NSpace :size="8" style="margin-left: auto;">
            <NButton size="medium" :disabled="submitting" @click="showModal = false">取消</NButton>
            <NButton
              type="primary"
              size="medium"
              :loading="submitting"
              @click="handleSubmit"
            >
              {{ modalMode === 'create' ? '创建' : '保存' }}
            </NButton>
          </NSpace>
        </div>
      </template>
    </NModal>
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

.modal-id-hint {
  font-size: 11.5px;
  color: var(--n-text-color-disabled);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  margin: 4px 0 0 78px;
}

.modal-footer {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>
