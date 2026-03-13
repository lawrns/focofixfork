import { NextRequest } from "next/server";
import { z } from "zod";
import { mergeAuthResponse } from "@/lib/api/auth-helper";
import {
  databaseErrorResponse,
  invalidUUIDResponse,
  successResponse,
  validationFailedResponse,
} from "@/lib/api/response-helpers";
import { getWorkspaceAgentRouteContext } from "@/lib/workspace-agent/api";
import {
  buildAssistantActionPreview,
  WorkspacePreviewEntityType,
} from "@/lib/workspaces/preview-builders";
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewSchema = z.object({
  request: z.string().trim().min(1).max(12000),
  entity_type: z.enum(["workspace", "page", "database"]),
  entity_id: z.string().uuid().nullable().optional(),
  selection_title: z.string().trim().max(200).optional(),
  agent_id: z.string().trim().max(200).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  if (!z.string().uuid().safeParse(workspaceId).success) {
    return invalidUUIDResponse("workspaceId", workspaceId);
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
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse(
          "Invalid assistant preview payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const entityType = parsed.data.entity_type as WorkspacePreviewEntityType;
    const selectionTitle = parsed.data.selection_title?.trim() || "Workspace";
    const preview = buildAssistantActionPreview(
      parsed.data.request,
      entityType,
      selectionTitle,
    );
    const previewService = new WorkspacePreviewService(accessClient);
    const stored = await previewService.createAssistantActionPreview({
      workspaceId,
      userId: user.id,
      entityType,
      entityId: parsed.data.entity_id ?? null,
      request: parsed.data.request,
      preview,
      applyPayload: {
        request: parsed.data.request,
        agent_id: parsed.data.agent_id ?? null,
      },
      metadata: {
        selection_title: selectionTitle,
        active_agent_id: parsed.data.agent_id ?? null,
      },
    });

    return mergeAuthResponse(
      successResponse(
        {
          preview_id: stored.preview_id,
          request: preview.request,
          plan: preview.plan,
          preview: preview.preview,
          apply_label: preview.applyLabel,
          effective_mode: preview.effectiveMode,
          risk_class: preview.riskClass,
        },
        undefined,
        201,
      ),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to create assistant preview",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
