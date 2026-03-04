'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Star,
  StarOff,
  MoreHorizontal,
  FolderKanban,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectData, riskColors, formatRelativeDate } from './ProjectCardTypes';

interface ProjectRowProps {
  project: ProjectData;
  onEdit: (project: ProjectData) => void;
  onDuplicate: (project: ProjectData) => void;
  onGenerateStatus: (project: ProjectData) => void;
  onArchive: (project: ProjectData) => void;
  onToggleDelegation: (project: ProjectData) => void;
  isMobile?: boolean;
}

export function ProjectRow({ project, onEdit, onDuplicate, onGenerateStatus, onArchive, onToggleDelegation, isMobile }: ProjectRowProps) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  if (isMobile) {
    return (
      <Link
        href={`/projects/${project.slug}`}
        className={cn(
          'block p-4 border-b border-zinc-100 dark:border-zinc-800',
          'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
          'group'
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: project.color }}
          >
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-[color:var(--foco-teal)] dark:group-hover:text-[color:var(--foco-teal)] transition-colors truncate">
                {project.name}
              </h3>
              {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
            </div>
            {project.risk !== 'none' && (
              <Badge variant="outline" className={cn('text-[10px] h-5 mt-1', riskColors[project.risk])}>
                {project.risk} risk
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); setIsPinned(!isPinned); }}>
                {isPinned ? 'Unpin' : 'Pin'} project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit(project); }}>
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onDuplicate(project); }}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onGenerateStatus(project); }}>
                Generate status update
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={(e) => { e.preventDefault(); onArchive(project); }}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-hidden rounded-full">
              <Progress value={project.progress} className="h-1.5" />
            </div>
            <span className="text-xs text-zinc-500 w-8 shrink-0">{project.progress}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px]">
              {project.owner.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{project.owner.name}</span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <span>{formatRelativeDate(project.updatedAt)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        'flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
        'group'
      )}
    >
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: project.color }}
      >
        <FolderKanban className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-[color:var(--foco-teal)] dark:group-hover:text-[color:var(--foco-teal)] transition-colors truncate">
            {project.name}
          </h3>
          {isPinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          {project.risk !== 'none' && (
            <Badge variant="outline" className={cn('text-[10px] h-5', riskColors[project.risk])}>
              {project.risk} risk
            </Badge>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {project.description}
          </p>
        )}
      </div>

      <div className="w-32 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden rounded-full">
            <Progress value={project.progress} className="h-1.5" />
          </div>
          <span className="text-xs text-zinc-500 w-8 shrink-0">{project.progress}%</span>
        </div>
      </div>

      <div className="hidden md:block w-36 shrink-0">
        {project.activeRuns > 0 ? (
          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0 gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {project.activeRuns} running
          </Badge>
        ) : project.delegationEnabled ? (
          <span className="text-[11px] text-muted-foreground">
            {project.delegationCounts.delegated + project.delegationCounts.pending > 0
              ? `${project.delegationCounts.delegated + project.delegationCounts.pending} queued`
              : 'idle'}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">unassigned</span>
        )}
      </div>

      <div className="w-32 shrink-0 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {project.owner.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-zinc-600 dark:text-zinc-300 truncate">
          {project.owner.name}
        </span>
      </div>

      <div className="w-24 shrink-0 text-xs text-zinc-500">
        {formatRelativeDate(project.updatedAt)}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.preventDefault(); setIsPinned(!isPinned); }}
        >
          {isPinned ? (
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit(project); }}>
              Edit project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onDuplicate(project); }}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onGenerateStatus(project); }}>
              Generate status update
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => { e.preventDefault(); onArchive(project); }}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}
