"use client";

import type { RefObject } from "react";
import {
  Bot,
  CalendarClock,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  SendHorizontal,
  Slack,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state-standard";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AgentOption,
  AutomationRecord,
  ConnectorRecord,
  PreparedAssistantAction,
  RevisionRecord,
  StudioTab,
  ThreadMessageRecord,
  ThreadRecord,
} from "@/components/workspaces/workspace-studio-types";

type WorkspaceAssistantRailProps = {
  activeTab: StudioTab;
  currentEntityType: "workspace" | "page" | "database";
  currentSelectionTitle: string;
  threads: ThreadRecord[];
  messages: ThreadMessageRecord[];
  agents: AgentOption[];
  activeAgentId: string;
  postingMessage: boolean;
  composer: string;
  selectedThreadId: string | null;
  preparedAction: PreparedAssistantAction | null;
  streamConnectionState: string;
  streamStatus?: string | null;
  streamLines: Array<{ id: string; token: string; text: string }>;
  activeRunFromMessages: string | null;
  visibleAutomations: AutomationRecord[];
  connectors: ConnectorRecord[];
  revisions: RevisionRecord[];
  runStatusTone: (status?: string | null) => string;
  relativeTime: (value?: string | null) => string;
  flowStrip: React.ReactNode;
  composerRef: RefObject<HTMLTextAreaElement>;
  onActiveTabChange: (value: StudioTab) => void;
  onSelectThread: (threadId: string | null) => void;
  onAgentChange: (value: string) => void;
  onComposerChange: (value: string) => void;
  onPrepareAction: (value?: string) => void;
  onApplyPreparedAction: () => void;
  onCreateAutomation: () => void;
  onToggleAutomation: (automation: AutomationRecord) => void;
  onTestAutomation: (automation: AutomationRecord) => void;
  onShowConnectorDialog: () => void;
  onRestoreRevision: (revisionId: string) => void;
  onOpenAiSettings: () => void;
};

function contextualPrompts(
  currentEntityType: "workspace" | "page" | "database",
  currentSelectionTitle: string,
) {
  if (currentEntityType === "page") {
    return [
      `Summarize "${currentSelectionTitle}" into an SOP`,
      `Extract tasks from "${currentSelectionTitle}" into a database`,
      `Create an automation from this process`,
    ];
  }

  if (currentEntityType === "database") {
    return [
      `Suggest better properties for "${currentSelectionTitle}"`,
      `Identify bottlenecks in "${currentSelectionTitle}"`,
      `Create an automation from the high-priority rows`,
    ];
  }

  return [
    "Turn the latest mission signal into a reviewable plan",
    "Draft the first workflow and artifact bundle for this mission",
    "Suggest the next safe action the agents should take",
  ];
}

