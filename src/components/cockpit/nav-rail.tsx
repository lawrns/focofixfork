'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertOctagon,
  Bot,
  Clock,
  FileBarChart2,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Play,
  ScrollText,
  Settings,
  StopCircle,
  Zap,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  icon: React.ElementType
  label: string
  href?: string
  action?: string
  divider?: boolean
  danger?: boolean
  accent?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Cockpit', href: '/cockpit' },
  { icon: Zap, label: 'Runs', href: '/runs' },
  { icon: Bot, label: 'Agents', href: '/agents' },
  { icon: Clock, label: 'Crons', href: '/crons' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: FileBarChart2, label: 'Reports', href: '/reports' },
  { icon: ScrollText, label: 'Ledger', href: '/ledger' },
  { icon: Settings, label: 'Settings', href: '/settings', divider: true },
]

const QUICK_ACTIONS: NavItem[] = [
  { icon: Play, label: 'Dispatch Task', action: 'dispatch', accent: true },
  { icon: Layers, label: 'New Goal', action: 'goal' },
  { icon: StopCircle, label: 'Pause All Non-critical', action: 'pause' },
  { icon: AlertOctagon, label: 'Emergency Stop', action: 'stop', danger: true },
]

interface NavRailProps {
  onAction?: (action: string) => void
}

export function NavRail({ onAction }: NavRailProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="w-12 flex-shrink-0 bg-[#0d0d0f] border-r border-zinc-800/70 flex flex-col items-center py-2 gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const href = item.href ?? '#'
          const isActive = href === '/cockpit'
            ? pathname === '/cockpit' || pathname === '/dashboard'
            : pathname?.startsWith(href)
          const Icon = item.icon

          return (
            <div key={item.label} className="w-full flex flex-col items-center">
              {item.divider && <div className="w-6 border-t border-zinc-800 my-1" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-colors group relative',
                      isActive
                        ? 'bg-teal-500/15 text-teal-400'
                        : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-mono">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick actions */}
        <div className="w-full flex flex-col items-center gap-1 pb-1 border-t border-zinc-800 pt-2">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAction?.(item.action ?? '')}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                      item.accent && 'text-teal-400 hover:bg-teal-500/15',
                      item.danger && 'text-rose-400 hover:bg-rose-500/10',
                      !item.accent && !item.danger && 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-mono">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </nav>
    </TooltipProvider>
  )
}
