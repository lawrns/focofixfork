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
  Command,
  FilePlus,
  FolderPlus,
  Focus,
  Sun,
  LayoutDashboard,
  Terminal,
  Users,
  CheckSquare,
  HelpCircle,
  Keyboard,
  Navigation,
  Zap,
  FolderOpen,
  Clock,
  GitBranch,
  Mail,
  Shield,
  Settings,
  Activity,
  FileBox,
  BookOpen,
  Bell,
  BarChart,
  FileText,
  Workflow,
  Cpu,
  Zap as Bolt,
  Rss
} from 'lucide-react';

type ShortcutCategory = 'Global' | 'Navigation' | 'Quick Actions' | 'Views';

interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: ShortcutCategory;
  icon?: React.ElementType;
}

/**
 * All keyboard shortcuts for the Critter app
 * Organized by category for the help modal
 */
const shortcuts: Shortcut[] = [
  // ============================================
  // GLOBAL SHORTCUTS
  // ============================================
  {
    id: 'global-command-palette',
    keys: ['⌘K', 'Ctrl+K'],
    description: 'Open Command Palette',
    category: 'Global',
    icon: Command,
  },
  {
    id: 'global-help',
    keys: ['?'],
    description: 'Show keyboard shortcuts help',
    category: 'Global',
    icon: HelpCircle,
  },
  {
    id: 'global-close',
    keys: ['Esc'],
    description: 'Close dialogs and modals',
    category: 'Global',
    icon: Keyboard,
  },
  {
    id: 'global-search',
    keys: ['/'],
    description: 'Quick search',
    category: 'Global',
    icon: Search,
  },

  // ============================================
  // QUICK ACTIONS (Cmd/Ctrl+Shift combinations)
  // ============================================
  {
    id: 'quick-create-task',
    keys: ['⌘⇧T', 'Ctrl+Shift+T'],
    description: 'Create new task',
    category: 'Quick Actions',
    icon: FilePlus,
  },
  {
    id: 'quick-create-project',
    keys: ['⌘⇧P', 'Ctrl+Shift+P'],
    description: 'Create new project',
    category: 'Quick Actions',
    icon: FolderPlus,
  },
  {
    id: 'quick-focus-mode',
    keys: ['⌘⇧F', 'Ctrl+Shift+F'],
    description: 'Toggle Focus Mode',
    category: 'Quick Actions',
    icon: Focus,
  },
  {
    id: 'quick-theme',
    keys: ['⌘⇧L', 'Ctrl+Shift+L'],
    description: 'Toggle light/dark theme',
    category: 'Quick Actions',
    icon: Sun,
  },

  // ============================================
  // NAVIGATION (G + key combinations)
  // ============================================
  
  // Core Navigation
  {
    id: 'nav-dashboard',
    keys: ['G', 'D'],
    description: 'Go to Dashboard',
    category: 'Navigation',
    icon: LayoutDashboard,
  },
  {
    id: 'nav-command-center',
    keys: ['G', 'C'],
    description: 'Go to Command Center',
    category: 'Navigation',
    icon: Terminal,
  },
  {
    id: 'nav-agents',
    keys: ['G', 'A'],
    description: 'Go to Agents',
    category: 'Navigation',
    icon: Users,
  },
  {
    id: 'nav-my-work',
    keys: ['G', 'M'],
    description: 'Go to My Work',
    category: 'Navigation',
    icon: CheckSquare,
  },
  
  // Additional Navigation
  {
    id: 'nav-intel',
    keys: ['G', 'I'],
    description: 'Go to Intel Feed',
    category: 'Navigation',
    icon: Rss,
  },
  {
    id: 'nav-runs',
    keys: ['G', 'R'],
    description: 'Go to Runs',
    category: 'Navigation',
    icon: Activity,
  },
  {
    id: 'nav-ledger',
    keys: ['G', 'L'],
    description: 'Go to Audit Log',
    category: 'Navigation',
    icon: BookOpen,
  },
  {
    id: 'nav-projects',
    keys: ['G', 'P'],
    description: 'Go to Projects',
    category: 'Navigation',
    icon: FolderOpen,
  },
  {
    id: 'nav-crons',
    keys: ['G', 'K'],
    description: 'Go to Crons',
    category: 'Navigation',
    icon: Clock,
  },
  {
    id: 'nav-timeline',
    keys: ['G', 'T'],
    description: 'Go to Timeline',
    category: 'Navigation',
    icon: GitBranch,
  },
  {
    id: 'nav-emails',
    keys: ['G', 'E'],
    description: 'Go to Emails',
    category: 'Navigation',
    icon: Mail,
  },
  {
    id: 'nav-notifications',
    keys: ['G', 'N'],
    description: 'Go to Notifications',
    category: 'Navigation',
    icon: Bell,
  },
  {
    id: 'nav-reports',
    keys: ['G', 'F'],
    description: 'Go to Reports',
    category: 'Navigation',
    icon: BarChart,
  },
  {
    id: 'nav-proposals',
    keys: ['G', 'Q'],
    description: 'Go to Proposals',
    category: 'Navigation',
    icon: FileText,
  },
  {
    id: 'nav-pipeline',
    keys: ['G', 'V'],
    description: 'Go to Pipeline',
    category: 'Navigation',
    icon: Workflow,
  },
  {
    id: 'nav-agents-alt',
    keys: ['G', 'J'],
    description: 'Go to Agents (alternative)',
    category: 'Navigation',
    icon: Users,
  },
  {
    id: 'nav-artifacts',
    keys: ['G', 'Y'],
    description: 'Go to Artifacts',
    category: 'Navigation',
    icon: FileBox,
  },
  {
    id: 'nav-policies',
    keys: ['G', 'S'],
    description: 'Go to Settings/Policies',
    category: 'Navigation',
    icon: Shield,
  },
  {
    id: 'nav-settings',
    keys: ['G', '?'],
    description: 'Go to Settings',
    category: 'Navigation',
    icon: Settings,
  },
  {
    id: 'nav-empire',
    keys: ['G', 'M'],
    description: 'Go to Empire OS',
    category: 'Navigation',
    icon: Cpu,
  },
  {
    id: 'nav-briefing',
    keys: ['G', 'B'],
    description: 'Go to Daily Briefing',
    category: 'Navigation',
    icon: Bolt,
  },
];

