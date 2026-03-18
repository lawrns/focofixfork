export type WorkspacePreviewEntityType = "workspace" | "page" | "database";
export type OperatorExecutionMode = "manual" | "semi_auto" | "full_auto";
export type WorkspaceStarterPlanItemKind =
  | "page"
  | "database"
  | "connector"
  | "automation";
export type WorkspaceConnectorProvider = "slack" | "mail" | "gmail";

export interface WorkspaceStarterPlanItem {
  id: string;
  kind: WorkspaceStarterPlanItemKind;
  title: string;
  detail: string;
  provider?: WorkspaceConnectorProvider;
  capabilities?: string[];
  triggerType?:
    | "manual"
    | "schedule"
    | "page_updated"
    | "database_row_updated"
    | "workspace_event";
  schedule?: string;
  prompt?: string;
  status: "draft" | "applied";
}

export interface WorkspaceStarterPlanPreview {
  rationale: string;
  warnings: string[];
  effectiveMode: OperatorExecutionMode;
  items: WorkspaceStarterPlanItem[];
}

export interface WorkspaceAssistantActionPreview {
  request: string;
  plan: string[];
  preview: string[];
  applyLabel: string;
  effectiveMode: OperatorExecutionMode;
  riskClass: "low" | "medium" | "high";
}

function createLocalId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export function buildStarterPlanItems(
  intent: string,
): WorkspaceStarterPlanItem[] {
  const normalized = intent.trim().toLowerCase();
  const items: WorkspaceStarterPlanItem[] = [];

  const pushItem = (item: Omit<WorkspaceStarterPlanItem, "id" | "status">) => {
    items.push({
      id: createLocalId(item.kind, items.length),
      status: "draft",
      ...item,
    });
  };

  if (!normalized) {
    pushItem({
      kind: "page",
      title: "Workspace brief",
      detail:
        "Outline the mission, operating principles, and the first working agreements for this workspace.",
    });
    pushItem({
      kind: "database",
      title: "Operating queue",
      detail:
        "Track the structured work this workspace needs to handle every day.",
    });
    pushItem({
      kind: "automation",
      title: "Weekly review digest",
      detail: "Summarize important changes and unresolved work every week.",
      triggerType: "schedule",
      schedule: "0 9 * * 1",
      prompt:
        "Summarize important workspace changes and unresolved work for the weekly review.",
    });
    return items;
  }

  if (normalized.includes("support")) {
    pushItem({
      kind: "page",
      title: "Support operating guide",
      detail:
        "Document intake rules, escalation paths, and response standards.",
    });
    pushItem({
      kind: "database",
      title: "Incoming issues",
      detail: "Track issue priority, owner, status, and promised follow-up.",
    });
    pushItem({
      kind: "connector",
      title: "Slack support channel",
      detail:
        "Prepare a Slack connector for issue intake and response summaries.",
      provider: "slack",
      capabilities: ["search", "send", "summarize"],
    });
    pushItem({
      kind: "automation",
      title: "Daily unresolved issues digest",
      detail: "Summarize unresolved issues and route them to the right owner.",
      triggerType: "schedule",
      schedule: "0 9 * * 1-5",
      prompt:
        "Review unresolved support issues, summarize blockers, and prepare a daily digest for the team.",
    });
  }

  if (normalized.includes("crm") || normalized.includes("sales")) {
    pushItem({
      kind: "page",
      title: "Revenue playbook",
      detail:
        "Capture qualification rules, pipeline stages, and operating notes.",
    });
    pushItem({
      kind: "database",
      title: "Pipeline tracker",
      detail: "Track accounts, stage, value, next step, and owner.",
    });
  }

  if (normalized.includes("hiring")) {
    pushItem({
      kind: "page",
      title: "Hiring process guide",
      detail: "Define stages, interview expectations, and scorecard standards.",
    });
    pushItem({
      kind: "database",
      title: "Candidate pipeline",
      detail: "Track role, stage, interviewer, and final decision.",
    });
  }

  if (normalized.includes("procedure") || normalized.includes("sop")) {
    pushItem({
      kind: "page",
      title: "Operating procedures",
      detail:
        "Turn recurring work into clear SOPs the team can follow and update.",
    });
  }

  if (normalized.includes("slack")) {
    pushItem({
      kind: "connector",
      title: "Slack workspace",
      detail:
        "Prepare a governed Slack connector for searches, drafts, and notifications.",
      provider: "slack",
      capabilities: ["search", "send", "summarize"],
    });
  }

  if (normalized.includes("mail") || normalized.includes("email")) {
    pushItem({
      kind: "connector",
      title: "Mail channel",
      detail:
        "Prepare a mail connector for digests, follow-ups, and outbound updates.",
      provider: "mail",
      capabilities: ["send", "summarize"],
    });
  }

  if (normalized.includes("automation") || normalized.includes("digest")) {
    pushItem({
      kind: "automation",
      title: "Recurring workspace digest",
      detail: "Summarize what changed and what needs attention on a schedule.",
      triggerType: "schedule",
      schedule: "0 9 * * 1-5",
      prompt:
        "Summarize the latest workspace changes and create a concise digest with next actions.",
    });
  }

  if (items.length === 0) {
    pushItem({
      kind: "page",
      title: "Workspace brief",
      detail: `Summarize the goals, workflows, and desired outcomes for: ${intent.trim()}`,
    });
    pushItem({
      kind: "database",
      title: "Operating tracker",
      detail:
        "Track the structured work that should move through this workspace.",
    });
    pushItem({
      kind: "automation",
      title: "Review rhythm",
      detail:
        "Create a recurring review that summarizes progress and open work.",
      triggerType: "schedule",
      schedule: "0 9 * * 1",
      prompt: `Create a recurring review loop for this workspace: ${intent.trim()}`,
    });
  }

  return items;
}

export function buildStarterPlanPreview(
  intent: string,
): WorkspaceStarterPlanPreview {
  const trimmedIntent = intent.trim();
  return {
    rationale: trimmedIntent
      ? `Generated a first structure from the stated workspace intent: "${trimmedIntent}".`
      : "Generated a default workspace operating structure because no explicit intent was provided.",
    warnings: trimmedIntent
      ? []
      : ["Intent was empty, so a default operating structure was used."],
    effectiveMode: "manual",
    items: buildStarterPlanItems(trimmedIntent),
  };
}

export function buildAssistantActionPreview(
  request: string,
  currentEntityType: WorkspacePreviewEntityType,
  currentSelectionTitle: string,
): WorkspaceAssistantActionPreview {
  const scope =
    currentEntityType === "workspace"
      ? "the workspace"
      : currentEntityType === "page"
        ? `the page "${currentSelectionTitle}"`
        : `the database "${currentSelectionTitle}"`;

  return {
    request,
    plan: [
      `Read ${scope} and collect the relevant context.`,
      "Propose a safe set of changes before writing anything.",
      "Apply the approved action and log the result in the activity stream.",
    ],
    preview: [
      currentEntityType === "workspace"
        ? "Expect suggested pages, trackers, connectors, or automations."
        : currentEntityType === "page"
          ? "Expect a rewritten draft, extracted structure, or a suggested automation."
          : "Expect schema improvements, workflow suggestions, or an automation draft.",
      "Any changes should stay reviewable before they become durable.",
    ],
    applyLabel: "Apply with assistant",
    effectiveMode: "manual",
    riskClass: currentEntityType === "workspace" ? "medium" : "low",
  };
}
