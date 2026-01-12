'use client';

import { useState, useEffect } from 'react';
import { TagFilter, type TagWithUsage } from './tag-filter';

interface SidebarTagFilterProps {
  workspaceId: string;
  selectedTags: string[];
  onSelectedTagsChange: (tagIds: string[]) => void;
}

/**
 * Sidebar component that displays and filters tasks by tags
 * Integrates with workspace tags and real-time usage counts
 */
export function SidebarTagFilter({
  workspaceId,
  selectedTags,
  onSelectedTagsChange,
}: SidebarTagFilterProps) {
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/tags?workspace_id=${workspaceId}&limit=100`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const data = await response.json();
        setTags(data.data?.tags || []);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      fetchTags();
    }
  }, [workspaceId]);

  return (
    <TagFilter
      tags={tags}
      selectedTags={selectedTags}
      onSelectedTagsChange={onSelectedTagsChange}
      loading={loading}
    />
  );
}
