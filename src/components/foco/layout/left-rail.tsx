'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import { useCreateTaskModal } from '@/features/tasks';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  Home,
  Inbox,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Star,
  GitBranch,
  BookOpen,
  Activity,
  Clock,
  Mail,
  Archive,
  Shield,
  Cpu,
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
  { label: 'Home',    href: '/dashboard', icon: Home,        shortcut: 'G H' },
  { label: 'Inbox',   href: '/inbox',     icon: Inbox,       shortcut: 'G I' },
  { label: 'My Work', href: '/my-work',   icon: CheckSquare, shortcut: 'G M' },
];

const baseWorkspaceNavItems: NavItem[] = [
  { label: 'Projects',  href: '/projects',  icon: FolderKanban, shortcut: 'G P' },
  { label: 'Proposals', href: '/proposals', icon: GitBranch,    shortcut: 'G O' },
  { label: 'Timeline',  href: '/timeline',  icon: Calendar,     shortcut: 'G T' },
  { label: 'People',    href: '/people',    icon: Users,        shortcut: 'G W' },
  { label: 'Reports',   href: '/reports',   icon: BarChart3,    shortcut: 'G B' },
];

const clawfusionNavItems: NavItem[] = [
  { label: 'Critter',   href: '/openclaw',  icon: Cpu,          shortcut: 'G C' },
  { label: 'Runs',      href: '/runs',      icon: Activity,     shortcut: 'G R' },
  { label: 'Crons',     href: '/crons',     icon: Clock,        shortcut: 'G K' },
  { label: 'Emails',    href: '/emails',    icon: Mail,         shortcut: 'G E' },
  { label: 'Artifacts', href: '/artifacts', icon: Archive,      shortcut: 'G A' },
  { label: 'Ledger',    href: '/ledger',    icon: BookOpen,     shortcut: 'G L' },
  { label: 'Policies',  href: '/policies',  icon: Shield,       shortcut: 'G Y' },
];

const pinnedProjects: { id: string; name: string; slug: string; color: string }[] = [];

