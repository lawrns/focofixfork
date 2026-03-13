"use client";

import {
  ArrowRight,
  Check,
  Database,
  FileText,
  Upload,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AutomationRecord,
  ConnectorRecord,
  DatabaseRecord,
  PageRecord,
  ResumeTarget,
  StarterPlanItem,
  ThreadRecord,
  WorkflowDraftInputMode,
  WorkflowDraftPreview,
  WorkspaceRecord,
} from "@/components/workspaces/workspace-studio-types";

type WorkspaceHomeOverviewProps = {
  workspace: WorkspaceRecord | null;
  pages: PageRecord[];
  databases: DatabaseRecord[];
  connectors: ConnectorRecord[];
  automations: AutomationRecord[];
  recentPages: PageRecord[];
  threads: ThreadRecord[];
  workspaceSummary: string;
  savingWorkspaceSummary: boolean;
  missionInput: string;
  workflowJsonInput: string;
  workflowDraftMode: WorkflowDraftInputMode;
  workflowDraft: WorkflowDraftPreview | null;
  workflowDraftBusy: boolean;
  resumeTarget: ResumeTarget | null;
  onWorkspaceSummaryChange: (value: string) => void;
  onSaveWorkspaceSummary: () => void;
  onMissionInputChange: (value: string) => void;
  onWorkflowJsonInputChange: (value: string) => void;
  onWorkflowDraftModeChange: (value: WorkflowDraftInputMode) => void;
  onGenerateWorkflowDraft: (seed?: string) => void;
  onUploadWorkflowJson: (file: File) => void;
  onApplyWorkflowDraft: () => void;
  onUpdateSupportingItem: (
    id: string,
    patch: Partial<Pick<StarterPlanItem, "title" | "detail">>,
  ) => void;
  onRemoveSupportingItem: (id: string) => void;
  onCreatePage: () => void;
  onCreateDatabase: () => void;
  onOpenToolGrants: () => void;
  onOpenAgentRail: () => void;
  onOpenWorkflowDrafts: () => void;
  onNavigateToPage: (pageId: string) => void;
  onNavigateToDatabase: (databaseId: string) => void;
  onResumeTarget: () => void;
};

const missionSuggestions = [
  "When bugs arrive, inspect the codebase, draft a patch brief, and queue safe execution.",
  "Turn support requests into triaged cases with a daily unresolved digest.",
  "Watch Slack for incidents, summarize impact, and produce a fix plan.",
];

const primaryActionClass =
  "bg-[color:var(--foco-teal)] text-white shadow-sm hover:bg-[color:var(--foco-teal)]/90 focus-visible:ring-[color:var(--foco-teal)]/35";

const chipButtonClass =
  "rounded-full border border-border/80 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-[color:var(--foco-teal)]/30 hover:bg-[color:var(--foco-teal-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foco-teal)]/30";

const listButtonClass =
  "flex w-full items-start justify-between gap-4 rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-[color:var(--foco-teal)]/15 hover:bg-[color:var(--foco-teal-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foco-teal)]/30";

function sectionHeading(title: string, description?: string) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function supportingItemIcon(kind: StarterPlanItem["kind"]) {
  if (kind === "page") return FileText;
  if (kind === "database") return Database;
  return Workflow;
}

