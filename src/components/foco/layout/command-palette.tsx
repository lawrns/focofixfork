'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Search,
  Home,
  Inbox,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  Hash,
  Clock,
  Star,
  Zap,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  group: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, mode, query, close, setQuery } = useCommandPaletteStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-home', label: 'Go to Home', icon: Home, shortcut: 'G H', group: 'Navigation', action: () => router.push('/dashboard'), keywords: ['dashboard'] },
    { id: 'nav-inbox', label: 'Go to Inbox', icon: Inbox, shortcut: 'G I', group: 'Navigation', action: () => router.push('/inbox'), keywords: ['notifications'] },
    { id: 'nav-mywork', label: 'Go to My Work', icon: CheckSquare, shortcut: 'G M', group: 'Navigation', action: () => router.push('/my-work'), keywords: ['tasks', 'assigned'] },
    { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, shortcut: 'G P', group: 'Navigation', action: () => router.push('/projects') },
    { id: 'nav-timeline', label: 'Go to Timeline', icon: Calendar, shortcut: 'G T', group: 'Navigation', action: () => router.push('/timeline') },
    { id: 'nav-docs', label: 'Go to Docs', icon: FileText, shortcut: 'G D', group: 'Navigation', action: () => router.push('/docs') },
    { id: 'nav-people', label: 'Go to People', icon: Users, shortcut: 'G E', group: 'Navigation', action: () => router.push('/people') },
    { id: 'nav-reports', label: 'Go to Reports', icon: BarChart3, shortcut: 'G R', group: 'Navigation', action: () => router.push('/reports') },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, shortcut: 'G S', group: 'Navigation', action: () => router.push('/settings') },
    
    // Quick Actions
    { id: 'create-task', label: 'Create Task', icon: Plus, shortcut: 'C', group: 'Quick Actions', action: () => router.push('/my-work?create=task'), keywords: ['new', 'add'] },
    { id: 'create-project', label: 'Create Project', icon: FolderKanban, shortcut: 'P', group: 'Quick Actions', action: () => router.push('/projects?create=true'), keywords: ['new', 'add'] },
    { id: 'create-doc', label: 'Create Doc', icon: FileText, shortcut: 'D', group: 'Quick Actions', action: () => router.push('/docs?create=true'), keywords: ['new', 'add', 'document'] },
    
    // AI Actions
    { id: 'ai-brief', label: 'Generate Daily Brief', icon: Zap, group: 'AI Actions', action: () => router.push('/dashboard?brief=generate'), keywords: ['summary', 'ai'] },
    { id: 'ai-status', label: 'Generate Status Update', icon: Zap, group: 'AI Actions', action: () => router.push('/reports?generate=status'), keywords: ['report', 'ai'] },
    { id: 'ai-suggest', label: 'Get AI Suggestions', icon: Zap, group: 'AI Actions', action: () => router.push('/dashboard?suggestions=true'), keywords: ['help', 'ai'] },
    
    // Recent
    { id: 'recent-1', label: 'Website Redesign', description: 'Project', icon: FolderKanban, group: 'Recent', action: () => router.push('/projects/website-redesign') },
    { id: 'recent-2', label: 'Design homepage mockups', description: 'Task in Website Redesign', icon: CheckSquare, group: 'Recent', action: () => router.push('/my-work') },
  ], [router]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => {
      const searchText = [
        cmd.label,
        cmd.description,
        ...(cmd.keywords || []),
      ].join(' ').toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const flatCommands = useMemo(() => filteredCommands, [filteredCommands]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    close();
    cmd.action();
  }, [close]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          close();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatCommands, selectedIndex, executeCommand, close]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  let currentIndex = 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 max-w-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder={
              mode === 'create' ? 'Create task...' :
              mode === 'create-project' ? 'Create project...' :
              mode === 'create-doc' ? 'Create doc...' :
              mode === 'import' ? 'Import...' :
              'Type a command or search...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-4 bg-transparent text-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            autoFocus
            aria-label="Command search"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {Object.entries(groupedCommands).length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {group}
                </div>
                {items.map((cmd) => {
                  const itemIndex = currentIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      className={cn(
                        'w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-800 ring-2 ring-blue-500'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      )}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <cmd.icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRight className="h-3 w-3 text-zinc-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">↵</kbd>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>AI-powered</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
