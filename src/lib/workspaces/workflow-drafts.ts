import { buildStarterPlanItems, type OperatorExecutionMode, type WorkspaceStarterPlanItem } from "@/lib/workspaces/preview-builders";

export type WorkflowDraftInputMode = "mission_prompt" | "workflow_json";
export type WorkflowDraftRiskTier = "low" | "medium" | "high";

export type WorkspaceWorkflowDraftPreview = {
  title: string;
  summary: string;
  triggerLabel: string;
  stepLabels: string[];
  externalEffects: string[];
  warnings: string[];
  effectiveMode: OperatorExecutionMode;
  riskTier: WorkflowDraftRiskTier;
  workflowJson: Record<string, unknown>;
  supportingItems: WorkspaceStarterPlanItem[];
};

type N8nNode = {
  id?: string;
  name?: string;
  type?: string;
  parameters?: Record<string, unknown>;
};

function titleFromIntent(intent: string) {
  const trimmed = intent.trim();
  if (!trimmed) return "Mission plan";
  return trimmed.length > 72 ? `${trimmed.slice(0, 69).trim()}...` : trimmed;
}

function inferTriggerLabel(nodes: N8nNode[]) {
  const first = nodes[0];
  const type = String(first?.type ?? "");
  if (type.includes("schedule")) return "schedule";
  if (type.includes("webhook")) return "webhook";
  if (type.includes("slack")) return "slack event";
  if (type.includes("gmail") || type.includes("email") || type.includes("mail")) return "mail event";
  return "manual";
}

function inferRiskTier(nodes: N8nNode[]): WorkflowDraftRiskTier {
  const haystack = nodes
    .map((node) => `${node.name ?? ""} ${node.type ?? ""}`)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("delete") || haystack.includes("payment") || haystack.includes("finance")) return "high";
  if (
    haystack.includes("httprequest") ||
    haystack.includes("webhook") ||
    haystack.includes("gmail") ||
    haystack.includes("slack")
  ) {
    return "medium";
  }
  return "low";
}

function collectExternalEffects(nodes: N8nNode[]) {
  return nodes
    .filter((node) => {
      const type = String(node.type ?? "").toLowerCase();
      return (
        type.includes("httprequest") ||
        type.includes("webhook") ||
        type.includes("slack") ||
        type.includes("gmail") ||
        type.includes("email") ||
        type.includes("mail")
      );
    })
    .map((node) => String(node.name ?? node.type ?? "External effect"));
}

function validateWorkflowJson(workflowJson: Record<string, unknown>) {
  const warnings: string[] = [];
  const nodes = Array.isArray(workflowJson.nodes)
    ? (workflowJson.nodes as Array<Record<string, unknown>>).map((node) => ({
        id: typeof node.id === "string" ? node.id : undefined,
        name: typeof node.name === "string" ? node.name : undefined,
        type: typeof node.type === "string" ? node.type : undefined,
        parameters: typeof node.parameters === "object" && node.parameters ? (node.parameters as Record<string, unknown>) : undefined,
      }))
    : [];

  if (nodes.length === 0) {
    throw new Error("Workflow JSON must include a non-empty nodes array.");
  }

  if (!workflowJson.connections || typeof workflowJson.connections !== "object") {
    warnings.push("No connections object was provided. The workflow will stay in draft until reviewed.");
  }

  return { nodes, warnings };
}

function createMissionWorkflowJson(intent: string, title: string) {
  const normalized = intent.trim() || "Handle the workspace mission";
  return {
    name: title,
    nodes: [
      {
        id: "manual-trigger",
        name: "Mission trigger",
        type: "n8n-nodes-base.manualTrigger",
        position: [240, 260],
        parameters: {},
      },
      {
        id: "normalize-brief",
        name: "Normalize mission brief",
        type: "n8n-nodes-base.set",
        position: [520, 260],
        parameters: {
          keepOnlySet: false,
          values: {
            string: [
              { name: "mission", value: normalized },
              { name: "workspace_action", value: "Draft the plan, produce an artifact, and prepare a reviewable result." },
            ],
          },
        },
      },
      {
        id: "prepare-receipt",
        name: "Prepare operator receipt",
        type: "n8n-nodes-base.set",
        position: [820, 260],
        parameters: {
          keepOnlySet: false,
          values: {
            string: [{ name: "next_step", value: "Review the artifact and decide whether to run the branch-scoped execution flow." }],
          },
        },
      },
    ],
    connections: {
      "Mission trigger": {
        main: [[{ node: "Normalize mission brief", type: "main", index: 0 }]],
      },
      "Normalize mission brief": {
        main: [[{ node: "Prepare operator receipt", type: "main", index: 0 }]],
      },
    },
    settings: {},
    tags: [{ name: "source:workspace_mission" }, { name: "state:draft" }],
  };
}

export function buildWorkflowDraftFromIntent(intent: string): WorkspaceWorkflowDraftPreview {
  const title = titleFromIntent(intent);
  const workflowJson = createMissionWorkflowJson(intent, title);
  const nodes = workflowJson.nodes as N8nNode[];
  return {
    title,
    summary: intent.trim()
      ? `Drafted a mission plan for "${intent.trim()}".`
      : "Drafted a generic mission plan because no explicit mission prompt was provided.",
    triggerLabel: inferTriggerLabel(nodes),
    stepLabels: nodes.map((node) => String(node.name ?? node.type ?? "Step")),
    externalEffects: collectExternalEffects(nodes),
    warnings: intent.trim() ? [] : ["The mission prompt was empty, so a default manual mission flow was created."],
    effectiveMode: "manual",
    riskTier: inferRiskTier(nodes),
    workflowJson,
    supportingItems: buildStarterPlanItems(intent),
  };
}

export function buildWorkflowDraftFromJson(workflowJson: Record<string, unknown>): WorkspaceWorkflowDraftPreview {
  const { nodes, warnings } = validateWorkflowJson(workflowJson);
  const title =
    typeof workflowJson.name === "string" && workflowJson.name.trim().length > 0
      ? workflowJson.name.trim()
      : "Imported workflow plan";

  return {
    title,
    summary: `Imported a workflow plan from JSON with ${nodes.length} step${nodes.length === 1 ? "" : "s"}.`,
    triggerLabel: inferTriggerLabel(nodes),
    stepLabels: nodes.map((node) => String(node.name ?? node.type ?? "Step")),
    externalEffects: collectExternalEffects(nodes),
    warnings,
    effectiveMode: "manual",
    riskTier: inferRiskTier(nodes),
    workflowJson,
    supportingItems: buildStarterPlanItems(title),
  };
}
