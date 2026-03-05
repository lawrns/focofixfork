'use client';

import { useState, useEffect } from 'react';
import { useRecentItems } from '@/hooks/useRecentItems';
import type { WorkItem } from '@/types/foco';
import type { Project, TeamMember } from './types';

function parseApiData<T>(payload: any, fallback: T): T {
  if (!payload || typeof payload !== 'object') return fallback;
  if ('data' in payload && payload.data !== undefined) return payload.data as T;
  return fallback;
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

  useEffect(() => {
    async function fetchProjectData(signal: AbortSignal) {
      if (!user || !slug) return;

      try {
        setLoading(true);
        setError(null);

        const projectRes = await fetch(`/api/projects?slug=${encodeURIComponent(slug)}&limit=1`, {
          credentials: 'include',
          signal,
        });

        if (!projectRes.ok) {
          if (projectRes.status === 404) throw new Error('Project not found');
          const errJson = await projectRes.json().catch(() => ({}));
          throw new Error(errJson?.error?.message || 'Failed to load project');
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

        const [tasksRes, teamRes] = await Promise.all([
          fetch(`/api/tasks?project_id=${proj.id}&limit=400`, { credentials: 'include', signal }),
          fetch(`/api/projects/${proj.id}/team`, { credentials: 'include', signal }),
        ]);

        if (!tasksRes.ok) {
          const errJson = await tasksRes.json().catch(() => ({}));
          throw new Error(errJson?.error?.message || 'Failed to load project tasks');
        }

        if (!teamRes.ok) {
          const errJson = await teamRes.json().catch(() => ({}));
          throw new Error(errJson?.error?.message || 'Failed to load project team');
        }

        const tasksJson = await tasksRes.json();
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

        const teamJson = await teamRes.json();
        const rawMembers = parseApiData<any[]>(teamJson, []);
        const normalizedMembers = rawMembers.map((member: any) => ({
          ...member,
          user_profiles: Array.isArray(member.user_profiles)
            ? member.user_profiles[0]
            : member.user_profiles,
        }));
        setTeamMembers(normalizedMembers);
      } catch (err: any) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error fetching project data:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    const controller = new AbortController();
    fetchProjectData(controller.signal);
    return () => controller.abort();
  }, [user, slug, addItem]);

  return {
    project, setProject,
    tasks, setTasks,
    teamMembers,
    loading, error,
    activeRuns,
    delegationEnabled, setDelegationEnabled,
    agentPool,
  };
}
