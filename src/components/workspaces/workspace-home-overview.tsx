"use client";

import {
  ArrowRight,
  Check,
  Database,
  FileText,
  Mail,
  RefreshCw,
  Sparkles,
  Upload,
  Workflow,
  Zap,
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
  "Slack bug report triage and patch brief generation",
  "Support intake with daily unresolved digest",
  "CRM follow-up workflow with operator review",
  "Hiring pipeline triage with structured scorecards",
];

function sectionHeading(title: string, description?: string) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function supportingItemIcon(kind: StarterPlanItem["kind"]) {
  if (kind === "page") return FileText;
  if (kind === "database") return Database;
  if (kind === "connector") return Mail;
  return Workflow;
}

function riskTone(risk: WorkflowDraftPreview["riskTier"]) {
  if (risk === "high") return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  if (risk === "medium") return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
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
  const latestThreads = threads.slice(0, 4);
  const recentArtifacts = recentPages.slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[color:var(--foco-teal)]/15 bg-[linear-gradient(135deg,rgba(var(--foco-teal-rgb),0.16),rgba(255,255,255,0.92)_38%,rgba(var(--foco-teal-rgb),0.06)_100%)] px-5 py-6 shadow-[0_24px_70px_-42px_rgba(0,196,154,0.45)] sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--foco-teal-rgb),0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(var(--foco-teal-rgb),0.12),transparent_34%)]" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--foco-teal)]/25 bg-white/75 px-3 py-1 text-xs font-medium text-[color:var(--foco-teal)] backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                Mission Canvas
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground">
                  {workspace?.name ?? "Workspace"}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                  Describe the outcome, inspect the plan, approve the artifact, and let OpenClaw act safely on reviewable infrastructure.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-[color:var(--foco-teal-dim)] text-[color:var(--foco-teal)]">
                  Agent OS shell
                </Badge>
                <Badge variant="secondary">Preview before mutation</Badge>
                {resumeTarget ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[color:var(--foco-teal)]/20 bg-white/80 text-foreground hover:bg-white"
                    onClick={onResumeTarget}
                  >
                    Resume {resumeTarget.entityType}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm sm:min-w-[280px]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Mission
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {workspaceSummary.trim() || "Set the operating objective for this workspace."}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-[color:var(--foco-teal-dim)] px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Signals</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{threads.length}</div>
                </div>
                <div className="rounded-2xl bg-slate-900 px-3 py-3 text-white">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/65">Artifacts</div>
                  <div className="mt-1 text-lg font-semibold">{pages.length + databases.length}</div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workflows</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{automations.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/72 p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <label
                htmlFor="workspace-purpose"
                className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
              >
                Mission objective
              </label>
              <Input
                id="workspace-purpose"
                value={workspaceSummary}
                onChange={(event) => onWorkspaceSummaryChange(event.target.value)}
                placeholder="Example: Turn Slack bugs into verified patch briefs and tracked execution."
                className="h-11 bg-white"
              />
            </div>
            <Button onClick={onSaveWorkspaceSummary} disabled={savingWorkspaceSummary} className="bg-[color:var(--foco-teal)] text-white hover:opacity-95">
              {savingWorkspaceSummary ? "Saving..." : "Save mission"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-4 rounded-[28px] border border-border/50 bg-card px-5 py-5 shadow-sm">
          {sectionHeading(
            "Signal to workflow draft",
            "Start from a mission prompt or imported workflow JSON. The system returns a reviewable workflow draft and supporting artifacts before anything is provisioned.",
          )}
          <div className="inline-flex rounded-full bg-muted/60 p-1">
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
              Mission prompt
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
              Workflow JSON
            </button>
          </div>

          {workflowDraftMode === "mission_prompt" ? (
            <div className="space-y-3">
              <Textarea
                value={missionInput}
                onChange={(event) => onMissionInputChange(event.target.value)}
                placeholder="Example: When a Slack bug arrives, summarize the issue, inspect code and prior runs, produce an IDE-ready patch brief, and queue branch-safe execution."
                className="min-h-[150px] rounded-3xl bg-white"
              />
              <div className="flex flex-wrap gap-2">
                {missionSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onGenerateWorkflowDraft(suggestion)}
                    className="rounded-full border border-[color:var(--foco-teal)]/15 bg-[color:var(--foco-teal-dim)] px-3 py-2 text-sm text-foreground transition hover:border-[color:var(--foco-teal)]/25"
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
                className="min-h-[190px] rounded-3xl bg-white font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2 text-sm text-foreground transition hover:bg-muted/50">
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
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onGenerateWorkflowDraft()}
              disabled={workflowDraftBusy}
              className="bg-[color:var(--foco-teal)] text-white hover:opacity-95"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {workflowDraftBusy ? "Drafting..." : "Preview workflow draft"}
            </Button>
            <Button variant="ghost" onClick={onOpenAgentRail}>
              Open agent rail
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-border/50 bg-card px-5 py-5 shadow-sm">
          {sectionHeading(
            "Live signals and run health",
            "The mission canvas should show what the machine is seeing and what it last did, even before you open a specific artifact.",
          )}
          <div className="space-y-3">
            {latestThreads.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                No signals yet. The first mission request, assistant preview, or recurring run will show up here.
              </div>
            ) : (
              latestThreads.map((thread) => (
                <div key={thread.id} className="rounded-3xl bg-muted/20 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {thread.entity_type === "workspace" ? "Mission signal" : `${thread.entity_type} signal`}
                      </div>
                      <div className="mt-1 font-medium text-foreground">{thread.title}</div>
                    </div>
                    <Badge variant="secondary">{thread.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {workflowDraft ? (
        <section className="space-y-4 rounded-[28px] border border-border/50 bg-card px-5 py-5 shadow-sm">
          {sectionHeading(
            "Workflow draft preview",
            "Review the workflow itself first, then trim the supporting artifacts before the workspace is changed.",
          )}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-3xl border border-[color:var(--foco-teal)]/12 bg-[color:var(--foco-teal-dim)] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border", riskTone(workflowDraft.riskTier))}>
                  {workflowDraft.riskTier} risk
                </Badge>
                <Badge variant="secondary">{workflowDraft.triggerLabel}</Badge>
                <Badge variant="secondary">{workflowDraft.effectiveMode}</Badge>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{workflowDraft.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{workflowDraft.summary}</p>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Draft steps
                </div>
                {workflowDraft.stepLabels.map((step, index) => (
                  <div key={`${step}-${index}`} className="rounded-2xl bg-white/85 px-3 py-2 text-sm text-foreground shadow-sm">
                    {index + 1}. {step}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  External effects
                </div>
                {workflowDraft.externalEffects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {workflowDraft.externalEffects.map((effect) => (
                      <Badge key={effect} variant="outline">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No external effects detected in this draft.</p>
                )}
              </div>
              {workflowDraft.warnings.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Warnings
                  </div>
                  {workflowDraft.warnings.map((warning) => (
                    <div key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Supporting artifacts
                  </div>
                  <div className="mt-1 text-base font-semibold text-foreground">
                    Adjust what should be created beside the workflow
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onOpenWorkflowDrafts}>
                  Open workflow drafts
                </Button>
              </div>
              <div className="space-y-3">
                {workflowDraft.supportingItems.map((item) => {
                  const ItemIcon = supportingItemIcon(item.kind);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-3xl border px-4 py-4 transition",
                        item.status === "applied"
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-border/60 bg-muted/20",
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-1 rounded-2xl bg-white p-2 shadow-sm">
                            <ItemIcon className="h-4 w-4 text-[color:var(--foco-teal)]" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="capitalize">
                                {item.kind}
                              </Badge>
                              {item.status === "applied" ? (
                                <span className="text-sm text-emerald-700">Provisioned</span>
                              ) : null}
                            </div>
                            <Input
                              value={item.title}
                              onChange={(event) => onUpdateSupportingItem(item.id, { title: event.target.value })}
                              className="h-10 bg-white"
                            />
                            <Textarea
                              value={item.detail}
                              onChange={(event) => onUpdateSupportingItem(item.id, { detail: event.target.value })}
                              className="min-h-[82px] bg-white"
                            />
                          </div>
                        </div>
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
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={onApplyWorkflowDraft}
                  disabled={workflowDraftBusy}
                  className="bg-[color:var(--foco-teal)] text-white hover:opacity-95"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {workflowDraftBusy ? "Provisioning..." : "Approve and provision"}
                </Button>
                <Button variant="ghost" onClick={onOpenAgentRail}>
                  Review in agent rail
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        {sectionHeading(
          "Artifacts and machine surfaces",
          "Keep human-readable artifacts, operational data, tool access, and workflow control in one calm view without making the shell feel like a dashboard grid.",
        )}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Recent artifacts</h3>
                <Button variant="ghost" size="sm" onClick={onCreatePage}>
                  New page
                </Button>
              </div>
              {recentArtifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create the first artifact for a brief, patch plan, report, or operating note.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentArtifacts.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => onNavigateToPage(page.id)}
                      className="flex w-full items-center justify-between rounded-3xl bg-muted/15 px-4 py-3 text-left transition hover:bg-muted/25"
                    >
                      <span className="font-medium text-foreground">{page.title}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Operational records</h3>
                <Button variant="ghost" size="sm" onClick={onCreateDatabase}>
                  New database
                </Button>
              </div>
              {databases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add a database when the mission needs queues, cases, owners, or recurring structured work.
                </p>
              ) : (
                <div className="space-y-2">
                  {databases.slice(0, 4).map((database) => (
                    <button
                      key={database.id}
                      type="button"
                      onClick={() => onNavigateToDatabase(database.id)}
                      className="flex w-full items-center justify-between rounded-3xl bg-muted/15 px-4 py-3 text-left transition hover:bg-muted/25"
                    >
                      <span>
                        <span className="block font-medium text-foreground">{database.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {database.description || "Structured operational data for this mission."}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-3 rounded-3xl bg-muted/20 px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">Tool grants</h3>
              {connectors.length === 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No external tools are granted yet.</p>
                  <Button variant="ghost" className="px-0 text-foreground" onClick={onOpenToolGrants}>
                    Open tool grants
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {connectors.map((connector) => (
                    <Badge key={connector.id} className="border-0 bg-[color:var(--foco-teal-dim)] text-foreground">
                      {connector.provider}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-3xl bg-muted/20 px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">Workflow drafts and run health</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {automations.length > 0
                    ? `${automations.length} workflow draft${automations.length === 1 ? "" : "s"} or automations linked to this workspace.`
                    : "No workflow drafts have been provisioned yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" className="px-0 text-foreground" onClick={onOpenWorkflowDrafts}>
                    Open workflow drafts
                  </Button>
                  <Button variant="ghost" className="px-0 text-foreground" onClick={onOpenAgentRail}>
                    Open run ledger
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
