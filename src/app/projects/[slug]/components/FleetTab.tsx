'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { WorkItem } from '@/types/foco';
import type { Project } from './types';
import { DelegationBadge } from './DelegationBadge';

interface FleetTabProps {
  project: Project;
  setProject: Dispatch<SetStateAction<Project | null>>;
  tasks: WorkItem[];
  activeRuns: number;
  delegationEnabled: boolean;
  setDelegationEnabled: (val: boolean) => void;
  agentPool: string[];
  setTasks: React.Dispatch<React.SetStateAction<WorkItem[]>>;
}

export function FleetTab({
  project,
  setProject,
  tasks,
  activeRuns,
  delegationEnabled,
  setDelegationEnabled,
  agentPool,
  setTasks,
}: FleetTabProps) {
  const [delegatingTaskId, setDelegatingTaskId] = useState<string | null>(null);

  const updateDelegationSettings = async (patch: Record<string, unknown>) => {
    const nextSettings = {
      ...(project.delegation_settings ?? {}),
      ...patch,
    };

    try {
      const res = await fetch(`/api/projects/${project?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ delegation_settings: nextSettings }),
      });

      if (!res.ok) throw new Error();
      setProject(prev => prev ? { ...prev, delegation_settings: nextSettings } : prev);
      if (patch.enabled !== undefined) setDelegationEnabled(Boolean(patch.enabled));
      toast.success('Delegation policy updated');
    } catch {
      toast.error('Failed to update delegation policy');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <div className="col-span-1 md:col-span-2">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-medium text-sm">Task Delegation</h3>
            <span className="text-xs text-zinc-500">{tasks.length} tasks</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">No tasks yet</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {(task as any).assigned_agent && (
                      <p className="text-[11px] text-zinc-400 font-mono truncate">
                        {(task as any).assigned_agent}
                      </p>
                    )}
                  </div>
                  <DelegationBadge status={(task as any).delegation_status ?? 'none'} />
                  {((task as any).delegation_status === 'none' || (task as any).delegation_status === 'failed' || !(task as any).delegation_status) && (
                    <button
                      className="text-[11px] text-[color:var(--foco-teal)] hover:underline shrink-0 disabled:opacity-50"
                      disabled={delegatingTaskId === task.id}
                      onClick={async () => {
                        setDelegatingTaskId(task.id);
                        try {
                          const res = await fetch(`/api/tasks/${task.id}/delegate`, { method: 'POST', credentials: 'include' });
                          if (res.ok) {
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, delegation_status: 'pending' } as any : t));
                            toast.success('Task queued for delegation');
                          } else {
                            toast.error('Failed to delegate task');
                          }
                        } finally {
                          setDelegatingTaskId(null);
                        }
                      }}
                    >
                      {delegatingTaskId === task.id ? 'Delegating…' : 'Delegate'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-sm mb-3">Active Runs</h3>
          {activeRuns > 0 ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-emerald-600">{activeRuns} running</span>
              <a href="/empire/command" className="ml-auto text-[11px] text-[color:var(--foco-teal)] hover:underline">
                View →
              </a>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No active runs</p>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Agent delegation</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Allow ClawdBot to pick up tasks</p>
            </div>
            <button
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${delegationEnabled ? 'bg-[color:var(--foco-teal)]' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              onClick={() => updateDelegationSettings({ enabled: !delegationEnabled })}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${delegationEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Auto queue agent tasks</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Approved brief tasks can enter delegation immediately</p>
            </div>
            <button
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${(project.delegation_settings?.auto_queue_agent_tasks ?? false) ? 'bg-[color:var(--foco-teal)]' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              onClick={() => updateDelegationSettings({ auto_queue_agent_tasks: !(project.delegation_settings?.auto_queue_agent_tasks ?? false) })}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${(project.delegation_settings?.auto_queue_agent_tasks ?? false) ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Require verification before done</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Tasks need a passing verification record before completion</p>
            </div>
            <button
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${(project.delegation_settings?.verification_required_before_done ?? false) ? 'bg-[color:var(--foco-teal)]' : 'bg-zinc-200 dark:bg-zinc-700'}`}
              onClick={() => updateDelegationSettings({ verification_required_before_done: !(project.delegation_settings?.verification_required_before_done ?? false) })}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${(project.delegation_settings?.verification_required_before_done ?? false) ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-sm mb-3">Agent Pool</h3>
          {agentPool.length === 0 ? (
            <p className="text-sm text-zinc-400">No agents assigned</p>
          ) : (
            <div className="space-y-1.5">
              {agentPool.map(agent => (
                <div key={agent} className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {agent}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
