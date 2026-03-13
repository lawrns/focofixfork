import { describe, expect, test } from "vitest";
import {
  buildAssistantActionPreview,
  buildStarterPlanPreview,
} from "@/lib/workspaces/preview-builders";

describe("workspace preview builders", () => {
  test("builds a default starter plan when intent is empty", () => {
    const preview = buildStarterPlanPreview("");

    expect(preview.effectiveMode).toBe("manual");
    expect(preview.items.length).toBeGreaterThan(0);
    expect(preview.warnings).toContain(
      "Intent was empty, so a default operating structure was used.",
    );
  });

  test("builds a support-oriented starter plan", () => {
    const preview = buildStarterPlanPreview(
      "Support workspace with Slack digest",
    );

    expect(preview.items.some((item) => item.kind === "page")).toBe(true);
    expect(preview.items.some((item) => item.kind === "database")).toBe(true);
    expect(preview.items.some((item) => item.kind === "connector")).toBe(true);
    expect(preview.items.some((item) => item.kind === "automation")).toBe(true);
  });

  test("builds a page-scoped assistant preview", () => {
    const preview = buildAssistantActionPreview(
      "Rewrite this SOP",
      "page",
      "Hiring SOP",
    );

    expect(preview.request).toBe("Rewrite this SOP");
    expect(preview.applyLabel).toBe("Apply with assistant");
    expect(preview.riskClass).toBe("low");
    expect(preview.plan[0]).toContain('the page "Hiring SOP"');
  });
});