export function LeftRail() {
  const pathname = usePathname();
  const { sidebarCollapsed: sidebarCollapsedRaw, toggleSidebar } = useUIPreferencesStore();
  const { openTaskModal } = useCreateTaskModal();
  const { user } = useAuth();
  const [workspaceNavItems, setWorkspaceNavItems] = useState<NavItem[]>(baseWorkspaceNavItems);
  const [inboxBadge, setInboxBadge] = useState<number | undefined>(undefined);

  // Gate sidebarCollapsed on isMounted — Zustand persist reads localStorage
  // synchronously on the client, causing SSR mismatch if used directly.
  // Always start collapsed=false to match SSR, then switch after mount.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const sidebarCollapsed = isMounted ? sidebarCollapsedRaw : false;

  /* Fetch unread inbox count */
  useEffect(() => {
    if (!user) return;
    fetch('/api/notifications?unread=true', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const count = data?.count ?? data?.data?.length ?? 0;
        setInboxBadge(count > 0 ? count : undefined);
      })
      .catch(() => {});
  }, [user]);

  /* Add Cursos for Fyves members */
  useEffect(() => {
    let isMounted = true;

    const addCursosLink = async () => {
      if (!user?.email) {
        if (isMounted) setWorkspaceNavItems(baseWorkspaceNavItems);
        return;
      }
      if (!user.email.endsWith('@fyves.com')) {
        if (isMounted) setWorkspaceNavItems(baseWorkspaceNavItems);
        return;
      }
      try {
        const res = await fetch('/api/workspaces');
        if (!res.ok) {
          if (isMounted) setWorkspaceNavItems(baseWorkspaceNavItems);
          return;
        }
        const data = await res.json();
        const fyvesWorkspace = data.data?.workspaces?.find(
          (ws: any) => ws.slug === 'fyves-team'
        );
        if (isMounted) {
          if (fyvesWorkspace) {
            setWorkspaceNavItems([
              ...baseWorkspaceNavItems,
              {
                label: 'Cursos',
                href: `/organizations/${fyvesWorkspace.id}/cursos`,
                icon: BookOpen,
                shortcut: 'G C',
              },
            ]);
          } else {
            setWorkspaceNavItems(baseWorkspaceNavItems);
          }
        }
      } catch {
        if (isMounted) setWorkspaceNavItems(baseWorkspaceNavItems);
      }
    };

    addCursosLink();
    return () => { isMounted = false; };
  }, [user?.email]);

  /* ── NavLink ──────────────────────────────────────────────── */
  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href));

    const inner = (
      <Link
        href={item.href}
        className={cn(
          'relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150',
          sidebarCollapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2',
          isActive
            ? [
                'text-[color:var(--foco-teal)]',
                'bg-[color:var(--foco-teal-dim)]',
                'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                'before:h-4 before:w-0.5 before:rounded-full',
                'before:bg-[color:var(--foco-teal)]',
              ].join(' ')
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
        )}
      >
        <item.icon className={cn(
          'flex-shrink-0 transition-colors',
          sidebarCollapsed ? 'h-4.5 w-4.5' : 'h-4 w-4',
          isActive ? 'text-[color:var(--foco-teal)]' : '',
        )} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge
                variant="secondary"
                className="h-4.5 min-w-[18px] px-1 text-[10px] font-mono-display bg-secondary text-muted-foreground"
              >
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
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2 text-[12px]">
            {item.label}
            {item.badge && item.badge > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{item.badge}</Badge>
            )}
            {item.shortcut && (
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono-display bg-secondary rounded">
                {item.shortcut}
              </kbd>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return inner;
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <aside
      suppressHydrationWarning
      className={cn(
        'fixed left-0 top-0 z-10 h-screen flex flex-col transition-all duration-200',
        'hidden md:flex',
        'border-r border-[var(--foco-rail-border)]',
        'bg-[var(--foco-rail-bg)]',
        sidebarCollapsed ? 'w-[52px]' : 'w-60',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'h-13 flex items-center border-b border-[var(--foco-rail-border)]',
          sidebarCollapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/focologo.png"
            alt="Foco"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg flex-shrink-0"
          />
          {!sidebarCollapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              Foco
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">

        {/* Create button */}
        {sidebarCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-9 mb-3 text-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal-dim)] border border-dashed border-[color:var(--foco-teal)]/30"
                onClick={() => openTaskModal()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Create task</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start mb-3 h-9 text-[13px] font-medium text-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal-dim)] border border-dashed border-[color:var(--foco-teal)]/30"
            onClick={() => openTaskModal()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        )}

        {/* Main nav */}
        {mainNavItems.map(item => (
          <NavLink
            key={item.href}
            item={item.href === '/inbox' ? { ...item, badge: inboxBadge } : item}
          />
        ))}

        {/* Divider */}
        <div className="my-3 h-px bg-[var(--foco-rail-border)]" />

        {/* Workspace label */}
        {!sidebarCollapsed && (
          <div className="px-3 mb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">
              Workspace
            </span>
          </div>
        )}

        {/* Workspace nav */}
        {workspaceNavItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* Critter divider */}
        <div className="my-3 h-px bg-[var(--foco-rail-border)]" />

        {/* Critter section label */}
        {!sidebarCollapsed && (
          <div className="px-3 mb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">
              Critter
            </span>
          </div>
        )}

        {/* Critter nav */}
        {clawfusionNavItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* Pinned projects */}
        {!sidebarCollapsed && pinnedProjects.length > 0 && (
          <>
            <div className="my-3 h-px bg-[var(--foco-rail-border)]" />
            <div className="px-3 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">
                Pinned
              </span>
              <Star className="h-3 w-3 text-muted-foreground" />
            </div>
            {pinnedProjects.map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: Settings + Collapse */}
      <div className="border-t border-[var(--foco-rail-border)] p-2 space-y-0.5">
        <NavLink item={{ label: 'Settings', href: '/settings', icon: Settings }} />

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-[12px] text-muted-foreground hover:text-foreground',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3',
          )}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
