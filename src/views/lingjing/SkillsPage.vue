<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NInput, NSwitch, NSpin, NTag, NIcon, NEmpty, NButton, useMessage } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { useWebSocketStore } from '@/stores/websocket'
import type { Skill } from '@/api/types'

const message = useMessage()
const wsStore = useWebSocketStore()

const skills = ref<Skill[]>([])
const loading = ref(false)
const lastError = ref('')
const search = ref('')
const togglingName = ref<string | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return skills.value
  return skills.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q),
  )
})

const installedCount = computed(() => skills.value.filter((s) => s.installed).length)

onMounted(loadSkills)

async function loadSkills() {
  loading.value = true
  lastError.value = ''
  try {
    const list = await wsStore.rpc.listSkills()
    skills.value = list as Skill[]
  } catch (err: any) {
    lastError.value = err?.message || '加载技能失败,请检查 OpenClaw Gateway 连接'
    message.error(lastError.value)
  } finally {
    loading.value = false
  }
}

async function handleToggle(skill: Skill, value: boolean) {
  togglingName.value = skill.name
  try {
    if (value && !skill.installed) {
      await wsStore.rpc.installSkill(skill.name)
      skill.installed = true
      message.success(`已启用 ${skill.name}`)
    } else if (!value && skill.installed) {
      // uninstall — RPC 没有 uninstallSkill 方法,用 disabled 标记代替(看 Skill 类型)
      message.warning('卸载功能尚未开放,请联系管理员')
      skill.installed = true // revert
    }
  } catch (err: any) {
    message.error(err?.message || '操作失败')
    skill.installed = !value // revert
  } finally {
    togglingName.value = null
  }
}

function skillBadge(skill: Skill): { label: string; type: 'default' | 'info' | 'success' } | null {
  if (skill.bundled) return { label: '内置', type: 'info' }
  if (skill.source === 'remote') return { label: '在线', type: 'default' }
  return null
}
</script>

<template>
  <div class="skills-page">
    <header class="page-head">
      <h1 class="page-title">技能广场</h1>
      <p class="page-subtitle">
        启用 AI 助手可调用的工具技能(网页搜索、文件读写、计算等)。已启用 {{ installedCount }} / {{ skills.length }} 项
      </p>
    </header>

    <NSpin :show="loading">
      <div v-if="!loading && skills.length === 0 && lastError" class="empty-state">
        <NEmpty :description="lastError">
          <template #extra>
            <NButton size="medium" @click="loadSkills">重试</NButton>
          </template>
        </NEmpty>
      </div>

      <template v-else>
        <div class="search-bar">
          <NInput
            v-model:value="search"
            placeholder="搜索技能名或描述"
            size="medium"
            clearable
          >
            <template #prefix>
              <NIcon><SearchOutline /></NIcon>
            </template>
          </NInput>
        </div>

        <div class="skill-card">
          <div
            v-for="(skill, idx) in filtered"
            :key="skill.name"
            class="skill-row"
            :class="{ 'first-row': idx === 0 }"
          >
            <div class="skill-main">
              <div class="skill-name-line">
                <span class="skill-name">{{ skill.name }}</span>
                <NTag
                  v-if="skillBadge(skill)"
                  size="small"
                  :bordered="false"
                  :type="skillBadge(skill)!.type"
                  round
                >
                  {{ skillBadge(skill)!.label }}
                </NTag>
                <span v-if="skill.version" class="skill-version">v{{ skill.version }}</span>
              </div>
              <p v-if="skill.description" class="skill-desc">{{ skill.description }}</p>
            </div>
            <NSwitch
              :value="skill.installed"
              :loading="togglingName === skill.name"
              :disabled="togglingName === skill.name || !skill.eligible"
              @update:value="(v) => handleToggle(skill, v)"
            />
          </div>

          <div v-if="filtered.length === 0" class="empty-state-inline">
            没有匹配的技能
          </div>
        </div>
      </template>
    </NSpin>

    <p class="page-footnote">
      技能由 OpenClaw 提供。新启用的技能会在下次对话中生效。
    </p>
  </div>
</template>

<style scoped>
.skills-page {
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

.search-bar {
  margin-bottom: 16px;
}

.skill-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  overflow: hidden;
}

.skill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-top: 1px solid var(--n-divider-color);
}

.skill-row.first-row {
  border-top: none;
}

.skill-main {
  flex: 1;
  min-width: 0;
}

.skill-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.skill-version {
  font-size: 11.5px;
  color: var(--n-text-color-disabled);
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

.skill-desc {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  margin-top: 60px;
}

.empty-state-inline {
  text-align: center;
  padding: 32px 16px;
  color: var(--n-text-color-disabled);
  font-size: 13px;
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}
</style>
