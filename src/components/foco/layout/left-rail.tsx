'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import {
  Home,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Activity,
  FileText,
  Bot,
  GitBranch,
  BarChart2,
  Radio,
  RefreshCw,
  Terminal,
  FolderKanban,
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

// OPERATE — daily work
const operateNavItems: NavItem[] = [
  { label: 'Overview',   href: '/dashboard',       icon: Home,        shortcut: 'G H' },
  { label: 'Projects',   href: '/empire/missions', icon: FolderKanban, shortcut: 'G P' },
  { label: 'Runs',       href: '/runs',            icon: Activity,    shortcut: 'G R' },
  { label: 'Audit Log',  href: '/ledger',          icon: BarChart2,   shortcut: 'G L' },
];

// BUILD — agent operations
const buildNavItems: NavItem[] = [
  { label: 'Command Center',   href: '/empire/command', icon: Terminal,  shortcut: 'G C' },
  { label: 'Agents',           href: '/empire/agents',  icon: Bot,       shortcut: 'G J' },
  { label: 'Pipeline',         href: '/empire/pipeline', icon: GitBranch, shortcut: 'G V' },
  { label: 'Recurring Tasks',  href: '/empire/loops',   icon: RefreshCw, shortcut: 'G U' },
];

// INFORM — intelligence & alerts
const informNavItems: NavItem[] = [
  { label: 'Daily Briefing', href: '/empire/briefing', icon: FileText, shortcut: 'G B' },
  { label: 'Notifications',  href: '/empire/signals',  icon: Radio,    shortcut: 'G N' },
  { label: 'Reports',        href: '/reports',         icon: BarChart2, shortcut: 'G F' },
  { label: 'Settings',       href: '/settings',        icon: Settings, shortcut: 'G S' },
];

export function LeftRail() {
  const pathname = usePathname();
  const { sidebarCollapsed: sidebarCollapsedRaw, toggleSidebar } = useUIPreferencesStore();

  // Gate sidebarCollapsed on isMounted — Zustand persist reads localStorage
  // synchronously on the client, causing SSR mismatch if used directly.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const sidebarCollapsed = isMounted ? sidebarCollapsedRaw : false;

  const navRef = useRef<HTMLElement>(null);
  const [navOverflows, setNavOverflows] = useState(false);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => setNavOverflows(el.scrollHeight > el.clientHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener('scroll', check);
    return () => { ro.disconnect(); el.removeEventListener('scroll', check); };
  }, []);

  /* ── NavLink ──────────────────────────────────────────────── */
  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname?.startsWith(item.href));

    const inner = (
      <Link
        href={item.href}
        className={cn(
          'relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-all duration-150',
          sidebarCollapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2.5',
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
        sidebarCollapsed ? 'w-[52px]' : 'w-56 lg:w-60',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-[var(--foco-rail-border)]',
          sidebarCollapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/focologo.png"
            alt="Critter"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg flex-shrink-0 dark:invert-0 grayscale"
          />
          {!sidebarCollapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              Critter
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="relative flex-1 overflow-y-auto py-4 px-2.5 space-y-1 scrollbar-hide">

        {/* OPERATE */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Operate</span>
          </div>
        )}
        {operateNavItems.map(item => <NavLink key={item.href} item={item} />)}

        <div className="my-3.5 h-px bg-[var(--foco-rail-border)]" />

        {/* BUILD */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Build</span>
          </div>
        )}
        {buildNavItems.map(item => <NavLink key={item.href} item={item} />)}

        <div className="my-3.5 h-px bg-[var(--foco-rail-border)]" />

        {/* INFORM */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">Inform</span>
          </div>
        )}
        {informNavItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* Scroll fade */}
        {navOverflows && (
          <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--foco-rail-bg)] to-transparent pointer-events-none" />
        )}
      </nav>

      {/* Bottom: Collapse only — Settings is in INFORM */}
      <div className="border-t border-[var(--foco-rail-border)] p-2">
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
