import { NextRequest } from "next/server";
import { z } from "zod";
import { mergeAuthResponse } from "@/lib/api/auth-helper";
import {
  databaseErrorResponse,
  forbiddenResponse,
  invalidUUIDResponse,
  notFoundResponse,
  successResponse,
  validationFailedResponse,
} from "@/lib/api/response-helpers";
import { isError } from "@/lib/repositories/base-repository";
import { WorkspaceRepository } from "@/lib/repositories/workspace-repository";
import { getWorkspaceAgentRouteContext } from "@/lib/workspace-agent/api";
import { WorkspaceAgentStudioService } from "@/lib/workspace-agent/studio";
import { WorkspaceStarterPlanItem } from "@/lib/workspaces/preview-builders";
import { applySupportingAsset } from "@/lib/workspaces/apply-supporting-assets";
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const starterPlanItemSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["page", "database", "connector", "automation"]),
  title: z.string().trim().min(1).max(200),
  detail: z.string().trim().min(1).max(4000),
  provider: z.enum(["slack", "mail", "gmail"]).optional(),
  capabilities: z.array(z.string().min(1).max(100)).optional(),
  triggerType: z
    .enum([
      "manual",
      "schedule",
      "page_updated",
      "database_row_updated",
      "workspace_event",
    ])
    .optional(),
  schedule: z.string().trim().max(120).optional(),
  prompt: z.string().trim().max(8000).optional(),
  status: z.enum(["draft", "applied"]).default("draft"),
});

const applySchema = z.object({
  preview_id: z.string().uuid(),
  items: z.array(starterPlanItemSchema).optional(),
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
    context: { authResponse, accessClient, service, user },
  } = contextResult;

  try {
    const body = await request.json().catch(() => null);
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse(
          "Invalid starter plan apply payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const previewService = new WorkspacePreviewService(accessClient);
    const preview = await previewService.getPreview(
      workspaceId,
      user.id,
      parsed.data.preview_id,
    );

    if (!preview || preview.preview_type !== "starter_plan") {
      return mergeAuthResponse(
        notFoundResponse("Workspace preview", parsed.data.preview_id),
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

    const items = (
      parsed.data.items ??
      (preview.apply_payload.items as WorkspaceStarterPlanItem[] | undefined) ??
      []
    ).filter((item) => item.status !== "applied");

    const requiresAdmin = items.some(
      (item) => item.kind === "connector" || item.kind === "automation",
    );
    if (requiresAdmin) {
      const repo = new WorkspaceRepository(accessClient as any);
      const adminAccess = await repo.hasAdminAccess(workspaceId, user.id);
      if (isError(adminAccess) || !adminAccess.data) {
        return mergeAuthResponse(
          forbiddenResponse(
            "Admin access is required to apply connectors or automations",
          ),
          authResponse,
        );
      }
    }

    const studioService = new WorkspaceAgentStudioService(accessClient);
    const activeAgentId =
      typeof preview.metadata.active_agent_id === "string"
        ? preview.metadata.active_agent_id
        : null;

    const results: Array<Record<string, unknown>> = [];
    let failedItemId: string | null = null;

    for (const item of items) {
      try {
        const result = await applySupportingAsset({
          workspaceId,
          userId: user.id,
          activeAgentId,
          item,
          pageService: service,
          studioService,
        });
        results.push(result);
      } catch (error) {
        failedItemId = item.id;
        results.push({
          item_id: item.id,
          kind: item.kind,
          status: "failed",
          error:
            error instanceof Error ? error.message : "Failed to apply item",
        });
        break;
      }
    }

    const appliedAll = failedItemId === null;
    if (appliedAll) {
      await previewService.markApplied(
        workspaceId,
        user.id,
        parsed.data.preview_id,
        {
          ...preview.metadata,
          applied_count: results.filter((item) => item.status === "applied")
            .length,
        },
      );
    } else {
      await previewService.markFailed(
        workspaceId,
        user.id,
        parsed.data.preview_id,
        String(
          results.find((result) => result.status === "failed")?.error ??
            "Starter plan apply failed",
        ),
        {
          ...preview.metadata,
          failed_item_id: failedItemId,
        },
      );
    }

    return mergeAuthResponse(
      successResponse({
        preview_id: parsed.data.preview_id,
        status: appliedAll ? "applied" : "failed",
        results,
        failed_item_id: failedItemId,
      }),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to apply starter plan preview",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
