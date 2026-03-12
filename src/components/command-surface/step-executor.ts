import type { CommandMode, PlanStep, StepResult, CTODecision, COODecision } from './types';
import { normalizeApiError } from './pipeline-utils';
import { apiFetch } from '@/lib/api/fetch-client';

export async function executeStep(
  step: PlanStep,
  prompt: string,
  mode: CommandMode,
  decision?: CTODecision | COODecision,
  completedSteps?: PlanStep[],
  projectId?: string | null
): Promise<{ success: boolean; result?: StepResult; error?: string }> {
  switch (step.type) {
    case 'ledger_log':
      try {
        await fetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'command_initiated',
            source: 'command_surface',
            payload: { prompt, mode, step: step.id }
          })
        });
        return { success: true, result: { logged: true } };
      } catch (error) {
        return { success: false, error: String(error) };
      }

    case 'create_cron':
      if (decision && 'crons' in decision && decision.crons.length > 0) {
        const cron = decision.crons[0];
        try {
          const res = await apiFetch('/api/crons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cron.name,
              schedule: cron.schedule,
              handler: cron.handler,
              enabled: true
            })
          });
          const data = await res.json();
          if (res.ok) {
            return { success: true, result: { cronId: data.data?.id } };
          }
          return { success: false, error: normalizeApiError(data.error) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
      return { success: false, error: 'No cron configuration found' };

    case 'send_email':
      if (decision && 'emails' in decision && decision.emails.length > 0) {
        const email = decision.emails[0];
        try {
          const res = await fetch('/api/emails/outbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email.to[0],
              subject: email.subject,
              body_md: email.body
            })
          });
          const data = await res.json();
          if (res.ok) {
            return { success: true, result: { emailId: data.data?.id } };
          }
          return { success: false, error: normalizeApiError(data.error) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
      return { success: false, error: 'No email configuration found' };

    case 'create_task':
      if (decision && 'tasks' in decision && decision.tasks.length > 0) {
        const task = decision.tasks[0];
        if (!projectId) {
          return { success: false, error: 'No project selected — pick a project before creating tasks' };
        }
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: 'backlog',
              project_id: projectId,
            })
          });
          const data = await res.json();
          if (res.ok || data.queued) {
            return { success: true, result: { taskId: data.data?.id || 'queued', queued: data.queued } };
          }
          return { success: false, error: normalizeApiError(data.error) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
      return { success: false, error: 'No task configuration found' };

    case 'create_project':
      if (decision && 'projects' in decision && decision.projects && decision.projects.length > 0) {
        const project = decision.projects[0];
        try {
          const workspaceRes = await fetch('/api/user/workspace');
          const workspaceJson = await workspaceRes.json();
          const workspaceId = workspaceJson?.data?.workspace_id ?? workspaceJson?.workspace_id;

          if (!workspaceRes.ok || !workspaceId) {
            return { success: false, error: normalizeApiError(workspaceJson?.error) || 'No workspace found for project creation' };
          }

          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: project.name,
              description: project.description,
              workspace_id: workspaceId,
              status: 'active',
            })
          });
          const data = await res.json();
          if (res.ok) {
            return { success: true, result: { projectId: data.data?.id, slug: data.data?.slug } };
          }
          return { success: false, error: normalizeApiError(data.error) || 'Project creation failed' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
      return { success: false, error: 'No project configuration found' };

    case 'create_run':
      if (decision && 'runs' in decision && decision.runs.length > 0) {
        const run = decision.runs[0];
        try {
          const res = await fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              runner: run.runner,
              status: 'pending',
              summary: run.task,
              project_id: projectId ?? null,
            })
          });
          const data = await res.json();
          if (res.ok) {
            return { success: true, result: { runId: data.data?.id } };
          }
          return { success: false, error: normalizeApiError(data.error) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }
      return { success: true, result: { skipped: true } };

    case 'verify': {
      const projectStep = completedSteps?.find(s => s.type === 'create_project' && s.result && (s.result as any).projectId);
      const taskStep = completedSteps?.find(s => s.type === 'create_task' && s.result && (s.result as any).taskId && (s.result as any).taskId !== 'queued');
      const cronStep = completedSteps?.find(s => s.type === 'create_cron' && s.result && (s.result as any).cronId);
      const runStep = completedSteps?.find(s => s.type === 'create_run' && s.result && (s.result as any).runId);

      try {
        if (projectStep?.result) {
          const pid = (projectStep.result as any).projectId;
          const res = await fetch(`/api/projects?id=${pid}`);
          if (!res.ok) return { success: false, error: 'Project not found in database after creation' };
          return { success: true, result: { verified: true, type: 'project', id: pid } };
        }
        if (taskStep?.result) {
          const taskId = (taskStep.result as any).taskId;
          const res = await fetch(`/api/tasks/${taskId}`);
          if (!res.ok) return { success: false, error: 'Task not found in database after creation' };
          return { success: true, result: { verified: true, type: 'task', id: taskId } };
        }
        if (cronStep?.result) {
          const cronId = (cronStep.result as any).cronId;
          const res = await apiFetch(`/api/crons/${cronId}`);
          if (!res.ok) return { success: false, error: 'Cron not found in database after creation' };
          return { success: true, result: { verified: true, type: 'cron', id: cronId } };
        }
        if (runStep?.result) {
          const runId = (runStep.result as any).runId;
          const res = await fetch(`/api/runs/${runId}`);
          if (!res.ok) return { success: false, error: 'Run not found in database after creation' };
          return { success: true, result: { verified: true, type: 'run', id: runId } };
        }
        return { success: true, result: { verified: true } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    case 'report': {
      try {
        const completedTypes = completedSteps?.map(s => s.type) || [];
        const resourceId = completedSteps?.find(s => s.result && (s.result as any).taskId || (s.result as any)?.cronId || (s.result as any)?.runId)?.result;
        await fetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'command_completed',
            source: 'command_surface',
            payload: {
              prompt,
              mode,
              steps_completed: completedTypes,
              resource: resourceId || null
            }
          })
        });
        return { success: true, result: { reported: true } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    default:
      return { success: false, error: 'Unknown step type' };
  }
}
