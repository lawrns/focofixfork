'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  Home,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Send,
  Activity,
  Clock,
  Mail,
  Archive,
  Shield,
  BookOpen,
  Radar,
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
  { label: 'Dashboard',  href: '/dashboard', icon: Home,     shortcut: 'G H' },
  { label: 'Dispatch',   href: '/openclaw',  icon: Send,     shortcut: 'G D' },
  { label: 'Intel Feed', href: '/clawdbot',  icon: Radar,    shortcut: 'G I' },
  { label: 'Runs',       href: '/runs',      icon: Activity, shortcut: 'G R' },
  { label: 'Ledger',     href: '/ledger',    icon: BookOpen, shortcut: 'G L' },
];

const operateNavItems: NavItem[] = [
  { label: 'Crons',     href: '/crons',     icon: Clock,    shortcut: 'G K' },
  { label: 'Emails',    href: '/emails',    icon: Mail,     shortcut: 'G E' },
  { label: 'Artifacts', href: '/artifacts', icon: Archive,  shortcut: 'G A' },
  { label: 'Policies',  href: '/policies',  icon: Shield,   shortcut: 'G Y' },
];

export function LeftRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed: sidebarCollapsedRaw, toggleSidebar } = useUIPreferencesStore();
  const { user } = useAuth();

  // Gate sidebarCollapsed on isMounted — Zustand persist reads localStorage
  // synchronously on the client, causing SSR mismatch if used directly.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const sidebarCollapsed = isMounted ? sidebarCollapsedRaw : false;

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
            alt="Critter"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg flex-shrink-0"
          />
          {!sidebarCollapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              Critter
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">

        {/* Dispatch button */}
        {sidebarCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-9 mb-3 text-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal-dim)] border border-dashed border-[color:var(--foco-teal)]/30"
                onClick={() => router.push('/openclaw')}
              >
                <Send className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Dispatch</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start mb-3 h-9 text-[13px] font-medium text-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal-dim)] border border-dashed border-[color:var(--foco-teal)]/30"
            onClick={() => router.push('/openclaw')}
          >
            <Send className="h-4 w-4 mr-2" />
            Dispatch
          </Button>
        )}

        {/* Main nav */}
        {mainNavItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Divider */}
        <div className="my-3 h-px bg-[var(--foco-rail-border)]" />

        {/* Operate section label */}
        {!sidebarCollapsed && (
          <div className="px-3 mb-1">
            <span className="text-[10px] font-mono-display text-muted-foreground tracking-widest uppercase">
              Operate
            </span>
          </div>
        )}

        {/* Operate nav */}
        {operateNavItems.map(item => <NavLink key={item.href} item={item} />)}
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
