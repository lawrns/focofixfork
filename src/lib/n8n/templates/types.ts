export interface N8nWorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  owner_agent: string
  risk_tier: 'low' | 'medium' | 'high'
  trigger_type: 'webhook' | 'cron' | 'manual' | 'event'
  parameters: Record<string, unknown>
  workflow: {
    name: string
    nodes: Array<Record<string, unknown>>
    connections: Record<string, unknown>
    settings?: Record<string, unknown>
  }
}
