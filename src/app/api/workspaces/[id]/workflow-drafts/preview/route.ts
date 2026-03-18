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
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";
import {
  buildWorkflowDraftFromIntent,
  buildWorkflowDraftFromJson,
} from "@/lib/workspaces/workflow-drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("mission_prompt"),
    mission_prompt: z.string().max(8000).optional().default(""),
  }),
  z.object({
    mode: z.literal("workflow_json"),
    workflow_json: z.record(z.string(), z.unknown()),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  if (!z.string().uuid().safeParse(workspaceId).success) {
    return invalidUUIDResponse("workspaceId", workspaceId);
  }

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId);
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
          "Invalid workflow draft preview payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const preview =
      parsed.data.mode === "mission_prompt"
        ? buildWorkflowDraftFromIntent(parsed.data.mission_prompt)
        : buildWorkflowDraftFromJson(parsed.data.workflow_json);

    const previewService = new WorkspacePreviewService(accessClient);
    const stored = await previewService.createWorkflowDraftPreview({
      workspaceId,
      userId: user.id,
      mode: parsed.data.mode,
      missionPrompt:
        parsed.data.mode === "mission_prompt" ? parsed.data.mission_prompt : undefined,
      workflowJson:
        parsed.data.mode === "workflow_json" ? parsed.data.workflow_json : undefined,
      preview,
    });

    return mergeAuthResponse(
      successResponse(
        {
          preview_id: stored.preview_id,
          title: preview.title,
          summary: preview.summary,
          trigger_label: preview.triggerLabel,
          step_labels: preview.stepLabels,
          external_effects: preview.externalEffects,
          warnings: preview.warnings,
          effective_mode: preview.effectiveMode,
          risk_tier: preview.riskTier,
          workflow_json: preview.workflowJson,
          supporting_items: preview.supportingItems,
        },
        undefined,
        201,
      ),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to create workflow draft preview",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
