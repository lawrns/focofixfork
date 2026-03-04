'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProjectData } from './ProjectCardTypes';

interface UseProjectHandlersParams {
  currentWorkspaceId: string | null;
  user: any;
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  setEditingProject: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  setEditProjectName: React.Dispatch<React.SetStateAction<string>>;
  setEditProjectDescription: React.Dispatch<React.SetStateAction<string>>;
  setEditDelegationEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingProject: ProjectData | null;
  editProjectName: string;
  editProjectDescription: string;
  editDelegationEnabled: boolean;
  setIsSavingProject: React.Dispatch<React.SetStateAction<boolean>>;
  newProjectName: string;
  newProjectDescription: string;
  setNewProjectName: React.Dispatch<React.SetStateAction<string>>;
  setNewProjectDescription: React.Dispatch<React.SetStateAction<string>>;
  setIsCreatingProject: React.Dispatch<React.SetStateAction<boolean>>;
  setCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useProjectHandlers({
  currentWorkspaceId,
  user,
  setProjects,
  setEditingProject,
  setEditProjectName,
  setEditProjectDescription,
  setEditDelegationEnabled,
  setEditDialogOpen,
  editingProject,
  editProjectName,
  editProjectDescription,
  editDelegationEnabled,
  setIsSavingProject,
  newProjectName,
  newProjectDescription,
  setNewProjectName,
  setNewProjectDescription,
  setIsCreatingProject,
  setCreateDialogOpen,
}: UseProjectHandlersParams) {
  const router = useRouter();

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim() || !currentWorkspaceId) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          workspace_id: currentWorkspaceId,
          status: 'active',
          color: '#6366F1',
          icon: 'folder',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create project error:', errorData);
        toast.error(errorData.error || 'Failed to create project');
        return;
      }

      const data = await response.json();
      if ((data.success || data.ok) && data.data) {
        toast.success('Project created successfully');
        setNewProjectName('');
        setNewProjectDescription('');
        setCreateDialogOpen(false);
        router.push(`/projects/${data.data.slug}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [newProjectName, newProjectDescription, currentWorkspaceId, router, setIsCreatingProject, setNewProjectName, setNewProjectDescription, setCreateDialogOpen]);

  const handleDuplicateProject = useCallback(async (project: ProjectData) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          description: project.description,
          color: project.color,
          icon: project.icon,
          status: project.status,
          workspace_id: currentWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Duplicate project API error:', { status: response.status, error: errorData.error });
        toast.error(errorData.error || 'Failed to duplicate project');
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Project duplicated successfully');
        const refreshResponse = await fetch(`/api/projects?workspace_id=${currentWorkspaceId}`, { credentials: 'include' });

        if (!refreshResponse.ok) { console.error('Failed to refresh projects list'); return; }

        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          const projectsData = refreshData.data?.data || refreshData.data || [];
          setProjects(projectsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug || p.id,
            description: p.description,
            color: p.color || '#6366F1',
            icon: p.icon || 'folder',
            status: p.status || 'active',
            isPinned: p.is_pinned || false,
            progress: p.progress || 0,
            tasksCompleted: p.tasks_completed || 0,
            totalTasks: p.total_tasks || 0,
            risk: p.risk || 'none',
            nextMilestone: p.next_milestone,
            owner: p.owner || { name: 'Unknown' },
            teamSize: p.team_size || 0,
            updatedAt: p.updated_at || new Date().toISOString(),
          })));
        }
      } else {
        toast.error(data.error || 'Failed to duplicate project');
      }
    } catch (error) {
      console.error('Duplicate project error:', error);
      toast.error('Failed to duplicate project');
    }
  }, [currentWorkspaceId, setProjects]);

  const handleEditProject = useCallback((project: ProjectData) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || '');
    setEditDelegationEnabled(project.delegationEnabled);
    setEditDialogOpen(true);
  }, [setEditingProject, setEditProjectName, setEditProjectDescription, setEditDelegationEnabled, setEditDialogOpen]);

  const handleSaveProject = useCallback(async () => {
    if (!editingProject) return;

    setIsSavingProject(true);
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProjectName,
          description: editProjectDescription,
          delegation_settings: { enabled: editDelegationEnabled },
        }),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Project updated successfully');
        setProjects(prev =>
          prev.map(p =>
            p.id === editingProject.id
              ? { ...p, name: editProjectName, description: editProjectDescription, delegationEnabled: editDelegationEnabled }
              : p
          )
        );
        setEditDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Save project error:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSavingProject(false);
    }
  }, [editingProject, editProjectName, editProjectDescription, editDelegationEnabled, setProjects, setEditDialogOpen, setIsSavingProject]);

  const handleGenerateStatus = useCallback((project: ProjectData) => {
    router.push(`/projects/${project.slug}/status-update`);
  }, [router]);

  const handleToggleDelegation = useCallback(async (project: ProjectData) => {
    const newEnabled = !project.delegationEnabled;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ delegation_settings: { enabled: newEnabled } }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to update delegation');
        return;
      }
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, delegationEnabled: newEnabled } : p));
      toast.success(`Delegation ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update delegation');
    }
  }, [setProjects]);

  const handleArchiveProject = useCallback(async (project: ProjectData) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Archive project API error:', { status: response.status, error: errorData.error });
        toast.error(errorData.error || 'Failed to archive project');
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Project archived successfully');
        setProjects(prev => prev.filter(p => p.id !== project.id));
      } else {
        toast.error(data.error || 'Failed to archive project');
      }
    } catch (error) {
      console.error('Archive project error:', error);
      toast.error('Failed to archive project');
    }
  }, [setProjects]);

  return {
    handleCreateProject,
    handleDuplicateProject,
    handleEditProject,
    handleSaveProject,
    handleGenerateStatus,
    handleToggleDelegation,
    handleArchiveProject,
  };
}
