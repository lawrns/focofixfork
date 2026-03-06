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
  created_at?: string
  summary?: string | null
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
  created_at?: string
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

  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [workItems, setWorkItems] = useState<DashboardWorkItem[]>([])
  const [workSummary, setWorkSummary] = useState({ total: 0, urgent: 0, blocked: 0 })
  const [proposals, setProposals] = useState<DashboardProposal[]>([])

  const activeRuns = useMemo(
    () => allRuns.filter((run) => run.status === 'running' || run.status === 'pending').slice(0, 10),
    [allRuns]
  )
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

  const fetchAll = useCallback(async () => {
    if (!user) return
    setRefreshing(true)

    try {
      const [statusRes, runsRes, fleetRes, ledgerRes, projectsRes, agentsRes, workRes, proposalsRes] = await Promise.allSettled([
        fetch('/api/openclaw/status'),
        fetch('/api/runs'),
        fetch('/api/policies/fleet-status'),
        fetch('/api/ledger?limit=18'),
        fetch('/api/projects?limit=50'),
        fetch('/api/command-center/agents'),
        fetch('/api/my-work/assigned?limit=8'),
        fetch('/api/proposals?limit=8'),
      ])

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = await statusRes.value.json()
        setRelayReachable(data.relay?.reachable ?? false)
        setTokenValid(data.token?.valid ?? false)
        setAttachedTabs(data.tabs?.filter((tab: any) => tab.attached).length ?? 0)
      } else {
        setRelayReachable(false)
        setTokenValid(false)
        setAttachedTabs(0)
      }

      if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
        const data = await runsRes.value.json()
        const runs: Run[] = data.data || data.runs || []
        setAllRuns(runs)
      }

      if (fleetRes.status === 'fulfilled' && fleetRes.value.ok) {
        const data = await fleetRes.value.json()
        if (typeof data.paused === 'boolean') setFleetPaused(data.paused)
      }

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value.ok) {
        const data = await ledgerRes.value.json()
        setRecentEvents(data.data || data.events || [])
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        const data = await projectsRes.value.json()
        const projects = (data?.data?.projects ?? []) as ProjectOption[]
        setProjectOptions(projects)
        if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
          setSelectedProjectId(projects[0]?.id ?? '')
        } else if (!selectedProjectId && projects[0]?.id) {
          setSelectedProjectId(projects[0].id)
        }
      }

      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const data = await agentsRes.value.json()
        const nextAgents = (data?.agents ?? []) as AgentOption[]
        setAgents(nextAgents)
      }

      if (workRes.status === 'fulfilled' && workRes.value.ok) {
        const data = await workRes.value.json()
        setWorkItems((data?.data?.tasks ?? []) as DashboardWorkItem[])
        setWorkSummary({
          total: data?.data?.summary?.total ?? 0,
          urgent: data?.data?.summary?.urgent ?? 0,
          blocked: data?.data?.summary?.blocked ?? 0,
        })
      } else {
        setWorkItems([])
        setWorkSummary({ total: 0, urgent: 0, blocked: 0 })
      }

      if (proposalsRes.status === 'fulfilled' && proposalsRes.value.ok) {
        const data = await proposalsRes.value.json()
        setProposals((data?.data ?? []) as DashboardProposal[])
      } else {
        setProposals([])
      }

      const statsResponse = await fetch('/api/dashboard/autonomous-stats').catch(() => null)
      if (statsResponse?.ok) {
        const data = await statsResponse.json()
        setAutonomousStats({
          improvementsWeek: data.improvementsWeek ?? 0,
          handbookEntries: data.improvementsMonth ?? 0,
        })
      }
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
    fetchAll,
  }
}
