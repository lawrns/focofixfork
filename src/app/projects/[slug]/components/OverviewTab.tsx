'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Project, TeamMember } from './types';
import type { WorkItem } from '@/types/foco';

interface OverviewTabProps {
  project: Project;
  tasks: WorkItem[];
  teamMembers: TeamMember[];
}

export function OverviewTab({ project, tasks, teamMembers }: OverviewTabProps) {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
        <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-2 text-sm md:text-base">Project Brief</h3>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300">
            {project.brief || project.description || 'No project brief available.'}
          </p>
        </div>

        <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-3 text-sm md:text-base">Milestones</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between p-2 md:p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm truncate">Design Phase Complete</p>
                  <p className="text-[10px] md:text-xs text-zinc-500">Due Jan 20, 2026</p>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 shrink-0 text-[10px] md:text-xs">
                In Progress
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 md:p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-zinc-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm truncate">Development Complete</p>
                  <p className="text-[10px] md:text-xs text-zinc-500">Due Feb 28, 2026</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] md:text-xs">Upcoming</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-3 text-sm md:text-base">Progress</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-zinc-500">Completed</span>
              <span className="font-medium text-sm md:text-base">{completedTasks} / {tasks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-zinc-500">In Progress</span>
              <span className="font-medium text-sm md:text-base">{inProgressTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-zinc-500">Blocked</span>
              <span className="font-medium text-sm md:text-base text-red-500">{blockedTasks}</span>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-3 text-sm md:text-base">Team</h3>
          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <p className="text-xs md:text-sm text-zinc-500">No team members yet</p>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {member.user_profiles?.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('') || member.user_profiles?.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs md:text-sm truncate">
                    {member.user_profiles?.full_name || member.user_profiles?.email}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
