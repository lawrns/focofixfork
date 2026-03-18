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
import { buildStarterPlanPreview } from "@/lib/workspaces/preview-builders";
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewSchema = z.object({
  intent: z.string().max(4000).optional().default(""),
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
          "Invalid starter plan preview payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const preview = buildStarterPlanPreview(parsed.data.intent);
    const previewService = new WorkspacePreviewService(accessClient);
    const stored = await previewService.createStarterPlanPreview({
      workspaceId,
      userId: user.id,
      intent: parsed.data.intent,
      preview: {
        rationale: preview.rationale,
        warnings: preview.warnings,
        effectiveMode: preview.effectiveMode,
      },
      items: preview.items,
    });

    return mergeAuthResponse(
      successResponse(
        {
          preview_id: stored.preview_id,
          rationale: preview.rationale,
          warnings: preview.warnings,
          effective_mode: preview.effectiveMode,
          items: preview.items,
        },
        undefined,
        201,
      ),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to create starter plan preview",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
