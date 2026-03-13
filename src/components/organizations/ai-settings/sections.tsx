"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Layers3,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Wand2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  StudioHeader,
  StudioIconTile,
  StudioSectionCard,
  StudioStatCard,
  StudioSurface,
} from "@/components/ui/studio-shell";
import { CustomAgentModal } from "@/components/agent-ops/custom-agent-modal";
import { cardContainer, cardEntrance } from "@/lib/animations/motion-system";
import type { AIUseCase, WorkspaceAIPolicy } from "@/lib/ai/policy";
import {
  SettingsChoiceCard,
  SettingsField,
  SettingsSelectField,
  SettingsToolCard,
} from "./primitives";
import {
  ADVANCED_USE_CASES,
  AUDIT_LEVELS,
  CAPABILITY_MATRIX,
  PRIMARY_USE_CASES,
  PROVIDER_OPTIONS,
  TASK_PROMPTS,
  TOOL_MODE_OPTIONS,
  TOOL_OPTIONS,
} from "./constants";
import { formatList, splitList, type CustomAgentSummary } from "./utils";

type PolicyUpdater = (
  updater: (prev: WorkspaceAIPolicy) => WorkspaceAIPolicy,
) => void;

export function AccessDeniedNotice({ className }: { className?: string }) {
  return (
    <div className={className}>
      <StudioSurface tone="card">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-foreground">Admin access required</p>
            <p className="text-sm text-muted-foreground">
              You need admin or owner permissions to manage workspace AI
              settings.
            </p>
          </div>
        </div>
      </StudioSurface>
    </div>
  );
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-6">
        {[0, 1, 2].map((index) => (
          <StudioSurface
            key={index}
            tone="card"
            padding="lg"
            className="animate-pulse bg-background"
          >
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="mt-4 h-24 rounded bg-muted" />
          </StudioSurface>
        ))}
      </div>
    </div>
  );
}

