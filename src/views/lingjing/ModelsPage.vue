<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NSelect, NButton, NSpin, NTag, useMessage } from 'naive-ui'
import { listPlaygroundModels, type PlaygroundModelInfo } from '@/api/lingjing/chat'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const authStore = useAuthStore()

const models = ref<PlaygroundModelInfo[]>([])
const loading = ref(false)
const applying = ref(false)
const selectedModelId = ref<string>('')
const lastError = ref<string>('')

// 当前生效的模型(从 localStorage 持久化的)
const activeModelId = computed(
  () => (authStore as any).getSelectedModel?.() || 'gpt-5.4',
)

const selectedModel = computed(() =>
  models.value.find((m) => m.id === selectedModelId.value) || null,
)

const isCurrentlyActive = computed(
  () => selectedModelId.value === activeModelId.value,
)

const modelOptions = computed(() =>
  models.value.map((m) => ({
    label: m.name || m.id,
    value: m.id,
  })),
)

onMounted(async () => {
  await loadModels()
})

async function loadModels() {
  loading.value = true
  lastError.value = ''
  try {
    const list = await listPlaygroundModels()
    models.value = list
    if (list.length === 0) {
      lastError.value = '账号下没有可用模型,请联系灵镜管理员开通'
      return
    }
    // 默认选中当前生效的(如果在列表里),否则选 featured 或第一个
    const current = list.find((m) => m.id === activeModelId.value)
    selectedModelId.value =
      current?.id || list.find((m) => m.featured)?.id || list[0].id
  } catch (err: any) {
    lastError.value = err?.message || '加载模型失败,请检查网络或重新登录'
    message.error(lastError.value)
  } finally {
    loading.value = false
  }
}

async function handleApply() {
  if (!selectedModelId.value) return
  if (isCurrentlyActive.value) {
    message.info('当前已经是这个模型')
    return
  }
  applying.value = true
  try {
    const bridge = (window as any).lingjing
    if (!bridge?.autoConfigureViaMain) {
      message.error('Electron 桥接未注入,请重启应用')
      return
    }
    const result = await bridge.autoConfigureViaMain({
      modelId: selectedModelId.value,
    })
    if (result?.openclaw === 'ok') {
      try {
        localStorage.setItem('lingjing_selected_model', selectedModelId.value)
      } catch {
        // ignore
      }
      message.success(`已切换到 ${selectedModel.value?.name || selectedModelId.value}`)
    } else {
      message.error(
        result?.openclawMessage || result?.message || '切换失败,请稍后重试',
      )
    }
  } catch (err: any) {
    message.error(err?.message || '切换失败')
  } finally {
    applying.value = false
  }
}

function formatPrice(value?: number) {
  if (value == null) return '—'
  return `$${value.toFixed(2)} / 1M tokens`
}
</script>

<template>
  <div class="models-page">
    <header class="page-head">
      <h1 class="page-title">模型管理</h1>
      <p class="page-subtitle">选择默认 AI 模型,所有对话都将使用所选模型回答</p>
    </header>

    <NSpin :show="loading">
      <section v-if="!loading && models.length > 0" class="model-card">
        <div class="row">
          <label class="row-label">默认模型</label>
          <div class="row-control">
            <NSelect
              v-model:value="selectedModelId"
              :options="modelOptions"
              size="medium"
              class="model-select"
              :consistent-menu-width="false"
            />
            <NButton
              type="primary"
              size="medium"
              :loading="applying"
              :disabled="isCurrentlyActive"
              class="apply-btn"
              @click="handleApply"
            >
              {{ isCurrentlyActive ? '当前生效' : '应用' }}
            </NButton>
          </div>
        </div>

        <div class="divider" />

        <div v-if="selectedModel" class="model-detail">
          <div class="detail-header">
            <span class="detail-name">{{ selectedModel.name || selectedModel.id }}</span>
            <NTag
              v-if="isCurrentlyActive"
              size="small"
              :bordered="false"
              type="success"
              round
            >
              当前生效
            </NTag>
            <NTag
              v-else-if="selectedModel.featured"
              size="small"
              :bordered="false"
              round
            >
              推荐
            </NTag>
          </div>

          <p v-if="selectedModel.description" class="detail-desc">
            {{ selectedModel.description }}
          </p>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="item-label">提供方</span>
              <span class="item-value">{{ selectedModel.provider || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">上下文</span>
              <span class="item-value">{{ selectedModel.context_window || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">输入价格</span>
              <span class="item-value">{{ formatPrice(selectedModel.input_price) }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">输出价格</span>
              <span class="item-value">{{ formatPrice(selectedModel.output_price) }}</span>
            </div>
            <div class="detail-item">
              <span class="item-label">模型 ID</span>
              <span class="item-value mono">{{ selectedModel.id }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="!loading" class="model-card empty-state">
        <div class="empty-title">无可用模型</div>
        <p class="empty-desc">{{ lastError || '请先登录,或联系灵镜管理员开通模型权限' }}</p>
        <NButton size="medium" @click="loadModels">重试</NButton>
      </section>
    </NSpin>

    <p class="page-footnote">
      切换模型后下次对话立即生效。本地 OpenClaw Gateway 会用新模型重启。
    </p>
  </div>
</template>

<style scoped>
.models-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 8px 48px;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.page-head {
  margin-bottom: 24px;
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
}

.model-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 20px 22px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  flex-shrink: 0;
}

.row-control {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.model-select {
  min-width: 240px;
}

.apply-btn {
  min-width: 80px;
}

.divider {
  height: 1px;
  background: var(--n-divider-color);
  margin: 16px -22px;
}

.model-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--n-text-color);
}

.detail-desc {
  font-size: 13px;
  color: var(--n-text-color-3);
  line-height: 1.55;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 24px;
  margin-top: 4px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--n-divider-color);
  font-size: 13px;
}

.detail-item:last-child {
  border-bottom: none;
}

.item-label {
  color: var(--n-text-color-3);
}

.item-value {
  color: var(--n-text-color);
  font-variant-numeric: tabular-nums;
}

.item-value.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 22px;
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--n-text-color);
}

.empty-desc {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0 0 8px;
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}
</style>
