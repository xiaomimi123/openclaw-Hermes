<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NSpin,
  NTag,
  NButton,
  NIcon,
  NModal,
  NCard,
  NInput,
  NSpace,
  NAlert,
  useMessage,
} from 'naive-ui'
import { CheckmarkCircleOutline, AddOutline } from '@vicons/ionicons5'
import { useWebSocketStore } from '@/stores/websocket'

interface Platform {
  id: string
  name: string
  desc: string
  logo: string
  fields: Array<{ key: string; label: string; placeholder?: string; secret?: boolean; hint?: string }>
}

const PLATFORMS: Platform[] = [
  {
    id: 'feishu',
    name: '飞书',
    desc: '字节系办公协作 · 群消息 / 私聊',
    logo: '飞',
    fields: [
      { key: 'appId', label: 'App ID', placeholder: 'cli_xxxxxxxxxxxx', hint: '在飞书开放平台 → 凭证与基础信息 获取' },
      { key: 'appSecret', label: 'App Secret', placeholder: 'xxxxxxxxxxxxxxxx', secret: true },
      { key: 'verificationToken', label: 'Verification Token', placeholder: '可选', secret: true },
      { key: 'encryptKey', label: 'Encrypt Key', placeholder: '可选', secret: true },
    ],
  },
  {
    id: 'wechat',
    name: '微信',
    desc: '微信公众号 / 企业微信',
    logo: '微',
    fields: [
      { key: 'appId', label: 'AppID', placeholder: 'wx......' },
      { key: 'appSecret', label: 'AppSecret', placeholder: 'xxxxxxxx', secret: true },
      { key: 'token', label: 'Token', placeholder: '在公众号后台设置', secret: true },
    ],
  },
  {
    id: 'qq',
    name: 'QQ',
    desc: '腾讯 QQ 群机器人',
    logo: 'Q',
    fields: [
      { key: 'botId', label: 'Bot ID', placeholder: 'QQ 号' },
      { key: 'token', label: 'Token', placeholder: 'NoneBot 或 go-cqhttp Token', secret: true },
    ],
  },
  {
    id: 'dingtalk',
    name: '钉钉',
    desc: '阿里钉钉企业内机器人',
    logo: '钉',
    fields: [
      { key: 'appKey', label: 'AppKey', placeholder: 'dingxxxxxxxxxx' },
      { key: 'appSecret', label: 'AppSecret', placeholder: 'xxxxxxxx', secret: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: '海外社区平台',
    logo: 'D',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'MTk4xxxxxxxxx', secret: true, hint: 'Discord Developer Portal → Bot' },
      { key: 'guildId', label: 'Guild ID', placeholder: '可选,不填为公开 bot' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: '加密通讯',
    logo: 'T',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '从 @BotFather 获取', secret: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: '海外团队协作',
    logo: 'S',
    fields: [
      { key: 'botToken', label: 'Bot User Token', placeholder: 'xoxb-xxxx-xxxx', secret: true },
      { key: 'signingSecret', label: 'Signing Secret', secret: true },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Meta WhatsApp Business',
    logo: 'W',
    fields: [
      { key: 'phoneId', label: 'Phone Number ID' },
      { key: 'accessToken', label: 'Access Token', secret: true },
    ],
  },
]

const message = useMessage()
const wsStore = useWebSocketStore()

const installed = ref<Record<string, boolean>>({})
const loading = ref(false)
const lastError = ref('')

const showConfigModal = ref(false)
const editingPlatform = ref<Platform | null>(null)
const formValues = ref<Record<string, string>>({})
const saving = ref(false)

const installedCount = computed(() => Object.values(installed.value).filter(Boolean).length)

onMounted(loadChannels)

async function loadChannels() {
  loading.value = true
  lastError.value = ''
  try {
    const list = await wsStore.rpc.listChannels()
    const map: Record<string, boolean> = {}
    for (const ch of list as any[]) {
      const id = (ch.platform || ch.type || ch.id || '').toLowerCase()
      if (id) map[id] = true
    }
    installed.value = map
  } catch (err: any) {
    lastError.value = err?.message || '加载渠道列表失败'
    // 不弹错误,允许用户继续看渠道目录
  } finally {
    loading.value = false
  }
}

function openConfig(platform: Platform) {
  editingPlatform.value = platform
  formValues.value = {}
  for (const f of platform.fields) {
    formValues.value[f.key] = ''
  }
  showConfigModal.value = true
}

async function handleSave() {
  if (!editingPlatform.value) return
  saving.value = true
  try {
    // 调 OpenClaw 的 channels.auth 等 RPC,具体方法名 rpc-client 已经做了 fallback chain
    await wsStore.rpc.authChannel({
      platform: editingPlatform.value.id,
      ...formValues.value,
    } as any)
    installed.value[editingPlatform.value.id] = true
    message.success(`${editingPlatform.value.name} 已配置`)
    showConfigModal.value = false
  } catch (err: any) {
    message.error(err?.message || '配置失败,请检查凭证')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="channels-page">
    <header class="page-head">
      <h1 class="page-title">通信渠道</h1>
      <p class="page-subtitle">
        让 AI 助手在飞书、微信、QQ 等平台自动回复消息。已接入 {{ installedCount }} / {{ PLATFORMS.length }} 个平台
      </p>
    </header>

    <NSpin :show="loading">
      <NAlert
        v-if="lastError"
        type="warning"
        :bordered="false"
        :show-icon="false"
        class="error-banner"
      >
        加载渠道列表失败({{ lastError }})。你仍然可以浏览支持的平台并配置新渠道。
      </NAlert>

      <div class="platform-grid">
        <div
          v-for="p in PLATFORMS"
          :key="p.id"
          class="platform-card"
          :class="{ 'platform-card--installed': installed[p.id] }"
          @click="openConfig(p)"
        >
          <div class="platform-logo">{{ p.logo }}</div>
          <div class="platform-body">
            <div class="platform-name-row">
              <span class="platform-name">{{ p.name }}</span>
              <NTag
                v-if="installed[p.id]"
                size="small"
                :bordered="false"
                type="success"
                round
              >
                已接入
              </NTag>
            </div>
            <p class="platform-desc">{{ p.desc }}</p>
          </div>
          <div class="platform-action">
            <NIcon size="16">
              <CheckmarkCircleOutline v-if="installed[p.id]" />
              <AddOutline v-else />
            </NIcon>
          </div>
        </div>
      </div>
    </NSpin>

    <p class="page-footnote">
      接入后,你的 AI 助手会监听该平台的群消息或私信,并基于配置自动回复。
    </p>

    <!-- 配置 Modal -->
    <NModal
      v-model:show="showConfigModal"
      preset="card"
      :title="editingPlatform ? `配置 ${editingPlatform.name}` : '配置'"
      style="width: 480px;"
      :bordered="false"
      :segmented="{ content: 'soft' }"
    >
      <template v-if="editingPlatform">
        <p class="modal-desc">填入 {{ editingPlatform.name }} 平台的凭证,保存后立即生效。</p>

        <div v-for="f in editingPlatform.fields" :key="f.key" class="form-item">
          <label class="form-label">{{ f.label }}</label>
          <NInput
            v-model:value="formValues[f.key]"
            :type="f.secret ? 'password' : 'text'"
            :show-password-on="f.secret ? 'click' : undefined"
            :placeholder="f.placeholder || ''"
            size="medium"
          />
          <p v-if="f.hint" class="form-hint">{{ f.hint }}</p>
        </div>

        <div class="modal-actions">
          <NSpace :size="8">
            <NButton size="medium" @click="showConfigModal = false">取消</NButton>
            <NButton
              type="primary"
              size="medium"
              :loading="saving"
              @click="handleSave"
            >
              保存并启用
            </NButton>
          </NSpace>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.channels-page {
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

.error-banner {
  margin-bottom: 14px;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 12px;
}

.platform-card {
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease;
}

.platform-card:hover {
  border-color: var(--n-text-color-3);
}

.platform-card:active {
  transform: scale(0.99);
}

.platform-card--installed {
  background: var(--n-action-color);
}

.platform-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--n-action-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--n-text-color);
  letter-spacing: 0;
}

.platform-card--installed .platform-logo {
  background: var(--n-card-color);
}

.platform-body {
  flex: 1;
  min-width: 0;
}

.platform-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.platform-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.platform-desc {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin: 0;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-action {
  flex-shrink: 0;
  color: var(--n-text-color-3);
}

.platform-card--installed .platform-action {
  color: var(--n-success-color, #18a058);
}

.page-footnote {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin: 16px 4px 0;
  line-height: 1.5;
}

.modal-desc {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0 0 16px;
  line-height: 1.5;
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
