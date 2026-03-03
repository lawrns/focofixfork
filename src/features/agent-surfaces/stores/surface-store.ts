/**
 * Surface Store
 * Zustand store for agent surface state management
 */

import { create } from 'zustand';
import type { AgentSurface, SurfaceExecution, SurfaceType } from '../types';

interface SurfaceState {
  // Data
  surfaces: AgentSurface[];
  executions: SurfaceExecution[];
  selectedAgentId: string | null;
  selectedSurfaceType: SurfaceType | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSurfaces: (surfaces: AgentSurface[]) => void;
  addSurface: (surface: AgentSurface) => void;
  updateSurface: (id: string, updates: Partial<AgentSurface>) => void;
  removeSurface: (id: string) => void;
  
  setExecutions: (executions: SurfaceExecution[]) => void;
  addExecution: (execution: SurfaceExecution) => void;
  updateExecution: (id: string, updates: Partial<SurfaceExecution>) => void;
  
  setSelectedAgent: (agentId: string | null) => void;
  setSelectedSurfaceType: (type: SurfaceType | null) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  fetchSurfaces: (agentId?: string) => Promise<void>;
  fetchExecutions: (agentId: string) => Promise<void>;
  registerSurface: (
    agentId: string,
    agentBackend: string,
    type: SurfaceType,
    capabilities: string[],
    config?: Record<string, unknown>
  ) => Promise<AgentSurface | null>;
}

export const useSurfaceStore = create<SurfaceState>((set, get) => ({
  // Initial state
  surfaces: [],
  executions: [],
  selectedAgentId: null,
  selectedSurfaceType: null,
  isLoading: false,
  error: null,

  // Actions
  setSurfaces: (surfaces) => set({ surfaces }),
  
  addSurface: (surface) => set((state) => ({
    surfaces: [...state.surfaces, surface],
  })),
  
  updateSurface: (id, updates) => set((state) => ({
    surfaces: state.surfaces.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    ),
  })),
  
  removeSurface: (id) => set((state) => ({
    surfaces: state.surfaces.filter((s) => s.id !== id),
  })),

  setExecutions: (executions) => set({ executions }),
  
  addExecution: (execution) => set((state) => ({
    executions: [execution, ...state.executions],
  })),
  
  updateExecution: (id, updates) => set((state) => ({
    executions: state.executions.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ),
  })),

  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),
  setSelectedSurfaceType: (type) => set({ selectedSurfaceType: type }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async actions
  fetchSurfaces: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      const url = agentId
        ? `/api/agent-surfaces?agentId=${agentId}`
        : '/api/agent-surfaces';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch surfaces');
      const data = await res.json();
      set({ surfaces: data.surfaces || [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchExecutions: async (agentId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/agent-surfaces/executions?agentId=${agentId}`);
      if (!res.ok) throw new Error('Failed to fetch executions');
      const data = await res.json();
      set({ executions: data.executions || [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },

  registerSurface: async (agentId, agentBackend, type, capabilities, config = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/agent-surfaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          agentBackend,
          surfaceType: type,
          capabilities,
          config,
        }),
      });
      if (!res.ok) throw new Error('Failed to register surface');
      const data = await res.json();
      const surface = data.surface as AgentSurface;
      get().addSurface(surface);
      return surface;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
}));