export function AISettingsHeader({
  customizedUseCaseCount,
  totalUseCases,
  customAgentCount,
  overrideCount,
  toolCount,
  executionMode,
  isSaving,
  hasChanges,
  onSave,
}: {
  customizedUseCaseCount: number;
  totalUseCases: number;
  customAgentCount: number;
  overrideCount: number;
  toolCount: number;
  executionMode: WorkspaceAIPolicy["execution_mode"];
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
}) {
  const summaryItems = [
    {
      label: "Customized Use Cases",
      value: customizedUseCaseCount,
      hint: `${totalUseCases - customizedUseCaseCount} still inherit defaults`,
      icon: Layers3,
    },
    {
      label: "Custom Agents",
      value: customAgentCount,
      hint: `${overrideCount} override profiles configured`,
      icon: Bot,
    },
    {
      label: "Default Tool Allowlist",
      value: toolCount,
      hint: `Approval mode: ${executionMode === "semi_auto" ? "semi-auto" : "auto"}`,
      icon: Wrench,
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <StudioHeader
          eyebrow={
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              AI runtime control plane
            </span>
          }
          eyebrowClassName="tracking-normal"
          title="AI Routing, Tools & Prompts"
          titleClassName="text-2xl tracking-tight"
          description="Configure workspace-wide defaults, per-use-case model routing, and custom-agent overrides from one screen."
        />

        <Button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          size="lg"
          className="gap-2 self-start"
        >
          {isSaving ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {summaryItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
          >
            <StudioStatCard
              label={item.label}
              value={item.value}
              hint={item.hint}
              icon={item.icon}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function WorkspaceDefaultsSection({
  policy,
  updatePolicy,
}: {
  policy: WorkspaceAIPolicy;
  updatePolicy: PolicyUpdater;
}) {
  const systemInstructionsLimit = 2000;

  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <StudioSectionCard
        title="Workspace Defaults"
        description="Fallback rules applied when a use case does not specify its own routing profile."
        icon={Settings2}
        contentClassName="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]"
      >
        <div className="space-y-6">
          <SettingsField
            label="Global system instructions"
            htmlFor="workspace-system-instructions"
            hint={
              <div className="flex justify-between">
                <span>Used as the inherited base prompt across flows.</span>
                <span>
                  {policy.system_instructions.length} /{" "}
                  {systemInstructionsLimit}
                </span>
              </div>
            }
          >
            <Textarea
              id="workspace-system-instructions"
              rows={6}
              value={policy.system_instructions}
              onChange={(event) =>
                updatePolicy((prev) => ({
                  ...prev,
                  system_instructions: event.target.value.slice(
                    0,
                    systemInstructionsLimit,
                  ),
                }))
              }
              placeholder="Define the shared voice, risk posture, or quality bar for all workspace AI activity."
              className="resize-none"
            />
          </SettingsField>

          <div className="grid gap-3 md:grid-cols-3">
            {TASK_PROMPTS.map((prompt) => (
              <StudioSurface key={prompt.id} tone="muted">
                <SettingsField
                  label={prompt.title}
                  hint={prompt.description}
                  labelClassName="text-sm font-medium"
                >
                  <Textarea
                    rows={5}
                    value={policy.task_prompts[prompt.id]}
                    onChange={(event) =>
                      updatePolicy((prev) => ({
                        ...prev,
                        task_prompts: {
                          ...prev.task_prompts,
                          [prompt.id]: event.target.value,
                        },
                      }))
                    }
                    placeholder={prompt.placeholder}
                    className="resize-none bg-background"
                  />
                </SettingsField>
              </StudioSurface>
            ))}
          </div>

          <StudioSurface tone="plain">
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Default tool allowlist</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {TOOL_OPTIONS.map((tool) => {
                const enabled = policy.allowed_tools.includes(tool.id);
                return (
                  <SettingsToolCard
                    key={tool.id}
                    id={`default-tool-${tool.id}`}
                    title={tool.name}
                    description={tool.description}
                    checked={enabled}
                    tone="background"
                    className="cursor-pointer transition-colors hover:border-border hover:bg-muted/40"
                    onCheckedChange={() =>
                      updatePolicy((prev) => ({
                        ...prev,
                        allowed_tools: enabled
                          ? prev.allowed_tools.filter((id) => id !== tool.id)
                          : [...prev.allowed_tools, tool.id],
                      }))
                    }
                  />
                );
              })}
            </div>
          </StudioSurface>
        </div>

        <div className="space-y-6">
          <StudioSurface tone="muted">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Automation & approvals</div>
            </div>
            <div className="space-y-4">
              <SettingsField label="Execution mode">
                <RadioGroup
                  value={policy.execution_mode ?? "auto"}
                  onValueChange={(value) =>
                    updatePolicy((prev) => ({
                      ...prev,
                      execution_mode:
                        value as WorkspaceAIPolicy["execution_mode"],
                    }))
                  }
                  className="space-y-2"
                >
                  <SettingsChoiceCard
                    control={
                      <RadioGroupItem
                        value="auto"
                        id="exec-auto"
                        className="mt-1"
                      />
                    }
                    title="Auto"
                    description="AI may proceed when confidence and policy gates allow it."
                  />
                  <SettingsChoiceCard
                    control={
                      <RadioGroupItem
                        value="semi_auto"
                        id="exec-semi-auto"
                        className="mt-1"
                      />
                    }
                    title="Semi-auto"
                    description="Keep the system in review-heavy mode."
                  />
                </RadioGroup>
              </SettingsField>

              <SettingsField
                label="Confidence threshold for autonomous execution"
                htmlFor="approval-threshold"
              >
                <Input
                  id="approval-threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={
                    policy.approval_thresholds?.confidence_min_for_auto ?? 0.75
                  }
                  onChange={(event) =>
                    updatePolicy((prev) => ({
                      ...prev,
                      approval_thresholds: {
                        ...(prev.approval_thresholds ?? {}),
                        confidence_min_for_auto: Math.max(
                          0,
                          Math.min(1, Number(event.target.value) || 0.75),
                        ),
                      },
                    }))
                  }
                  className="max-w-[220px] bg-background"
                />
              </SettingsField>

              <div className="space-y-3">
                {[
                  {
                    key: "allow_task_creation",
                    label: "Allow task creation",
                    description: "Lets AI create new tasks and subtasks.",
                  },
                  {
                    key: "allow_task_updates",
                    label: "Allow task updates",
                    description: "Lets AI modify existing tasks.",
                  },
                  {
                    key: "allow_task_deletion",
                    label: "Allow task deletion",
                    description: "Lets AI permanently remove tasks.",
                  },
                  {
                    key: "require_approval_for_changes",
                    label: "Require approval for changes",
                    description: "Forces apply actions into approval mode.",
                  },
                ].map((row) => (
                  <SettingsChoiceCard
                    key={row.key}
                    title={row.label}
                    description={row.description}
                    control={
                      <Switch
                        checked={Boolean(
                          policy.constraints?.[
                            row.key as keyof NonNullable<
                              WorkspaceAIPolicy["constraints"]
                            >
                          ],
                        )}
                        onCheckedChange={(checked) =>
                          updatePolicy((prev) => ({
                            ...prev,
                            constraints: {
                              ...(prev.constraints ?? {}),
                              [row.key]: checked,
                            },
                          }))
                        }
                      />
                    }
                    controlPosition="end"
                    className="items-center justify-between"
                  />
                ))}
              </div>

              <SettingsField
                label="Workspace max tokens per request"
                htmlFor="max-tokens"
              >
                <Input
                  id="max-tokens"
                  type="number"
                  min={256}
                  max={32768}
                  step={256}
                  value={policy.constraints?.max_tokens_per_request ?? 4096}
                  onChange={(event) =>
                    updatePolicy((prev) => ({
                      ...prev,
                      constraints: {
                        ...(prev.constraints ?? {}),
                        max_tokens_per_request: Math.min(
                          32768,
                          Math.max(256, Number(event.target.value) || 4096),
                        ),
                      },
                    }))
                  }
                  className="max-w-[220px] bg-background"
                />
              </SettingsField>
            </div>
          </StudioSurface>

          <StudioSurface tone="muted">
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Audit level</div>
            </div>
            <RadioGroup
              value={policy.audit_level}
              onValueChange={(value) =>
                updatePolicy((prev) => ({
                  ...prev,
                  audit_level: value as WorkspaceAIPolicy["audit_level"],
                }))
              }
              className="space-y-2"
            >
              {AUDIT_LEVELS.map((level) => (
                <SettingsChoiceCard
                  key={level.value}
                  control={
                    <RadioGroupItem
                      value={level.value}
                      id={`audit-${level.value}`}
                      className="mt-1"
                    />
                  }
                  title={level.title}
                  description={level.description}
                />
              ))}
            </RadioGroup>
          </StudioSurface>

          <StudioSurface tone="plain" className="text-foreground">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Version Info
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Version</div>
                <div className="text-xl font-semibold">{policy.version}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated By</div>
                <div className="text-sm font-medium">
                  {policy.last_updated_by || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated At</div>
                <div className="text-sm font-medium">
                  {policy.last_updated_at
                    ? new Date(policy.last_updated_at).toLocaleString()
                    : "N/A"}
                </div>
              </div>
            </div>
          </StudioSurface>
        </div>
      </StudioSectionCard>
    </motion.div>
  );
}

export function CapabilityMatrixSection() {
  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <StudioSectionCard
        title="Capability Matrix"
        description="Start simple. Expand a use case only when it truly needs more power."
        icon={Layers3}
      >
        <motion.div
          variants={cardContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4"
        >
          {CAPABILITY_MATRIX.map((item) => (
            <motion.div
              key={item.mode}
              variants={cardEntrance}
              className="space-y-0"
            >
              <StudioSurface tone="card">
                <div className="mb-3 flex items-center gap-3">
                  <StudioIconTile
                    icon={item.icon}
                    tone="inverse"
                    className="h-9 w-9"
                  />
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {item.mode.replaceAll("_", " ")}
                    </div>
                  </div>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {item.summary}
                </p>
                <div className="space-y-1.5 text-xs text-foreground/80">
                  {item.details.map((detail) => (
                    <div key={detail}>· {detail}</div>
                  ))}
                </div>
              </StudioSurface>
            </motion.div>
          ))}
        </motion.div>
      </StudioSectionCard>
    </motion.div>
  );
}

type UseCaseRoutingSectionProps = {
  title: string;
  description: string;
  useCases: typeof PRIMARY_USE_CASES;
  policy: WorkspaceAIPolicy;
  expandedPrompts: string[];
  toggleExpanded: (id: string) => void;
  updateUseCaseModel: (
    useCase: AIUseCase,
    patch: Record<string, unknown>,
  ) => void;
  updateUseCaseTools: (
    useCase: AIUseCase,
    patch: Record<string, unknown>,
  ) => void;
  updateUseCasePrompts: (
    useCase: AIUseCase,
    patch: Record<string, unknown>,
  ) => void;
  updateUseCaseHandbooks: (useCase: AIUseCase, value: string) => void;
  toggleUseCaseTool: (useCase: AIUseCase, toolId: string) => void;
};

export function UseCaseRoutingSection({
  title,
  description,
  useCases,
  policy,
  expandedPrompts,
  toggleExpanded,
  updateUseCaseModel,
  updateUseCaseTools,
  updateUseCasePrompts,
  updateUseCaseHandbooks,
  toggleUseCaseTool,
}: UseCaseRoutingSectionProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <StudioSectionCard
        title={title}
        description={description}
        icon={title.includes("Advanced") ? Wand2 : Brain}
        contentClassName="space-y-4"
      >
        {useCases.map((useCase, index) => {
          const model = policy.model_profiles?.[useCase.id] ?? {};
          const tools = policy.tool_profiles?.[useCase.id] ?? {};
          const prompts = policy.prompt_profiles?.[useCase.id] ?? {};
          const handbooks =
            policy.skills_policy?.use_case_handbooks?.[useCase.id] ??
            prompts.handbook_slugs ??
            [];
          const isCustomized = Boolean(
            model.provider ||
            model.model ||
            model.fallback_chain?.length ||
            tools.tool_mode ||
            tools.allowed_tools?.length ||
            prompts.system_instructions ||
            prompts.prompt_instructions ||
            handbooks.length,
          );

          if (title.includes("Advanced")) {
            return (
              <StudioSurface key={useCase.id} tone="muted">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="font-medium">{useCase.title}</div>
                  <Badge variant="outline">{useCase.badge}</Badge>
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  {useCase.description}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <SettingsField label="Model">
                    <Input
                      value={model.model ?? ""}
                      onChange={(event) =>
                        updateUseCaseModel(useCase.id, {
                          model: event.target.value || undefined,
                        })
                      }
                      placeholder="Model"
                    />
                  </SettingsField>
                  <SettingsSelectField
                    label="Provider"
                    value={model.provider ?? "__default__"}
                    onValueChange={(value) =>
                      updateUseCaseModel(useCase.id, {
                        provider: value === "__default__" ? undefined : value,
                      })
                    }
                    placeholder="Provider"
                    inheritedLabel="Inherited provider"
                    options={PROVIDER_OPTIONS}
                  />
                  <SettingsSelectField
                    label="Tool mode"
                    value={tools.tool_mode ?? "__default__"}
                    onValueChange={(value) =>
                      updateUseCaseTools(useCase.id, {
                        tool_mode: value === "__default__" ? undefined : value,
                      })
                    }
                    placeholder="Tool mode"
                    inheritedLabel="Inherited tool mode"
                    options={TOOL_MODE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                  <SettingsField label="Fallback chain">
                    <Input
                      value={formatList(model.fallback_chain)}
                      onChange={(event) =>
                        updateUseCaseModel(useCase.id, {
                          fallback_chain: splitList(event.target.value),
                        })
                      }
                      placeholder="Fallback chain"
                    />
                  </SettingsField>
                </div>
              </StudioSurface>
            );
          }

          return (
            <motion.div
              key={useCase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
            >
              <Collapsible
                open={expandedPrompts.includes(useCase.id)}
                onOpenChange={() => toggleExpanded(useCase.id)}
              >
                <StudioSurface
                  tone="plain"
                  padding="none"
                  className="overflow-hidden"
                >
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between gap-4 bg-muted/20 px-5 py-4 text-left transition-colors hover:bg-muted/35">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{useCase.title}</span>
                          <Badge
                            variant={isCustomized ? "default" : "secondary"}
                          >
                            {isCustomized ? "Customized" : "Inherited"}
                          </Badge>
                          <Badge variant="outline">{useCase.badge}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {useCase.description}
                        </div>
                      </div>
                      {expandedPrompts.includes(useCase.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="grid gap-5 border-t border-border px-5 py-5 xl:grid-cols-[0.92fr_1.08fr]">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <SettingsSelectField
                            label="Provider"
                            value={model.provider ?? "__default__"}
                            onValueChange={(value) =>
                              updateUseCaseModel(useCase.id, {
                                provider:
                                  value === "__default__" ? undefined : value,
                              })
                            }
                            placeholder="Use workspace default"
                            inheritedLabel="Use workspace default"
                            options={PROVIDER_OPTIONS}
                          />

                          <SettingsSelectField
                            label="Tool mode"
                            value={tools.tool_mode ?? "__default__"}
                            onValueChange={(value) =>
                              updateUseCaseTools(useCase.id, {
                                tool_mode:
                                  value === "__default__" ? undefined : value,
                              })
                            }
                            placeholder="Use workspace default"
                            inheritedLabel="Use workspace default"
                            hint={
                              TOOL_MODE_OPTIONS.find(
                                (option) => option.value === tools.tool_mode,
                              )?.description ??
                              "Falls back to the workspace tool profile."
                            }
                            options={TOOL_MODE_OPTIONS.map((option) => ({
                              value: option.value,
                              label: option.label,
                            }))}
                          />
                        </div>

                        <SettingsField label="Model identifier">
                          <Input
                            value={model.model ?? ""}
                            onChange={(event) =>
                              updateUseCaseModel(useCase.id, {
                                model: event.target.value || undefined,
                              })
                            }
                            placeholder="claude-opus-4-6, gpt-5-mini, glm-5..."
                          />
                        </SettingsField>

                        <div className="grid gap-4 md:grid-cols-3">
                          <SettingsField label="Temperature">
                            <Input
                              type="number"
                              min={0}
                              max={2}
                              step={0.05}
                              value={model.temperature ?? ""}
                              onChange={(event) =>
                                updateUseCaseModel(useCase.id, {
                                  temperature:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                              placeholder="Inherited"
                            />
                          </SettingsField>
                          <SettingsField label="Max tokens">
                            <Input
                              type="number"
                              min={1}
                              max={32768}
                              step={128}
                              value={model.max_tokens ?? ""}
                              onChange={(event) =>
                                updateUseCaseModel(useCase.id, {
                                  max_tokens:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                              placeholder="Inherited"
                            />
                          </SettingsField>
                          <SettingsField label="Fallback chain">
                            <Input
                              value={formatList(model.fallback_chain)}
                              onChange={(event) =>
                                updateUseCaseModel(useCase.id, {
                                  fallback_chain: splitList(event.target.value),
                                })
                              }
                              placeholder="glm-5, codex-standard"
                            />
                          </SettingsField>
                        </div>

                        <SettingsField label="Handbook slugs">
                          <Input
                            value={formatList(handbooks)}
                            onChange={(event) =>
                              updateUseCaseHandbooks(
                                useCase.id,
                                event.target.value,
                              )
                            }
                            placeholder="general, coding, product..."
                          />
                        </SettingsField>
                      </div>

                      <div className="space-y-4">
                        <SettingsField label="System instruction override">
                          <Textarea
                            rows={4}
                            value={prompts.system_instructions ?? ""}
                            onChange={(event) =>
                              updateUseCasePrompts(useCase.id, {
                                system_instructions:
                                  event.target.value || undefined,
                              })
                            }
                            placeholder="Optional system-level override for this use case."
                            className="resize-none"
                          />
                        </SettingsField>

                        <SettingsField label="Prompt instructions">
                          <Textarea
                            rows={5}
                            value={prompts.prompt_instructions ?? ""}
                            onChange={(event) =>
                              updateUseCasePrompts(useCase.id, {
                                prompt_instructions:
                                  event.target.value || undefined,
                              })
                            }
                            placeholder="Add concise behavior or output-format guidance for this use case."
                            className="resize-none"
                          />
                        </SettingsField>

                        <SettingsField label="Allowed tools for this use case">
                          <div className="grid gap-2 md:grid-cols-2">
                            {TOOL_OPTIONS.map((tool) => {
                              const checked =
                                tools.allowed_tools?.includes(tool.id) ?? false;
                              return (
                                <SettingsToolCard
                                  key={tool.id}
                                  title={tool.name}
                                  description={tool.description}
                                  checked={checked}
                                  onCheckedChange={() =>
                                    toggleUseCaseTool(useCase.id, tool.id)
                                  }
                                />
                              );
                            })}
                          </div>
                        </SettingsField>
                      </div>
                    </div>
                  </CollapsibleContent>
                </StudioSurface>
              </Collapsible>
            </motion.div>
          );
        })}
      </StudioSectionCard>
    </motion.div>
  );
}

export function CustomAgentOverridesSection({
  workspaceId,
  policy,
  customAgents,
  reload,
  updateAgentProfile,
  toggleAgentTool,
}: {
  workspaceId: string;
  policy: WorkspaceAIPolicy;
  customAgents: CustomAgentSummary[];
  reload: () => Promise<void>;
  updateAgentProfile: (agentId: string, patch: Record<string, unknown>) => void;
  toggleAgentTool: (agentId: string, toolId: string) => void;
}) {
  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <StudioSectionCard
        title="Custom Agent Overrides"
        description="Tune model, tools, and prompt overlays for custom agents in this workspace."
        icon={Bot}
        actions={
          <CustomAgentModal
            workspaceId={workspaceId}
            onSaved={() => void reload()}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 self-start"
              >
                <Bot className="h-4 w-4" />
                Manage Agents
              </Button>
            }
          />
        }
        contentClassName="space-y-4"
      >
        {customAgents.length === 0 ? (
          <StudioSurface tone="dashed" className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium">
              No custom agents found for this workspace
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Create custom agents first, then their runtime override controls
              will appear here.
            </div>
          </StudioSurface>
        ) : (
          customAgents.map((agent, index) => {
            const override = policy.agent_profiles?.[agent.id] ?? {};
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="space-y-0"
              >
                <StudioSurface tone="plain" className="p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{agent.name}</div>
                        <Badge variant="outline">{agent.lane}</Badge>
                        {!agent.active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {agent.description || `Slug: ${agent.slug}`}
                      </div>
                    </div>
                    <CustomAgentModal
                      workspaceId={workspaceId}
                      agentId={agent.id}
                      onSaved={() => void reload()}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          <Settings2 className="h-4 w-4" />
                          Edit agent
                        </Button>
                      }
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SettingsSelectField
                          label="Provider"
                          value={override.provider ?? "__default__"}
                          onValueChange={(value) =>
                            updateAgentProfile(agent.id, {
                              provider:
                                value === "__default__" ? undefined : value,
                            })
                          }
                          placeholder="Provider"
                          inheritedLabel="Inherited provider"
                          options={PROVIDER_OPTIONS}
                        />
                        <SettingsSelectField
                          label="Tool mode"
                          value={override.tool_mode ?? "__default__"}
                          onValueChange={(value) =>
                            updateAgentProfile(agent.id, {
                              tool_mode:
                                value === "__default__" ? undefined : value,
                            })
                          }
                          placeholder="Tool mode"
                          inheritedLabel="Inherited tool mode"
                          options={TOOL_MODE_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                        />
                      </div>

                      <SettingsField label="Model override">
                        <Input
                          value={override.model ?? ""}
                          onChange={(event) =>
                            updateAgentProfile(agent.id, {
                              model: event.target.value || undefined,
                            })
                          }
                          placeholder="Model override"
                        />
                      </SettingsField>

                      <div className="grid gap-4 md:grid-cols-3">
                        <SettingsField label="Temperature">
                          <Input
                            type="number"
                            min={0}
                            max={2}
                            step={0.05}
                            value={override.temperature ?? ""}
                            onChange={(event) =>
                              updateAgentProfile(agent.id, {
                                temperature:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                            placeholder="Temperature"
                          />
                        </SettingsField>
                        <SettingsField label="Max tokens">
                          <Input
                            type="number"
                            min={1}
                            max={32768}
                            step={128}
                            value={override.max_tokens ?? ""}
                            onChange={(event) =>
                              updateAgentProfile(agent.id, {
                                max_tokens:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                            placeholder="Max tokens"
                          />
                        </SettingsField>
                        <SettingsField label="Fallback chain">
                          <Input
                            value={formatList(override.fallback_chain)}
                            onChange={(event) =>
                              updateAgentProfile(agent.id, {
                                fallback_chain: splitList(event.target.value),
                              })
                            }
                            placeholder="Fallback chain"
                          />
                        </SettingsField>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <SettingsField label="System prompt override">
                        <Textarea
                          rows={4}
                          value={override.system_prompt ?? ""}
                          onChange={(event) =>
                            updateAgentProfile(agent.id, {
                              system_prompt: event.target.value || undefined,
                            })
                          }
                          placeholder="Optional runtime system prompt override for this agent."
                          className="resize-none"
                        />
                      </SettingsField>
                      <SettingsField label="Handbook slugs">
                        <Input
                          value={formatList(override.handbook_slugs)}
                          onChange={(event) =>
                            updateAgentProfile(agent.id, {
                              handbook_slugs: splitList(event.target.value),
                            })
                          }
                          placeholder="Handbook slugs"
                        />
                      </SettingsField>
                      <div className="grid gap-2 md:grid-cols-2">
                        {TOOL_OPTIONS.map((tool) => {
                          const checked =
                            override.allowed_tools?.includes(tool.id) ?? false;
                          return (
                            <SettingsToolCard
                              key={`${agent.id}-${tool.id}`}
                              title={tool.name}
                              description={tool.description}
                              checked={checked}
                              onCheckedChange={() =>
                                toggleAgentTool(agent.id, tool.id)
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </StudioSurface>
              </motion.div>
            );
          })
        )}
      </StudioSectionCard>
    </motion.div>
  );
}

export function MobileSaveBar({
  hasChanges,
  customizedUseCaseCount,
  isSaving,
  onSave,
}: {
  hasChanges: boolean;
  customizedUseCaseCount: number;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="fixed inset-x-4 bottom-4 z-20 md:hidden"
        >
          <StudioSurface tone="plain" padding="sm" className="shadow-lg">
            <div className="mb-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">Unsaved AI settings</div>
                <div className="text-muted-foreground">
                  Routing, prompts, or overrides changed.
                </div>
              </div>
              <Badge>{customizedUseCaseCount} tuned</Badge>
            </div>
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save AI Settings
                </>
              )}
            </Button>
          </StudioSurface>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { PRIMARY_USE_CASES, ADVANCED_USE_CASES };