/**
 * Keyboard Shortcuts Help Modal
 * Shows all available keyboard shortcuts organized by category
 */
export function KeyboardShortcutsModal() {
  const { isOpen, open, close } = useKeyboardShortcutsModalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'All'>('All');

  // Filter shortcuts based on search query and selected category
  const filteredShortcuts = useMemo(() => {
    let filtered = shortcuts;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shortcut) =>
          shortcut.description.toLowerCase().includes(lowerQuery) ||
          shortcut.keys.some((key) => key.toLowerCase().includes(lowerQuery)) ||
          shortcut.category.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

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

  // Handle keyboard shortcuts for the modal itself
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open on ? key (but not when typing in inputs)
      if (e.key === '?' && !isEditableElement(e.target)) {
        e.preventDefault();
        open();
        return;
      }

      // Open on Cmd/Ctrl + / (but not when typing in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && !isEditableElement(e.target)) {
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
        setSelectedCategory('All');
      }
    },
    [open, close]
  );

  const categoryOrder: ShortcutCategory[] = ['Global', 'Quick Actions', 'Navigation'];
  const categoryIcons: Record<string, React.ElementType> = {
    'Global': Zap,
    'Quick Actions': Command,
    'Navigation': Navigation,
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" 
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 px-0 py-0 placeholder:text-zinc-400 focus-visible:ring-0"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                selectedCategory === 'All'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              )}
            >
              All
            </button>
            {categoryOrder.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5',
                    selectedCategory === category
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-500">
              <Search className="h-8 w-8 mb-3 opacity-50" />
              <p>No shortcuts found for &quot;{searchQuery}&quot;</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categoryOrder
                .filter((category) => groupedShortcuts[category])
                .map((category) => {
                  const CategoryIcon = categoryIcons[category];
                  return (
                    <div key={category}>
                      <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-3">
                        {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
                        {category}
                      </h3>
                      <div className="space-y-1">
                        {groupedShortcuts[category].map((shortcut) => (
                          <div
                            key={shortcut.id}
                            className={cn(
                              'flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg',
                              'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                              'transition-colors group'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {shortcut.icon && (
                                <shortcut.icon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                              )}
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {shortcut.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {shortcut.keys.map((key, idx) => (
                                <kbd
                                  key={idx}
                                  className={cn(
                                    'px-2 py-1 text-xs font-mono font-semibold rounded-md border',
                                    'bg-zinc-100 dark:bg-zinc-800',
                                    'border-zinc-300 dark:border-zinc-700',
                                    'text-zinc-700 dark:text-zinc-300',
                                    'shadow-sm min-w-[1.5rem] text-center'
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
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded mx-1">?</kbd> anytime to open this help
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded mx-1">Esc</kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper to check if user is typing in an input field
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  
  const tagName = target.tagName.toLowerCase();
  const isInputElement = 
    tagName === 'input' || 
    tagName === 'textarea' || 
    tagName === 'select' ||
    target.isContentEditable;
  
  const role = target.getAttribute('role');
  const isRoleEditable = role === 'textbox' || role === 'searchbox' || role === 'combobox';
  
  return isInputElement || isRoleEditable;
}

export default KeyboardShortcutsModal;
