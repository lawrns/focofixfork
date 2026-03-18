"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  FileJson,
  RotateCcw,
  ShieldAlert,
  Terminal,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Send,
  Loader2,
} from "lucide-react";
import { UnifiedPageShell } from "@/components/layout/unified-page-shell";
import { UnifiedCard } from "@/components/ui/unified-card";
import { StatusBadge } from "@/components/ui/unified-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RunTurn = {
  id: string;
  run_id: string;
  idx: number;
  kind: string;
  prompt: string;
  status: string;
  outcome_kind: string | null;
  preferred_model: string | null;
  actual_model: string | null;
  gateway_run_id: string | null;
  correlation_id: string | null;
  summary: string | null;
  output: string | null;
  session_path: string | null;
  created_at: string;
  ended_at: string | null;
};

type RunArtifact = {
  type: string;
  uri: string;
  name?: string;
  title?: string | null;
};

type Run = {
  id: string;
  runner: string;
  status: string;
  task_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  created_at: string;
  artifacts?: RunArtifact[] | null;
  trace?: Record<string, unknown> | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cost_usd?: number | null;
};

type TimelineEvent = {
  id: string;
  kind: "lifecycle" | "execution" | "audit";
  title: string;
  description?: string;
  status?:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | "info";
  source: string;
  timestamp: string;
  payload?: Record<string, unknown> | null;
};

function formatDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (seconds < 3600) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function statusTone(status?: TimelineEvent["status"]): string {
  if (status === "completed") return "text-emerald-600 dark:text-emerald-400";
  if (status === "running") return "text-[color:var(--foco-teal)]";
  if (status === "failed") return "text-red-600 dark:text-red-400";
  if (status === "cancelled") return "text-zinc-500";
  if (status === "pending") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function outcomeIcon(outcome?: string | null): React.ReactNode {
  switch (outcome) {
    case "executed":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "advisory":
      return <Lightbulb className="h-4 w-4 text-amber-500" />;
    case "no_evidence":
      return <AlertCircle className="h-4 w-4 text-zinc-400" />;
    case "failed":
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <Clock className="h-4 w-4 text-zinc-500" />;
    default:
      return null;
  }
}

export default function RunDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [run, setRun] = useState<Run | null>(null);
  const [turns, setTurns] = useState<RunTurn[]>([]);
  const [activeTurn, setActiveTurn] = useState<RunTurn | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [artifactsByTurn, setArtifactsByTurn] = useState<
    Record<string, RunArtifact[]>
  >({});
  const [inspector, setInspector] = useState<Record<string, unknown> | null>(
    null,
  );
  const [session, setSession] = useState<unknown>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Continue composer state
  const [continuePrompt, setContinuePrompt] = useState("");
  const [continuing, setContinuing] = useState(false);

  // Inspector state
  const [showInspector, setShowInspector] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    async function load() {
      setFetching(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/runs/${id}/timeline`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        const data = json.data;

        setRun(data.run ?? data.thread);
        setTurns(data.turns ?? []);
        setActiveTurn(data.active_turn);
        setOutcome(data.outcome);
        setTimeline(data.timeline ?? []);
        setArtifactsByTurn(data.artifacts_by_turn ?? {});
        setInspector(data.inspector);
        setSession(data.session);
      } catch {
        setNotFound(true);
      } finally {
        setFetching(false);
      }
    }

    void load();
  }, [user, id]);

  const duration = useMemo(() => {
    if (!run?.started_at || !run?.ended_at) return null;
    return formatDuration(run.started_at, run.ended_at);
  }, [run]);

  const handleContinue = useCallback(async () => {
    if (!continuePrompt.trim() || continuing) return;

    setContinuing(true);
    try {
      const res = await fetch(`/api/runs/${id}/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: continuePrompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to continue");
      }

      const data = await res.json();
      toast.success(`Turn dispatched: ${data.turnId?.slice(0, 8)}`);
      setContinuePrompt("");

      // Refresh the data
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to continue");
    } finally {
      setContinuing(false);
    }
  }, [continuePrompt, continuing, id]);

  const handleRetry = useCallback(async () => {
    // Retry the last failed turn
    if (!activeTurn) return;

    try {
      const res = await fetch(`/api/runs/${id}/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activeTurn.prompt,
          context: { isRetry: true, originalTurnId: activeTurn.id },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to retry");
      }

      toast.success("Retry dispatched");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry");
    }
  }, [activeTurn, id]);

  const getTurnArtifacts = useCallback(
    (turnId: string) => {
      return artifactsByTurn[turnId] ?? [];
    },
    [artifactsByTurn],
  );

  const hasEvidence = outcome === "executed";
  const isAdvisory = outcome === "advisory";
  const isFailed = outcome === "failed" || run?.status === "failed";

  if (loading || (fetching && !notFound)) {
    return (
      <UnifiedPageShell
        className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8"
        maxWidth="6xl"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </UnifiedPageShell>
    );
  }

  if (!user) return null;

  if (notFound || !run) {
    return (
      <UnifiedPageShell
        className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8"
        maxWidth="6xl"
      >
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 sm:gap-5 text-center">
          <p className="text-sm font-medium">Run not found</p>
          <Link
            href="/runs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Runs
          </Link>
        </div>
      </UnifiedPageShell>
    );
  }

  return (
    <UnifiedPageShell
      className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8 pb-24"
      maxWidth="6xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1 py-2 -mx-1">
        <Link
          href="/runs"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" />
          <span>Runs</span>
        </Link>
        {isFailed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRetry()}
            className="ml-auto"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed text-foreground break-words">
            {run.summary ?? `Run ${run.id.slice(0, 8)}`}
          </h1>
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <StatusBadge status={run.status} />
            <span className="inline-flex items-center rounded bg-muted px-2 sm:px-2.5 py-1 font-mono text-xs whitespace-nowrap">
              {run.runner}
            </span>
            {duration && (
              <span className="inline-flex items-center rounded bg-muted/60 px-2 sm:px-2.5 py-1 text-xs whitespace-nowrap">
                Duration: {duration}
              </span>
            )}
            <span className="inline-flex items-center rounded bg-muted/60 px-2 sm:px-2.5 py-1 text-xs whitespace-nowrap">
              Turns: {turns.length}
            </span>
            {outcome && (
              <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 sm:px-2.5 py-1 text-xs whitespace-nowrap">
                {outcomeIcon(outcome)}
                {outcome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Outputs */}
      <section className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Outputs
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {turns.length === 0 ? (
          <UnifiedCard>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-sm text-muted-foreground">
                No execution evidence
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This run has no recorded turns yet.
              </p>
            </div>
          </UnifiedCard>
        ) : (
          <div className="space-y-4">
            {turns.map((turn) => {
              const artifacts = getTurnArtifacts(turn.id);
              return (
                <UnifiedCard
                  key={turn.id}
                  className={cn(
                    "border-l-4",
                    turn.outcome_kind === "executed" && "border-l-emerald-500",
                    turn.outcome_kind === "advisory" && "border-l-amber-500",
                    turn.outcome_kind === "failed" && "border-l-red-500",
                    !turn.outcome_kind && "border-l-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {outcomeIcon(turn.outcome_kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          Turn {turn.idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({turn.kind})
                        </span>
                        {turn.status && <StatusBadge status={turn.status} />}
                      </div>
                      <p className="mt-2 text-sm font-medium">Prompt:</p>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded mt-1">
                        {turn.prompt}
                      </p>
                      {turn.output && (
                        <>
                          <p className="mt-3 text-sm font-medium">Output:</p>
                          <pre className="mt-1 text-xs bg-muted/50 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                            {turn.output.slice(0, 2000)}
                            {turn.output.length > 2000 ? "..." : ""}
                          </pre>
                        </>
                      )}
                      {turn.summary && !turn.output && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {turn.summary}
                        </p>
                      )}
                      {artifacts.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {artifacts.map((artifact, i) => (
                            <a
                              key={i}
                              href={artifact.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileJson className="h-3 w-3" />
                              {artifact.title ?? artifact.type}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </UnifiedCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Empty states */}
      {isAdvisory && (
        <UnifiedCard className="border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Advisory only</p>
              <p className="text-xs text-muted-foreground mt-1">
                This run provided suggestions but did not make any changes. Use
                the continue composer below to ask for implementation.
              </p>
            </div>
          </div>
        </UnifiedCard>
      )}

      {!hasEvidence && turns.length > 0 && !isAdvisory && !isFailed && (
        <UnifiedCard>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">No execution evidence</p>
              <p className="text-xs text-muted-foreground mt-1">
                This run completed but no code changes or tool executions were
                detected.
              </p>
            </div>
          </div>
        </UnifiedCard>
      )}

      {/* Suggestions */}
      {isAdvisory && (
        <section className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested Actions
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setContinuePrompt("Implement the suggested changes");
                document
                  .getElementById("continue-composer")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Implement suggestions
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setContinuePrompt(
                  "Provide more details about the implementation",
                );
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask for clarification
            </Button>
          </div>
        </section>
      )}

      {/* History */}
      {turns.length > 1 && (
        <section className="space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              History
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {turns.map((turn, i) => (
              <div
                key={turn.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card/50 text-sm"
              >
                <span className="text-xs text-muted-foreground w-8">
                  #{i + 1}
                </span>
                <span className="flex-1 truncate">
                  {turn.prompt.slice(0, 60)}...
                </span>
                {outcomeIcon(turn.outcome_kind)}
                <span className="text-xs text-muted-foreground">
                  {new Date(turn.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inspector */}
      <section className="space-y-5 sm:space-y-6">
        <button
          onClick={() => setShowInspector(!showInspector)}
          className="flex items-center gap-3 w-full group"
        >
          <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
            Inspector
          </span>
          <div className="flex-1 h-px bg-border" />
          {showInspector ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {showInspector && inspector && (
          <UnifiedCard>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(inspector, null, 2)}
            </pre>
          </UnifiedCard>
        )}
      </section>

      {/* Inline Continue Composer */}
      <div
        id="continue-composer"
        className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={continuePrompt}
              onChange={(e) => setContinuePrompt(e.target.value)}
              placeholder="Continue this run..."
              className="min-h-[44px] max-h-[120px] resize-none flex-1"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleContinue();
                }
              }}
            />
            <Button
              onClick={() => void handleContinue()}
              disabled={!continuePrompt.trim() || continuing}
              className="shrink-0"
            >
              {continuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
            Cmd+Enter to send · {continuePrompt.length} chars
          </p>
        </div>
      </div>
    </UnifiedPageShell>
  );
}