export function WorkspaceAssistantRail({
  activeTab,
  currentEntityType,
  currentSelectionTitle,
  threads,
  messages,
  agents,
  activeAgentId,
  postingMessage,
  composer,
  selectedThreadId,
  preparedAction,
  streamConnectionState,
  streamStatus,
  streamLines,
  activeRunFromMessages,
  visibleAutomations,
  connectors,
  revisions,
  runStatusTone,
  relativeTime,
  flowStrip,
  composerRef,
  onActiveTabChange,
  onSelectThread,
  onAgentChange,
  onComposerChange,
  onPrepareAction,
  onApplyPreparedAction,
  onCreateAutomation,
  onToggleAutomation,
  onTestAutomation,
  onShowConnectorDialog,
  onRestoreRevision,
  onOpenAiSettings,
}: WorkspaceAssistantRailProps) {
  const prompts = contextualPrompts(currentEntityType, currentSelectionTitle);

  return (
    <section className="rounded-[28px] border border-[color:var(--foco-teal)]/12 bg-[linear-gradient(180deg,rgba(var(--foco-teal-rgb),0.06),rgba(255,255,255,0.9))] px-3 py-3 shadow-[0_20px_50px_-40px_rgba(0,196,154,0.35)]">
      <div className="px-1 pt-1">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as StudioTab)}
          className="h-full"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-white/85 p-1">
            <TabsTrigger value="assist" className="flex-1 min-w-[120px] data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white">Plan</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-w-[120px] data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white">Runs</TabsTrigger>
            <TabsTrigger value="automations" className="flex-1 min-w-[120px] data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white">Workflow Drafts</TabsTrigger>
            <TabsTrigger value="integrations" className="flex-1 min-w-[120px] data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white">Tool Grants</TabsTrigger>
          </TabsList>

          <TabsContent value="assist" className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white/85 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Context
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                {currentSelectionTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {currentEntityType === "workspace"
                  ? "Turn a signal into a plan, a workflow draft, or a reviewable artifact."
                  : currentEntityType === "page"
                    ? "Use the current artifact as context for a plan, rewrite, extraction, or execution brief."
                    : "Use the current records as context for a plan, triage flow, or workflow draft."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPrepareAction(prompt)}
                    className="rounded-full border border-[color:var(--foco-teal)]/15 bg-[color:var(--foco-teal-dim)] px-3 py-2 text-left text-sm text-foreground transition hover:border-[color:var(--foco-teal)]/30"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Signal thread
                </div>
                <div className="mt-1 text-lg font-medium">
                  {currentSelectionTitle}
                </div>
              </div>
              <Button variant="outline" onClick={() => onSelectThread(null)}>
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </div>

            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    selectedThreadId === thread.id
                      ? "bg-secondary text-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="font-medium">{thread.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {relativeTime(thread.last_message_at)}
                  </div>
                </button>
              ))}
              {threads.length === 0 && messages.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title="No thread yet"
                  description="Prepare the first action and apply it when the preview looks right."
                  size="sm"
                  className="rounded-lg bg-background/80 px-4 py-6"
                />
              ) : null}
            </div>

            <div className="rounded-lg bg-white/85 p-3">
              <Label>Agent</Label>
              <Select value={activeAgentId} onValueChange={onAgentChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Pick an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} · {agent.kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preparedAction ? (
              <div className="rounded-2xl border border-[color:var(--foco-teal)]/12 bg-white/90 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Preview before apply
                </div>
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Request
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {preparedAction.request}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Plan
                    </div>
                    <div className="mt-2 space-y-2">
                      {preparedAction.plan.map((step) => (
                        <div
                          key={step}
                          className="rounded-xl bg-[color:var(--foco-teal-dim)] px-3 py-2 text-sm"
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Preview
                    </div>
                    <div className="mt-2 space-y-2">
                      {preparedAction.preview.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl bg-[color:var(--foco-teal-dim)] px-3 py-2 text-sm"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={onApplyPreparedAction}
                    disabled={postingMessage}
                    className="w-full bg-[color:var(--foco-teal)] text-white hover:opacity-95"
                  >
                    {postingMessage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="mr-2 h-4 w-4" />
                    )}
                    {preparedAction.applyLabel}
                  </Button>
                </div>
              </div>
            ) : null}

            {messages.length > 0 ? (
              <ScrollArea className="h-[280px] rounded-lg bg-white/85 p-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-xl px-4 py-3",
                        message.role === "user"
                          ? "ml-8 bg-primary text-primary-foreground"
                          : "mr-8 bg-background text-foreground shadow-sm",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
                        <span>{message.role}</span>
                        <span className="opacity-70">{message.status}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : null}

            <div className="space-y-3 rounded-lg bg-white/85 p-3">
              <Textarea
                ref={composerRef}
                value={composer}
                onChange={(event) => onComposerChange(event.target.value)}
                placeholder="Describe the outcome you want. The rail will show a plan, preview, approval step, and receipt."
                className="min-h-[120px] bg-background"
              />
              <Button
                onClick={() => onPrepareAction()}
                disabled={postingMessage || !composer.trim()}
                className="w-full bg-[color:var(--foco-teal)] text-white hover:opacity-95"
              >
                <SendHorizontal className="mr-2 h-4 w-4" />
                Preview action
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-4">
            {flowStrip}
            <div className="rounded-lg bg-white/85 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Run ledger
                  </div>
                  <div className="mt-1 text-lg font-medium">
                    {streamConnectionState === "idle"
                      ? "No active run"
                      : streamConnectionState}
                  </div>
                </div>
                {activeRunFromMessages ? (
                  <Badge
                    className={cn("border-0", runStatusTone(streamStatus))}
                  >
                    {streamStatus ?? "stream"}
                  </Badge>
                ) : null}
              </div>
              <ScrollArea className="mt-4 h-[280px] rounded-lg bg-background p-3 shadow-sm">
                <div className="space-y-2">
                  {streamLines.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Request, plan, preview, apply, and logged results will
                      appear here once a run is active.
                    </div>
                  ) : (
                    streamLines.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {line.token}
                        </div>
                        <div>{line.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {revisions.length > 0 ? (
              <div className="rounded-lg bg-white/85 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Revisions
                  </div>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 space-y-2">
                  {revisions.slice(0, 6).map((revision) => (
                    <div
                      key={revision.id}
                      className="rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{revision.action}</div>
                          <div className="text-sm text-muted-foreground">
                            {relativeTime(revision.created_at)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => onRestoreRevision(revision.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="automations" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Workflow drafts
                </div>
                <div className="mt-1 text-lg font-medium">
                  Govern repeatable workflows with reviewable drafts and test runs
                </div>
              </div>
              <Button onClick={onCreateAutomation}>
                <Plus className="mr-2 h-4 w-4" />
                New automation
              </Button>
            </div>
            <div className="space-y-3">
              {visibleAutomations.map((automation) => (
                <div
                  key={automation.id}
                  className="rounded-lg bg-white/85 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{automation.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {automation.description || automation.prompt}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "border-0",
                        runStatusTone(automation.last_status),
                      )}
                    >
                      {automation.trigger_type}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {automation.schedule ? (
                      <span className="rounded-full border px-2 py-1">
                        {automation.schedule}
                      </span>
                    ) : null}
                    {automation.agent_id ? (
                      <span className="rounded-full border px-2 py-1">
                        agent {automation.agent_id}
                      </span>
                    ) : null}
                    {automation.latest_run ? (
                      <span className="rounded-full border px-2 py-1">
                        last {automation.latest_run.status}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onToggleAutomation(automation)}
                    >
                      {automation.enabled ? "Pause" : "Enable"}
                    </Button>
                    <Button onClick={() => onTestAutomation(automation)}>
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Test run
                    </Button>
                  </div>
                </div>
              ))}
              {visibleAutomations.length === 0 ? (
                <EmptyState
                  icon={Workflow}
                  title="No automations yet"
                  description="Turn repeat work into a governed workflow draft once the page, tracker, or mission is clear."
                  primaryAction={{
                    label: "New automation",
                    onClick: onCreateAutomation,
                  }}
                  size="sm"
                  className="rounded-lg bg-background/80 px-4 py-6"
                />
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Tool grants
                </div>
                <div className="mt-1 text-lg font-medium">
                  Grant the tools this mission can safely use outside the workspace
                </div>
              </div>
              <Button onClick={onShowConnectorDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Connect
              </Button>
            </div>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="rounded-lg bg-white/85 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-lg bg-background p-2">
                        {connector.provider === "slack" ? (
                          <Slack className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{connector.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {connector.provider === "slack"
                            ? `Default channel ${String(connector.config.default_channel ?? "not set")}`
                            : `From ${String(connector.config.from_email ?? "not set")}`}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "border-0",
                        runStatusTone(connector.status),
                      )}
                    >
                      {connector.status}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {connector.capabilities.map((capability) => (
                      <span
                        key={capability}
                        className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {capability}
                      </span>
                    ))}
                    {connector.capabilities.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        No explicit capabilities saved
                      </span>
                    ) : null}
                  </div>
                  {connector.last_error ? (
                    <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {connector.last_error}
                    </div>
                  ) : null}
                </div>
              ))}
              {connectors.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No tool grants configured"
                  description="Grant Slack or mail access so the mission can act outside the artifact surface."
                  primaryAction={{
                    label: "Connect channel",
                    onClick: onShowConnectorDialog,
                  }}
                  secondaryAction={{
                    label: "Open AI Settings",
                    onClick: onOpenAiSettings,
                  }}
                  size="sm"
                  className="rounded-lg bg-background/80 px-4 py-6"
                />
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
