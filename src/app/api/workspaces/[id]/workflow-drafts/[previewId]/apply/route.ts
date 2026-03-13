import { NextRequest } from "next/server";
import { z } from "zod";
import { mergeAuthResponse } from "@/lib/api/auth-helper";
import {
  badRequestResponse,
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
import { n8nRequest } from "@/lib/n8n/client";
import { canCreateOrUpdateWorkflow } from "@/lib/n8n/governance";
import { supabaseAdmin } from "@/lib/supabase-server";
import { WorkspacePreviewService } from "@/lib/workspaces/workspace-preview-service";
import type { WorkspaceStarterPlanItem } from "@/lib/workspaces/preview-builders";
import { applySupportingAsset } from "@/lib/workspaces/apply-supporting-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const applySchema = z.object({
  supporting_items: z.array(z.any()).optional(),
  owner_agent: z.string().trim().max(200).optional().nullable(),
});

function toWorkflowObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

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

  const contextResult = await getWorkspaceAgentRouteContext(request, workspaceId);
  if (!contextResult.ok) return contextResult.response;

  const {
    context: { authResponse, accessClient, service, user },
  } = contextResult;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return mergeAuthResponse(
        validationFailedResponse(
          "Invalid workflow draft apply payload",
          parsed.error.flatten(),
        ),
        authResponse,
      );
    }

    const previewService = new WorkspacePreviewService(accessClient);
    const preview = await previewService.getPreview(workspaceId, user.id, previewId);

    if (!preview || preview.preview_type !== "workflow_draft") {
      return mergeAuthResponse(notFoundResponse("Workflow draft preview", previewId), authResponse);
    }
    if (preview.status !== "pending") {
      return mergeAuthResponse(
        validationFailedResponse("Preview is no longer pending", {
          preview_id: ["Preview must be pending before it can be applied."],
        }),
        authResponse,
      );
    }

    const workflow = toWorkflowObject(preview.apply_payload.workflow_json);
    if (!workflow) {
      return mergeAuthResponse(badRequestResponse("workflow_json is required"), authResponse);
    }

    const repo = new WorkspaceRepository(accessClient as any);
    const adminAccess = await repo.hasAdminAccess(workspaceId, user.id);
    if (isError(adminAccess) || !adminAccess.data) {
      return mergeAuthResponse(
        forbiddenResponse("Admin access is required to provision workflow drafts"),
        authResponse,
      );
    }

    const ownerAgent =
      parsed.data.owner_agent ??
      (typeof preview.metadata.active_agent_id === "string" ? preview.metadata.active_agent_id : null) ??
      "cofounder";

    const governance = canCreateOrUpdateWorkflow({
      ownerAgent,
      riskTier:
        typeof preview.preview_data.riskTier === "string"
          ? (preview.preview_data.riskTier as "low" | "medium" | "high")
          : "low",
      hasExternalMessaging: Array.isArray(preview.preview_data.externalEffects)
        ? (preview.preview_data.externalEffects as unknown[]).length > 0
        : false,
      hasFinancialAction: false,
      forceActivate: false,
    });
    if (!governance.allowed) {
      return mergeAuthResponse(
        forbiddenResponse(governance.reason ?? "Governance denied workflow creation"),
        authResponse,
      );
    }

    const enforcedTags = new Set<string>([
      "source:workspace_mission",
      "state:draft",
      `owner_agent:${ownerAgent}`,
      `workspace:${workspaceId}`,
    ]);
    const incomingTags = Array.isArray(workflow.tags) ? workflow.tags : [];
    for (const tag of incomingTags) {
      if (typeof tag === "string") enforcedTags.add(tag);
      if (tag && typeof tag === "object" && "name" in tag && typeof tag.name === "string") {
        enforcedTags.add(tag.name);
      }
    }

    const created = await n8nRequest<Record<string, any>>("/api/v1/workflows", {
      method: "POST",
      body: {
        ...workflow,
        active: false,
        tags: Array.from(enforcedTags).map((name) => ({ name })),
      },
    });

    const workflowId = String(created.id ?? "");
    const workflowName = String(
      created.name ??
        preview.preview_data.title ??
        "Workspace workflow draft",
    );

    let automationJobId: string | null = null;
    if (workflowId && supabaseAdmin) {
      const { data: job, error: upsertErr } = await supabaseAdmin
        .from("automation_jobs")
        .upsert(
          {
            external_id: workflowId,
            name: workflowName,
            description:
              typeof preview.preview_data.summary === "string"
                ? preview.preview_data.summary
                : null,
            job_type: "event_triggered",
            enabled: false,
            handler: `n8n.workflow.${workflowId}`,
            payload: {},
            policy: {
              draft_first: true,
              risk_tier: preview.preview_data.riskTier ?? "low",
            },
            workspace_id: workspaceId,
            metadata: {
              owner_agent: ownerAgent,
              source: "workspace_workflow_draft",
              preview_id: previewId,
            },
            last_status: "pending",
          },
          { onConflict: "external_id" },
        )
        .select("id")
        .single();

      if (upsertErr) {
        throw new Error(`Workflow created but automation job sync failed: ${upsertErr.message}`);
      }
      automationJobId = job?.id ?? null;
    }

    const supportingItems = (parsed.data.supporting_items ??
      (preview.apply_payload.supporting_items as WorkspaceStarterPlanItem[] | undefined) ??
      []) as WorkspaceStarterPlanItem[];

    const studioService = new WorkspaceAgentStudioService(accessClient);
    const supportingResults: Array<Record<string, unknown>> = [];
    for (const item of supportingItems.filter((entry) => entry.status !== "applied")) {
      supportingResults.push(
        await applySupportingAsset({
          workspaceId,
          userId: user.id,
          activeAgentId: ownerAgent,
          item,
          pageService: service,
          studioService,
        }),
      );
    }

    await previewService.markApplied(workspaceId, user.id, previewId, {
      workflow_id: workflowId,
      automation_job_id: automationJobId,
      owner_agent: ownerAgent,
    });

    return mergeAuthResponse(
      successResponse({
        workflow_id: workflowId,
        workflow_name: workflowName,
        automation_job_id: automationJobId,
        supporting_results: supportingResults,
      }),
      authResponse,
    );
  } catch (error) {
    return mergeAuthResponse(
      databaseErrorResponse(
        "Failed to apply workflow draft",
        error instanceof Error ? error.message : error,
      ),
      authResponse,
    );
  }
}
