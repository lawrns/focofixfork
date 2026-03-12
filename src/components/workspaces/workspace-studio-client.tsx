'use client'

import { useDeferredValue, useEffect, useMemo, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  Database,
  FilePlus2,
  FileText,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  SendHorizontal,
  Slack,
  Sparkles,
  WandSparkles,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRunStream } from '@/hooks/use-run-stream'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type WorkspaceRecord = {
  id: string
  name: string
  slug?: string | null
  description?: string | null
}

type PageRecord = {
  id: string
  parent_id: string | null
  title: string
  updated_at: string | null
  created_at: string | null
  project_id: string | null
}

type BlockRecord = {
  id?: string
  block_type: string
  plain_text: string | null
  props: Record<string, unknown>
  position?: number
}

type PageState = {
  page: PageRecord & { content?: string | null }
  blocks: BlockRecord[]
  databases: DatabaseRecord[]
}

type DatabaseProperty = {
  id: string
  name: string
  type: string
  options?: string[]
}

type DatabaseRecord = {
  id: string
  parent_doc_id: string | null
  title: string
  description: string | null
  schema: DatabaseProperty[]
  updated_at: string | null
}

type DatabaseRowRecord = {
  id?: string
  position?: number
  properties: Record<string, unknown>
}

type DatabaseState = {
  database: DatabaseRecord
  rows: DatabaseRowRecord[]
}

type SearchResult = {
  entity_type: string
  entity_id: string
  parent_entity_type: string | null
  parent_entity_id: string | null
  plain_text: string
  metadata: Record<string, unknown>
}

type ThreadRecord = {
  id: string
  entity_type: 'workspace' | 'page' | 'database'
  entity_id: string | null
  title: string
  status: 'open' | 'paused' | 'closed'
  agent_id: string | null
  last_message_at: string
}

type ThreadMessageRecord = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'event'
  content: string
  status: 'posted' | 'pending' | 'running' | 'completed' | 'failed'
  run_id: string | null
  created_at: string
  metadata: Record<string, unknown>
}

type ConnectorRecord = {
  id: string
  provider: 'slack' | 'mail' | 'gmail'
  label: string
  status: 'connected' | 'paused' | 'error' | 'disconnected'
  capabilities: string[]
  config: Record<string, unknown>
  last_error: string | null
}

type AutomationRunRecord = {
  id: string
  status: string
  trigger_type: string
  created_at: string
  error: string | null
}

type AutomationRecord = {
  id: string
  name: string
  description: string | null
  enabled: boolean
  trigger_type: 'manual' | 'schedule' | 'page_updated' | 'database_row_updated' | 'workspace_event'
  event_name: string | null
  schedule: string | null
  entity_type: 'workspace' | 'page' | 'database'
  entity_id: string | null
  prompt: string
  agent_id: string | null
  writeback_mode: string | null
  last_status: string | null
  latest_run: AutomationRunRecord | null
}

type AgentOption = {
  id: string
  name: string
  role: string
  kind: 'system' | 'advisor' | 'custom'
}

type RevisionRecord = {
  id: string
  entity_type: string
  action: string
  created_at: string
}

type AutomationDraft = {
  name: string
  description: string
  trigger_type: AutomationRecord['trigger_type']
  event_name: string
  schedule: string
  prompt: string
  writeback_mode: string
  agent_id: string
}

type ConnectorDraft = {
  provider: ConnectorRecord['provider']
  label: string
  capabilities: string
  default_channel: string
  webhook_url: string
  from_name: string
  from_email: string
  reply_to: string
}

type StudioTab = 'assist' | 'activity' | 'automations' | 'integrations'

const DEFAULT_AGENT_OPTION = '__default_agent__'

function relativeTime(value?: string | null) {
  if (!value) return 'just now'
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'just now'
  const diff = Date.now() - time
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      `Request failed with HTTP ${response.status}`
    throw new Error(typeof message === 'string' ? message : 'Request failed')
  }

  return (json?.data ?? json) as T
}

function buildPageTree(pages: PageRecord[]) {
  const byParent = new Map<string | null, PageRecord[]>()
  const sorted = [...pages].sort((a, b) => a.title.localeCompare(b.title))
  for (const page of sorted) {
    const key = page.parent_id ?? null
    const current = byParent.get(key) ?? []
    current.push(page)
    byParent.set(key, current)
  }

  function build(parentId: string | null, depth = 0): Array<PageRecord & { depth: number }> {
    const items = byParent.get(parentId) ?? []
    return items.flatMap((item) => [
      { ...item, depth },
      ...build(item.id, depth + 1),
    ])
  }

  return build(null)
}

function resultHref(workspaceId: string, result: SearchResult) {
  if (result.entity_type === 'page') return `/workspaces/${workspaceId}/pages/${result.entity_id}`
  if (result.entity_type === 'database') return `/workspaces/${workspaceId}/databases/${result.entity_id}`
  if (result.parent_entity_type === 'page' && result.parent_entity_id) {
    return `/workspaces/${workspaceId}/pages/${result.parent_entity_id}`
  }
  if (result.parent_entity_type === 'database' && result.parent_entity_id) {
    return `/workspaces/${workspaceId}/databases/${result.parent_entity_id}`
  }
  return `/workspaces/${workspaceId}`
}

