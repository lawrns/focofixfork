'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ProjectData, FetchFailureReason, mapApiProjectRow } from './ProjectCardTypes';

interface UseProjectsFetchResult {
  projects: ProjectData[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  isLoading: boolean;
  fetchFailed: boolean;
  fetchFailureReason: FetchFailureReason;
  fetchFailureMessage: string | null;
  currentWorkspaceId: string | null;
}

export function useProjectsFetch(
  user: any,
  authLoading: boolean
): UseProjectsFetchResult {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [fetchFailureReason, setFetchFailureReason] = useState<FetchFailureReason>('none');
  const [fetchFailureMessage, setFetchFailureMessage] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setFetchFailed(true);
      setFetchFailureReason('unauthenticated');
      setFetchFailureMessage('Session required to load projects.');
      return;
    }

    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', { credentials: 'include' });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setFetchFailureReason('unauthenticated');
            setFetchFailureMessage('Session expired. Please sign in again.');
          } else if (response.status === 403) {
            setFetchFailureReason('forbidden');
            setFetchFailureMessage('You do not have permission to access projects.');
          } else {
            setFetchFailureReason('server');
            setFetchFailureMessage(errorData?.error?.message || 'Projects service returned an unexpected error.');
          }
          setFetchFailed(true);
          return;
        }

        const data = await response.json();

        if (data.ok && data.data) {
          const { projects: rawProjects, workspaceId } = data.data;

          setCurrentWorkspaceId(workspaceId ?? null);

          if (!Array.isArray(rawProjects) || rawProjects.length === 0) {
            setProjects([]);
            setFetchFailed(false);
            setFetchFailureReason('none');
            setFetchFailureMessage(null);
            return;
          }

          const fallbackOwnerName =
            user?.user_metadata?.name
            || user?.user_metadata?.full_name
            || 'Unknown';
          const transformedProjects = rawProjects.map((project: any) => (
            mapApiProjectRow(project, fallbackOwnerName)
          ));

          setProjects(transformedProjects);
          setFetchFailed(false);
          setFetchFailureReason('none');
          setFetchFailureMessage(null);
        } else {
          console.error('Invalid response format:', data);
          setProjects([]);
          setFetchFailed(true);
          setFetchFailureReason('server');
          setFetchFailureMessage('Projects response format was invalid.');
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
        setProjects([]);
        setFetchFailed(true);
        setFetchFailureReason('network');
        setFetchFailureMessage('Network error while loading projects.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user, authLoading]);

  return {
    projects,
    setProjects,
    isLoading,
    fetchFailed,
    fetchFailureReason,
    fetchFailureMessage,
    currentWorkspaceId,
  };
}
