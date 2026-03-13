"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, ChevronRight, Shield, Sparkles } from "lucide-react";
import AISettingsTab from "@/components/organizations/ai-settings-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkspaceOption = {
  id: string;
  name: string;
  slug: string;
};

export function AIControlClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceIdParam = searchParams?.get("workspace_id") ?? "";
  const initialTab = searchParams?.get("tab") ?? "runtime";

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState(workspaceIdParam);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSelectedWorkspaceId(workspaceIdParam);
  }, [workspaceIdParam]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/workspaces", {
          credentials: "include",
        });
        const json = await response.json();
        const items = (json?.data?.workspaces ??
          json?.workspaces ??
          []) as WorkspaceOption[];
        if (cancelled) return;
        setWorkspaces(items);

        if (!selectedWorkspaceId && items.length > 0) {
          const nextId = items[0].id;
          setSelectedWorkspaceId(nextId);
          const next = new URLSearchParams(searchParams?.toString());
          next.set("workspace_id", nextId);
          router.replace(`/ai-control?${next.toString()}`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadWorkspaces();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, selectedWorkspaceId]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    null;

  const handleWorkspaceChange = (nextWorkspaceId: string) => {
    setSelectedWorkspaceId(nextWorkspaceId);
    const next = new URLSearchParams(searchParams?.toString());
    next.set("workspace_id", nextWorkspaceId);
    router.replace(`/ai-control?${next.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-6 py-6 shadow-sm">
          <div
            className="signal-grid absolute inset-0 opacity-30"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
                  AI control
                </span>
                {selectedWorkspace ? (
                  <span className="normal-case tracking-normal text-sm font-medium text-foreground">
                    {selectedWorkspace.name}
                  </span>
                ) : null}
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-foreground">
                Runtime, agents, and guardrails for the current workspace.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                This is the AI control layer for the selected workspace. Tune
                runtime defaults here, then return to the workspace to keep
                working with the same agents and policies in context.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background">
                  <Bot className="mr-1 h-3.5 w-3.5" />
                  Workspace-scoped runtime
                </Badge>
                <Badge variant="outline" className="bg-background">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Custom agent overrides
                </Badge>
                <Badge variant="outline" className="bg-background">
                  <Shield className="mr-1 h-3.5 w-3.5" />
                  Guardrails and fleet links
                </Badge>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-md">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Workspace
                </div>
                <Select
                  value={selectedWorkspaceId || undefined}
                  onValueChange={handleWorkspaceChange}
                  disabled={isLoading || workspaces.length === 0}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue
                      placeholder={
                        isLoading ? "Loading workspaces..." : "Select workspace"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkspace ? (
                <Button
                  asChild
                  variant="outline"
                  className="justify-between bg-background"
                >
                  <Link href={`/workspaces/${selectedWorkspace.id}`}>
                    Return to workspace
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 rounded-2xl border border-border/60 bg-background/80 p-1">
            <TabsTrigger value="runtime">Workspace runtime</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="runtime" className="space-y-6">
            {selectedWorkspaceId ? (
              <AISettingsTab
                workspaceId={selectedWorkspaceId}
                currentUserRole="admin"
                className="space-y-6"
              />
            ) : (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Select a workspace to load its AI runtime settings.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>What belongs here</CardTitle>
                <CardDescription>
                  AI settings should control how the workspace thinks and acts,
                  not take you into team administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  Use this surface to tune model routing, allowed tools,
                  prompts, and agent-specific overrides for the selected
                  workspace.
                </p>
                <p>
                  Team members, invitations, and workspace metadata still belong
                  in organization administration.
                </p>
                {selectedWorkspace ? (
                  <p>
                    Current workspace:{" "}
                    <span className="font-medium text-foreground">
                      {selectedWorkspace.name}
                    </span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardrails" className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Guardrails and fleet controls</CardTitle>
                <CardDescription>
                  Global pause state and policy management stay available here
                  as linked control surfaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/policies">Open guardrails</Link>
                </Button>
                {selectedWorkspace ? (
                  <Button asChild variant="outline">
                    <Link href={`/workspaces/${selectedWorkspace.id}`}>
                      Back to workspace
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
