import { create } from 'zustand'
import type {
  UnifiedAgent,
  UnifiedMission,
  FlowLane,
  FlowGoal,
  AgentBackend,
} from '@/lib/command-center/types'
import { BACKEND_LABELS } from '@/lib/command-center/types'

interface CommandCenterStore {
  agents: UnifiedAgent[]
  missions: UnifiedMission[]
  selectedAgentId: string | null
  isLoading: boolean
  lastFetch: Date | null
  error: string | null

  // setters
  setAgents: (agents: UnifiedAgent[]) => void
  setMissions: (missions: UnifiedMission[]) => void
  selectAgent: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // derived selectors
  toFlowLanes: () => FlowLane[]
  toFlowGoals: () => FlowGoal[]
  selectedAgent: () => UnifiedAgent | null

  // control actions
  stopAgent: (backend: AgentBackend, nativeId: string) => Promise<void>
  pauseAgent: (backend: AgentBackend, nativeId: string) => Promise<void>
  createMission: (input: {
    title: string
    description?: string
    backend: AgentBackend
    agentIds?: string[]
    [key: string]: unknown
  }) => Promise<UnifiedMission>
}

const BACKEND_ORDER: AgentBackend[] = ['crico', 'clawdbot', 'bosun', 'openclaw']

export const useCommandCenterStore = create<CommandCenterStore>((set, get) => ({
  agents: [],
  missions: [],
  selectedAgentId: null,
  isLoading: false,
  lastFetch: null,
  error: null,

  setAgents: (agents) => set({ agents, lastFetch: new Date() }),
  setMissions: (missions) => set({ missions }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  toFlowLanes: () => {
    const { agents } = get()
    return BACKEND_ORDER.map(backend => ({
      id: backend,
      label: BACKEND_LABELS[backend],
      backend,
      agents: agents.filter(a => a.backend === backend),
    }))
  },

  toFlowGoals: () => {
    const { missions } = get()
    return missions.map(m => ({
      id: m.id,
      label: m.title,
      status: m.status,
      agentIds: m.assignedAgentIds,
    }))
  },

  selectedAgent: () => {
    const { agents, selectedAgentId } = get()
    if (!selectedAgentId) return null
    return agents.find(a => a.id === selectedAgentId) ?? null
  },

  stopAgent: async (backend, nativeId) => {
    await fetch('/api/command-center/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop', backend, nativeId }),
    })
    // Optimistic update
    set(state => ({
      agents: state.agents.map(a =>
        a.backend === backend && a.nativeId === nativeId
          ? { ...a, status: 'done' }
          : a
      ),
    }))
  },

  pauseAgent: async (backend, nativeId) => {
    await fetch('/api/command-center/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', backend, nativeId }),
    })
    // Optimistic update
    set(state => ({
      agents: state.agents.map(a =>
        a.backend === backend && a.nativeId === nativeId
          ? { ...a, status: 'paused' }
          : a
      ),
    }))
  },

  createMission: async (input) => {
    const res = await fetch('/api/command-center/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create mission')
    const json = await res.json()
    const mission: UnifiedMission = json.mission
    set(state => ({ missions: [mission, ...state.missions] }))
    return mission
  },
}))
