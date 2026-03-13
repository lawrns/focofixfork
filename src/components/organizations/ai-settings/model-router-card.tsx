"use client";

import { Bot, ChevronsUpDown, Route } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StudioSectionCard, StudioSurface } from "@/components/ui/studio-shell";
import type { WorkspaceAIPolicy, AIUseCase } from "@/lib/ai/policy";
import { MODEL_CATALOG } from "@/components/organizations/ai-settings/constants";
import {
  SettingsField,
  SettingsSelectField,
} from "@/components/organizations/ai-settings/primitives";
import {
  ADVANCED_USE_CASES,
  PRIMARY_USE_CASES,
} from "@/components/organizations/ai-settings/constants";
import {
  getModelProvider,
  getModelRuntimeSourceLabel,
} from "@/lib/ai/model-catalog";
import { useAIHealth } from "@/lib/hooks/use-ai-health";

const GENERAL_USE_CASES = [...PRIMARY_USE_CASES, ...ADVANCED_USE_CASES]
  .map((item) => item.id)
  .filter(
    (id) => !id.startsWith("pipeline_") && !id.startsWith("command_surface_"),
  ) as AIUseCase[];

const PIPELINE_CHAIN_USE_CASES: Array<{ id: AIUseCase; label: string }> = [
  { id: "pipeline_plan", label: "Pipeline plan" },
  { id: "pipeline_execute", label: "Pipeline execute" },
  { id: "pipeline_review", label: "Pipeline review" },
  { id: "command_surface_plan", label: "Command plan" },
  { id: "command_surface_execute", label: "Command execute" },
  { id: "command_surface_review", label: "Command review" },
];

const GENERAL_MODELS = MODEL_CATALOG.filter((entry) => !entry.pipelineOnly);
const PIPELINE_MODELS = MODEL_CATALOG;

function setModelForUseCases(
  policy: WorkspaceAIPolicy,
  useCases: AIUseCase[],
  model: string,
  fallbackChain?: string[],
): WorkspaceAIPolicy {
  const provider = getModelProvider(model);
  return {
    ...policy,
    model_profiles: {
      ...(policy.model_profiles ?? {}),
      ...Object.fromEntries(
        useCases.map((useCase) => [
          useCase,
          {
            ...(policy.model_profiles?.[useCase] ?? {}),
            model,
            provider,
            ...(fallbackChain ? { fallback_chain: fallbackChain } : {}),
          },
        ]),
      ),
    },
  };
}

export function ModelRouterCard({
  policy,
  updatePolicy,
}: {
  policy: WorkspaceAIPolicy;
  updatePolicy: (
    updater: (prev: WorkspaceAIPolicy) => WorkspaceAIPolicy,
  ) => void;
}) {
  const { getModelHealth, loading: healthLoading } = useAIHealth();
  const generalDefault = policy.model_profiles?.task_action?.model ?? "glm-5";
  const fallbackChain = policy.model_profiles?.task_action?.fallback_chain ?? [
    "claude-opus-4-6",
    "glm-5",
  ];
  const plannerModel = policy.model_profiles?.pipeline_plan?.model ?? "glm-5";
  const executorModel =
    policy.model_profiles?.pipeline_execute?.model ?? "kimi-k2-standard";
  const reviewerModel =
    policy.model_profiles?.pipeline_review?.model ?? "glm-5";
  const generalHealth = getModelHealth(generalDefault);

  return (
    <StudioSectionCard
      title="Model Router"
      description="Set one recommended default model, keep an ordered fallback chain, and tune the plan / execute / review chain in one place."
      icon={Route}
      contentClassName="space-y-6"
    >
      <StudioSurface tone="muted">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Recommended default model</div>
            <div className="text-xs text-muted-foreground">
              Applied as the baseline across general AI use cases.
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <SettingsField label="Default model">
            <Select
              value={generalDefault}
              onValueChange={(value) =>
                updatePolicy((prev) =>
                  setModelForUseCases(
                    prev,
                    GENERAL_USE_CASES,
                    value,
                    fallbackChain,
                  ),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a default model" />
              </SelectTrigger>
              <SelectContent>
                {GENERAL_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Runtime source">
            <StudioSurface tone="inset" padding="sm" className="text-sm">
              <div>
                {getModelRuntimeSourceLabel(generalDefault) ?? "Inherited"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {healthLoading
                  ? "Checking availability..."
                  : generalHealth?.available
                    ? generalHealth.reason
                    : (generalHealth?.reason ?? "Health unavailable")}
              </div>
            </StudioSurface>
          </SettingsField>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const selected = fallbackChain[index] ?? "__none__";
            return (
              <SettingsField key={index} label={`Fallback ${index + 1}`}>
                <Select
                  value={selected}
                  onValueChange={(value) => {
                    const next = [...fallbackChain];
                    if (value === "__none__") next.splice(index, 1);
                    else next[index] = value;
                    const normalized = next.filter(Boolean).slice(0, 3);
                    updatePolicy((prev) =>
                      setModelForUseCases(
                        prev,
                        GENERAL_USE_CASES,
                        generalDefault,
                        normalized,
                      ),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {GENERAL_MODELS.filter(
                      (model) => model.value !== generalDefault,
                    ).map((model) => (
                      <SelectItem
                        key={`${index}-${model.value}`}
                        value={model.value}
                      >
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[generalDefault, ...fallbackChain]
            .filter(Boolean)
            .map((model, index) => (
              <Badge
                key={`${model}-${index}`}
                variant={
                  getModelHealth(model)?.available
                    ? index === 0
                      ? "default"
                      : "outline"
                    : "destructive"
                }
              >
                {index === 0 ? "Primary" : `Fallback ${index}`} · {model}
              </Badge>
            ))}
        </div>
      </StudioSurface>

      <StudioSurface tone="plain">
        <div className="mb-4 flex items-center gap-2">
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              Plan / execute / review chain
            </div>
            <div className="text-xs text-muted-foreground">
              These defaults drive both the pipeline screen and the command
              surface.
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Planner",
              value: plannerModel,
              useCases: [
                "pipeline_plan",
                "command_surface_plan",
              ] as AIUseCase[],
            },
            {
              label: "Executor",
              value: executorModel,
              useCases: [
                "pipeline_execute",
                "command_surface_execute",
              ] as AIUseCase[],
            },
            {
              label: "Reviewer",
              value: reviewerModel,
              useCases: [
                "pipeline_review",
                "command_surface_review",
              ] as AIUseCase[],
            },
          ].map((item) => (
            <SettingsSelectField
              key={item.label}
              label={item.label}
              value={item.value}
              onValueChange={(value) =>
                updatePolicy((prev) =>
                  setModelForUseCases(
                    prev,
                    item.useCases,
                    value,
                    prev.model_profiles?.[item.useCases[0]]?.fallback_chain,
                  ),
                )
              }
              placeholder={`Select ${item.label.toLowerCase()} model`}
              hint={getModelRuntimeSourceLabel(item.value) ?? "Inherited"}
              options={PIPELINE_MODELS.map((model) => ({
                value: model.value,
                label: model.label,
              }))}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {PIPELINE_CHAIN_USE_CASES.map((item) => {
            const model =
              policy.model_profiles?.[item.id]?.model ?? generalDefault;
            return (
              <StudioSurface
                key={item.id}
                tone="muted"
                padding="sm"
                className="text-xs"
              >
                <div className="font-medium">{item.label}</div>
                <div className="mt-1 text-muted-foreground">{model}</div>
              </StudioSurface>
            );
          })}
        </div>
      </StudioSurface>
    </StudioSectionCard>
  );
}
