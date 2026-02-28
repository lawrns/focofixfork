'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPaletteStore } from '@/lib/stores/foco-store';
// import { useCreateTaskModal } from '@/features/tasks';
import { cn } from '@/lib/utils';
import { useMobile } from '@/lib/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Home,
  Send,
  Activity,
  BookOpen,
  Clock,
  Mail,
  FileBox,
  Shield,
  Settings,
  Plus,
  ArrowRight,
  Zap,
  Rss,
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
  const isMobile = useMobile();

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: Home, shortcut: 'G H', group: 'Navigation', action: () => router.push('/dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-dispatch', label: 'Go to Dispatch', icon: Send, shortcut: 'G D', group: 'Navigation', action: () => router.push('/openclaw'), keywords: ['agent', 'openclaw', 'mission control'] },
    { id: 'nav-intel', label: 'Go to Intel Feed', icon: Rss, shortcut: 'G I', group: 'Navigation', action: () => router.push('/clawdbot'), keywords: ['intel', 'feed'] },
    { id: 'nav-runs', label: 'Go to Runs', icon: Activity, shortcut: 'G R', group: 'Navigation', action: () => router.push('/runs'), keywords: ['executions', 'history'] },
    { id: 'nav-ledger', label: 'Go to Ledger', icon: BookOpen, shortcut: 'G L', group: 'Navigation', action: () => router.push('/ledger'), keywords: ['events', 'log'] },
    { id: 'nav-crons', label: 'Go to Crons', icon: Clock, shortcut: 'G K', group: 'Navigation', action: () => router.push('/crons'), keywords: ['scheduler', 'jobs'] },
    { id: 'nav-emails', label: 'Go to Emails', icon: Mail, shortcut: 'G E', group: 'Navigation', action: () => router.push('/emails'), keywords: ['outbox', 'messages'] },
    { id: 'nav-artifacts', label: 'Go to Artifacts', icon: FileBox, shortcut: 'G A', group: 'Navigation', action: () => router.push('/artifacts'), keywords: ['files'] },
    { id: 'nav-policies', label: 'Go to Policies', icon: Shield, shortcut: 'G Y', group: 'Navigation', action: () => router.push('/policies'), keywords: ['guardrails', 'fleet'] },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, shortcut: 'G S', group: 'Navigation', action: () => router.push('/settings') },

    // Quick Actions
    { id: 'dispatch-agent', label: 'Dispatch Agent', icon: Send, shortcut: 'C', group: 'Quick Actions', action: () => router.push('/openclaw'), keywords: ['new', 'task', 'agent'] },
    { id: 'new-cron', label: 'New Cron', icon: Clock, group: 'Quick Actions', action: () => router.push('/crons?create=true'), keywords: ['new', 'schedule'] },
    { id: 'new-email', label: 'New Email', icon: Mail, group: 'Quick Actions', action: () => router.push('/emails?create=true'), keywords: ['new', 'send'] },

    // AI Actions
    { id: 'ai-brief', label: 'Generate Daily Brief', icon: Zap, group: 'AI Actions', action: () => router.push('/dashboard?brief=generate'), keywords: ['summary', 'ai'] },
    { id: 'ai-status', label: 'Generate Status Update', icon: Zap, group: 'AI Actions', action: () => router.push('/reports?generate=status'), keywords: ['report', 'ai'] },
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
      <DialogContent
        className={cn(
          "p-0 overflow-hidden",
          // Mobile: nearly full-screen with safe area padding
          isMobile
            ? "max-w-[calc(100vw-1rem)] max-h-[calc(100vh-2rem)] pb-[env(safe-area-inset-bottom)]"
            : "max-w-xl"
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search Input */}
        <div className={cn(
          "flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4",
          isMobile && "px-3"
        )}>
          <Search className={cn("h-4 w-4 text-zinc-400", isMobile && "h-5 w-5")} />
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
            className={cn(
              "flex-1 px-3 py-4 bg-transparent text-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
              isMobile && "py-3 text-base"
            )}
            autoFocus
            aria-label="Command search"
          />
          {/* Only show ESC hint on desktop */}
          {!isMobile && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className={cn(
          "max-h-[400px] overflow-y-auto p-2",
          isMobile && "max-h-[calc(100vh-10rem)] p-3"
        )}>
          {Object.entries(groupedCommands).length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className={cn(
                  "px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400",
                  isMobile && "px-3 py-2"
                )}>
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
                        // Mobile: larger touch targets (min 44px height)
                        isMobile && 'px-3 py-3 min-h-[44px] text-base gap-4',
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-800 ring-2 ring-blue-500'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      )}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <cmd.icon className={cn(
                        "h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0",
                        isMobile && "h-5 w-5"
                      )} />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div className={cn(
                            "text-xs text-zinc-500 dark:text-zinc-400",
                            isMobile && "text-sm mt-0.5"
                          )}>
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {/* Only show keyboard shortcuts on desktop */}
                      {cmd.shortcut && !isMobile && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRight className={cn("h-3 w-3 text-zinc-400", isMobile && "h-4 w-4")} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer - hide keyboard hints on mobile */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500",
          isMobile && "px-3 py-3"
        )}>
          {/* Only show keyboard navigation hints on desktop */}
          {!isMobile && (
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
          )}
          <div className={cn("flex items-center gap-1", isMobile && "w-full justify-center")}>
            <Zap className="h-3 w-3" />
            <span>AI-powered</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
