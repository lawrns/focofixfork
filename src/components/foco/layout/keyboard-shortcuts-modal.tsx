'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcutsModalStore } from '@/lib/hooks/use-keyboard-shortcuts-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search,
} from 'lucide-react';

interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: 'Navigation' | 'Tasks' | 'Projects' | 'Global';
}

const shortcuts: Shortcut[] = [
  // Global
  {
    id: 'global-quick-add',
    keys: ['⌘K', 'Ctrl+K'],
    description: 'Quick add task',
    category: 'Global',
  },
  {
    id: 'global-help',
    keys: ['?'],
    description: 'Keyboard shortcuts help',
    category: 'Global',
  },
  {
    id: 'global-close',
    keys: ['Esc'],
    description: 'Close dialogs',
    category: 'Global',
  },
  {
    id: 'global-search',
    keys: ['⌘/', 'Ctrl+/'],
    description: 'Open keyboard shortcuts',
    category: 'Global',
  },

  // Navigation
  // ── Core
  { id: 'nav-dashboard',  keys: ['G', 'H'], description: 'Go to dashboard',       category: 'Navigation' },
  { id: 'nav-dispatch',   keys: ['G', 'D'], description: 'Go to Dispatch',         category: 'Navigation' },
  { id: 'nav-intel',      keys: ['G', 'I'], description: 'Go to Intel Feed',       category: 'Navigation' },
  { id: 'nav-runs',       keys: ['G', 'R'], description: 'Go to Runs',             category: 'Navigation' },
  { id: 'nav-ledger',     keys: ['G', 'L'], description: 'Go to Ledger',           category: 'Navigation' },
  // ── Work
  { id: 'nav-mywork',     keys: ['G', 'W'], description: 'Go to My Work',          category: 'Navigation' },
  { id: 'nav-inbox',      keys: ['G', 'N'], description: 'Go to Inbox',            category: 'Navigation' },
  { id: 'nav-projects',   keys: ['G', 'P'], description: 'Go to Projects',         category: 'Navigation' },
  { id: 'nav-people',     keys: ['G', 'O'], description: 'Go to People',           category: 'Navigation' },
  { id: 'nav-timeline',   keys: ['G', 'T'], description: 'Go to Timeline',         category: 'Navigation' },
  // ── Empire
  { id: 'nav-empire',     keys: ['G', 'M'], description: 'Go to Empire command',   category: 'Navigation' },
  { id: 'nav-briefing',   keys: ['G', 'B'], description: 'Go to Empire briefing',  category: 'Navigation' },
  { id: 'nav-agents',     keys: ['G', 'J'], description: 'Go to Empire agents',    category: 'Navigation' },
  // ── Operate
  { id: 'nav-crons',      keys: ['G', 'K'], description: 'Go to Crons',            category: 'Navigation' },
  { id: 'nav-emails',     keys: ['G', 'E'], description: 'Go to Emails',           category: 'Navigation' },
  { id: 'nav-reports',    keys: ['G', 'F'], description: 'Go to Reports',          category: 'Navigation' },
  { id: 'nav-proposals',  keys: ['G', 'Q'], description: 'Go to Proposals',        category: 'Navigation' },
  { id: 'nav-artifacts',  keys: ['G', 'A'], description: 'Go to Artifacts',        category: 'Navigation' },
  { id: 'nav-policies',   keys: ['G', 'Y'], description: 'Go to Policies',         category: 'Navigation' },
  { id: 'nav-settings',   keys: ['G', 'S'], description: 'Go to Settings',         category: 'Navigation' },

  // Tasks
  {
    id: 'task-create',
    keys: ['C'],
    description: 'Create new task',
    category: 'Tasks',
  },
  {
    id: 'task-mark-complete',
    keys: ['Ctrl+Enter'],
    description: 'Mark task as complete',
    category: 'Tasks',
  },

  // Projects
  {
    id: 'project-create',
    keys: ['P'],
    description: 'Create new project',
    category: 'Projects',
  },
  {
    id: 'project-docs',
    keys: ['D'],
    description: 'Create new doc',
    category: 'Projects',
  },
];

export function KeyboardShortcutsModal() {
  const { isOpen, open, close } = useKeyboardShortcutsModalStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;

    const lowerQuery = searchQuery.toLowerCase();
    return shortcuts.filter(
      (shortcut) =>
        shortcut.description.toLowerCase().includes(lowerQuery) ||
        shortcut.keys.some((key) => key.toLowerCase().includes(lowerQuery)) ||
        shortcut.category.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    filteredShortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    return groups;
  }, [filteredShortcuts]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open on ? key
      if (e.key === '?') {
        e.preventDefault();
        open();
        return;
      }

      // Open on Cmd/Ctrl + /
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        open();
        return;
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    },
    [isOpen, open, close]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset search when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        open();
      } else {
        close();
        setSearchQuery('');
      }
    },
    [open, close]
  );

  const categoryOrder = ['Global', 'Navigation', 'Tasks', 'Projects'];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <Search className="h-4 w-4 text-zinc-400 flex-shrink-0" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-0 px-0 py-0 placeholder:text-zinc-400 focus-visible:ring-0"
            autoFocus
          />
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-6">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              No shortcuts found for &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {categoryOrder
                .filter((category) => groupedShortcuts[category])
                .map((category) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts[category].map((shortcut) => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between gap-4 py-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-3 transition-colors"
                        >
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-2">
                            {shortcut.keys.map((key, idx) => (
                              <kbd
                                key={idx}
                                className={cn(
                                  'px-2 py-1 text-xs font-mono font-semibold rounded border',
                                  'bg-zinc-100 dark:bg-zinc-800',
                                  'border-zinc-300 dark:border-zinc-700',
                                  'text-zinc-700 dark:text-zinc-300',
                                  'shadow-sm'
                                )}
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">Esc</kbd> to close
        </div>
      </DialogContent>
    </Dialog>
  );
}
