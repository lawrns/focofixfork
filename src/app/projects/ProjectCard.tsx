'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Star,
  StarOff,
  MoreHorizontal,
  Users,
  Calendar,
  AlertTriangle,
  FolderKanban,
  FolderOpen,
  CheckSquare,
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
import { Card } from '@/components/ui/card';
import { ProjectHealthIndicator } from '@/components/crico/project-health-indicator';
import { ProjectData, riskColors, formatRelativeDate } from './ProjectCardTypes';

interface ProjectCardProps {
  project: ProjectData;
  onEdit: (project: ProjectData) => void;
  onDuplicate: (project: ProjectData) => void;
  onGenerateStatus: (project: ProjectData) => void;
  onArchive: (project: ProjectData) => void;
  onToggleDelegation: (project: ProjectData) => void;
}

export function ProjectCard({ project, onEdit, onDuplicate, onGenerateStatus, onArchive, onToggleDelegation }: ProjectCardProps) {
  const [isPinned, setIsPinned] = useState(project.isPinned);

  return (
    <Link href={`/projects/${project.slug}`} className="group block h-full">
      <Card variant="interactive" padding="none" className="h-full overflow-hidden border-zinc-200/80 bg-white/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--foco-teal)]/30 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex h-full flex-col p-3.5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: project.color }}
            >
              <FolderKanban className="h-4 w-4" />
            </div>
            <ProjectHealthIndicator
              projectId={project.id}
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
              {project.name}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Updated {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); onToggleDelegation(project); }}>
                {project.delegationEnabled ? 'Disable' : 'Enable'} delegation
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
      </div>

      {project.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {project.description}
        </p>
      )}

      {project.localPath && (
        <div className="mb-3 flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 truncate" title={project.localPath}>
          <FolderOpen className="h-3 w-3 shrink-0" />
          <span className="truncate">{project.localPath.replace(/^\/home\/[^/]+/, '~')}</span>
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Progress</span>
          <span className="text-[11px] font-medium">
            {project.tasksCompleted}/{project.totalTasks} tasks
          </span>
        </div>
        <div className="overflow-hidden rounded-full">
          <Progress value={project.progress} className="h-1.5 bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </div>

      <div className="mb-3 flex min-h-6 items-center justify-between gap-2">
        {project.risk !== 'none' && (
          <Badge variant="outline" className={cn('text-[10px]', riskColors[project.risk])}>
            <AlertTriangle className="h-3 w-3" />
            {project.risk} risk
          </Badge>
        )}
        {project.nextMilestone && (
          <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="truncate">{project.nextMilestone.name}</span>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px]">
                {project.owner.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] text-muted-foreground">{project.owner.name}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            <span>{project.tasksCompleted}/{project.totalTasks}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border/40 pt-1">
          {project.activeRuns > 0 && (
            <Link
              href="/system"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {project.activeRuns} running
            </Link>
          )}
          {project.delegationCounts.pending > 0 && (
            <span className="text-[10px] font-mono text-amber-500">
              {project.delegationCounts.pending} pending
            </span>
          )}
          {project.delegationCounts.failed > 0 && (
            <span className="text-[10px] font-mono text-red-500">
              {project.delegationCounts.failed} failed
            </span>
          )}
          {project.agentPool.length > 0 ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Bot className="h-3 w-3" />{project.agentPool.length}
            </span>
          ) : (
            <span className="ml-auto text-[10px] text-muted-foreground/50">No agents</span>
          )}
        </div>
      </div>
      </div>
      </Card>
    </Link>
  );
}
