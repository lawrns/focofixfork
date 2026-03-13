"use client";

export type WorkspaceRecord = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type PageRecord = {
  id: string;
  parent_id: string | null;
  title: string;
  updated_at: string | null;
  created_at: string | null;
  project_id: string | null;
};

export type BlockRecord = {
  id?: string;
  block_type: string;
  plain_text: string | null;
  props: Record<string, unknown>;
  position?: number;
};

export type DatabaseProperty = {
  id: string;
  name: string;
  type: string;
  options?: string[];
};

export type DatabaseRecord = {
  id: string;
  parent_doc_id: string | null;
  title: string;
  description: string | null;
  schema: DatabaseProperty[];
  updated_at: string | null;
};

export type PageState = {
  page: PageRecord & { content?: string | null };
  blocks: BlockRecord[];
  databases: DatabaseRecord[];
};

export type DatabaseRowRecord = {
  id?: string;
  position?: number;
  properties: Record<string, unknown>;
};

export type DatabaseState = {
  database: DatabaseRecord;
  rows: DatabaseRowRecord[];
};

export type SearchResult = {
  entity_type: string;
  entity_id: string;
  parent_entity_type: string | null;
  parent_entity_id: string | null;
  plain_text: string;
  metadata: Record<string, unknown>;
};

export type ThreadRecord = {
  id: string;
  entity_type: "workspace" | "page" | "database";
  entity_id: string | null;
  title: string;
  status: "open" | "paused" | "closed";
  agent_id: string | null;
  last_message_at: string;
};

export type ThreadMessageRecord = {
  id: string;
  role: "user" | "assistant" | "system" | "event";
  content: string;
  status: "posted" | "pending" | "running" | "completed" | "failed";
  run_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type ConnectorRecord = {
  id: string;
  provider: "slack" | "mail" | "gmail";
  label: string;
  status: "connected" | "paused" | "error" | "disconnected";
  capabilities: string[];
  config: Record<string, unknown>;
  last_error: string | null;
};

export type AutomationRunRecord = {
  id: string;
  status: string;
  trigger_type: string;
  created_at: string;
  error: string | null;
};

export type AutomationRecord = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type:
    | "manual"
    | "schedule"
    | "page_updated"
    | "database_row_updated"
    | "workspace_event";
  event_name: string | null;
  schedule: string | null;
  entity_type: "workspace" | "page" | "database";
  entity_id: string | null;
  prompt: string;
  agent_id: string | null;
  writeback_mode: string | null;
  last_status: string | null;
  latest_run: AutomationRunRecord | null;
};

export type AgentOption = {
  id: string;
  name: string;
  role: string;
  kind: "system" | "advisor" | "custom";
};

export type RevisionRecord = {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
};

export type AutomationDraft = {
  name: string;
  description: string;
  trigger_type: AutomationRecord["trigger_type"];
  event_name: string;
  schedule: string;
  prompt: string;
  writeback_mode: string;
  agent_id: string;
};

export type ConnectorDraft = {
  provider: ConnectorRecord["provider"];
  label: string;
  capabilities: string;
  default_channel: string;
  webhook_url: string;
  from_name: string;
  from_email: string;
  reply_to: string;
};

export type StudioTab = "assist" | "activity" | "automations" | "integrations";
export type WorkflowDraftInputMode = "mission_prompt" | "workflow_json";

export type StarterPlanItemKind =
  | "page"
  | "database"
  | "connector"
  | "automation";

export type StarterPlanItem = {
  id: string;
  kind: StarterPlanItemKind;
  title: string;
  detail: string;
  provider?: ConnectorRecord["provider"];
  capabilities?: string[];
  triggerType?: AutomationRecord["trigger_type"];
  schedule?: string;
  prompt?: string;
  status: "draft" | "applied";
};

export type PreparedAssistantAction = {
  previewId: string;
  request: string;
  plan: string[];
  preview: string[];
  applyLabel: string;
  effectiveMode: "manual" | "semi_auto" | "full_auto";
  riskClass: "low" | "medium" | "high";
};

export type ResumeTarget = {
  href: string;
  label: string;
  entityType: "page" | "database";
};

export type WorkflowDraftPreview = {
  previewId: string;
  title: string;
  summary: string;
  triggerLabel: string;
  stepLabels: string[];
  externalEffects: string[];
  warnings: string[];
  effectiveMode: "manual" | "semi_auto" | "full_auto";
  riskTier: "low" | "medium" | "high";
  workflowJson: Record<string, unknown>;
  supportingItems: StarterPlanItem[];
};
