<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NSpin,
  NTag,
  NButton,
  NIcon,
  NSwitch,
  NEmpty,
  NModal,
  NInput,
  NSpace,
  useMessage,
} from 'naive-ui'
import { AddOutline, PlayOutline, CalendarOutline } from '@vicons/ionicons5'
import { useWebSocketStore } from '@/stores/websocket'

interface CronTask {
  id: string
  name: string
  cron: string
  message: string
  enabled: boolean
  nextRun?: string
  lastRun?: string
}

const message = useMessage()
const wsStore = useWebSocketStore()

const tasks = ref<CronTask[]>([])
const loading = ref(false)
const lastError = ref('')
const togglingId = ref<string | null>(null)
const triggeringId = ref<string | null>(null)

const showCreateModal = ref(false)
const formName = ref('')
const formCron = ref('0 9 * * *')
const formMessage = ref('')
const creating = ref(false)

const enabledCount = computed(() => tasks.value.filter((t) => t.enabled).length)

onMounted(loadTasks)

async function loadTasks() {
  loading.value = true
  lastError.value = ''
  try {
    const list = await (wsStore.rpc as any).listCronJobs?.() ?? []
    tasks.value = (list as any[]).map((t) => ({
      id: t.id || t.jobId || t.name,
      name: t.name || t.id,
      cron: t.cron || t.schedule || t.expression || '',
      message: t.message || t.body || t.payload?.message || '',
      enabled: t.enabled ?? t.active ?? true,
      nextRun: t.nextRun,
      lastRun: t.lastRun,
    }))
  } catch (err: any) {
    lastError.value = err?.message || '加载任务列表失败'
  } finally {
    loading.value = false
  }
}

async function handleToggle(task: CronTask, value: boolean) {
  togglingId.value = task.id
  try {
    if (value) {
      await (wsStore.rpc as any).resumeCronJob?.(task.id)
    } else {
      await (wsStore.rpc as any).pauseCronJob?.(task.id)
    }
    task.enabled = value
    message.success(value ? '已启用' : '已暂停')
  } catch (err: any) {
    message.error(err?.message || '操作失败')
    task.enabled = !value
  } finally {
    togglingId.value = null
  }
}

async function handleTrigger(task: CronTask) {
  triggeringId.value = task.id
  try {
    await (wsStore.rpc as any).triggerCronJob?.(task.id)
    message.success(`已手动触发 "${task.name}"`)
  } catch (err: any) {
    message.error(err?.message || '触发失败')
  } finally {
    triggeringId.value = null
  }
}

function openCreate() {
  formName.value = ''
  formCron.value = '0 9 * * *'
  formMessage.value = ''
  showCreateModal.value = true
}

