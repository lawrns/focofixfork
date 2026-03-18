"use client";

import type { ReactNode, RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { StudioHeader, StudioSurface } from "@/components/ui/studio-shell";
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
  flowStrip: ReactNode;
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
      "Create an automation from this process",
    ];
  }

  if (currentEntityType === "database") {
    return [
      `Suggest better properties for "${currentSelectionTitle}"`,
      `Identify bottlenecks in "${currentSelectionTitle}"`,
      "Create an automation from the high-priority rows",
    ];
  }

  return [
    "Turn the latest mission signal into a reviewable plan",
    "Draft the first workflow and artifact bundle for this mission",
    "Suggest the next safe action the agents should take",
  ];
}

const chipButtonClass =
  "rounded-full border border-border/80 bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-[color:var(--foco-teal)]/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foco-teal)]/30";

const primaryRailButtonClass =
  "w-full bg-[color:var(--foco-teal)] text-white shadow-sm hover:bg-[color:var(--foco-teal)]/90 focus-visible:ring-[color:var(--foco-teal)]/35";

const motionEase = [0.22, 1, 0.36, 1] as const;

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
  const reduceMotion = useReducedMotion();
  const prompts = contextualPrompts(currentEntityType, currentSelectionTitle);

  return (
    <motion.section
      layout
      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: motionEase }}
      className="space-y-0"
    >
      <StudioSurface tone="card" padding="sm" className="relative">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as StudioTab)}
          className="h-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-background/85 p-1">
            <TabsTrigger
              value="assist"
              className="min-w-0 data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white"
            >
              Assistant
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="min-w-0 data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="automations"
              className="min-w-0 data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white"
            >
              Automations
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="min-w-0 data-[state=active]:bg-[color:var(--foco-teal)] data-[state=active]:text-white"
            >
              Connectors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assist" className="mt-4 space-y-4">
            <motion.div
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: motionEase }}
              className="overflow-hidden"
            >
              <StudioSurface
                tone="plain"
                padding="sm"
                className="overflow-hidden"
              >
                <StudioHeader
                  eyebrow="Current context"
                  title={currentSelectionTitle}
                  description={
                    currentEntityType === "workspace"
                      ? "Use the workspace as the operating context. Keep the request, plan, and approval in one place."
                      : currentEntityType === "page"
                        ? "Use this page as the source material and make the next transformation explicit."
                        : "Use these records as operational context and keep the proposed change reviewable."
                  }
                />
              </StudioSurface>
            </motion.div>

            <motion.div
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: reduceMotion ? 0 : 0.04,
                ease: motionEase,
              }}
              className="space-y-0"
            >
              <StudioSurface tone="inset" padding="sm">
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
              </StudioSurface>
            </motion.div>

            <motion.div
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: reduceMotion ? 0 : 0.08,
                ease: motionEase,
              }}
              className="space-y-2"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Suggested next actions
              </div>
              <div className="flex flex-wrap gap-2">
                {prompts.map((prompt, index) => (
                  <motion.button
                    key={prompt}
                    type="button"
                    onClick={() => onPrepareAction(prompt)}
                    className={chipButtonClass}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.24,
                      delay: reduceMotion ? 0 : 0.1 + index * 0.04,
                      ease: motionEase,
                    }}
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence initial={false} mode="wait">
              {preparedAction ? (
                <motion.div
                  key="prepared-action"
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: motionEase }}
                  className="space-y-0"
                >
                  <StudioSurface tone="plain" padding="sm">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      Current plan
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
                          {preparedAction.plan.map((step, index) => (
                            <motion.div
                              key={step}
                              initial={
                                reduceMotion ? false : { opacity: 0, x: -8 }
                              }
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.22,
                                delay: reduceMotion ? 0 : index * 0.04,
                                ease: motionEase,
                              }}
                              className="rounded-xl bg-[color:var(--foco-teal-dim)] px-3 py-2 text-sm"
                            >
                              {step}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Preview
                        </div>
                        <div className="mt-2 space-y-2">
                          {preparedAction.preview.map((item, index) => (
                            <motion.div
                              key={item}
                              initial={
                                reduceMotion ? false : { opacity: 0, y: 8 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.22,
                                delay: reduceMotion ? 0 : 0.04 + index * 0.04,
                                ease: motionEase,
                              }}
                              className="rounded-xl border border-dashed border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground"
                            >
                              {item}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={onApplyPreparedAction}
                        disabled={postingMessage}
                        className={primaryRailButtonClass}
                      >
                        {postingMessage ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="mr-2 h-4 w-4" />
                        )}
                        {preparedAction.applyLabel}
                      </Button>
                    </div>
                  </StudioSurface>
                </motion.div>
              ) : (
                <motion.div
                  key="prepared-empty"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: motionEase }}
                >
                  <EmptyState
                    icon={Bot}
                    title="No plan prepared"
                    description="Describe the next action you want. The agent will return a plan and a preview before anything runs."
                    size="sm"
                    className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: reduceMotion ? 0 : 0.12,
                ease: motionEase,
              }}
              className="space-y-0"
            >
              <StudioSurface tone="inset" padding="sm" className="space-y-3">
                <Textarea
                  ref={composerRef}
                  value={composer}
                  onChange={(event) => onComposerChange(event.target.value)}
                  placeholder="Describe the next action. Example: Inspect the latest bug signal and prepare a patch brief."
                  className="min-h-[120px] bg-background"
                />
                <Button
                  onClick={() => onPrepareAction()}
                  disabled={postingMessage || !composer.trim()}
                  className={primaryRailButtonClass}
                >
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  Preview action
                </Button>
              </StudioSurface>
            </motion.div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-4">
            {flowStrip}
            <StudioSurface tone="inset" padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Signal threads
                  </div>
                  <div className="mt-1 text-lg font-medium">
                    Recent mission activity
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {threads.slice(0, 6).map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2 text-left transition-colors",
                      selectedThreadId === thread.id
                        ? "border-[color:var(--foco-teal)]/20 bg-[color:var(--foco-teal-dim)] text-foreground"
                        : "bg-background text-muted-foreground hover:border-[color:var(--foco-teal)]/15 hover:bg-muted/60 hover:text-foreground",
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
                    title="No activity yet"
                    description="The first approved action will create a thread, run, and receipt here."
                    size="sm"
                    className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6"
                  />
                ) : null}
              </div>
            </StudioSurface>

            {messages.length > 0 ? (
              <ScrollArea className="h-[240px] rounded-2xl border border-border/60 bg-background/70 p-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-xl px-4 py-3",
                        message.role === "user"
                          ? "ml-8 bg-primary text-primary-foreground"
                          : "mr-8 border border-border/60 bg-card text-foreground shadow-sm",
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

            <StudioSurface tone="inset" padding="sm">
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
              <ScrollArea className="mt-4 h-[280px] rounded-2xl border border-border/60 bg-background p-3 shadow-sm">
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
            </StudioSurface>

            {revisions.length > 0 ? (
              <StudioSurface tone="inset" padding="sm">
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
                      className="rounded-2xl border border-border/60 bg-background/70 p-3"
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
              </StudioSurface>
            ) : null}
          </TabsContent>

          <TabsContent value="automations" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Workflow drafts
                </div>
                <div className="mt-1 text-lg font-medium">
                  Govern repeatable workflows with reviewable drafts and test
                  runs
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
                  className="rounded-2xl border border-border/60 bg-card/95 p-4"
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
                  className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6"
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
                  Grant the tools this mission can safely use outside the
                  workspace
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
                  className="rounded-2xl border border-border/60 bg-card/95 p-4"
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
                  </div>
                </div>
              ))}
              {connectors.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No connectors yet"
                  description="Connect Slack or mail so the assistant can act outside the workspace with explicit approval."
                  primaryAction={{
                    label: "Open AI settings",
                    onClick: onOpenAiSettings,
                  }}
                  secondaryAction={{
                    label: "Connect channel",
                    onClick: onShowConnectorDialog,
                  }}
                  size="sm"
                  className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6"
                />
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </StudioSurface>
    </motion.section>
  );
}
