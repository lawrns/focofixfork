'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import { useCreateTaskModal } from '@/features/tasks';
import {
  Home,
  Inbox,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  shortcut?: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home, shortcut: 'G H' },
  { label: 'Inbox', href: '/inbox', icon: Inbox, badge: 3, shortcut: 'G I' },
  { label: 'My Work', href: '/my-work', icon: CheckSquare, shortcut: 'G M' },
];

const workspaceNavItems: NavItem[] = [
  { label: 'Projects', href: '/projects', icon: FolderKanban, shortcut: 'G P' },
  { label: 'Proposals', href: '/proposals', icon: GitBranch, shortcut: 'G O' },
  { label: 'Timeline', href: '/timeline', icon: Calendar, shortcut: 'G T' },
  { label: 'People', href: '/people', icon: Users, shortcut: 'G E' },
  { label: 'Reports', href: '/reports', icon: BarChart3, shortcut: 'G R' },
];

// Pinned projects will be fetched from the API - empty by default
const pinnedProjects: { id: string; name: string; slug: string; color: string }[] = [];

export function LeftRail() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIPreferencesStore();
  const { openTaskModal } = useCreateTaskModal();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href));
    
    const content = (
      <Link
        href={item.href}
        className={cn(
          'nav-link flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'hover:bg-zinc-100 dark:hover:bg-zinc-800',
          isActive 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50' 
            : 'text-zinc-600 dark:text-zinc-400'
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && item.badge > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
            {item.shortcut && (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 rounded">
                {item.shortcut}
              </kbd>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-10 h-screen bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800',
        'flex flex-col transition-all duration-200',
        'hidden md:flex',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-14 flex items-center border-b border-zinc-200 dark:border-zinc-800',
        sidebarCollapsed ? 'justify-center px-2' : 'px-4'
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="/focologo.png" 
            alt="Foco" 
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
          />
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Foco</span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Create Button */}
        <Button
          variant="default"
          className={cn(
            'w-full mb-4',
            sidebarCollapsed ? 'px-2' : ''
          )}
          size={sidebarCollapsed ? 'icon' : 'md'}
          onClick={() => openTaskModal()}
        >
          <Plus className="h-4 w-4" />
          {!sidebarCollapsed && <span className="ml-2">Create</span>}
        </Button>

        {/* Main Nav */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Workspace Nav */}
        <div className="space-y-1">
          {workspaceNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Pinned Projects */}
        {!sidebarCollapsed && pinnedProjects.length > 0 && (
          <>
            <div className="my-4 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="px-3 py-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <span>Pinned</span>
                <Star className="h-3 w-3" />
              </div>
            </div>
            <div className="space-y-1">
              {pinnedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  title={project.name}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                    'hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    'text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 space-y-1">
        <NavLink item={{ label: 'Settings', href: '/settings', icon: Settings }} />
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start text-zinc-500 dark:text-zinc-400',
            sidebarCollapsed && 'justify-center'
          )}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
