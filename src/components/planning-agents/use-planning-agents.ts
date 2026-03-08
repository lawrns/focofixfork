'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PlanningAgentDescriptor } from '@/lib/pipeline/agent-planning'

export interface AvailablePlanningAgent extends PlanningAgentDescriptor {
  active?: boolean
}

function normalizeAgents(payload: any): AvailablePlanningAgent[] {
  const advisors = Array.isArray(payload?.data?.advisors) ? payload.data.advisors : []
  const customAgents = Array.isArray(payload?.data?.custom_agents) ? payload.data.custom_agents : []

  return [
    ...advisors.map((agent: any) => ({
      id: agent.id,
      kind: agent.kind ?? 'persona',
      name: agent.name,
      role: agent.role ?? 'Persona advisor',
      expertise: Array.isArray(agent.expertise) ? agent.expertise : Array.isArray(agent.persona_tags) ? agent.persona_tags : [],
      incentives: Array.isArray(agent.incentives) ? agent.incentives : [],
      risk_model: typeof agent.risk_model === 'string' ? agent.risk_model : agent.description ?? 'Not specified.',
      description: agent.description ?? null,
      source: 'advisor_catalog',
      active: true,
    })),
    ...customAgents.map((agent: any) => ({
      id: agent.id,
      kind: agent.kind ?? 'custom',
      name: agent.name,
      role: agent.role ?? `${agent.lane ?? 'custom'} specialist`,
      expertise: Array.isArray(agent.expertise) ? agent.expertise : [],
      incentives: Array.isArray(agent.incentives) ? agent.incentives : [],
      risk_model: typeof agent.risk_model === 'string' ? agent.risk_model : 'Not specified.',
      description: agent.description ?? null,
      source: 'custom_agent_profiles',
      active: Boolean(agent.active),
    })),
  ]
}

export function usePlanningAgents(workspaceId: string | null) {
  const [agents, setAgents] = useState<AvailablePlanningAgent[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshAgents = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/empire/agents/overview')
      if (!res.ok) return
      const json = await res.json()
      if (!json?.ok) return
      setAgents(normalizeAgents(json))
    } catch {
      // Keep the caller usable even if the catalog is unavailable.
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAgents()
  }, [refreshAgents])

  useEffect(() => {
    if (!workspaceId || agents.length === 0) return

    void (async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/agent-planning-defaults`)
        if (!res.ok) return
        const json = await res.json()
        const selected = Array.isArray(json?.data?.defaults?.selected_agents) ? json.data.defaults.selected_agents : []
        const ids = selected
          .map((agent: { id?: string }) => (typeof agent?.id === 'string' ? agent.id : null))
          .filter((id: string | null): id is string => !!id)
          .filter((id: string) => agents.some((agent) => agent.id === id))
        setSelectedIds(ids)
      } catch {
        // Leave manual selection intact.
      }
    })()
  }, [workspaceId, agents])

  const saveDefaults = useCallback(async () => {
    if (!workspaceId) {
      toast.error('No active workspace found')
      return false
    }

    setIsSaving(true)
    try {
      const selectedAgents = agents.filter((agent) => selectedIds.includes(agent.id))
      const res = await fetch(`/api/workspaces/${workspaceId}/agent-planning-defaults`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_agents: selectedAgents }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? 'Failed to save workspace defaults')
      }
      toast.success('Workspace default planning agents saved')
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save workspace defaults')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [agents, selectedIds, workspaceId])

  const selectedAgents = useMemo(
    () => agents.filter((agent) => selectedIds.includes(agent.id)),
    [agents, selectedIds],
  )

  return {
    agents,
    selectedIds,
    setSelectedIds,
    selectedAgents,
    isLoading,
    isSaving,
    refreshAgents,
    saveDefaults,
  }
}
