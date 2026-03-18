import {
  createCommandStreamJob,
  publishCommandStreamEvent,
  setJobRunId,
} from "@/lib/command-surface/stream-broker";
import { dispatchOpenClawTask } from "@/lib/openclaw/client";
import { mergeRunTrace } from "@/lib/runs/trace";
import { WorkspaceAgentStudioService } from "@/lib/workspace-agent/studio";

type AccessClient = {
  from: (...args: any[]) => any;
};

export async function dispatchWorkspaceThreadTask(args: {
  accessClient: AccessClient;
  workspaceId: string;
  userId: string;
  requestUrl: string;
  thread: {
    id: string;
    title: string;
    entity_type: "workspace" | "page" | "database";
    entity_id: string | null;
    agent_id: string | null;
  };
  content: string;
  agentId?: string | null;
  aiUseCase: "workspace_plan" | "workspace_execute" | "workspace_review";
  additionalContext?: Record<string, unknown>;
}) {
  const studio = new WorkspaceAgentStudioService(args.accessClient);
  const jobId = createCommandStreamJob(args.userId);
  const prepared = await studio.createRunWithThreadMessages(
    args.workspaceId,
    args.userId,
    {
      threadId: args.thread.id,
      agentId: args.agentId ?? args.thread.agent_id,
      task: args.content,
      useCase: args.aiUseCase,
      entityType: args.thread.entity_type,
      entityId: args.thread.entity_id,
      jobId,
      additionalContext: args.additionalContext,
    },
  );

  await setJobRunId(jobId, prepared.run_id);
  publishCommandStreamEvent(jobId, {
    type: "status_update",
    status: "queued",
    message: "Queued for OpenClaw",
    timestamp: new Date().toISOString(),
  });

  const callbackUrl = new URL(
    "/api/openclaw/callback",
    args.requestUrl,
  ).toString();

  try {
    const dispatchResult = await dispatchOpenClawTask({
      agentId: args.agentId ?? args.thread.agent_id ?? "cofounder",
      task: args.content,
      correlationId: prepared.run_id,
      callbackUrl,
      title: `Workspace thread ${args.thread.title}`,
      context: {
        source: "workspace_thread",
        workspace_id: args.workspaceId,
        actor_user_id: args.userId,
        agent_id: args.agentId ?? args.thread.agent_id ?? null,
        ai_use_case: args.aiUseCase,
        thread_id: args.thread.id,
        page_id:
          args.thread.entity_type === "page" ? args.thread.entity_id : null,
        database_id:
          args.thread.entity_type === "database" ? args.thread.entity_id : null,
        scope: {
          entity_type: args.thread.entity_type,
          entity_id: args.thread.entity_id,
        },
        additional_context: args.additionalContext ?? {},
      },
    });

    await mergeRunTrace(args.accessClient as any, prepared.run_id, {
      openclaw: {
        correlation_id: dispatchResult.correlationId,
        gateway_run_id: dispatchResult.runId,
        agent_id: args.agentId ?? args.thread.agent_id ?? null,
        status: dispatchResult.status,
        last_event_at: new Date().toISOString(),
        dispatch_kind: "workspace_thread",
      },
    });

    return {
      run_id: prepared.run_id,
      job_id: jobId,
      user_message: prepared.user_message,
      assistant_message: prepared.assistant_message,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenClaw dispatch failed";

    await args.accessClient
      .from("agent_thread_messages")
      .update({
        status: "failed",
        content: message,
        metadata: {
          ...prepared.assistant_message.metadata,
          dispatch_error: message,
        },
      })
      .eq("id", prepared.assistant_message.id);

    await mergeRunTrace(
      args.accessClient as any,
      prepared.run_id,
      {
        openclaw: {
          correlation_id: prepared.run_id,
          status: "failed",
          last_error: message,
          last_event_at: new Date().toISOString(),
          dispatch_kind: "workspace_thread",
        },
        command_surface: {
          job_id: jobId,
          stream_state: "error",
          last_stream_event_at: new Date().toISOString(),
          last_error: message,
        },
      },
      {
        status: "failed",
        summary: message,
      },
    );

    publishCommandStreamEvent(jobId, {
      type: "error",
      message,
      timestamp: new Date().toISOString(),
    });
    publishCommandStreamEvent(jobId, {
      type: "done",
      exitCode: 1,
      summary: message,
      timestamp: new Date().toISOString(),
    });

    throw new Error(message);
  }
}
