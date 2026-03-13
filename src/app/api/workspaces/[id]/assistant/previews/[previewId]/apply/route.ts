import { NextRequest } from "next/server";
import { z } from "zod";
import { mergeAuthResponse } from "@/lib/api/auth-helper";
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from "@/lib/api/response-helpers";
import { getWorkspaceAgentRouteContext } from "@/lib/workspace-agent/api";
import { WorkspaceAgentStudioService } from "@/lib/workspace-agent/studio";
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";
import { dispatchWorkspaceThreadTask } from "@/lib/workspaces/workspace-thread-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const applySchema = z.object({
  thread_id: z.string().uuid().nullable().optional(),
  agent_id: z.string().trim().max(200).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; previewId: string }> },
) {
  const { id: workspaceId, previewId } = await params;
  if (!z.string().uuid().safeParse(workspaceId).success) {
    return invalidUUIDResponse("workspaceId", workspaceId);
  }
  if (!z.string().uuid().safeParse(previewId).success) {
    return invalidUUIDResponse("previewId", previewId);
  }

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
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse(
          "Invalid assistant preview apply payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const previewService = new WorkspacePreviewService(accessClient);
    const preview = await previewService.getPreview(
      workspaceId,
      user.id,
      previewId,
    );
    if (!preview || preview.preview_type !== "assistant_action") {
      return mergeAuthResponse(
        notFoundResponse("Workspace preview", previewId),
        authResponse,
      );
    }

    if (preview.status !== "pending") {
      return mergeAuthResponse(
        validationFailedResponse("Preview is no longer pending", {
          preview_id: ["Preview must be pending before it can be applied."],
        }),
        authResponse,
      );
    }

    if (new Date(preview.expires_at).getTime() < Date.now()) {
      return mergeAuthResponse(
        validationFailedResponse("Preview has expired", {
          preview_id: ["Generate a new preview before applying."],
        }),
        authResponse,
      );
    }

    const content =
      typeof preview.apply_payload.request === "string"
        ? preview.apply_payload.request
        : typeof preview.input_data.request === "string"
          ? preview.input_data.request
          : null;

    if (!content) {
      return mergeAuthResponse(
        validationFailedResponse("Preview is missing the assistant request", {
          request: [
            "Assistant preview must include a request before it can be applied.",
          ],
        }),
        authResponse,
      );
    }

    const studio = new WorkspaceAgentStudioService(accessClient);
    let thread = parsed.data.thread_id
      ? await studio.getThread(workspaceId, parsed.data.thread_id)
      : null;

    if (!thread) {
      const selectionTitle =
        typeof preview.metadata.selection_title === "string"
          ? preview.metadata.selection_title
          : "Workspace";
      thread = await studio.createThread(workspaceId, user.id, {
        entity_type: preview.entity_type,
        entity_id: preview.entity_id,
        title: `${selectionTitle} thread`,
        agent_id:
          parsed.data.agent_id ??
          (typeof preview.apply_payload.agent_id === "string"
            ? preview.apply_payload.agent_id
            : null),
        metadata: {
          preview_id: previewId,
        },
      });
    }

    try {
      const dispatchResult = await dispatchWorkspaceThreadTask({
        accessClient,
        workspaceId,
        userId: user.id,
        requestUrl: request.url,
        thread,
        content,
        agentId:
          parsed.data.agent_id ??
          (typeof preview.apply_payload.agent_id === "string"
            ? preview.apply_payload.agent_id
            : null) ??
          thread.agent_id,
        aiUseCase: "workspace_execute",
        additionalContext: {
          preview_id: previewId,
          preview_type: preview.preview_type,
        },
      });

      await previewService.markApplied(workspaceId, user.id, previewId, {
        ...preview.metadata,
        thread_id: thread.id,
        run_id: dispatchResult.run_id,
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
        error instanceof Error
          ? error.message
          : "Failed to dispatch assistant preview";
      await previewService.markFailed(
        workspaceId,
        user.id,
        previewId,
        message,
        {
          ...preview.metadata,
          thread_id: thread.id,
        },
      );
      return mergeAuthResponse(
        databaseErrorResponse("Failed to apply assistant preview", message),
        authResponse,
      );
    }
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to apply assistant preview",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
