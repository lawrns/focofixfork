'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useWorkspaceStore, useInboxStore } from '@/lib/stores/foco-store';
import type { 
  Workspace, 
  Project, 
  WorkItem, 
  InboxItem, 
  Label,
  Doc 
} from '@/types/foco';

// Demo workspace ID from seed data
const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================================
// WORKSPACE HOOKS
// ============================================================================

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorkspaces(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaces();
  }, []);

  return { workspaces, loading, error };
}

export function useCurrentWorkspace() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(!currentWorkspace);

  useEffect(() => {
    if (currentWorkspace) return;

    async function fetchDefaultWorkspace() {
      try {
        // Try to get demo workspace first
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', DEMO_WORKSPACE_ID)
          .single();

        if (data) {
          setCurrentWorkspace(data);
        }
      } catch (err) {
        // Fallback to first workspace
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .limit(1)
          .single();

        if (data) {
          setCurrentWorkspace(data);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDefaultWorkspace();
  }, [currentWorkspace, setCurrentWorkspace]);

  return { workspace: currentWorkspace, loading };
}

// ============================================================================
// PROJECT HOOKS
// ============================================================================

export function useProjects(workspaceId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { workspace } = useCurrentWorkspace();

  const wsId = workspaceId || workspace?.id || DEMO_WORKSPACE_ID;

  const refetch = useCallback(async () => {
    if (!wsId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('foco_projects')
        .select('*')
        .eq('workspace_id', wsId)
        .order('position', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Real-time subscription
  useEffect(() => {
    if (!wsId) return;

    const channel = supabase
      .channel(`projects-${wsId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'foco_projects',
          filter: `workspace_id=eq.${wsId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, refetch]);

  return { projects, loading, error, refetch };
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    async function fetchProject() {
      try {
        const { data, error } = await supabase
          .from('foco_projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        setProject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
}

// ============================================================================
// WORK ITEM HOOKS
// ============================================================================

export function useWorkItems(options?: {
  workspaceId?: string;
  projectId?: string;
  status?: string;
  assigneeId?: string;
}) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { workspace } = useCurrentWorkspace();

  const wsId = options?.workspaceId || workspace?.id || DEMO_WORKSPACE_ID;

  const refetch = useCallback(async () => {
    if (!wsId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('work_items')
        .select(`
          *,
          project:foco_projects(id, name, slug, color)
        `)
        .eq('workspace_id', wsId)
        .order('position', { ascending: true });

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.assigneeId) {
        query = query.eq('assignee_id', options.assigneeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkItems(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsId, options?.projectId, options?.status, options?.assigneeId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Real-time subscription
  useEffect(() => {
    if (!wsId) return;

    const channel = supabase
      .channel(`work-items-${wsId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_items',
          filter: `workspace_id=eq.${wsId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, refetch]);

  return { workItems, loading, error, refetch };
}

export function useWorkItem(workItemId: string) {
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!workItemId) return;

    try {
      const { data, error } = await supabase
        .from('work_items')
        .select(`
          *,
          project:foco_projects(id, name, slug, color)
        `)
        .eq('id', workItemId)
        .single();

      if (error) throw error;
      setWorkItem(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workItemId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Real-time subscription for single item
  useEffect(() => {
    if (!workItemId) return;

    const channel = supabase
      .channel(`work-item-${workItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_items',
          filter: `id=eq.${workItemId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workItemId, refetch]);

  return { workItem, loading, error, refetch };
}

// ============================================================================
// INBOX HOOKS
// ============================================================================

export function useInbox(userId: string) {
  const { setItems } = useInboxStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('inbox_items')
        .select(`
          *,
          work_item:work_items(id, title, status, priority),
          project:foco_projects(id, name, color)
        `)
        .eq('user_id', userId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, setItems]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { loading, error, refetch };
}

// ============================================================================
// LABELS HOOKS
// ============================================================================

export function useLabels(workspaceId?: string) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const { workspace } = useCurrentWorkspace();

  const wsId = workspaceId || workspace?.id || DEMO_WORKSPACE_ID;

  useEffect(() => {
    if (!wsId) return;

    async function fetchLabels() {
      try {
        const { data, error } = await supabase
          .from('labels')
          .select('*')
          .eq('workspace_id', wsId)
          .order('name', { ascending: true });

        if (error) throw error;
        setLabels(data || []);
      } catch (err) {
        console.error('Failed to fetch labels:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLabels();
  }, [wsId]);

  return { labels, loading };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateWorkItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWorkItem = useCallback(async (workItem: Partial<WorkItem>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/foco/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workItem),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create work item');
      }

      return result.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createWorkItem, loading, error };
}

export function useUpdateWorkItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWorkItem = useCallback(async (id: string, updates: Partial<WorkItem>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/foco/work-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update work item');
      }

      return result.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateWorkItem, loading, error };
}

export function useDeleteWorkItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteWorkItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/foco/work-items?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete work item');
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteWorkItem, loading, error };
}
