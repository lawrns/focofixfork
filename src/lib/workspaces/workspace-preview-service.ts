import fs from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WorkspaceAssistantActionPreview,
  WorkspacePreviewEntityType,
  WorkspaceStarterPlanItem,
} from "@/lib/workspaces/preview-builders";
import type { WorkspaceWorkflowDraftPreview } from "@/lib/workspaces/workflow-drafts";

type DataClient = Pick<SupabaseClient, "from">;

type PreviewStatus = "pending" | "applied" | "expired" | "failed";
type PreviewType = "starter_plan" | "assistant_action" | "workflow_draft";

type PreviewRow = {
  id: string;
  preview_id: string;
  workspace_id: string;
  user_id: string;
  preview_type: PreviewType;
  entity_type: WorkspacePreviewEntityType;
  entity_id: string | null;
  status: PreviewStatus;
  input_data: Record<string, unknown>;
  preview_data: Record<string, unknown>;
  apply_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  applied_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
};

type PreviewStoreFile = {
  previews: PreviewRow[];
};

const PREVIEW_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "workspace-action-previews.json",
);

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeRow(row: Record<string, unknown>): PreviewRow {
  return {
    id: String(row.id),
    preview_id: String(row.preview_id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    preview_type: String(row.preview_type) as PreviewType,
    entity_type: String(row.entity_type) as WorkspacePreviewEntityType,
    entity_id: safeString(row.entity_id),
    status: String(row.status ?? "pending") as PreviewStatus,
    input_data: toRecord(row.input_data),
    preview_data: toRecord(row.preview_data),
    apply_payload: toRecord(row.apply_payload),
    metadata: toRecord(row.metadata),
    created_at: safeString(row.created_at) ?? new Date(0).toISOString(),
    expires_at: safeString(row.expires_at) ?? new Date(0).toISOString(),
    applied_at: safeString(row.applied_at),
    failed_at: safeString(row.failed_at),
    failure_reason: safeString(row.failure_reason),
  };
}

function isMissingPreviewTableError(message: string): boolean {
  return (
    message.includes("workspace_action_previews") &&
    message.toLowerCase().includes("could not find the table")
  );
}

async function readPreviewStore(): Promise<PreviewStoreFile> {
  try {
    const raw = await fs.readFile(PREVIEW_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PreviewStoreFile;
    return { previews: Array.isArray(parsed.previews) ? parsed.previews : [] };
  } catch {
    return { previews: [] };
  }
}

async function writePreviewStore(store: PreviewStoreFile): Promise<void> {
  await fs.mkdir(path.dirname(PREVIEW_STORE_PATH), { recursive: true });
  await fs.writeFile(PREVIEW_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export class WorkspacePreviewService {
  constructor(private readonly client: DataClient) {}

  private buildFallbackRow(input: {
    workspaceId: string;
    userId: string;
    previewType: PreviewType;
    entityType: WorkspacePreviewEntityType;
    entityId?: string | null;
    inputData: Record<string, unknown>;
    previewData: Record<string, unknown>;
    applyPayload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): PreviewRow {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      preview_id: crypto.randomUUID(),
      workspace_id: input.workspaceId,
      user_id: input.userId,
      preview_type: input.previewType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      status: "pending",
      input_data: input.inputData,
      preview_data: input.previewData,
      apply_payload: input.applyPayload,
      metadata: input.metadata ?? {},
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      applied_at: null,
      failed_at: null,
      failure_reason: null,
    };
  }

  private async createFallbackPreview(row: PreviewRow): Promise<PreviewRow> {
    const store = await readPreviewStore();
    store.previews = [
      ...store.previews.filter((existing) => existing.preview_id !== row.preview_id),
      row,
    ];
    await writePreviewStore(store);
    return row;
  }

  private async getFallbackPreview(
    workspaceId: string,
    userId: string,
    previewId: string,
  ): Promise<PreviewRow | null> {
    const store = await readPreviewStore();
    return (
      store.previews.find(
        (row) =>
          row.workspace_id === workspaceId &&
          row.user_id === userId &&
          row.preview_id === previewId,
      ) ?? null
    );
  }

  private async updateFallbackPreview(
    workspaceId: string,
    userId: string,
    previewId: string,
    updater: (row: PreviewRow) => PreviewRow,
  ): Promise<void> {
    const store = await readPreviewStore();
    const index = store.previews.findIndex(
      (row) =>
        row.workspace_id === workspaceId &&
        row.user_id === userId &&
        row.preview_id === previewId,
    );
    if (index === -1) {
      throw new Error("Failed to update preview fallback store: preview not found");
    }
    store.previews[index] = updater(store.previews[index]);
    await writePreviewStore(store);
  }

  async createStarterPlanPreview(input: {
    workspaceId: string;
    userId: string;
    intent: string;
    preview: Record<string, unknown>;
    items: WorkspaceStarterPlanItem[];
    metadata?: Record<string, unknown>;
  }): Promise<PreviewRow> {
    const { data, error } = await this.client
      .from("workspace_action_previews")
      .insert({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        preview_type: "starter_plan",
        entity_type: "workspace",
        entity_id: null,
        input_data: { intent: input.intent },
        preview_data: input.preview,
        apply_payload: { items: input.items },
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error?.message && isMissingPreviewTableError(error.message)) {
        return this.createFallbackPreview(
          this.buildFallbackRow({
            workspaceId: input.workspaceId,
            userId: input.userId,
            previewType: "starter_plan",
            entityType: "workspace",
            inputData: { intent: input.intent },
            previewData: input.preview,
            applyPayload: { items: input.items },
            metadata: input.metadata,
          }),
        );
      }
      throw new Error(
        `Failed to create starter plan preview: ${error?.message ?? "unknown error"}`,
      );
    }

    return normalizeRow(data as Record<string, unknown>);
  }

  async createAssistantActionPreview(input: {
    workspaceId: string;
    userId: string;
    entityType: WorkspacePreviewEntityType;
    entityId?: string | null;
    request: string;
    preview: WorkspaceAssistantActionPreview;
    applyPayload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<PreviewRow> {
    const { data, error } = await this.client
      .from("workspace_action_previews")
      .insert({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        preview_type: "assistant_action",
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        input_data: { request: input.request },
        preview_data: input.preview,
        apply_payload: input.applyPayload ?? {},
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error?.message && isMissingPreviewTableError(error.message)) {
        return this.createFallbackPreview(
          this.buildFallbackRow({
            workspaceId: input.workspaceId,
            userId: input.userId,
            previewType: "assistant_action",
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            inputData: { request: input.request },
            previewData: input.preview as unknown as Record<string, unknown>,
            applyPayload: input.applyPayload ?? {},
            metadata: input.metadata,
          }),
        );
      }
      throw new Error(
        `Failed to create assistant action preview: ${error?.message ?? "unknown error"}`,
      );
    }

    return normalizeRow(data as Record<string, unknown>);
  }

  async createWorkflowDraftPreview(input: {
    workspaceId: string;
    userId: string;
    mode: "mission_prompt" | "workflow_json";
    missionPrompt?: string;
    workflowJson?: Record<string, unknown>;
    preview: WorkspaceWorkflowDraftPreview;
    metadata?: Record<string, unknown>;
  }): Promise<PreviewRow> {
    const { data, error } = await this.client
      .from("workspace_action_previews")
      .insert({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        preview_type: "workflow_draft",
        entity_type: "workspace",
        entity_id: null,
        input_data: {
          mode: input.mode,
          mission_prompt: input.missionPrompt ?? "",
          workflow_json: input.workflowJson ?? null,
        },
        preview_data: {
          title: input.preview.title,
          summary: input.preview.summary,
          triggerLabel: input.preview.triggerLabel,
          stepLabels: input.preview.stepLabels,
          externalEffects: input.preview.externalEffects,
          warnings: input.preview.warnings,
          effectiveMode: input.preview.effectiveMode,
          riskTier: input.preview.riskTier,
          workflowJson: input.preview.workflowJson,
        },
        apply_payload: {
          workflow_json: input.preview.workflowJson,
          supporting_items: input.preview.supportingItems,
        },
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error?.message && isMissingPreviewTableError(error.message)) {
        return this.createFallbackPreview(
          this.buildFallbackRow({
            workspaceId: input.workspaceId,
            userId: input.userId,
            previewType: "workflow_draft",
            entityType: "workspace",
            inputData: {
              mode: input.mode,
              mission_prompt: input.missionPrompt ?? "",
              workflow_json: input.workflowJson ?? null,
            },
            previewData: {
              title: input.preview.title,
              summary: input.preview.summary,
              triggerLabel: input.preview.triggerLabel,
              stepLabels: input.preview.stepLabels,
              externalEffects: input.preview.externalEffects,
              warnings: input.preview.warnings,
              effectiveMode: input.preview.effectiveMode,
              riskTier: input.preview.riskTier,
              workflowJson: input.preview.workflowJson,
            },
            applyPayload: {
              workflow_json: input.preview.workflowJson,
              supporting_items: input.preview.supportingItems,
            },
            metadata: input.metadata,
          }),
        );
      }
      throw new Error(
        `Failed to create workflow draft preview: ${error?.message ?? "unknown error"}`,
      );
    }

    return normalizeRow(data as Record<string, unknown>);
  }

  async getPreview(
    workspaceId: string,
    userId: string,
    previewId: string,
  ): Promise<PreviewRow | null> {
    const { data, error } = await this.client
      .from("workspace_action_previews")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("preview_id", previewId)
      .maybeSingle();

    if (error) {
      if (isMissingPreviewTableError(error.message)) {
        return this.getFallbackPreview(workspaceId, userId, previewId);
      }
      throw new Error(`Failed to fetch workspace preview: ${error.message}`);
    }

    if (!data) return null;
    return normalizeRow(data as Record<string, unknown>);
  }

  async markApplied(
    workspaceId: string,
    userId: string,
    previewId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.client
      .from("workspace_action_previews")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
        metadata: metadata ?? {},
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("preview_id", previewId);

    if (error) {
      if (isMissingPreviewTableError(error.message)) {
        return this.updateFallbackPreview(workspaceId, userId, previewId, (row) => ({
          ...row,
          status: "applied",
          applied_at: new Date().toISOString(),
          metadata: metadata ?? {},
        }));
      }
      throw new Error(`Failed to mark preview applied: ${error.message}`);
    }
  }

  async markFailed(
    workspaceId: string,
    userId: string,
    previewId: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.client
      .from("workspace_action_previews")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_reason: reason,
        metadata: metadata ?? {},
      })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("preview_id", previewId);

    if (error) {
      if (isMissingPreviewTableError(error.message)) {
        return this.updateFallbackPreview(workspaceId, userId, previewId, (row) => ({
          ...row,
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_reason: reason,
          metadata: metadata ?? {},
        }));
      }
      throw new Error(`Failed to mark preview failed: ${error.message}`);
    }
  }
}
