'use client';

import { useCommandPaletteStore, useInboxStore, useUIPreferencesStore } from '@/lib/stores/foco-store';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { open: openCommandPalette } = useCommandPaletteStore();
  const { unreadCount } = useInboxStore();
  const { sidebarCollapsed, density, setDensity } = useUIPreferencesStore();
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-20 h-14 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800',
        'flex items-center justify-between px-4 gap-4',
        'transition-all duration-200',
        sidebarCollapsed ? 'left-16' : 'left-64',
        className
      )}
    >
      {/* Search */}
      <Button
        variant="outline"
        className="flex-1 max-w-md justify-start text-zinc-500 dark:text-zinc-400 h-9"
        onClick={() => openCommandPalette('search')}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="text-sm">Search or jump to...</span>
        <kbd className="ml-auto px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
          ⌘K
        </kbd>
      </Button>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-1" />
              Create
              <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => openCommandPalette('create')}>
              <span>Task</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">C</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Project</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">P</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Doc</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">D</kbd>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>Import...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Workspace Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2 gap-2">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">AC</span>
              </div>
              <span className="text-sm font-medium hidden sm:inline">Acme Corp</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem>
              <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-2">
                <span className="text-[10px] font-bold text-white">AC</span>
              </div>
              <span>Acme Corp</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="h-4 w-4 mr-2" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Avatar className="h-7 w-7">
                <AvatarImage src="/images/avatar.jpg" />
                <AvatarFallback className="text-xs">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>John Doe</span>
                <span className="text-xs font-normal text-zinc-500">john@acme.com</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Theme Selector */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 mr-2" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4 mr-2" />
                ) : (
                  <Monitor className="h-4 w-4 mr-2" />
                )}
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Density Selector */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="mr-2">⊟</span>
                Density
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as any)}>
                  <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile settings</DropdownMenuItem>
            <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 dark:text-red-400">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