function runStatusTone(status?: string | null) {
  if (status === 'completed' || status === 'done') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status === 'failed' || status === 'error') return 'bg-red-500/10 text-red-700 dark:text-red-300'
  if (status === 'running' || status === 'pending') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'bg-muted text-muted-foreground'
}

function FlowStrip({ active }: { active: boolean }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">OpenClaw flow</div>
      <div className="mt-2 h-1.5 rounded-full bg-border/70">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={active ? { x: ['-15%', '110%'] } : { x: '0%' }}
          transition={active ? { duration: 1.8, ease: 'linear', repeat: Infinity } : { duration: 0 }}
          style={{ width: '35%' }}
        />
      </div>
    </div>
  )
}

function SidebarSection({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: BlockRecord[]
  onChange: (blocks: BlockRecord[]) => void
}) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div
          key={block.id ?? `draft-${index}`}
          className="rounded-2xl border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Select
              value={block.block_type}
              onValueChange={(value) => {
                const next = [...blocks]
                next[index] = { ...block, block_type: value }
                onChange(next)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'quote', 'callout', 'code', 'toggle', 'divider'].map((type) => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
            >
              Remove
            </Button>
          </div>
          {block.block_type === 'divider' ? (
            <div className="h-px bg-border" />
          ) : (
            <Textarea
              value={block.plain_text ?? ''}
              onChange={(event) => {
                const next = [...blocks]
                next[index] = { ...block, plain_text: event.target.value }
                onChange(next)
              }}
              placeholder="Write the block content..."
              className="min-h-[96px]"
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function WorkspaceStudioClient({
  workspaceId,
  pageId,
  databaseId,
}: {
  workspaceId: string
  pageId?: string
  databaseId?: string
}) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null)
  const [pages, setPages] = useState<PageRecord[]>([])
  const [databases, setDatabases] = useState<DatabaseRecord[]>([])
  const [pageState, setPageState] = useState<PageState | null>(null)
  const [databaseState, setDatabaseState] = useState<DatabaseState | null>(null)
  const [pageBlocks, setPageBlocks] = useState<BlockRecord[]>([])
  const [pageTitle, setPageTitle] = useState('')
  const [databaseRows, setDatabaseRows] = useState<DatabaseRowRecord[]>([])
  const [threads, setThreads] = useState<ThreadRecord[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([])
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([])
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [revisions, setRevisions] = useState<RevisionRecord[]>([])
  const [activeTab, setActiveTab] = useState<StudioTab>('assist')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [composer, setComposer] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string>('cofounder')
  const [loadingBootstrap, setLoadingBootstrap] = useState(true)
  const [savingPage, setSavingPage] = useState(false)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const [postingMessage, setPostingMessage] = useState(false)
  const [liveRunId, setLiveRunId] = useState<string | null>(null)
  const [showCreatePage, setShowCreatePage] = useState(false)
  const [showCreateDatabase, setShowCreateDatabase] = useState(false)
  const [showCreateAutomation, setShowCreateAutomation] = useState(false)
  const [showConnectorDialog, setShowConnectorDialog] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState('')
  const [newDatabaseTitle, setNewDatabaseTitle] = useState('')
  const [automationDraft, setAutomationDraft] = useState<AutomationDraft>({
    name: '',
    description: '',
    trigger_type: 'manual',
    event_name: '',
    schedule: '0 9 * * 1',
    prompt: '',
    writeback_mode: 'page_append',
    agent_id: '',
  })
  const [connectorDraft, setConnectorDraft] = useState<ConnectorDraft>({
    provider: 'slack',
    label: '',
    capabilities: '',
    default_channel: '',
    webhook_url: '',
    from_name: '',
    from_email: '',
    reply_to: '',
  })

  const currentEntityType: 'workspace' | 'page' | 'database' = pageId ? 'page' : databaseId ? 'database' : 'workspace'
  const currentEntityId = pageId ?? databaseId ?? null
  const currentSelectionTitle = pageState?.page.title ?? databaseState?.database.title ?? workspace?.name ?? 'Workspace'
  const pageTree = useMemo(() => buildPageTree(pages), [pages])
  const visibleAutomations = useMemo(
    () => automations.filter((automation) => (
      automation.entity_type === currentEntityType &&
      (currentEntityType === 'workspace' ? automation.entity_id === null : automation.entity_id === currentEntityId)
    )),
    [automations, currentEntityId, currentEntityType],
  )
  const activeRunFromMessages = useMemo(
    () => liveRunId ?? [...messages].reverse().find((message) => message.run_id && ['pending', 'running'].includes(message.status))?.run_id ?? null,
    [liveRunId, messages],
  )
  const stream = useRunStream(activeRunFromMessages, null)

  async function loadBootstrap() {
    setLoadingBootstrap(true)
    try {
      const [workspaceData, pagesData, databasesData, connectorsData, automationsData, agentsData] = await Promise.all([
        apiRequest<WorkspaceRecord>(`/api/workspaces/${workspaceId}`),
        apiRequest<{ pages: PageRecord[] }>(`/api/workspaces/${workspaceId}/pages?limit=200`),
        apiRequest<{ databases: DatabaseRecord[] }>(`/api/workspaces/${workspaceId}/databases?limit=120`),
        apiRequest<{ connectors: ConnectorRecord[] }>(`/api/workspaces/${workspaceId}/connectors`),
        apiRequest<{ automations: AutomationRecord[] }>(`/api/workspaces/${workspaceId}/automations?limit=80`),
        apiRequest<{
          system_agents?: Array<{ id: string; name: string; role: string }>
          advisors?: Array<{ id: string; name: string; role: string }>
          custom_agents?: Array<{ id: string; name: string; description: string | null }>
        }>(`/api/empire/agents/overview?workspace_id=${workspaceId}`),
      ])

      setWorkspace(workspaceData)
      setPages(pagesData.pages ?? [])
      setDatabases(databasesData.databases ?? [])
      setConnectors(connectorsData.connectors ?? [])
      setAutomations(automationsData.automations ?? [])
      setAgents([
        ...(agentsData.system_agents ?? []).map((agent) => ({ id: agent.id, name: agent.name, role: agent.role, kind: 'system' as const })),
        ...(agentsData.advisors ?? []).map((agent) => ({ id: agent.id, name: agent.name, role: agent.role, kind: 'advisor' as const })),
        ...(agentsData.custom_agents ?? []).map((agent) => ({ id: agent.id, name: agent.name, role: agent.description ?? 'Custom specialist', kind: 'custom' as const })),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load workspace')
    } finally {
      setLoadingBootstrap(false)
    }
  }

  async function loadPageState(targetPageId: string) {
    const state = await apiRequest<PageState>(`/api/workspaces/${workspaceId}/pages/${targetPageId}`)
    setPageState(state)
    setPageTitle(state.page.title)
    setPageBlocks(state.blocks)
  }

  async function loadDatabaseState(targetDatabaseId: string) {
    const state = await apiRequest<DatabaseState>(`/api/workspaces/${workspaceId}/databases/${targetDatabaseId}`)
    setDatabaseState(state)
    setDatabaseRows(state.rows)
  }

  async function loadThreads(entityType: 'workspace' | 'page' | 'database', entityId: string | null) {
    const params = new URLSearchParams({ entity_type: entityType })
    if (entityId) params.set('entity_id', entityId)
    const data = await apiRequest<{ threads: ThreadRecord[] }>(`/api/workspaces/${workspaceId}/threads?${params.toString()}`)
    setThreads(data.threads ?? [])
    setSelectedThreadId((current) => current && data.threads.some((thread) => thread.id === current)
      ? current
      : data.threads[0]?.id ?? null)
  }

  async function loadThread(threadId: string) {
    const data = await apiRequest<{ thread: ThreadRecord; messages: ThreadMessageRecord[] }>(`/api/workspaces/${workspaceId}/threads/${threadId}`)
    setMessages(data.messages ?? [])
    if (data.thread.agent_id) setActiveAgentId(data.thread.agent_id)
  }

  async function loadRevisions(targetPageId: string) {
    const data = await apiRequest<{ revisions: RevisionRecord[] }>(`/api/workspaces/${workspaceId}/pages/${targetPageId}/revisions`)
    setRevisions(data.revisions ?? [])
  }

  useEffect(() => {
    void loadBootstrap()
  }, [workspaceId])

  useEffect(() => {
    if (pageId) {
      void loadPageState(pageId)
      void loadRevisions(pageId)
      setDatabaseState(null)
    } else if (databaseId) {
      void loadDatabaseState(databaseId)
      setPageState(null)
      setRevisions([])
    } else {
      setPageState(null)
      setDatabaseState(null)
      setRevisions([])
      const storedPath = typeof window !== 'undefined'
        ? window.localStorage.getItem(`workspace:last:${workspaceId}`)
        : null
      if (storedPath && storedPath !== `/workspaces/${workspaceId}`) {
        startTransition(() => router.replace(storedPath))
      }
    }
  }, [workspaceId, pageId, databaseId, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = pageId
      ? `/workspaces/${workspaceId}/pages/${pageId}`
      : databaseId
        ? `/workspaces/${workspaceId}/databases/${databaseId}`
        : `/workspaces/${workspaceId}`
    window.localStorage.setItem(`workspace:last:${workspaceId}`, path)
  }, [workspaceId, pageId, databaseId])

  useEffect(() => {
    void loadThreads(currentEntityType, currentEntityId)
  }, [workspaceId, currentEntityType, currentEntityId])

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([])
      return
    }
    void loadThread(selectedThreadId)
  }, [workspaceId, selectedThreadId])

  useEffect(() => {
    if (!deferredSearchQuery.trim()) {
      startTransition(() => setSearchResults([]))
      return
    }
    const handle = window.setTimeout(async () => {
      try {
        const data = await apiRequest<{ results: SearchResult[] }>(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(deferredSearchQuery.trim())}&limit=8`)
        startTransition(() => setSearchResults(data.results ?? []))
      } catch {
        startTransition(() => setSearchResults([]))
      }
    }, 180)
    return () => window.clearTimeout(handle)
  }, [deferredSearchQuery, workspaceId])

  useEffect(() => {
    if (!selectedThreadId || !activeRunFromMessages || stream.connectionState === 'idle') return
    if (stream.connectionState === 'ended' || stream.connectionState === 'unavailable') {
      void loadThread(selectedThreadId)
      if (databaseId) void loadDatabaseState(databaseId)
      if (pageId) {
        void loadPageState(pageId)
        void loadRevisions(pageId)
      }
      void loadBootstrap()
      setLiveRunId(null)
    }
  }, [activeRunFromMessages, databaseId, pageId, selectedThreadId, stream.connectionState])

  useEffect(() => {
    if (agents.length === 0) return
    if (!agents.some((agent) => agent.id === activeAgentId)) {
      setActiveAgentId(agents[0]?.id ?? 'cofounder')
    }
  }, [activeAgentId, agents])

  async function savePage() {
    if (!pageId) return
    setSavingPage(true)
    try {
      await Promise.all([
        apiRequest(`/api/workspaces/${workspaceId}/pages/${pageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: pageTitle }),
        }),
        apiRequest(`/api/workspaces/${workspaceId}/pages/${pageId}/blocks`, {
          method: 'PUT',
          body: JSON.stringify({ mode: 'replace', blocks: pageBlocks.map((block, index) => ({ ...block, position: index })) }),
        }),
      ])
      toast.success('Page saved')
      await Promise.all([loadPageState(pageId), loadBootstrap(), loadRevisions(pageId)])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save page')
    } finally {
      setSavingPage(false)
    }
  }

  async function saveRow(row: DatabaseRowRecord) {
    if (!databaseId) return
    setSavingRowId(row.id ?? `draft-${row.position ?? 0}`)
    try {
      if (row.id) {
        await apiRequest(`/api/workspaces/${workspaceId}/databases/${databaseId}/rows/${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties: row.properties, position: row.position ?? 0 }),
        })
      } else {
        await apiRequest(`/api/workspaces/${workspaceId}/databases/${databaseId}/rows`, {
          method: 'POST',
          body: JSON.stringify({ properties: row.properties, position: row.position ?? databaseRows.length }),
        })
      }
      toast.success('Row saved')
      await Promise.all([loadDatabaseState(databaseId), loadBootstrap()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save row')
    } finally {
      setSavingRowId(null)
    }
  }

  async function ensureThread() {
    if (selectedThreadId) return selectedThreadId
    const data = await apiRequest<{ thread: ThreadRecord }>(`/api/workspaces/${workspaceId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        entity_type: currentEntityType,
        entity_id: currentEntityId,
        title: `${currentSelectionTitle} thread`,
        agent_id: activeAgentId || null,
      }),
    })
    setThreads((current) => [data.thread, ...current])
    setSelectedThreadId(data.thread.id)
    return data.thread.id
  }

  async function sendThreadMessage() {
    if (!composer.trim()) return
    setPostingMessage(true)
    try {
      const threadId = await ensureThread()
      const data = await apiRequest<{
        run_id: string
        user_message: ThreadMessageRecord
        assistant_message: ThreadMessageRecord
      }>(`/api/workspaces/${workspaceId}/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: composer.trim(),
          agent_id: activeAgentId || null,
          ai_use_case: 'workspace_execute',
        }),
      })

      setMessages((current) => [...current, data.user_message, data.assistant_message])
      setComposer('')
      setLiveRunId(data.run_id)
      setActiveTab('activity')
      await loadThreads(currentEntityType, currentEntityId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send request')
    } finally {
      setPostingMessage(false)
    }
  }

  async function createPage() {
    if (!newPageTitle.trim()) return
    try {
      const data = await apiRequest<PageState>(`/api/workspaces/${workspaceId}/pages`, {
        method: 'POST',
        body: JSON.stringify({
          title: newPageTitle.trim(),
          parent_id: pageId ?? null,
          blocks: [{ block_type: 'paragraph', plain_text: '', props: {} }],
        }),
      })
      toast.success('Page created')
      setShowCreatePage(false)
      setNewPageTitle('')
      await loadBootstrap()
      startTransition(() => router.push(`/workspaces/${workspaceId}/pages/${data.page.id}`))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create page')
    }
  }

  async function createDatabase() {
    if (!newDatabaseTitle.trim()) return
    try {
      const data = await apiRequest<{ database: DatabaseRecord }>(`/api/workspaces/${workspaceId}/databases`, {
        method: 'POST',
        body: JSON.stringify({
          parent_doc_id: pageId ?? null,
          title: newDatabaseTitle.trim(),
          description: '',
          schema: [
            { id: crypto.randomUUID(), name: 'Name', type: 'title' },
            { id: crypto.randomUUID(), name: 'Status', type: 'select', options: ['Backlog', 'In Progress', 'Done'] },
            { id: crypto.randomUUID(), name: 'Notes', type: 'rich_text' },
          ],
          default_view: { layout: 'table' },
        }),
      })
      toast.success('Database created')
      setShowCreateDatabase(false)
      setNewDatabaseTitle('')
      await loadBootstrap()
      startTransition(() => router.push(`/workspaces/${workspaceId}/databases/${data.database.id}`))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create database')
    }
  }

  async function createAutomation() {
    if (!automationDraft.name.trim() || !automationDraft.prompt.trim()) return
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/automations`, {
        method: 'POST',
        body: JSON.stringify({
          name: automationDraft.name.trim(),
          description: automationDraft.description.trim() || null,
          trigger_type: automationDraft.trigger_type,
          event_name: automationDraft.event_name.trim() || null,
          schedule: automationDraft.trigger_type === 'schedule' ? automationDraft.schedule.trim() : null,
          entity_type: currentEntityType,
          entity_id: currentEntityId,
          prompt: automationDraft.prompt.trim(),
          agent_id: automationDraft.agent_id || null,
          writeback_mode: automationDraft.writeback_mode || null,
        }),
      })
      toast.success('Automation created')
      setShowCreateAutomation(false)
      setAutomationDraft({
        name: '',
        description: '',
        trigger_type: 'manual',
        event_name: '',
        schedule: '0 9 * * 1',
        prompt: '',
        writeback_mode: 'page_append',
        agent_id: '',
      })
      await loadBootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create automation')
    }
  }

  async function toggleAutomation(automation: AutomationRecord) {
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/automations/${automation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !automation.enabled }),
      })
      await loadBootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update automation')
    }
  }

  async function testAutomation(automation: AutomationRecord) {
    try {
      const data = await apiRequest<{ run_id: string }>(`/api/workspaces/${workspaceId}/automations/${automation.id}/test-run`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setLiveRunId(data.run_id)
      setActiveTab('activity')
      toast.success('Automation dispatched')
      await loadBootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to dispatch automation')
    }
  }

  async function saveConnector() {
    if (!connectorDraft.label.trim()) return
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/connectors`, {
        method: 'POST',
        body: JSON.stringify({
          provider: connectorDraft.provider,
          label: connectorDraft.label.trim(),
          capabilities: connectorDraft.capabilities.split(',').map((item) => item.trim()).filter(Boolean),
          config: connectorDraft.provider === 'slack'
            ? {
                default_channel: connectorDraft.default_channel.trim() || null,
                webhook_url: connectorDraft.webhook_url.trim() || null,
              }
            : {
                from_name: connectorDraft.from_name.trim() || null,
                from_email: connectorDraft.from_email.trim() || null,
                reply_to: connectorDraft.reply_to.trim() || null,
              },
        }),
      })
      toast.success('Connector saved')
      setShowConnectorDialog(false)
      setConnectorDraft({
        provider: 'slack',
        label: '',
        capabilities: '',
        default_channel: '',
        webhook_url: '',
        from_name: '',
        from_email: '',
        reply_to: '',
      })
      await loadBootstrap()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save connector')
    }
  }

  async function restoreRevision(revisionId: string) {
    if (!pageId) return
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/pages/${pageId}/revisions/${revisionId}/restore`, {
        method: 'POST',
      })
      toast.success('Revision restored')
      await Promise.all([loadPageState(pageId), loadBootstrap(), loadRevisions(pageId)])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore revision')
    }
  }

  function navigateTo(path: string) {
    startTransition(() => router.push(path))
  }

  if (loadingBootstrap) {
    return (
      <PageShell>
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="h-[360px] animate-pulse bg-muted/30" />
            </Card>
          ))}
        </div>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell>
      <div className="space-y-6">
        <PageHeader
          title={workspace?.name ?? 'Workspace'}
          subtitle="Pages, databases, OpenClaw threads, automations, and governed connectors in one workspace."
          primaryAction={(
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigateTo(`/organizations/${workspaceId}`)}>
                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                AI Settings
              </Button>
              {currentEntityType === 'page' && (
                <Button onClick={savePage} disabled={savingPage}>
                  {savingPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Page
                </Button>
              )}
            </div>
          )}
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]"
        >
          <aside className="space-y-4">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{workspace?.name}</CardTitle>
                    <CardDescription>
                      Page-native orchestration, live activity, and governed external actions.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">OpenClaw</Badge>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search pages, blocks, and databases"
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <AnimatePresence initial={false}>
                {searchResults.length > 0 && (
                  <CardContent className="space-y-2 pt-0">
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      className="space-y-2"
                    >
                      {searchResults.map((result) => (
                        <button
                          key={`${result.entity_type}-${result.entity_id}`}
                          type="button"
                          onClick={() => navigateTo(resultHref(workspaceId, result))}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-left transition hover:bg-muted"
                        >
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{result.entity_type}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-foreground">{result.plain_text}</div>
                        </button>
                      ))}
                    </motion.div>
                  </CardContent>
                )}
              </AnimatePresence>
            </Card>

            <Card>
              <CardContent className="space-y-6 pt-6">
                <SidebarSection
                  label="Pages"
                  action={(
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreatePage(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                >
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="space-y-1">
                      {pageTree.map((page) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                            page.id === pageId ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                          style={{ paddingLeft: `${page.depth * 18 + 12}px` }}
                        >
                          {page.depth > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-60" /> : <FileText className="h-3.5 w-3.5 opacity-70" />}
                          <span className="truncate">{page.title}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </SidebarSection>

                <SidebarSection
                  label="Databases"
                  action={(
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCreateDatabase(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                >
                  <div className="space-y-2">
                    {databases.map((database) => (
                      <button
                        key={database.id}
                        type="button"
                        onClick={() => navigateTo(`/workspaces/${workspaceId}/databases/${database.id}`)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm transition',
                          database.id === databaseId ? 'border-primary/40 bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Database className="h-4 w-4" />
                          <span className="truncate">{database.title}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 opacity-50" />
                      </button>
                    ))}
                  </div>
                </SidebarSection>

                <SidebarSection label="System">
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => navigateTo(`/organizations/${workspaceId}`)}
                      className="rounded-lg border bg-background px-3 py-3 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <BriefcaseBusiness className="mb-2 h-4 w-4" />
                      AI policies
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('/runs')}
                      className="rounded-lg border bg-background px-3 py-3 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Workflow className="mb-2 h-4 w-4" />
                      Run ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo(`/agents?workspace_id=${workspaceId}`)}
                      className="rounded-lg border bg-background px-3 py-3 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Bot className="mb-2 h-4 w-4" />
                      Agent roster
                    </button>
                  </div>
                </SidebarSection>
              </CardContent>
            </Card>
          </aside>

          <main>
            <Card className="h-full">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {currentEntityType === 'page' ? 'Page canvas' : currentEntityType === 'database' ? 'Database canvas' : 'Workspace overview'}
                  </div>
                  <CardTitle className="text-2xl">{currentSelectionTitle}</CardTitle>
                  <CardDescription>
                    Work on content and structured data while agents plan, execute, and log their actions beside it.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{currentEntityType}</Badge>
              </CardHeader>

              <CardContent>
                <AnimatePresence mode="wait">
                  {currentEntityType === 'page' && pageState ? (
                    <motion.div
                      key={`page-${pageState.page.id}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-5"
                    >
                      <Input
                        value={pageTitle}
                        onChange={(event) => setPageTitle(event.target.value)}
                        className="h-12 text-2xl font-semibold"
                        placeholder="Untitled page"
                      />
                      <BlockEditor blocks={pageBlocks} onChange={setPageBlocks} />
                      <Button
                        variant="outline"
                        onClick={() => setPageBlocks((current) => [...current, { block_type: 'paragraph', plain_text: '', props: {}, position: current.length }])}
                      >
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Add block
                      </Button>
                      {pageState.databases.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Attached databases</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {pageState.databases.map((database) => (
                              <button
                                key={database.id}
                                type="button"
                                onClick={() => navigateTo(`/workspaces/${workspaceId}/databases/${database.id}`)}
                                className="rounded-lg border bg-background p-4 text-left transition hover:bg-muted"
                              >
                                <div className="flex items-center justify-between">
                                  <Database className="h-5 w-5 text-muted-foreground" />
                                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-4 text-lg font-medium">{database.title}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{database.description || 'Structured records bound to this page.'}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : currentEntityType === 'database' && databaseState ? (
                    <motion.div
                      key={`database-${databaseState.database.id}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-lg font-medium">{databaseState.database.title}</div>
                            <div className="text-sm text-muted-foreground">{databaseState.database.description || 'Structured table for agent-managed records.'}</div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setDatabaseRows((current) => [...current, {
                              position: current.length,
                              properties: Object.fromEntries(databaseState.database.schema.map((property) => [property.id, ''])),
                            }])}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add row
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                {databaseState.database.schema.map((property) => (
                                  <th key={property.id} className="px-3 pb-1 font-medium">{property.name}</th>
                                ))}
                                <th className="px-3 pb-1 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {databaseRows.map((row, rowIndex) => (
                                <tr key={row.id ?? `draft-row-${rowIndex}`} className="rounded-lg bg-muted/30">
                                  {databaseState.database.schema.map((property) => (
                                    <td key={property.id} className="px-3 py-2">
                                      <Input
                                        value={typeof row.properties[property.id] === 'string' ? String(row.properties[property.id] ?? '') : JSON.stringify(row.properties[property.id] ?? '')}
                                        onChange={(event) => {
                                          const next = [...databaseRows]
                                          next[rowIndex] = {
                                            ...row,
                                            properties: {
                                              ...row.properties,
                                              [property.id]: event.target.value,
                                            },
                                          }
                                          setDatabaseRows(next)
                                        }}
                                        className="h-10"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-3 py-2">
                                    <Button
                                      onClick={() => void saveRow(row)}
                                      disabled={savingRowId === (row.id ?? `draft-${row.position ?? rowIndex}`)}
                                      size="icon"
                                    >
                                      {savingRowId === (row.id ?? `draft-${row.position ?? rowIndex}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="workspace-home"
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
                    >
                      <Card className="border-dashed">
                        <CardHeader>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">How this workspace works</div>
                          <CardTitle className="max-w-xl text-2xl">Pages stay primary. Agents stay visible. Every action stays reversible.</CardTitle>
                          <CardDescription className="max-w-xl">
                            The left side is your knowledge graph, the middle is the working surface, and the right rail is the operational agent layer.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                          {[
                            { icon: Sparkles, title: 'Context-first', copy: 'Threads inherit scope from the page or database you are on.' },
                            { icon: Workflow, title: 'Live trace', copy: 'OpenClaw streams into the activity rail as work happens.' },
                            { icon: WandSparkles, title: 'Reversible writes', copy: 'Page changes route through revisions instead of direct table mutation.' },
                          ].map((item) => (
                            <div key={item.title} className="rounded-lg border bg-background p-4">
                              <item.icon className="h-5 w-5 text-muted-foreground" />
                              <div className="mt-3 font-medium">{item.title}</div>
                              <div className="mt-2 text-sm text-muted-foreground">{item.copy}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <div className="space-y-4">
                        <Card>
                          <CardHeader>
                            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Recent pages</div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {pages.slice(0, 4).map((page) => (
                              <button
                                key={page.id}
                                type="button"
                                onClick={() => navigateTo(`/workspaces/${workspaceId}/pages/${page.id}`)}
                                className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left transition hover:bg-muted"
                              >
                                <div>
                                  <div className="font-medium">{page.title}</div>
                                  <div className="text-sm text-muted-foreground">Updated {relativeTime(page.updated_at)}</div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </button>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Connected channels</div>
                          </CardHeader>
                          <CardContent className="flex flex-wrap gap-2">
                            {connectors.map((connector) => (
                              <Badge key={connector.id} className={cn('border-0', runStatusTone(connector.status))}>
                                {connector.provider}
                              </Badge>
                            ))}
                            {connectors.length === 0 && <div className="text-sm text-muted-foreground">No connectors configured yet.</div>}
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </main>

          <aside>
            <Card className="h-full">
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StudioTab)} className="h-full">
                  <TabsList className="grid h-auto w-full grid-cols-4">
                    <TabsTrigger value="assist">Assist</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="automations">Auto</TabsTrigger>
                    <TabsTrigger value="integrations">Apps</TabsTrigger>
                  </TabsList>

                  <TabsContent value="assist" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Scoped thread</div>
                        <div className="mt-1 text-lg font-medium">{currentSelectionTitle}</div>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedThreadId(null)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {threads.map((thread) => (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-2 text-left transition',
                            selectedThreadId === thread.id ? 'bg-secondary text-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <div className="font-medium">{thread.title}</div>
                          <div className="text-xs text-muted-foreground">Updated {relativeTime(thread.last_message_at)}</div>
                        </button>
                      ))}
                      {threads.length === 0 && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                          No thread yet for this scope. Send the first message to create one.
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border bg-background p-3">
                      <Label>Agent</Label>
                      <Select value={activeAgentId} onValueChange={setActiveAgentId}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Pick an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} · {agent.kind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-[360px] rounded-lg border bg-background p-3">
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              'rounded-xl px-4 py-3',
                              message.role === 'user'
                                ? 'ml-8 bg-primary text-primary-foreground'
                                : 'mr-8 border bg-muted/40 text-foreground',
                            )}
                          >
                            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
                              <span>{message.role}</span>
                              <span className="opacity-70">{message.status}</span>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="space-y-3 rounded-lg border bg-background p-3">
                      <Textarea
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        placeholder="Ask the agent to search, write, update a database, or use Slack and Mail connectors"
                        className="min-h-[140px]"
                      />
                      <Button
                        onClick={() => void sendThreadMessage()}
                        disabled={postingMessage || !composer.trim()}
                        className="w-full"
                      >
                        {postingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-2 h-4 w-4" />}
                        Dispatch with OpenClaw
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4 space-y-4">
                    <FlowStrip active={stream.connectionState === 'connecting' || stream.connectionState === 'live'} />
                    <div className="rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Live execution</div>
                          <div className="mt-1 text-lg font-medium">{stream.connectionState === 'idle' ? 'No active run' : stream.connectionState}</div>
                        </div>
                        {activeRunFromMessages && (
                          <Badge className={cn('border-0', runStatusTone(stream.status))}>
                            {stream.status ?? 'stream'}
                          </Badge>
                        )}
                      </div>
                      <ScrollArea className="mt-4 h-[280px] rounded-lg border bg-muted/20 p-3">
                        <div className="space-y-2">
                          {stream.lines.length === 0 ? (
                            <div className="text-sm text-muted-foreground">OpenClaw stream events will appear here once a run is active.</div>
                          ) : (
                            stream.lines.map((line) => (
                              <div key={line.id} className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground">
                                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{line.token}</div>
                                <div>{line.text}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {pageId && revisions.length > 0 && (
                      <div className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Revision rail</div>
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 space-y-2">
                          {revisions.slice(0, 6).map((revision) => (
                            <div key={revision.id} className="rounded-lg border bg-muted/20 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium">{revision.action}</div>
                                  <div className="text-sm text-muted-foreground">{relativeTime(revision.created_at)}</div>
                                </div>
                                <Button variant="outline" onClick={() => void restoreRevision(revision.id)}>
                                  Restore
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="automations" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Automation studio</div>
                        <div className="mt-1 text-lg font-medium">Scope-bound OpenClaw workflows</div>
                      </div>
                      <Button onClick={() => setShowCreateAutomation(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New automation
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {visibleAutomations.map((automation) => (
                        <div key={automation.id} className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{automation.name}</div>
                              <div className="mt-1 text-sm text-muted-foreground">{automation.description || automation.prompt}</div>
                            </div>
                            <Badge className={cn('border-0', runStatusTone(automation.last_status))}>{automation.trigger_type}</Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {automation.schedule && <span className="rounded-full border px-2 py-1">{automation.schedule}</span>}
                            {automation.agent_id && <span className="rounded-full border px-2 py-1">agent {automation.agent_id}</span>}
                            {automation.latest_run && <span className="rounded-full border px-2 py-1">last {automation.latest_run.status}</span>}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button variant="outline" onClick={() => void toggleAutomation(automation)}>
                              {automation.enabled ? 'Pause' : 'Enable'}
                            </Button>
                            <Button onClick={() => void testAutomation(automation)}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Test run
                            </Button>
                          </div>
                        </div>
                      ))}
                      {visibleAutomations.length === 0 && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
                          No automations are attached to this scope yet. Create one to schedule summaries, database updates, or maintenance loops.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="integrations" className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Governed connectors</div>
                        <div className="mt-1 text-lg font-medium">Slack, Mail, and Gmail-aware agents</div>
                      </div>
                      <Button onClick={() => setShowConnectorDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Connect
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {connectors.map((connector) => (
                        <div key={connector.id} className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 rounded-lg border bg-muted/30 p-2">
                                {connector.provider === 'slack' ? <Slack className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="font-medium">{connector.label}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {connector.provider === 'slack'
                                    ? `Default channel ${String(connector.config.default_channel ?? 'not set')}`
                                    : `From ${String(connector.config.from_email ?? 'not set')}`}
                                </div>
                              </div>
                            </div>
                            <Badge className={cn('border-0', runStatusTone(connector.status))}>{connector.status}</Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {connector.capabilities.map((capability) => (
                              <span key={capability} className="rounded-full border px-2 py-1 text-xs text-muted-foreground">{capability}</span>
                            ))}
                            {connector.capabilities.length === 0 && <span className="text-sm text-muted-foreground">No explicit capabilities saved</span>}
                          </div>
                          {connector.last_error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{connector.last_error}</div>}
                        </div>
                      ))}
                      {connectors.length === 0 && (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
                          No external connectors configured yet. Once connected, they become governed tools in the workspace rail and OpenClaw bridge.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </aside>
        </motion.div>
      </div>
      </PageShell>

      <Dialog open={showCreatePage} onOpenChange={setShowCreatePage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create page</DialogTitle>
            <DialogDescription>
              Add a new page to the current workspace scope.
            </DialogDescription>
          </DialogHeader>
          <Input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} placeholder="Weekly ops review" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreatePage(false)}>Cancel</Button>
            <Button onClick={() => void createPage()}>Create page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDatabase} onOpenChange={setShowCreateDatabase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create database</DialogTitle>
            <DialogDescription>
              Start a structured table for the current scope.
            </DialogDescription>
          </DialogHeader>
          <Input value={newDatabaseTitle} onChange={(event) => setNewDatabaseTitle(event.target.value)} placeholder="Launch tracker" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDatabase(false)}>Cancel</Button>
            <Button onClick={() => void createDatabase()}>Create database</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateAutomation} onOpenChange={setShowCreateAutomation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create automation</DialogTitle>
            <DialogDescription>
              Build a scheduled or event-driven OpenClaw workflow bound to this scope.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={automationDraft.name} onChange={(event) => setAutomationDraft((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={automationDraft.trigger_type} onValueChange={(value) => setAutomationDraft((current) => ({ ...current, trigger_type: value as AutomationRecord['trigger_type'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="page_updated">Page updated</SelectItem>
                  <SelectItem value="database_row_updated">Database row updated</SelectItem>
                  <SelectItem value="workspace_event">Workspace event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {automationDraft.trigger_type === 'schedule' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Cron schedule</Label>
                <Input value={automationDraft.schedule} onChange={(event) => setAutomationDraft((current) => ({ ...current, schedule: event.target.value }))} />
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={automationDraft.description} onChange={(event) => setAutomationDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Prompt</Label>
              <Textarea value={automationDraft.prompt} onChange={(event) => setAutomationDraft((current) => ({ ...current, prompt: event.target.value }))} className="min-h-[150px]" />
            </div>
            <div className="space-y-2">
              <Label>Agent</Label>
              <Select value={automationDraft.agent_id || DEFAULT_AGENT_OPTION} onValueChange={(value) => setAutomationDraft((current) => ({ ...current, agent_id: value === DEFAULT_AGENT_OPTION ? '' : value }))}>
                <SelectTrigger><SelectValue placeholder="Choose agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_AGENT_OPTION}>Default policy agent</SelectItem>
                  {agents.map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Writeback</Label>
              <Select value={automationDraft.writeback_mode} onValueChange={(value) => setAutomationDraft((current) => ({ ...current, writeback_mode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page_append">Append to page</SelectItem>
                  <SelectItem value="database_update">Update database</SelectItem>
                  <SelectItem value="commentary_only">Commentary only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateAutomation(false)}>Cancel</Button>
            <Button onClick={() => void createAutomation()}>Create automation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConnectorDialog} onOpenChange={setShowConnectorDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Connect app</DialogTitle>
            <DialogDescription>
              Add a governed connector so agents can use Slack or Mail without bypassing policy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={connectorDraft.provider} onValueChange={(value) => setConnectorDraft((current) => ({ ...current, provider: value as ConnectorRecord['provider'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={connectorDraft.label} onChange={(event) => setConnectorDraft((current) => ({ ...current, label: event.target.value }))} />
            </div>
            {connectorDraft.provider === 'slack' ? (
              <>
                <div className="space-y-2">
                  <Label>Default channel</Label>
                  <Input value={connectorDraft.default_channel} onChange={(event) => setConnectorDraft((current) => ({ ...current, default_channel: event.target.value }))} placeholder="#ops" />
                </div>
                <div className="space-y-2">
                  <Label>Incoming webhook URL</Label>
                  <Input value={connectorDraft.webhook_url} onChange={(event) => setConnectorDraft((current) => ({ ...current, webhook_url: event.target.value }))} placeholder="https://hooks.slack.com/..." />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>From name</Label>
                  <Input value={connectorDraft.from_name} onChange={(event) => setConnectorDraft((current) => ({ ...current, from_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>From email</Label>
                  <Input value={connectorDraft.from_email} onChange={(event) => setConnectorDraft((current) => ({ ...current, from_email: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Reply-to</Label>
                  <Input value={connectorDraft.reply_to} onChange={(event) => setConnectorDraft((current) => ({ ...current, reply_to: event.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Capabilities</Label>
              <Input value={connectorDraft.capabilities} onChange={(event) => setConnectorDraft((current) => ({ ...current, capabilities: event.target.value }))} placeholder="send, search, summarize" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConnectorDialog(false)}>Cancel</Button>
            <Button onClick={() => void saveConnector()}>Save connector</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