function riskTone(risk: WorkflowDraftPreview["riskTier"]) {
  if (risk === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function entityLabel(thread: ThreadRecord) {
  if (thread.entity_type === "workspace") return "Mission signal";
  if (thread.entity_type === "page") return "Artifact signal";
  return "Record signal";
}

export function WorkspaceHomeOverview({
  workspace,
  pages,
  databases,
  connectors,
  automations,
  recentPages,
  threads,
  workspaceSummary,
  savingWorkspaceSummary,
  missionInput,
  workflowJsonInput,
  workflowDraftMode,
  workflowDraft,
  workflowDraftBusy,
  resumeTarget,
  onWorkspaceSummaryChange,
  onSaveWorkspaceSummary,
  onMissionInputChange,
  onWorkflowJsonInputChange,
  onWorkflowDraftModeChange,
  onGenerateWorkflowDraft,
  onUploadWorkflowJson,
  onApplyWorkflowDraft,
  onUpdateSupportingItem,
  onRemoveSupportingItem,
  onCreatePage,
  onCreateDatabase,
  onOpenToolGrants,
  onOpenAgentRail,
  onOpenWorkflowDrafts,
  onNavigateToPage,
  onNavigateToDatabase,
  onResumeTarget,
}: WorkspaceHomeOverviewProps) {
  const latestThreads = threads.slice(0, 5);
  const artifactCount = pages.length + databases.length;

  return (
    <div className="space-y-10">
      <section className="space-y-5 rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,rgba(var(--foco-teal-rgb),0.09),transparent_45%)] px-6 py-6 shadow-[0_24px_60px_-48px_rgba(var(--foco-teal-rgb),0.5)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="rounded-full bg-[color:var(--foco-teal-dim)] px-2.5 py-1 text-[color:var(--foco-teal)]">
                  Mission canvas
                </span>
                <span>Workspace</span>
                <span className="normal-case tracking-normal text-sm font-medium text-foreground">
                  {workspace?.name ?? "Workspace"}
                </span>
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.2rem]">
                Signals arrive, the plan stays reviewable, and the resulting work stays legible.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {workspaceSummary.trim() ||
                  "Describe the operating job this workspace should handle. Signals arrive, the agent proposes a plan, you approve what matters, and the resulting artifacts and runs stay visible."}
              </p>
            </div>
            {resumeTarget ? (
              <Button
                variant="outline"
                onClick={onResumeTarget}
                className="border-[color:var(--foco-teal)]/20 bg-background/70 hover:border-[color:var(--foco-teal)]/35 hover:bg-[color:var(--foco-teal-dim)]"
              >
                Resume {resumeTarget.entityType}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[color:var(--foco-teal)]/20 bg-background/80 text-foreground"
            >
              {threads.length} signal{threads.length === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant="outline"
              className="border-[color:var(--foco-teal)]/20 bg-background/80 text-foreground"
            >
              {artifactCount} artifact{artifactCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant="outline"
              className="border-[color:var(--foco-teal)]/20 bg-background/80 text-foreground"
            >
              {automations.length} workflow{automations.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor="workspace-purpose"
              className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
            >
              Mission statement
            </label>
            <Input
              id="workspace-purpose"
              value={workspaceSummary}
              onChange={(event) => onWorkspaceSummaryChange(event.target.value)}
              placeholder="Example: Turn Slack bugs into patch briefs, approvals, and branch-safe execution."
              className="h-11"
            />
          </div>
          <Button
            onClick={onSaveWorkspaceSummary}
            disabled={savingWorkspaceSummary}
            className={primaryActionClass}
          >
            {savingWorkspaceSummary ? "Saving..." : "Save mission"}
          </Button>
        </div>
      </section>

      <section className="border-t border-border/60 pt-8">
        <div className="space-y-4">
          {sectionHeading(
            "Signals",
            "Start with incoming work. A signal can be a bug report, a request, or any recurring event the workspace should absorb and turn into an actionable plan.",
          )}
          {latestThreads.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              No signals yet. The first mission request, imported workflow, or assistant action will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {latestThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="flex flex-col gap-2 border-l-2 border-[color:var(--foco-teal)]/20 pl-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{entityLabel(thread)}</span>
                    <span className="rounded-full bg-[color:var(--foco-teal-dim)] px-2 py-1 text-[10px] text-foreground">
                      {thread.status}
                    </span>
                  </div>
                  <div className="text-base font-medium text-foreground">{thread.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Updated {thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : "just now"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border/60 pt-8">
        <div className="space-y-5">
          {sectionHeading(
            "Agent plan",
            "Describe what should happen in plain language or paste workflow JSON. The system should return a reviewable plan before anything is provisioned.",
          )}

          <div className="inline-flex rounded-full border border-border bg-muted/25 p-1">
            <button
              type="button"
              onClick={() => onWorkflowDraftModeChange("mission_prompt")}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                workflowDraftMode === "mission_prompt"
                  ? "bg-[color:var(--foco-teal)] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Describe the job
            </button>
            <button
              type="button"
              onClick={() => onWorkflowDraftModeChange("workflow_json")}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                workflowDraftMode === "workflow_json"
                  ? "bg-[color:var(--foco-teal)] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Import JSON
            </button>
          </div>

          {workflowDraftMode === "mission_prompt" ? (
            <div className="space-y-3">
              <Textarea
                value={missionInput}
                onChange={(event) => onMissionInputChange(event.target.value)}
                placeholder="When a Slack bug arrives, inspect the codebase, find likely root causes, generate a patch brief, and queue a branch-safe execution run."
                className="min-h-[156px]"
              />
              <div className="flex flex-wrap gap-2">
                {missionSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onGenerateWorkflowDraft(suggestion)}
                    className={chipButtonClass}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={workflowJsonInput}
                onChange={(event) => onWorkflowJsonInputChange(event.target.value)}
                placeholder='Paste workflow JSON here. Example: {"name":"Bug triage flow","nodes":[...],"connections":{...}}'
                className="min-h-[196px] font-mono text-sm"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:bg-muted/20">
                <Upload className="h-4 w-4" />
                Upload JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUploadWorkflowJson(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onGenerateWorkflowDraft()}
              disabled={workflowDraftBusy}
              className={primaryActionClass}
            >
              {workflowDraftBusy ? "Preparing plan..." : "Preview plan"}
            </Button>
            <Button
              variant="outline"
              onClick={onOpenAgentRail}
              className="border-[color:var(--foco-teal)]/15 hover:border-[color:var(--foco-teal)]/30 hover:bg-[color:var(--foco-teal-dim)]"
            >
              Open agent rail
            </Button>
          </div>

          {workflowDraft ? (
            <div className="space-y-6 border-t border-border/60 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", riskTone(workflowDraft.riskTier))}>
                  {workflowDraft.riskTier} risk
                </Badge>
                <Badge variant="secondary">{workflowDraft.triggerLabel}</Badge>
                <Badge variant="secondary">{workflowDraft.effectiveMode}</Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {workflowDraft.title}
                </h3>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {workflowDraft.summary}
                </p>
              </div>

              <div className="space-y-3">
                {workflowDraft.stepLabels.map((step, index) => (
                  <div
                    key={`${step}-${index}`}
                    className="flex items-start gap-3 border-l-2 border-[color:var(--foco-teal)]/20 pl-4"
                  >
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--foco-teal-dim)] text-xs font-semibold text-foreground">
                      {index + 1}
                    </div>
                    <div className="text-sm leading-6 text-foreground">{step}</div>
                  </div>
                ))}
              </div>

              {workflowDraft.supportingItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Artifacts this plan will create
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Keep what helps the operator understand, approve, or execute the work. Remove anything decorative.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {workflowDraft.supportingItems.map((item) => {
                      const ItemIcon = supportingItemIcon(item.kind);
                      return (
                        <div key={item.id} className="space-y-3 border-l-2 border-border pl-4">
                          <div className="flex items-center gap-2">
                            <ItemIcon className="h-4 w-4 text-[color:var(--foco-teal)]" />
                            <Badge variant="secondary" className="capitalize">
                              {item.kind}
                            </Badge>
                            {item.status === "applied" ? (
                              <span className="text-sm text-emerald-700">Provisioned</span>
                            ) : null}
                          </div>
                          <Input
                            value={item.title}
                            onChange={(event) =>
                              onUpdateSupportingItem(item.id, {
                                title: event.target.value,
                              })
                            }
                          />
                          <Textarea
                            value={item.detail}
                            onChange={(event) =>
                              onUpdateSupportingItem(item.id, {
                                detail: event.target.value,
                              })
                            }
                            className="min-h-[88px]"
                          />
                          {item.status !== "applied" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveSupportingItem(item.id)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {workflowDraft.warnings.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Warnings
                  </h4>
                  {workflowDraft.warnings.map((warning) => (
                    <div
                      key={warning}
                      className="border-l-2 border-amber-300 bg-amber-50/70 pl-4 text-sm leading-6 text-amber-900"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={onApplyWorkflowDraft}
                  disabled={workflowDraftBusy}
                  className={primaryActionClass}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {workflowDraftBusy ? "Provisioning..." : "Approve plan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={onOpenWorkflowDrafts}
                  className="border-[color:var(--foco-teal)]/15 hover:border-[color:var(--foco-teal)]/30 hover:bg-[color:var(--foco-teal-dim)]"
                >
                  Open drafts
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-border/60 pt-8">
        <div className="space-y-6">
          {sectionHeading(
            "Artifacts",
            "Artifacts are the human-facing outputs of the system: briefs, pages, trackers, and structured records that explain what happened and what should happen next.",
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Pages</h3>
                <Button variant="ghost" size="sm" onClick={onCreatePage}>
                  New page
                </Button>
              </div>
              {recentPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pages yet. Create a brief, patch note, report, or operating document.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentPages.slice(0, 4).map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onNavigateToPage(page.id)}
                      className={cn(listButtonClass, "items-center")}
                    >
                      <span className="font-medium text-foreground">{page.title}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Databases</h3>
                <Button variant="ghost" size="sm" onClick={onCreateDatabase}>
                  New database
                </Button>
              </div>
              {databases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No operational databases yet. Add one when this mission needs queues, records, or ownership.
                </p>
              ) : (
                <div className="space-y-2">
                  {databases.slice(0, 4).map((database) => (
                    <button
                      key={database.id}
                      type="button"
                      onClick={() => onNavigateToDatabase(database.id)}
                      className={listButtonClass}
                    >
                      <span>
                        <span className="block font-medium text-foreground">{database.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {database.description || "Structured operational records"}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={onOpenToolGrants}
              className={chipButtonClass}
            >
              {connectors.length} tool grant{connectors.length === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={onOpenWorkflowDrafts}
              className={chipButtonClass}
            >
              {automations.length} workflow draft{automations.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 pt-8">
        <div className="space-y-4">
          {sectionHeading(
            "Runs",
            "Runs show what the system actually did after a plan was approved. Keep them separate from the mission description so action history stays legible.",
          )}
          {latestThreads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No runs yet. Apply an agent plan to create the first execution trail.
            </p>
          ) : (
            <div className="space-y-3">
              {latestThreads.map((thread) => (
                <div
                  key={`${thread.id}-run`}
                  className="flex items-start justify-between gap-4 border-l-2 border-border pl-4"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">{thread.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {thread.entity_type === "workspace"
                        ? "Mission-level run"
                        : `${thread.entity_type} run`}{" "}
                      · {thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : "recently"}
                    </div>
                  </div>
                  <Badge variant="secondary">{thread.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
