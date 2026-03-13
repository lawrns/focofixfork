"use client";

import {
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Mail,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceSetupGuideProps = {
  compact: boolean;
  pagesCount: number;
  databasesCount: number;
  connectorsCount: number;
  automationsCount: number;
  onCreatePage: () => void;
  onCreateDatabase: () => void;
  onOpenConnectors: () => void;
  onOpenAssistant: () => void;
  onOpenAutomations: () => void;
};

export function WorkspaceSetupGuide({
  compact,
  pagesCount,
  databasesCount,
  connectorsCount,
  automationsCount,
  onCreatePage,
  onCreateDatabase,
  onOpenConnectors,
  onOpenAssistant,
  onOpenAutomations,
}: WorkspaceSetupGuideProps) {
  const steps = [
    {
      title: "Create a page",
      detail: "Start the workspace with notes, SOPs, or a working brief.",
      complete: pagesCount > 0,
      action: onCreatePage,
      cta: "Create page",
      icon: FileText,
    },
    {
      title: "Add a database",
      detail: "Track structured work like issues, deals, hiring, or requests.",
      complete: databasesCount > 0,
      action: onCreateDatabase,
      cta: "Add database",
      icon: Database,
    },
    {
      title: "Connect Slack or mail",
      detail: "Let the assistant work through approved outside channels.",
      complete: connectorsCount > 0,
      action: onOpenConnectors,
      cta: "Connect channel",
      icon: Mail,
    },
    {
      title: "Ask the assistant to help",
      detail: "Generate structure, rewrite docs, and suggest the next action.",
      complete: false,
      action: onOpenAssistant,
      cta: "Open assistant",
      icon: Bot,
    },
    {
      title: "Save repeat work as automation",
      detail: "Turn routines into reusable runs the team can trust.",
      complete: automationsCount > 0,
      action: onOpenAutomations,
      cta: "Create automation",
      icon: Workflow,
    },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl bg-muted/30 px-4 py-4 sm:px-5",
        compact ? "border border-border/30" : "border border-border/50",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Why use this
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            Use this to turn repeat work into an organized system the assistant
            can help run.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Instead of starting with blank docs and tables, you give the
            workspace a job, approve the first draft, and then use the assistant
            to improve the workflow over time.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {steps.filter((step) => step.complete).length} of {steps.length} steps
          in motion
        </div>
      </div>

      <div
        className={cn(
          "mt-4 grid gap-3",
          compact ? "lg:grid-cols-5" : "lg:grid-cols-5",
        )}
      >
        {steps.map((step, index) => (
          <div
            key={step.title}
            className={cn(
              "rounded-2xl px-3 py-3 transition",
              step.complete ? "bg-background/80" : "bg-background/60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    step.complete
                      ? "bg-emerald-500/12 text-emerald-700"
                      : "bg-muted text-foreground",
                  )}
                >
                  {step.complete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Step {index + 1}
                </div>
              </div>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {step.title}
            </h3>
            <p
              className={cn(
                "mt-1 text-sm leading-5 text-muted-foreground",
                compact && step.complete ? "line-clamp-2" : "",
              )}
            >
              {step.detail}
            </p>
            <Button
              variant={step.complete ? "ghost" : "secondary"}
              size="sm"
              className="mt-3 h-8"
              onClick={step.action}
            >
              {step.cta}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
