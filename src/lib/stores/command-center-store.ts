import { create } from 'zustand'
import type {
  UnifiedAgent,
  UnifiedMission,
  FlowLane,
  AgentBackend,
  CommandDecision,
} from '@/lib/command-center/types'
import { BACKEND_LABELS } from '@/lib/command-center/types'

interface CommandCenterStore {
  agents: UnifiedAgent[]
  missions: UnifiedMission[]
  decisions: CommandDecision[]
  selectedAgentId: string | null
  isLoading: boolean
  error: string | null
  mode: 'Reactive' | 'Predictive' | 'Guarded'
  paused: boolean
  quietMode: boolean
  quietCategories: { p3: boolean; heartbeat: boolean }

  // setters
  setAgents: (agents: UnifiedAgent[]) => void
  setMissions: (missions: UnifiedMission[]) => void
  setDecisions: (decisions: CommandDecision[]) => void
  selectAgent: (id: string | null) => void
  setError: (error: string | null) => void
  setMode: (mode: 'Reactive' | 'Predictive' | 'Guarded') => void
  setPaused: (paused: boolean) => void
  setQuietMode: (quietMode: boolean) => void
  setQuietCategory: (key: 'p3' | 'heartbeat', value: boolean) => void

  // derived selectors
  toFlowLanes: () => FlowLane[]
  selectedAgent: () => UnifiedAgent | null

  // control actions
  stopAgent: (backend: AgentBackend, nativeId: string) => Promise<void>
  pauseAgent: (backend: AgentBackend, nativeId: string) => Promise<void>
  resumeAgent: (backend: AgentBackend, nativeId: string) => Promise<void>
  createMission: (input: {
    title: string
    description?: string
    backend: AgentBackend
    agentIds?: string[]
    [key: string]: unknown
  }) => Promise<UnifiedMission>
  approveDecision: (id: string, action: 'approve' | 'reject' | 'defer') => Promise<void>
}

const BACKEND_ORDER: AgentBackend[] = ['crico', 'clawdbot', 'bosun', 'openclaw']

export const useCommandCenterStore = create<CommandCenterStore>((set, get) => ({
  agents: [],
  missions: [],
  decisions: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,
  mode: 'Guarded',
  paused: false,
  quietMode: false,
  quietCategories: { p3: false, heartbeat: false },

  setAgents: (agents) => set({ agents }),
  setMissions: (missions) => set({ missions }),
  setDecisions: (decisions) => set({ decisions }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setError: (error) => set({ error }),
  setMode: (mode) => set({ mode }),
  setPaused: (paused) => set({ paused }),
  setQuietMode: (quietMode) => set({ quietMode }),
  setQuietCategory: (key, value) => set(state => ({
    quietCategories: { ...state.quietCategories, [key]: value },
  })),

  toFlowLanes: () => {
    const { agents } = get()
    return BACKEND_ORDER.map(backend => ({
      id: backend,
      label: BACKEND_LABELS[backend],
      backend,
      agents: agents.filter(a => a.backend === backend),
    }))
  },

  selectedAgent: () => {
    const { agents, selectedAgentId } = get()
    if (!selectedAgentId) return null
    return agents.find(a => a.id === selectedAgentId) ?? null
  },

  stopAgent: async (backend, nativeId) => {
    const prev = get().agents
    // Optimistic update
    set(state => ({
      agents: state.agents.map(a =>
        a.backend === backend && a.nativeId === nativeId
          ? { ...a, status: 'done' }
          : a
      ),
    }))
    try {
      const res = await fetch('/api/command-center/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', backend, nativeId }),
      })
      if (!res.ok) {
        set({ agents: prev, error: 'Failed to stop agent' })
      }
    } catch {
      set({ agents: prev, error: 'Failed to stop agent' })
    }
  },

  pauseAgent: async (backend, nativeId) => {
    const prev = get().agents
    // Optimistic update
    set(state => ({
      agents: state.agents.map(a =>
        a.backend === backend && a.nativeId === nativeId
          ? { ...a, status: 'paused' }
          : a
      ),
    }))
    try {
      const res = await fetch('/api/command-center/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', backend, nativeId }),
      })
      if (!res.ok) {
        set({ agents: prev, error: 'Failed to pause agent' })
      }
    } catch {
      set({ agents: prev, error: 'Failed to pause agent' })
    }
  },

  resumeAgent: async (backend, nativeId) => {
    const prev = get().agents
    // Optimistic update
    set(state => ({
      agents: state.agents.map(a =>
        a.backend === backend && a.nativeId === nativeId
          ? { ...a, status: 'working' }
          : a
      ),
    }))
    try {
      const res = await fetch('/api/command-center/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', backend, nativeId }),
      })
      if (!res.ok) {
        set({ agents: prev, error: 'Failed to resume agent' })
      }
    } catch {
      set({ agents: prev, error: 'Failed to resume agent' })
    }
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

  approveDecision: async (id, action) => {
    const prev = get().decisions
    // Optimistic update
    if (action === 'defer') {
      set(state => ({
        decisions: state.decisions.map(d =>
          d.id === id
            ? { ...d, state: 'deferred' as const, deferCount: (d.deferCount ?? 0) + 1 }
            : d
        ),
      }))
    } else {
      set(state => ({
        decisions: state.decisions.filter(d => d.id !== id),
      }))
    }

    try {
      const res = await fetch('/api/command-center/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        set({ decisions: prev, error: 'Failed to process decision' })
      }
    } catch {
      set({ decisions: prev, error: 'Failed to process decision' })
    }
  },
}))
