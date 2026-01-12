'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagWithUsage {
  id: string;
  name: string;
  color: string;
  usage_count: number;
}

interface TagFilterProps {
  tags: TagWithUsage[];
  selectedTags: string[];
  onSelectedTagsChange: (tagIds: string[]) => void;
  loading?: boolean;
}

export function TagFilter({
  tags,
  selectedTags,
  onSelectedTagsChange,
  loading = false,
}: TagFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');

  // Sort tags by usage count
  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => b.usage_count - a.usage_count),
    [tags]
  );

  // Filter tags by search
  const filteredTags = useMemo(
    () =>
      sortedTags.filter(tag =>
        tag.name.toLowerCase().includes(search.toLowerCase())
      ),
    [sortedTags, search]
  );

  const handleToggleTag = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onSelectedTagsChange(newSelectedTags);
  };

  const handleClearAll = () => {
    onSelectedTagsChange([]);
  };

  const hasActiveFilters = selectedTags.length > 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-medium text-sm hover:text-blue-500 transition-colors flex-1"
        >
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              !expanded && '-rotate-90'
            )}
          />
          <span>Tags</span>
          {hasActiveFilters && (
            <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {selectedTags.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="space-y-2 px-2">
          {/* Search */}
          {sortedTags.length > 5 && (
            <input
              type="text"
              placeholder="Search tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full px-2 py-1.5 text-sm rounded border',
                'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              aria-label="Search tags"
            />
          )}

          {/* Tag List */}
          {loading ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Loading tags...
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filteredTags.map(tag => (
                <label
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => handleToggleTag(tag.id)}
                    className="rounded border-gray-300"
                    aria-label={`Filter by ${tag.name} tag`}
                  />

                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />

                  <span className="text-sm flex-1 truncate">{tag.name}</span>

                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {tag.usage_count}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              {search.length > 0 ? 'No tags found' : 'No tags yet'}
            </div>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className={cn(
                'w-full flex items-center justify-center gap-1 px-2 py-1.5 text-sm',
                'rounded border border-gray-300 dark:border-gray-600',
                'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              )}
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
