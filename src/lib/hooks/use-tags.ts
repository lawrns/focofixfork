'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagWithUsage extends Tag {
  usage_count: number;
  created_at: string;
}

export interface TagsResponse {
  success: boolean;
  data: {
    tags: TagWithUsage[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  };
}

export interface CreateTagResponse {
  success: boolean;
  data: Tag;
}

export interface AssignTagsResponse {
  success: boolean;
  data: {
    task_id: string;
    tags: Tag[];
    added_count: number;
  };
}

/**
 * Hook for managing workspace tags
 */
export function useTags(workspaceId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all tags for workspace
  const tagsQuery = useQuery({
    queryKey: ['tags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const response = await fetch(
        `/api/tags?workspace_id=${workspaceId}&limit=100`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data: TagsResponse = await response.json();
      return data.data.tags;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (variables: {
      workspace_id: string;
      name: string;
      color: string;
    }) => {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }

      const data: CreateTagResponse = await response.json();
      return data.data;
    },
    onSuccess: (newTag) => {
      // Invalidate tags query to refetch
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] });
      }
    },
  });

  const createTag = useCallback(
    (name: string, color: string) => {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      return createTagMutation.mutateAsync({
        workspace_id: workspaceId,
        name,
        color,
      });
    },
    [workspaceId, createTagMutation]
  );

  return {
    // Tags data
    tags: tagsQuery.data || [],
    isLoadingTags: tagsQuery.isLoading,
    tagsError: tagsQuery.error,

    // Tag creation
    createTag,
    isCreatingTag: createTagMutation.isPending,
    createTagError: createTagMutation.error,
  };
}

/**
 * Hook for managing tags on a specific task
 */
export function useTaskTags(taskId: string | null) {
  const queryClient = useQueryClient();

  // Fetch task tags
  const taskTagsQuery = useQuery({
    queryKey: ['task-tags', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const response = await fetch(`/api/tasks/${taskId}/tags`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task tags');
      }

      const data = await response.json();
      return (data.data.tags as Tag[]) || [];
    },
    enabled: !!taskId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Assign tags mutation
  const assignTagsMutation = useMutation({
    mutationFn: async (variables: { tag_ids: string[] }) => {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const response = await fetch(`/api/tasks/${taskId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign tags');
      }

      const data: AssignTagsResponse = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // Invalidate task tags query
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-tags', taskId] });
      }
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      if (!taskId) {
        throw new Error('Task ID is required');
      }

      const response = await fetch(`/api/tasks/${taskId}/tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove tag');
      }

      return tagId;
    },
    onSuccess: () => {
      // Invalidate task tags query
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-tags', taskId] });
      }
    },
  });

  const assignTags = useCallback(
    (tagIds: string[]) => {
      return assignTagsMutation.mutateAsync({ tag_ids: tagIds });
    },
    [assignTagsMutation]
  );

  const removeTag = useCallback(
    (tagId: string) => {
      return removeTagMutation.mutateAsync(tagId);
    },
    [removeTagMutation]
  );

  return {
    // Task tags data
    taskTags: taskTagsQuery.data || [],
    isLoadingTaskTags: taskTagsQuery.isLoading,
    taskTagsError: taskTagsQuery.error,

    // Tag management
    assignTags,
    isAssigningTags: assignTagsMutation.isPending,
    assignTagsError: assignTagsMutation.error,

    removeTag,
    isRemovingTag: removeTagMutation.isPending,
    removeTagError: removeTagMutation.error,
  };
}

/**
 * Hook for tag autocomplete
 */
export function useTagAutocomplete(
  workspaceTags: TagWithUsage[],
  selectedTagIds: string[]
) {
  const [query, setQuery] = useState('');

  const suggestions = workspaceTags.filter(tag => {
    // Exclude already selected tags
    if (selectedTagIds.includes(tag.id)) {
      return false;
    }

    // Filter by search query
    return tag.name.toLowerCase().includes(query.toLowerCase());
  });

  const showCreateOption =
    query.trim().length > 0 &&
    !workspaceTags.some(
      t => t.name.toLowerCase() === query.toLowerCase()
    );

  return {
    query,
    setQuery,
    suggestions,
    showCreateOption,
  };
}