async function handleCreate() {
  if (!formName.value || !formCron.value || !formMessage.value) {
    message.error('请填写名称、定时和指令')
    return
  }
  creating.value = true
  try {
    await (wsStore.rpc as any).createCronJob?.({
      name: formName.value,
      cron: formCron.value,
      message: formMessage.value,
    })
    message.success('任务已创建')
    showCreateModal.value = false
    await loadTasks()
  } catch (err: any) {
    message.error(err?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// 把 cron 表达式翻译成大白话
function describeCron(cron: string): string {
  const map: Record<string, string> = {
    '* * * * *': '每分钟',
    '0 * * * *': '每小时整点',
    '0 9 * * *': '每天 09:00',
    '0 9 * * 1': '每周一 09:00',
    '0 9 1 * *': '每月 1 号 09:00',
    '0 0 * * *': '每天午夜',
  }
  return map[cron] || cron
}
</script>

<template>
  <div class="cron-page">
    <header class="page-head">
      <div class="head-row">
        <div>
          <h1 class="page-title">自动化任务</h1>
          <p class="page-subtitle">
            让 AI 助手按时间表自动执行任务。已启用 {{ enabledCount }} / {{ tasks.length }} 个
          </p>
        </div>
        <NButton type="primary" size="medium" @click="openCreate">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          新建任务
        </NButton>
      </div>
    </header>

    <NSpin :show="loading">
      <div v-if="!loading && tasks.length === 0" class="empty-card">
        <NEmpty :description="lastError || '还没有任务,点击右上角创建一个'">
          <template v-if="lastError" #extra>
            <NButton size="small" @click="loadTasks">重试</NButton>
          </template>
        </NEmpty>
      </div>

      <div v-else class="task-list">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
        >
          <div class="task-icon">
            <NIcon size="18">
              <CalendarOutline />
            </NIcon>
          </div>
          <div class="task-body">
            <div class="task-name-row">
              <span class="task-name">{{ task.name }}</span>
              <NTag size="small" :bordered="false" round>
                {{ describeCron(task.cron) }}
              </NTag>
            </div>
            <p v-if="task.message" class="task-msg">{{ task.message }}</p>
            <div v-if="task.nextRun || task.lastRun" class="task-meta">
              <span v-if="task.nextRun" class="meta-item">下次 {{ task.nextRun }}</span>
              <span v-if="task.lastRun" class="meta-item">上次 {{ task.lastRun }}</span>
            </div>
          </div>
          <div class="task-actions">
            <NButton
              quaternary
              size="small"
              :loading="triggeringId === task.id"
              :disabled="!task.enabled"
              @click="handleTrigger(task)"
            >
              <template #icon>
                <NIcon><PlayOutline /></NIcon>
              </template>
              立即执行
            </NButton>
            <NSwitch
              :value="task.enabled"
              :loading="togglingId === task.id"
              :disabled="togglingId === task.id"
              @update:value="(v: boolean) => handleToggle(task, v)"
            />
          </div>
        </div>
      </div>
    </NSpin>

    <p class="page-footnote">
      任务由 OpenClaw 调度执行。Cron 格式参考:分 时 日 月 周(如 <code>0 9 * * *</code> 表示每天 9 点)
    </p>

    <!-- 新建 Modal -->
    <NModal
      v-model:show="showCreateModal"
      preset="card"
      title="新建任务"
      style="width: 480px;"
      :bordered="false"
      :segmented="{ content: 'soft' }"
    >
      <p class="modal-desc">设置一个定时任务,到点 AI 自动执行你的指令。</p>
      <div class="form-item">
        <label class="form-label">任务名称</label>
        <NInput v-model:value="formName" placeholder="如:每天早晨总结日程" size="medium" />
      </div>
      <div class="form-item">
        <label class="form-label">执行时间(Cron 表达式)</label>
        <NInput v-model:value="formCron" placeholder="0 9 * * *" size="medium" />
        <p class="form-hint">{{ describeCron(formCron) }}</p>
      </div>
      <div class="form-item">
        <label class="form-label">指令</label>
        <NInput
          v-model:value="formMessage"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="到点要 AI 做什么,如:总结今天的待办并发邮件给我"
          size="medium"
        />
      </div>
      <div class="modal-actions">
        <NSpace :size="8">
          <NButton size="medium" @click="showCreateModal = false">取消</NButton>
          <NButton
            type="primary"
            size="medium"
            :loading="creating"
            @click="handleCreate"
          >
            创建
          </NButton>
        </NSpace>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.cron-page {
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

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.task-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--n-action-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--n-text-color-3);
}

.task-body {
  flex: 1;
  min-width: 0;
}

.task-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.task-msg {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin: 0 0 4px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 11.5px;
  color: var(--n-text-color-disabled);
  font-variant-numeric: tabular-nums;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}

.page-footnote code {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  background: var(--n-action-color);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11.5px;
}

.modal-desc {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0 0 16px;
}

.form-item {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color);
  margin-bottom: 6px;
}

.form-hint {
  font-size: 11.5px;
  color: var(--n-text-color-3);
  margin: 4px 0 0;
}

.modal-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}
</style>
