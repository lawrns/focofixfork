import { NextRequest } from "next/server";
import { z } from "zod";
import { mergeAuthResponse } from "@/lib/api/auth-helper";
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  isValidUUID,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from "@/lib/api/response-helpers";
import { getWorkspaceAgentRouteContext } from "@/lib/workspace-agent/api";
import { WorkspaceAgentStudioService } from "@/lib/workspace-agent/studio";
import { dispatchWorkspaceThreadTask } from "@/lib/workspaces/workspace-thread-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const postMessageSchema = z.object({
  content: z.string().trim().min(1).max(12000),
  agent_id: z.string().min(1).max(200).nullable().optional(),
  ai_use_case: z
    .enum(["workspace_plan", "workspace_execute", "workspace_review"])
    .default("workspace_execute"),
  additional_context: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id: workspaceId, threadId } = await params;
  if (!isValidUUID(workspaceId))
    return invalidUUIDResponse("workspaceId", workspaceId);
  if (!isValidUUID(threadId)) return invalidUUIDResponse("threadId", threadId);

  const contextResult = await getWorkspaceAgentRouteContext(
    request,
    workspaceId,
  );
  if (!contextResult.ok) return contextResult.response;

  const {
    context: { authResponse, accessClient },
  } = contextResult;

  try {
    const studio = new WorkspaceAgentStudioService(accessClient);
    const thread = await studio.getThread(workspaceId, threadId);
    if (!thread)
      return mergeAuthResponse(
        notFoundResponse("Thread", threadId),
        authResponse,
      );

    const messages = await studio.listThreadMessages(workspaceId, threadId);
    return mergeAuthResponse(
      successResponse({ thread, messages, count: messages.length }),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to fetch thread messages",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id: workspaceId, threadId } = await params;
  if (!isValidUUID(workspaceId))
    return invalidUUIDResponse("workspaceId", workspaceId);
  if (!isValidUUID(threadId)) return invalidUUIDResponse("threadId", threadId);

  const contextResult = await getWorkspaceAgentRouteContext(
    request,
    workspaceId,
  );
  if (!contextResult.ok) return contextResult.response;

  const {
    context: { authResponse, accessClient, user },
  } = contextResult;

  try {
    const body = await request.json().catch(() => null);
    const parsed = postMessageSchema.safeParse(body);
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse(
          "Invalid thread message payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const studio = new WorkspaceAgentStudioService(accessClient);
    const thread = await studio.getThread(workspaceId, threadId);
    if (!thread)
      return mergeAuthResponse(
        notFoundResponse("Thread", threadId),
        authResponse,
      );

    try {
      const dispatchResult = await dispatchWorkspaceThreadTask({
        accessClient,
        workspaceId,
        userId: user.id,
        requestUrl: request.url,
        thread,
        content: parsed.data.content,
        agentId: parsed.data.agent_id ?? thread.agent_id,
        aiUseCase: parsed.data.ai_use_case,
        additionalContext: parsed.data.additional_context,
      });

      return mergeAuthResponse(
        successResponse(
          {
            thread,
            run_id: dispatchResult.run_id,
            job_id: dispatchResult.job_id,
            user_message: dispatchResult.user_message,
            assistant_message: dispatchResult.assistant_message,
          },
          undefined,
          201,
        ),
        authResponse,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OpenClaw dispatch failed";

      return mergeAuthResponse(
        databaseErrorResponse(
          "Failed to dispatch workspace thread run",
          message,
        ),
        authResponse,
      );
    }
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to create thread message",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
