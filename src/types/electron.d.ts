// electron/preload.cjs 通过 contextBridge.exposeInMainWorld('lingjing', ...) 暴露的真实接口。
// 已在 lingjing-desktop/开发文档.md §2.4 列出。这里仅做 TypeScript 类型映射。

export interface ConfigureLocalProvidersParams {
  token: string
  baseUrl?: string
  modelId?: string
  providerId?: string
  compat?: string
  skipHermes?: boolean
}

export interface ConfigureResult {
  openclaw: 'ok' | 'error' | 'skipped'
  hermes: 'ok' | 'error' | 'skipped'
  openclawMessage?: string
  hermesMessage?: string
}

export interface AutoConfigureResult extends ConfigureResult {
  tokenSource: 'reused' | 'reused-other' | 'created'
  tokenSuffix: string
}

export interface GatewayStatus {
  backend: { port: number; alive: boolean }
  openclaw: { port: number; alive: boolean }
  hermes: { port: number; alive: boolean }
}

export interface RestartGatewayResult {
  status: 'started' | 'already-running' | 'error' | 'skipped' | 'started-but-not-listening'
  port?: number
  message?: string
}

export interface SkillsSearchParams {
  query?: string
  limit?: number
}

export interface SkillsInstallParams {
  slug: string
  force?: boolean
}

export interface LingjingPreload {
  platform: string
  version: string
  safeStorage: {
    isAvailable(): boolean
    encrypt(plain: string): string | null
    decrypt(b64: string): string | null
  }
  configureLocalProviders(params: ConfigureLocalProvidersParams): Promise<ConfigureResult>
  autoConfigureViaMain(params?: { modelId?: string }): Promise<AutoConfigureResult>
  getGatewayStatus(): Promise<GatewayStatus>
  restartGateway(which: 'openclaw' | 'hermes'): Promise<RestartGatewayResult>
  openExternal(url: string): Promise<{ ok: boolean; message?: string }>
  skillsSearch(params?: SkillsSearchParams): Promise<{ ok: boolean; results?: unknown[]; message?: string }>
  skillsInstall(params: SkillsInstallParams): Promise<{ ok: boolean; stdout?: string; message?: string }>
  skillsInfo(params: { slug: string }): Promise<{ ok: boolean; text: string; code: number }>
}

declare global {
  interface Window {
    lingjing: LingjingPreload
  }
}

export {}
