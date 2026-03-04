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
    <Link href={`/projects/${project.slug}`} className="group block">
      <Card variant="interactive" padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: project.color }}
            >
              <FolderKanban className="h-5 w-5" />
            </div>
            <ProjectHealthIndicator
              projectId={project.id}
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Updated {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">
            {project.tasksCompleted}/{project.totalTasks} tasks
          </span>
        </div>
        <div className="overflow-hidden rounded-full">
          <Progress value={project.progress} className="h-1.5" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        {project.risk !== 'none' && (
          <Badge variant="outline" className={cn('text-xs', riskColors[project.risk])}>
            <AlertTriangle className="h-3 w-3" />
            {project.risk} risk
          </Badge>
        )}
        {project.nextMilestone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{project.nextMilestone.name}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {project.owner.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{project.owner.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            <span>{project.tasksCompleted}/{project.totalTasks}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
          {project.activeRuns > 0 && (
            <Link
              href="/empire/command"
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
