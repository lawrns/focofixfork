import { describe, expect, test } from "vitest";
import {
  buildWorkflowDraftFromIntent,
  buildWorkflowDraftFromJson,
} from "@/lib/workspaces/workflow-drafts";

describe("workspace workflow drafts", () => {
  test("builds a mission workflow draft from intent", () => {
    const preview = buildWorkflowDraftFromIntent(
      "Slack bug report triage and patch brief generation",
    );

    expect(preview.effectiveMode).toBe("manual");
    expect(preview.triggerLabel).toBe("manual");
    expect(preview.stepLabels.length).toBeGreaterThan(1);
    expect(preview.supportingItems.length).toBeGreaterThan(0);
  });

  test("builds a workflow draft from imported JSON", () => {
    const preview = buildWorkflowDraftFromJson({
      name: "Imported bug workflow",
      nodes: [
        { name: "Webhook intake", type: "n8n-nodes-base.webhook" },
        { name: "Normalize", type: "n8n-nodes-base.set" },
      ],
      connections: {},
    });

    expect(preview.title).toBe("Imported bug workflow");
    expect(preview.triggerLabel).toBe("webhook");
    expect(preview.riskTier).toBe("medium");
    expect(preview.externalEffects).toContain("Webhook intake");
  });

  test("rejects invalid workflow JSON", () => {
    expect(() => buildWorkflowDraftFromJson({ name: "Bad workflow" })).toThrow(
      "Workflow JSON must include a non-empty nodes array.",
    );
  });
});
