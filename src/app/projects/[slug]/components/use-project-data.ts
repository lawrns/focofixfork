'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRecentItems } from '@/hooks/useRecentItems';
import { apiFetch } from '@/lib/api/fetch-client';
import type { WorkItem } from '@/types/foco';
import type { Project, ProjectDelegationQueueItem, TeamMember } from './types';

function parseApiData<T>(payload: any, fallback: T): T {
  if (!payload || typeof payload !== 'object') return fallback;
  if ('data' in payload && payload.data !== undefined) return payload.data as T;
  return fallback;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const errJson = await response.json().catch(() => ({}));
  return errJson?.error?.message || fallback;
}

export function useProjectData(user: any, slug: string) {
  const { addItem } = useRecentItems();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState(0);
  const [delegationEnabled, setDelegationEnabled] = useState(false);
  const [agentPool, setAgentPool] = useState<string[]>([]);
  const [queueItems, setQueueItems] = useState<ProjectDelegationQueueItem[]>([]);

  const fetchProjectData = useCallback(async (signal?: AbortSignal) => {
    if (!user || !slug) return;

    try {
      setLoading(true);
      setError(null);
      setTeamMembers([]);
      setQueueItems([]);

      const projectRes = await apiFetch(`/api/projects?slug=${encodeURIComponent(slug)}&limit=1`, { signal });

      if (!projectRes.ok) {
        if (projectRes.status === 404) throw new Error('Project not found');
        throw new Error(await readErrorMessage(projectRes, 'Failed to load project'));
      }

      const projectJson = await projectRes.json();
      const projectPayload = parseApiData<any>(projectJson, {} as any);
      const proj = (projectPayload.project || projectPayload.projects?.[0]) as Project | undefined;

      if (!proj) {
        throw new Error('Project not found');
      }

      setProject(proj);
      setDelegationEnabled((proj as any)?.delegation_settings?.enabled ?? false);
      setAgentPool(((proj as any)?.assigned_agent_pool ?? []) as string[]);
      setActiveRuns((proj as any)?.active_run_count ?? 0);

      addItem({ type: 'project', id: proj.id, name: proj.name });

      const [tasksRes, teamRes, queueRes] = await Promise.allSettled([
        apiFetch(`/api/tasks?project_id=${proj.id}&limit=400`, { signal }),
        apiFetch(`/api/projects/${proj.id}/team`, { signal }),
        apiFetch(`/api/projects/${proj.id}/delegation/queue`, { signal }),
      ]);

      if (tasksRes.status === 'rejected') {
        throw tasksRes.reason instanceof Error ? tasksRes.reason : new Error('Failed to load project tasks');
      }

      if (!tasksRes.value.ok) {
        throw new Error(await readErrorMessage(tasksRes.value, 'Failed to load project tasks'));
      }

      const tasksJson = await tasksRes.value.json();
      const rawTasksEnvelope = parseApiData<any>(tasksJson, {});
      const rawTasks = Array.isArray(rawTasksEnvelope?.data)
        ? rawTasksEnvelope.data
        : Array.isArray(rawTasksEnvelope)
          ? rawTasksEnvelope
          : [];

      const normalizedTasks: WorkItem[] = rawTasks.map((task: any) => ({
        ...task,
        blocked_reason: task.blocked_reason ?? null,
        delegation_status: task.delegation_status ?? null,
        assigned_agent: task.assigned_agent ?? null,
        assignee: undefined,
      }));
      setTasks(normalizedTasks);

      if (teamRes.status === 'fulfilled' && teamRes.value.ok) {
        const teamJson = await teamRes.value.json();
        const rawMembers = parseApiData<any[]>(teamJson, []);
        const normalizedMembers = rawMembers.map((member: any) => ({
          ...member,
          user_profiles: Array.isArray(member.user_profiles)
            ? member.user_profiles[0]
            : member.user_profiles,
        }));
        setTeamMembers(normalizedMembers);
      } else {
        console.warn('Project team request failed; continuing without team data.', {
          projectId: proj.id,
          status: teamRes.status === 'fulfilled' ? teamRes.value.status : 'request_failed',
        });
      }

      if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
        const queueJson = await queueRes.value.json().catch(() => ({}));
        const rawQueue = parseApiData<{ items?: ProjectDelegationQueueItem[] }>(queueJson, {});
        setQueueItems(rawQueue.items ?? []);
      } else {
        console.warn('Project delegation queue request failed; continuing without queue data.', {
          projectId: proj.id,
          status: queueRes.status === 'fulfilled' ? queueRes.value.status : 'request_failed',
        });
      }
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Error fetching project data:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [addItem, slug, user]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProjectData(controller.signal);
    return () => controller.abort();
  }, [fetchProjectData]);

  return {
    project, setProject,
    tasks, setTasks,
    teamMembers,
    loading, error,
    activeRuns,
    delegationEnabled, setDelegationEnabled,
    agentPool,
    queueItems,
    setQueueItems,
    refetch: fetchProjectData,
  };
}
