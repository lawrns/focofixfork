'use client';

import { useCommandPaletteStore, useInboxStore, useUIPreferencesStore } from '@/lib/stores/foco-store';
import { useKeyboardShortcutsModalStore } from '@/lib/hooks/use-keyboard-shortcuts-modal';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { useMobile } from '@/lib/hooks/use-mobile';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCreateTaskModal } from '@/features/tasks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { open: openCommandPalette } = useCommandPaletteStore();
  const { openTaskModal } = useCreateTaskModal();
  const { open: openKeyboardShortcuts } = useKeyboardShortcutsModalStore();
  const { unreadCount } = useInboxStore();
  const { sidebarCollapsed: sidebarCollapsedRaw, density, setDensity } = useUIPreferencesStore();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useMobile();
  const PRIMARY_ACCOUNT_EMAIL = user?.email || '';

  // Gate on isMounted — Zustand persist reads localStorage synchronously, which
  // differs from SSR default. Prevents className mismatch on left-position.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const sidebarCollapsed = isMounted ? sidebarCollapsedRaw : false;

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800',
        'flex items-center gap-2 md:gap-4',
        'transition-all duration-200',
        'left-0 md:left-64',
        sidebarCollapsed && 'md:left-16',
        'h-12 md:h-14 px-2 md:px-4',
        className
      )}
    >
      {/* Breadcrumbs - Hidden on mobile */}
      <div className="hidden md:flex md:flex-1 md:min-w-0">
        <Breadcrumbs className="text-xs" />
      </div>

      {/* Search Bar - Icon button on mobile, full search on desktop */}
      <div className="flex items-center gap-2 flex-1 md:flex-none md:max-w-xs">
        {/* Mobile: Search icon button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openCommandPalette('search')}
          className="md:hidden h-9 w-9 min-h-[44px] min-w-[44px]"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        
        {/* Desktop: Full search bar */}
        <Button
          variant="outline"
          onClick={() => openCommandPalette('search')}
          className="hidden md:flex items-center gap-2 h-9 px-3 flex-1 max-w-xs text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Search...</span>
          <kbd className="ml-auto hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="h-9 min-h-[44px] px-2 md:px-3">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">New Action</span>
              <ChevronDown className="h-3 w-3 opacity-60 hidden md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => openTaskModal()}>
              <span>Execution Task</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">C</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/projects?create=true')}>
              <span>Initiative</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">P</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/docs?create=true')}>
              <span>Playbook Note</span>
              <kbd className="ml-auto text-[10px] font-mono text-zinc-400">D</kbd>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/projects?import=true')}>
              <span>Import Data...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Link */}
        <Link href="/search">
          <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px]" aria-label="Go to search page">
            <Search className="h-4 w-4" />
          </Button>
        </Link>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 min-h-[44px] min-w-[44px]" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
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

        {/* Theme Toggle - Show for all users */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    aria-label={`Current theme: ${theme}. Click to change theme.`}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup 
                    value={theme} 
                    onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                  >
                    <DropdownMenuRadioItem value="light">
                      <Sun className="h-4 w-4 mr-2" aria-hidden="true" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="h-4 w-4 mr-2" aria-hidden="true" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Monitor className="h-4 w-4 mr-2" aria-hidden="true" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Toggle theme</span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>Shift L
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Sign In Button - Only show if not authenticated */}
        {!user && (
          <Link href="/login">
            <Button variant="default" size="sm" className="h-9 min-h-[44px] px-2 md:px-3">
              <LogIn className="h-4 w-4" />
              <span className="hidden md:inline">Sign in</span>
            </Button>
          </Link>
        )}

        {/* Profile - Only show if authenticated */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 min-h-[44px] min-w-[44px]"
              title={`Your profile — ${PRIMARY_ACCOUNT_EMAIL}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{PRIMARY_ACCOUNT_EMAIL.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{PRIMARY_ACCOUNT_EMAIL.split('@')[0]}</span>
                <span className="text-xs font-normal text-zinc-500">{PRIMARY_ACCOUNT_EMAIL}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Density Selector */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="mr-2">{'\u22df'}</span>
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
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openKeyboardShortcuts}>Keyboard shortcuts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 dark:text-red-400"
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw error;
                  router.push('/login');
                } catch {
                  // Sign out error handled by redirect
                }
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  );
}
