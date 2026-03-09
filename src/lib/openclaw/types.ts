export interface OpenClawRuntimeSnapshot {
  configPath: string
  relayUrl: string
  gatewayUrl: string
  relayReachable: boolean
  dispatchConfigured: boolean
  tokenConfigured: boolean
  tokenSource: 'env' | 'config' | 'none'
  primaryModel: string | null
  modelAlias: string | null
  workspacePath: string | null
  attachedTabs: number
  tabs: Array<{
    id: string
    title: string
    url: string
    attached: boolean
    profile?: string
    lastSeen?: string
  }>
  profiles: Array<{
    name: string
    active: boolean
  }>
  version: string | null
}

export interface OpenClawDispatchRequest {
  agentId: string
  task: string
  context?: Record<string, unknown>
  correlationId?: string | null
  taskId?: string | null
  callbackUrl?: string | null
  title?: string | null
  preferredModel?: string | null
}

export interface OpenClawDispatchResult {
  accepted: boolean
  runId: string | null
  correlationId: string
  status: string
}

export interface OpenClawProgressEvent {
  id: string
  type: string
  status: string | null
  message: string | null
  timestamp: string
  correlationId: string | null
  contextId: string | null
  source: string | null
  payload: Record<string, unknown>
}
