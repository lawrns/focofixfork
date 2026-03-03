/**
 * Orchestration Store - Zustand store for workflow state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  OrchestrationWorkflow,
  WorkflowPhase,
  CreateWorkflowInput,
} from '../types';

interface OrchestrationState {
  // State
  workflows: OrchestrationWorkflow[];
  activeWorkflow: (OrchestrationWorkflow & { phases?: WorkflowPhase[] }) | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWorkflows: (workflows: OrchestrationWorkflow[]) => void;
  setActiveWorkflow: (workflow: OrchestrationWorkflow & { phases?: WorkflowPhase[] } | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchWorkflows: (projectId?: string) => Promise<void>;
  fetchWorkflow: (workflowId: string) => Promise<void>;
  createWorkflow: (input: CreateWorkflowInput) => Promise<{ success: boolean; workflowId?: string; error?: string }>;
  advancePhase: (workflowId: string) => Promise<{ success: boolean; error?: string }>;
  skipPhase: (workflowId: string) => Promise<{ success: boolean; error?: string }>;
  deleteWorkflow: (workflowId: string) => Promise<{ success: boolean; error?: string }>;

  // Local updates
  updateWorkflowInList: (workflow: OrchestrationWorkflow) => void;
  removeWorkflowFromList: (workflowId: string) => void;
}

export const useOrchestrationStore = create<OrchestrationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      workflows: [],
      activeWorkflow: null,
      isLoading: false,
      error: null,

      // Setters
      setWorkflows: (workflows) => set({ workflows }),
      setActiveWorkflow: (activeWorkflow) => set({ activeWorkflow }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Fetch all workflows
      fetchWorkflows: async (projectId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const url = projectId 
            ? `/api/orchestration?project_id=${projectId}`
            : '/api/orchestration';
          
          const response = await fetch(url);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch workflows');
          }

          set({ workflows: data.workflows || [], isLoading: false });
        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : 'Failed to fetch workflows',
            isLoading: false 
          });
        }
      },

      // Fetch single workflow with phases
      fetchWorkflow: async (workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/orchestration/${workflowId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch workflow');
          }

          set({ 
            activeWorkflow: data.workflow || null, 
            isLoading: false 
          });
        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : 'Failed to fetch workflow',
            isLoading: false 
          });
        }
      },

      // Create new workflow
      createWorkflow: async (input: CreateWorkflowInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/orchestration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create workflow');
          }

          // Add to list
          const currentWorkflows = get().workflows;
          if (data.workflow) {
            set({ 
              workflows: [data.workflow, ...currentWorkflows],
              isLoading: false 
            });
          }

          return { success: true, workflowId: data.workflow?.id };
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Failed to create workflow';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      // Advance to next phase
      advancePhase: async (workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/orchestration/${workflowId}/advance`, {
            method: 'POST',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to advance phase');
          }

          // Refresh active workflow
          await get().fetchWorkflow(workflowId);
          
          // Refresh workflow list to show updated status
          await get().fetchWorkflows();

          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Failed to advance phase';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      // Skip current phase
      skipPhase: async (workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/orchestration/${workflowId}/advance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skip: true }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to skip phase');
          }

          // Refresh active workflow
          await get().fetchWorkflow(workflowId);
          
          // Refresh workflow list
          await get().fetchWorkflows();

          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Failed to skip phase';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      // Delete workflow
      deleteWorkflow: async (workflowId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/orchestration/${workflowId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete workflow');
          }

          // Remove from list
          get().removeWorkflowFromList(workflowId);
          
          // Clear active if it was the deleted one
          const activeWorkflow = get().activeWorkflow;
          if (activeWorkflow?.id === workflowId) {
            set({ activeWorkflow: null });
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Failed to delete workflow';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      // Local state updates
      updateWorkflowInList: (workflow) => {
        const workflows = get().workflows.map(w => 
          w.id === workflow.id ? workflow : w
        );
        set({ workflows });
      },

      removeWorkflowFromList: (workflowId) => {
        const workflows = get().workflows.filter(w => w.id !== workflowId);
        set({ workflows });
      },
    }),
    { name: 'orchestration-store' }
  )
);
