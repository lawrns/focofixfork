'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProjectData, mapApiProjectRow } from './ProjectCardTypes';
import { getProjectStatusReportHref } from '@/lib/routes/project-routes';

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

  const parseErrorMessage = (payload: any, fallback: string) => {
    const nested = payload?.error;
    if (typeof nested === 'string' && nested) return nested;
    if (typeof nested?.message === 'string' && nested.message) return nested.message;
    return fallback;
  };

  const fetchProjectsAndHydrate = useCallback(async () => {
    const refreshResponse = await fetch('/api/projects', { credentials: 'include' });
    if (!refreshResponse.ok) throw new Error('Failed to refresh projects list');

    const refreshData = await refreshResponse.json();
    if (!refreshData?.ok) throw new Error(parseErrorMessage(refreshData, 'Failed to refresh projects list'));

    const projectsData = Array.isArray(refreshData.data?.projects) ? refreshData.data.projects : [];
    const fallbackOwnerName =
      user?.user_metadata?.name
      || user?.user_metadata?.full_name
      || 'Unknown';
    setProjects(projectsData.map((p: any) => mapApiProjectRow(p, fallbackOwnerName)));
  }, [setProjects, user?.user_metadata?.full_name, user?.user_metadata?.name]);

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
        const errorData = await response.json().catch(() => ({}));
        console.error('Create project error:', errorData);
        toast.error(parseErrorMessage(errorData, 'Failed to create project'));
        return;
      }

      const data = await response.json();
      if (data?.ok && data.data) {
        toast.success('Project created successfully');
        setNewProjectName('');
        setNewProjectDescription('');
        setCreateDialogOpen(false);
        router.push(`/projects/${data.data.slug}`);
      } else {
        toast.error(parseErrorMessage(data, 'Failed to create project'));
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [currentWorkspaceId, newProjectDescription, newProjectName, router, setCreateDialogOpen, setIsCreatingProject, setNewProjectDescription, setNewProjectName]);

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
        const errorData = await response.json().catch(() => ({}));
        console.error('Duplicate project API error:', { status: response.status, error: errorData.error });
        toast.error(parseErrorMessage(errorData, 'Failed to duplicate project'));
        return;
      }

      const data = await response.json();

      if (data?.ok && data?.data) {
        toast.success('Project duplicated successfully');
        await fetchProjectsAndHydrate();
      } else {
        toast.error(parseErrorMessage(data, 'Failed to duplicate project'));
      }
    } catch (error) {
      console.error('Duplicate project error:', error);
      toast.error('Failed to duplicate project');
    }
  }, [currentWorkspaceId, fetchProjectsAndHydrate]);

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
    router.push(getProjectStatusReportHref(project.slug));
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
        const errorData = await response.json().catch(() => ({}));
        console.error('Archive project API error:', { status: response.status, error: errorData.error });
        toast.error(parseErrorMessage(errorData, 'Failed to archive project'));
        return;
      }

      const data = await response.json();
      if (data?.ok) {
        toast.success('Project archived successfully');
        setProjects(prev => prev.filter(p => p.id !== project.id));
      } else {
        toast.error(parseErrorMessage(data, 'Failed to archive project'));
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
