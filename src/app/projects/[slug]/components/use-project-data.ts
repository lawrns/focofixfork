'use client';

import { useState, useEffect } from 'react';
import { useRecentItems } from '@/hooks/useRecentItems';
import { supabase } from '@/lib/supabase/client';
import type { WorkItem } from '@/types/foco';
import type { Project, TeamMember } from './types';

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
    async function fetchProjectData() {
      if (!user || !slug) return;

      try {
        setLoading(true);
        setError(null);

        const { data: projectData, error: projectError } = (await supabase
          .from('foco_projects')
          .select('id, workspace_id, name, slug, description, brief, color, icon, status, owner_id, default_status, settings, is_pinned, archived_at, created_at, updated_at')
          .eq('slug', slug)) as { data: Project[] | null; error: any };

        if (projectError) throw projectError;
        if (!projectData || projectData.length === 0) throw new Error('Project not found');
        if (projectData.length > 1) throw new Error('Multiple projects found with this slug');

        const proj = projectData[0];
        setProject(proj);

        const [projectFullResult, activeRunsResult] = await Promise.all([
          supabase
            .from('foco_projects')
            .select('delegation_settings, assigned_agent_pool')
            .eq('id', proj.id)
            .maybeSingle(),
          (supabase as any)
            .from('runs')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', proj.id)
            .in('status', ['pending', 'running']),
        ]);
        setDelegationEnabled((projectFullResult.data as any)?.delegation_settings?.enabled ?? false);
        setAgentPool((projectFullResult.data as any)?.assigned_agent_pool ?? []);
        setActiveRuns(activeRunsResult.count ?? 0);

        addItem({ type: 'project', id: proj.id, name: proj.name });

        const { data: tasksData, error: tasksError } = (await supabase
          .from('work_items')
          .select('id, project_id, title, description, type, status, priority, assignee_id, due_date, blocked_reason, created_at, updated_at, delegation_status, assigned_agent')
          .eq('project_id', proj.id)
          .order('created_at', { ascending: false })) as { data: any[] | null; error: any };

        if (tasksError) throw tasksError;

        const assigneeIds = [...new Set((tasksData || []).map((t: any) => t.assignee_id).filter(Boolean))];
        let assigneeMap: Record<string, any> = {};

        if (assigneeIds.length > 0) {
          const { data: assigneesData } = (await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', assigneeIds)) as { data: any[] | null; error: any };

          if (assigneesData) {
            assigneeMap = Object.fromEntries(assigneesData.map((a: any) => [a.id, a]));
          }
        }

        setTasks((tasksData || []).map((task: any) => ({
          ...task,
          assignee: task.assignee_id ? assigneeMap[task.assignee_id] : undefined
        })));

        const { data: membersData, error: membersError } = (await supabase
          .from('foco_project_members')
          .select('id, project_id, user_id, role, created_at')
          .eq('project_id', proj.id)) as { data: any[] | null; error: any };

        if (membersError) throw membersError;

        const memberUserIds = (membersData || []).map((m: any) => m.user_id);
        let memberProfilesMap: Record<string, any> = {};

        if (memberUserIds.length > 0) {
          const { data: profilesData } = (await supabase
            .from('user_profiles')
            .select('id, email, full_name')
            .in('id', memberUserIds)) as { data: any[] | null; error: any };

          if (profilesData) {
            memberProfilesMap = Object.fromEntries(profilesData.map((p: any) => [p.id, p]));
          }
        }

        setTeamMembers((membersData || []).map((member: any) => ({
          ...member,
          user_profiles: memberProfilesMap[member.user_id]
        })));

      } catch (err: any) {
        console.error('Error fetching project data:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
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
