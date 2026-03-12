'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

const DASHBOARD_PROJECT_STORAGE_KEY = 'dashboard_selected_project_id'

export type Run = {
  id: string
  runner: string
  status: string
  task_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  summary: string | null
  trace?: Record<string, unknown> | null
}

export type LedgerEvent = {
  id: string
  type: string
  source: string | null
  payload: Record<string, unknown> | null
  timestamp: string
}

export type AgentOption = {
  id: string
  name: string
  nativeId: string
  status: string
  backend: string
  avatarUrl?: string
}

export type ProjectOption = {
  id: string
  slug: string
  name: string
}

export type OpenClawRuntime = {
  configPath: string
  relayUrl: string
  gatewayUrl: string
  relayReachable: boolean
  gatewayHealthy: boolean
  dispatchConfigured: boolean
  tokenConfigured: boolean
  tokenSource: 'env' | 'config' | 'none'
  primaryModel: string | null
  modelAlias: string | null
  configuredModels: string[]
  defaultModelConfigured: boolean
  workspacePath: string | null
  attachedTabs: number
}

export type DashboardWorkItem = {
  id: string
  title: string
  status: string
  priority?: string | null
  due_date?: string | null
  project_id?: string | null
  section?: string | null
  project?: {
    id: string
    name: string
    slug?: string
    color?: string | null
  } | null
}

export type DashboardProposal = {
  id: string
  title: string
  status: string
  description?: string | null
  project_id?: string | null
  created_at: string
  project?: {
    id: string
    name: string
    slug?: string
  } | null
}

