'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RecurrencePattern } from '@/lib/validation/schemas/task.schema';
import { shouldCreateNextInstance } from '@/features/tasks/services/recurrence.service';

interface UseTaskRecurrenceOptions {
  projectId?: string;
  onSuccess?: (nextTaskId: string) => void;
  onError?: (error: Error) => void;
}

export function useTaskRecurrence(options?: UseTaskRecurrenceOptions) {
  const queryClient = useQueryClient();

  const createNextInstance = useCallback(
    async (
      taskId: string,
      pattern: RecurrencePattern,
      occurrenceCount?: number
    ) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/create-next`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create next recurring task');
        }

        const result = await response.json();

        if (result.success) {
          // Invalidate task queries to refresh
          queryClient.invalidateQueries({ queryKey: ['tasks'] });

          options?.onSuccess?.(result.data.id);
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to create next recurring task');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        options?.onError?.(err);
        throw err;
      }
    },
    [queryClient, options]
  );

  const handleTaskCompletion = useCallback(
    async (
      taskId: string,
      pattern: Partial<RecurrencePattern>,
      occurrenceCount?: number
    ) => {
      // Validate pattern has required type field
      if (!pattern.type) {
        throw new Error('Invalid recurrence pattern: missing type');
      }

      // Check if we should create the next instance
      const should = shouldCreateNextInstance(pattern, new Date(), occurrenceCount);

      if (should) {
        return createNextInstance(taskId, pattern as RecurrencePattern, occurrenceCount);
      }

      return null;
    },
    [createNextInstance]
  );

  return {
    createNextInstance,
    handleTaskCompletion,
  };
}
