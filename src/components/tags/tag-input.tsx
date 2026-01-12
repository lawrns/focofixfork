'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColorPicker } from './color-picker';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  availableTags: Tag[];
  onCreateTag?: (name: string, color: string) => Promise<Tag>;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  availableTags,
  onCreateTag,
  placeholder = 'Select or create tags...',
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState('#339AF0');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags
  const selectedIds = new Set(value.map(t => t.id));
  const filteredTags = availableTags.filter(
    tag =>
      !selectedIds.has(tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption =
    search.trim().length > 0 &&
    !availableTags.some(t => t.name.toLowerCase() === search.toLowerCase());

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveTag = (tagId: string) => {
    onChange(value.filter(t => t.id !== tagId));
  };

  const handleSelectTag = (tag: Tag) => {
    onChange([...value, tag]);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleCreateTag = async () => {
    if (!onCreateTag || !search.trim()) return;

    setCreating(true);
    try {
      const newTag = await onCreateTag(search.trim(), newTagColor);
      onChange([...value, newTag]);
      setSearch('');
      setNewTagColor('#339AF0');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && showCreateOption && onCreateTag) {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Focus first option in dropdown
      const firstButton = containerRef.current?.querySelector(
        'button[data-tag-option]'
      ) as HTMLButtonElement;
      firstButton?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Container */}
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 border rounded-lg bg-white dark:bg-gray-900',
          'border-gray-300 dark:border-gray-600',
          open && 'ring-2 ring-blue-500'
        )}
      >
        {/* Selected Tags */}
        {value.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm text-white"
            style={{ backgroundColor: tag.color }}
          >
            <span>{tag.name}</span>
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:opacity-80 transition-opacity"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          disabled={disabled}
          className={cn(
            'flex-1 min-w-[120px] outline-none bg-transparent text-sm',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Tag input"
        />

        {/* Dropdown Toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          disabled={disabled}
          aria-label="Toggle tag dropdown"
        >
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleSelectTag(tag)}
                data-tag-option
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.name}</span>
              </button>
            ))
          ) : search.length > 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">
              No tags found
            </div>
          ) : null}

          {/* Create New Tag Option */}
          {showCreateOption && onCreateTag && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Create new tag: <strong>{search}</strong>
                </label>
                <ColorPicker
                  value={newTagColor}
                  onChange={setNewTagColor}
                  label="Choose color"
                />
              </div>

              <button
                onClick={handleCreateTag}
                disabled={creating}
                className={cn(
                  'w-full px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors',
                  creating && 'opacity-50 cursor-not-allowed'
                )}
              >
                {creating ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