export function useDashboardData(user: { id: string } | null) {
  const [relayReachable, setRelayReachable] = useState<boolean | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [attachedTabs, setAttachedTabs] = useState(0)
  const [allRuns, setAllRuns] = useState<Run[]>([])
  const [fleetPaused, setFleetPaused] = useState(false)
  const [recentEvents, setRecentEvents] = useState<LedgerEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [autonomousStats, setAutonomousStats] = useState({ improvementsWeek: 0, handbookEntries: 0 })
  const [openclawRuntime, setOpenclawRuntime] = useState<OpenClawRuntime | null>(null)

  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [workItems, setWorkItems] = useState<DashboardWorkItem[]>([])
  const [workSummary, setWorkSummary] = useState({ total: 0, urgent: 0, blocked: 0 })
  const [proposals, setProposals] = useState<DashboardProposal[]>([])
  const [autonomy, setAutonomy] = useState({ activeLoops: 0, pendingDecisions: 0, latestSession: null as Record<string, unknown> | null })

  const activeRuns = useMemo(() => {
    const now = Date.now()
    const RUNNING_STALE_MS = 60 * 60 * 1000  // 1 hour — running but never finished
    const PENDING_STALE_MS = 30 * 60 * 1000  // 30 min — queued but never started
    return allRuns
      .filter((run) => {
        if (run.status === 'running') {
          const age = run.started_at ? now - new Date(run.started_at).getTime() : now - new Date(run.created_at ?? Date.now()).getTime()
          return age < RUNNING_STALE_MS
        }
        if (run.status === 'pending') {
          const age = now - new Date(run.created_at ?? Date.now()).getTime()
          return age < PENDING_STALE_MS
        }
        return false
      })
      .slice(0, 10)
  }, [allRuns])
  const selectedProject = useMemo(
    () => projectOptions.find((project) => project.id === selectedProjectId) ?? null,
    [projectOptions, selectedProjectId]
  )
  const selectedProjectSlug = selectedProject?.slug ?? ''
  const filteredWorkItems = useMemo(
    () => workItems.filter((item) => !selectedProjectId || item.project_id === selectedProjectId),
    [selectedProjectId, workItems]
  )
  const filteredProposals = useMemo(
    () => proposals.filter((proposal) => !selectedProjectId || proposal.project_id === selectedProjectId),
    [proposals, selectedProjectId]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DASHBOARD_PROJECT_STORAGE_KEY)
    if (stored) {
      setSelectedProjectId(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedProjectId) {
      window.localStorage.removeItem(DASHBOARD_PROJECT_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(DASHBOARD_PROJECT_STORAGE_KEY, selectedProjectId)
  }, [selectedProjectId])

  const runningCount = allRuns.filter((run) => run.status === 'running').length
  const pendingCount = allRuns.filter((run) => run.status === 'pending').length
  const doneCount = allRuns.filter((run) => run.status === 'completed').length
  const failedCount = allRuns.filter((run) => run.status === 'failed').length
  const staleCount = allRuns.filter(
    (run) => run.status === 'running' && run.started_at && Date.now() - new Date(run.started_at).getTime() > 30 * 60 * 1000
  ).length

  const g1Share = allRuns.length > 0
    ? Math.round(
      (allRuns.filter((run) => /revenue|customer|sales|onboard|trial/i.test((run.runner || '') + ' ' + (run.task_id || '') + ' ' + (run.summary || ''))).length / allRuns.length) * 100
    )
    : null

  const gatewayStatus = relayReachable === null ? 'Checking...' : relayReachable ? 'Reachable' : 'Down'

  const attentionCount = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentFailedRuns = allRuns.filter(
      (run) => run.status === 'failed' && run.created_at && new Date(run.created_at).getTime() > oneDayAgo
    ).length
    const blockedItems = workItems.filter((item) => item.status === 'blocked').length
    const pendingProposals = proposals.filter((p) => p.status === 'pending_review').length
    const errorAgents = agents.filter((a) => a.status === 'error').length
    return recentFailedRuns + blockedItems + pendingProposals + errorAgents
  }, [allRuns, workItems, proposals, agents])

  const fetchAll = useCallback(async () => {
    if (!user) return
    setRefreshing(true)

    try {
      const response = await fetch('/api/dashboard/cockpit')
      if (!response.ok) throw new Error('Failed to load cockpit data')

      const payload = await response.json()
      const data = payload?.data ?? {}

      setRelayReachable(data.relayReachable ?? false)
      setTokenValid(data.tokenValid ?? false)
      setAttachedTabs(data.attachedTabs ?? 0)
      setOpenclawRuntime((data.openclawRuntime ?? null) as OpenClawRuntime | null)
      setAllRuns((data.allRuns ?? []) as Run[])
      setFleetPaused(data.fleetPaused ?? false)
      setRecentEvents((data.recentEvents ?? []) as LedgerEvent[])
      setAutonomousStats(data.autonomousStats ?? { improvementsWeek: 0, handbookEntries: 0 })

      const projects = (data.projectOptions ?? []) as ProjectOption[]
      setProjectOptions(projects)
      if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
        setSelectedProjectId(projects[0]?.id ?? '')
      } else if (!selectedProjectId && projects[0]?.id) {
        setSelectedProjectId(projects[0].id)
      }

      setAgents((data.agents ?? []) as AgentOption[])
      setWorkItems((data.workItems ?? []) as DashboardWorkItem[])
      setWorkSummary(data.workSummary ?? { total: 0, urgent: 0, blocked: 0 })
      setProposals((data.proposals ?? []) as DashboardProposal[])
      setAutonomy(data.autonomy ?? { activeLoops: 0, pendingDecisions: 0, latestSession: null })
    } catch {
      // no-op
    } finally {
      setRefreshing(false)
    }
  }, [selectedProjectId, user])

  useEffect(() => {
    if (!user) {
      setAllRuns([])
      setRecentEvents([])
      setProjectOptions([])
      setSelectedProjectId('')
      setAgents([])
      setWorkItems([])
      setWorkSummary({ total: 0, urgent: 0, blocked: 0 })
      setProposals([])
      setAutonomy({ activeLoops: 0, pendingDecisions: 0, latestSession: null })
      setOpenclawRuntime(null)
      return
    }
    void fetchAll()
  }, [user, fetchAll])

  useEffect(() => {
    const handleRunsMutated = () => {
      void fetchAll()
    }
    window.addEventListener('runs:mutated', handleRunsMutated)
    return () => window.removeEventListener('runs:mutated', handleRunsMutated)
  }, [fetchAll])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [user, fetchAll])

  return {
    relayReachable,
    tokenValid,
    attachedTabs,
    allRuns,
    activeRuns,
    fleetPaused,
    recentEvents,
    refreshing,
    autonomousStats,
    openclawRuntime,
    projectOptions,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    selectedProjectSlug,
    agents,
    workItems: filteredWorkItems,
    workSummary,
    proposals: filteredProposals,
    runningCount,
    pendingCount,
    doneCount,
    failedCount,
    staleCount,
    g1Share,
    gatewayStatus,
    attentionCount,
    autonomy,
    fetchAll,
  }
}
