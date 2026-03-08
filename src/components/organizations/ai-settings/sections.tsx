'use client'

import { AnimatePresence, motion } from 'framer-motion'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CustomAgentModal } from '@/components/agent-ops/custom-agent-modal'
import { cardContainer, cardEntrance } from '@/lib/animations/motion-system'
import type { AIUseCase, WorkspaceAIPolicy } from '@/lib/ai/policy'
import {
  ADVANCED_USE_CASES,
  AUDIT_LEVELS,
  CAPABILITY_MATRIX,
  PRIMARY_USE_CASES,
  PROVIDER_OPTIONS,
  TASK_PROMPTS,
  TOOL_MODE_OPTIONS,
  TOOL_OPTIONS,
} from './constants'
import { formatList, splitList, type CustomAgentSummary } from './utils'

type PolicyUpdater = (updater: (prev: WorkspaceAIPolicy) => WorkspaceAIPolicy) => void

export function AccessDeniedNotice({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Card className="border-amber-200/70 bg-amber-50/60">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-950">Admin access required</p>
              <p className="text-sm text-amber-800">
                You need admin or owner permissions to manage workspace AI settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse rounded-2xl border bg-background p-6">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="mt-4 h-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
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
  customizedUseCaseCount: number
  totalUseCases: number
  customAgentCount: number
  overrideCount: number
  toolCount: number
  executionMode: WorkspaceAIPolicy['execution_mode']
  isSaving: boolean
  hasChanges: boolean
  onSave: () => void
}) {
  const summaryItems = [
    {
      label: 'Customized Use Cases',
      value: customizedUseCaseCount,
      hint: `${totalUseCases - customizedUseCaseCount} still inherit defaults`,
      icon: Layers3,
    },
    {
      label: 'Custom Agents',
      value: customAgentCount,
      hint: `${overrideCount} override profiles configured`,
      icon: Bot,
    },
    {
      label: 'Default Tool Allowlist',
      value: toolCount,
      hint: `Approval mode: ${executionMode === 'semi_auto' ? 'semi-auto' : 'auto'}`,
      icon: Wrench,
    },
  ]

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900">
            <Sparkles className="h-3.5 w-3.5" />
            AI runtime control plane
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">AI Routing, Tools & Prompts</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Configure workspace-wide defaults, per-use-case model routing, and custom-agent overrides from one screen.
            </p>
          </div>
        </div>

        <Button onClick={onSave} disabled={isSaving || !hasChanges} size="lg" className="gap-2 self-start">
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
            <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-slate-900 p-3 text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                  <div className="text-2xl font-semibold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.hint}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  )
}

export function WorkspaceDefaultsSection({
  policy,
  updatePolicy,
}: {
  policy: WorkspaceAIPolicy
  updatePolicy: PolicyUpdater
}) {
  const systemInstructionsLimit = 2000

  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Workspace Defaults</h3>
              <p className="text-sm text-white/70">
                Fallback rules applied when a use case does not specify its own routing profile.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-6 pt-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspace-system-instructions">Global system instructions</Label>
              <Textarea
                id="workspace-system-instructions"
                rows={6}
                value={policy.system_instructions}
                onChange={(event) =>
                  updatePolicy((prev) => ({
                    ...prev,
                    system_instructions: event.target.value.slice(0, systemInstructionsLimit),
                  }))
                }
                placeholder="Define the shared voice, risk posture, or quality bar for all workspace AI activity."
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used as the inherited base prompt across flows.</span>
                <span>{policy.system_instructions.length} / {systemInstructionsLimit}</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {TASK_PROMPTS.map((prompt) => (
                <div key={prompt.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 text-sm font-medium">{prompt.title}</div>
                  <p className="mb-3 text-xs text-muted-foreground">{prompt.description}</p>
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
                    className="resize-none bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-600" />
                <div className="text-sm font-medium">Default tool allowlist</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {TOOL_OPTIONS.map((tool) => {
                  const enabled = policy.allowed_tools.includes(tool.id)
                  return (
                    <label
                      key={tool.id}
                      htmlFor={`default-tool-${tool.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Checkbox
                        id={`default-tool-${tool.id}`}
                        checked={enabled}
                        onCheckedChange={() =>
                          updatePolicy((prev) => ({
                            ...prev,
                            allowed_tools: enabled
                              ? prev.allowed_tools.filter((id) => id !== tool.id)
                              : [...prev.allowed_tools, tool.id],
                          }))
                        }
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-600" />
                <div className="text-sm font-medium">Automation & approvals</div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Execution mode</Label>
                  <RadioGroup
                    value={policy.execution_mode ?? 'auto'}
                    onValueChange={(value) =>
                      updatePolicy((prev) => ({
                        ...prev,
                        execution_mode: value as WorkspaceAIPolicy['execution_mode'],
                      }))
                    }
                    className="space-y-2"
                  >
                    <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                      <RadioGroupItem value="auto" id="exec-auto" className="mt-1" />
                      <div>
                        <div className="text-sm font-medium">Auto</div>
                        <div className="text-xs text-muted-foreground">AI may proceed when confidence and policy gates allow it.</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border bg-white p-3">
                      <RadioGroupItem value="semi_auto" id="exec-semi-auto" className="mt-1" />
                      <div>
                        <div className="text-sm font-medium">Semi-auto</div>
                        <div className="text-xs text-muted-foreground">Keep the system in review-heavy mode.</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-threshold">Confidence threshold for autonomous execution</Label>
                  <Input
                    id="approval-threshold"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={policy.approval_thresholds?.confidence_min_for_auto ?? 0.75}
                    onChange={(event) =>
                      updatePolicy((prev) => ({
                        ...prev,
                        approval_thresholds: {
                          ...(prev.approval_thresholds ?? {}),
                          confidence_min_for_auto: Math.max(0, Math.min(1, Number(event.target.value) || 0.75)),
                        },
                      }))
                    }
                    className="max-w-[220px] bg-white"
                  />
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'allow_task_creation', label: 'Allow task creation', description: 'Lets AI create new tasks and subtasks.' },
                    { key: 'allow_task_updates', label: 'Allow task updates', description: 'Lets AI modify existing tasks.' },
                    { key: 'allow_task_deletion', label: 'Allow task deletion', description: 'Lets AI permanently remove tasks.' },
                    { key: 'require_approval_for_changes', label: 'Require approval for changes', description: 'Forces apply actions into approval mode.' },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 rounded-xl border bg-white p-3">
                      <div>
                        <div className="text-sm font-medium">{row.label}</div>
                        <div className="text-xs text-muted-foreground">{row.description}</div>
                      </div>
                      <Switch
                        checked={Boolean(policy.constraints?.[row.key as keyof NonNullable<WorkspaceAIPolicy['constraints']>])}
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
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Workspace max tokens per request</Label>
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
                          max_tokens_per_request: Math.min(32768, Math.max(256, Number(event.target.value) || 4096)),
                        },
                      }))
                    }
                    className="max-w-[220px] bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-600" />
                <div className="text-sm font-medium">Audit level</div>
              </div>
              <RadioGroup
                value={policy.audit_level}
                onValueChange={(value) =>
                  updatePolicy((prev) => ({
                    ...prev,
                    audit_level: value as WorkspaceAIPolicy['audit_level'],
                  }))
                }
                className="space-y-2"
              >
                {AUDIT_LEVELS.map((level) => (
                  <label key={level.value} className="flex items-start gap-3 rounded-xl border bg-white p-3">
                    <RadioGroupItem value={level.value} id={`audit-${level.value}`} className="mt-1" />
                    <div>
                      <div className="text-sm font-medium">{level.title}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-white/60">Version Info</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs text-white/60">Version</div>
                  <div className="text-xl font-semibold">{policy.version}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Updated By</div>
                  <div className="text-sm font-medium">{policy.last_updated_by || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Updated At</div>
                  <div className="text-sm font-medium">{policy.last_updated_at ? new Date(policy.last_updated_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function CapabilityMatrixSection() {
  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5" />
            Capability Matrix
          </CardTitle>
          <CardDescription>
            Start simple. Expand a use case only when it truly needs more power.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div variants={cardContainer} initial="hidden" animate="visible" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {CAPABILITY_MATRIX.map((item) => (
              <motion.div key={item.mode} variants={cardEntrance} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.mode.replaceAll('_', ' ')}</div>
                  </div>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{item.summary}</p>
                <div className="space-y-1.5 text-xs text-foreground/80">
                  {item.details.map((detail) => (
                    <div key={detail}>· {detail}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

type UseCaseRoutingSectionProps = {
  title: string
  description: string
  useCases: typeof PRIMARY_USE_CASES
  policy: WorkspaceAIPolicy
  expandedPrompts: string[]
  toggleExpanded: (id: string) => void
  updateUseCaseModel: (useCase: AIUseCase, patch: Record<string, unknown>) => void
  updateUseCaseTools: (useCase: AIUseCase, patch: Record<string, unknown>) => void
  updateUseCasePrompts: (useCase: AIUseCase, patch: Record<string, unknown>) => void
  updateUseCaseHandbooks: (useCase: AIUseCase, value: string) => void
  toggleUseCaseTool: (useCase: AIUseCase, toolId: string) => void
}

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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title.includes('Advanced') ? <Wand2 className="h-5 w-5" /> : <Brain className="h-5 w-5" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {useCases.map((useCase, index) => {
            const model = policy.model_profiles?.[useCase.id] ?? {}
            const tools = policy.tool_profiles?.[useCase.id] ?? {}
            const prompts = policy.prompt_profiles?.[useCase.id] ?? {}
            const handbooks = policy.skills_policy?.use_case_handbooks?.[useCase.id] ?? prompts.handbook_slugs ?? []
            const isCustomized = Boolean(
              model.provider ||
              model.model ||
              model.fallback_chain?.length ||
              tools.tool_mode ||
              tools.allowed_tools?.length ||
              prompts.system_instructions ||
              prompts.prompt_instructions ||
              handbooks.length,
            )

            if (title.includes('Advanced')) {
              return (
                <div key={useCase.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="font-medium">{useCase.title}</div>
                    <Badge variant="outline">{useCase.badge}</Badge>
                  </div>
                  <div className="mb-4 text-sm text-muted-foreground">{useCase.description}</div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <Input value={model.model ?? ''} onChange={(event) => updateUseCaseModel(useCase.id, { model: event.target.value || undefined })} placeholder="Model" />
                    <Select value={model.provider ?? '__default__'} onValueChange={(value) => updateUseCaseModel(useCase.id, { provider: value === '__default__' ? undefined : value })}>
                      <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Inherited provider</SelectItem>
                        {PROVIDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={tools.tool_mode ?? '__default__'} onValueChange={(value) => updateUseCaseTools(useCase.id, { tool_mode: value === '__default__' ? undefined : value })}>
                      <SelectTrigger><SelectValue placeholder="Tool mode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Inherited tool mode</SelectItem>
                        {TOOL_MODE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={formatList(model.fallback_chain)} onChange={(event) => updateUseCaseModel(useCase.id, { fallback_chain: splitList(event.target.value) })} placeholder="Fallback chain" />
                  </div>
                </div>
              )
            }

            return (
              <motion.div key={useCase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.2 }}>
                <Collapsible open={expandedPrompts.includes(useCase.id)} onOpenChange={() => toggleExpanded(useCase.id)}>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white px-5 py-4 text-left transition-colors hover:from-slate-100 hover:to-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{useCase.title}</span>
                            <Badge variant={isCustomized ? 'default' : 'secondary'}>{isCustomized ? 'Customized' : 'Inherited'}</Badge>
                            <Badge variant="outline">{useCase.badge}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{useCase.description}</div>
                        </div>
                        {expandedPrompts.includes(useCase.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="grid gap-5 border-t border-slate-200 px-5 py-5 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Provider</Label>
                              <Select value={model.provider ?? '__default__'} onValueChange={(value) => updateUseCaseModel(useCase.id, { provider: value === '__default__' ? undefined : value })}>
                                <SelectTrigger><SelectValue placeholder="Use workspace default" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__default__">Use workspace default</SelectItem>
                                  {PROVIDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Tool mode</Label>
                              <Select value={tools.tool_mode ?? '__default__'} onValueChange={(value) => updateUseCaseTools(useCase.id, { tool_mode: value === '__default__' ? undefined : value })}>
                                <SelectTrigger><SelectValue placeholder="Use workspace default" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__default__">Use workspace default</SelectItem>
                                  {TOOL_MODE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {TOOL_MODE_OPTIONS.find((option) => option.value === tools.tool_mode)?.description ?? 'Falls back to the workspace tool profile.'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Model identifier</Label>
                            <Input value={model.model ?? ''} onChange={(event) => updateUseCaseModel(useCase.id, { model: event.target.value || undefined })} placeholder="claude-opus-4-6, gpt-5-mini, glm-5..." />
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Temperature</Label>
                              <Input type="number" min={0} max={2} step={0.05} value={model.temperature ?? ''} onChange={(event) => updateUseCaseModel(useCase.id, { temperature: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="Inherited" />
                            </div>
                            <div className="space-y-2">
                              <Label>Max tokens</Label>
                              <Input type="number" min={1} max={32768} step={128} value={model.max_tokens ?? ''} onChange={(event) => updateUseCaseModel(useCase.id, { max_tokens: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="Inherited" />
                            </div>
                            <div className="space-y-2">
                              <Label>Fallback chain</Label>
                              <Input value={formatList(model.fallback_chain)} onChange={(event) => updateUseCaseModel(useCase.id, { fallback_chain: splitList(event.target.value) })} placeholder="glm-5, codex-standard" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Handbook slugs</Label>
                            <Input value={formatList(handbooks)} onChange={(event) => updateUseCaseHandbooks(useCase.id, event.target.value)} placeholder="general, coding, product..." />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>System instruction override</Label>
                            <Textarea rows={4} value={prompts.system_instructions ?? ''} onChange={(event) => updateUseCasePrompts(useCase.id, { system_instructions: event.target.value || undefined })} placeholder="Optional system-level override for this use case." className="resize-none" />
                          </div>

                          <div className="space-y-2">
                            <Label>Prompt instructions</Label>
                            <Textarea rows={5} value={prompts.prompt_instructions ?? ''} onChange={(event) => updateUseCasePrompts(useCase.id, { prompt_instructions: event.target.value || undefined })} placeholder="Add concise behavior or output-format guidance for this use case." className="resize-none" />
                          </div>

                          <div className="space-y-2">
                            <Label>Allowed tools for this use case</Label>
                            <div className="grid gap-2 md:grid-cols-2">
                              {TOOL_OPTIONS.map((tool) => {
                                const checked = tools.allowed_tools?.includes(tool.id) ?? false
                                return (
                                  <label key={tool.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                    <Checkbox checked={checked} onCheckedChange={() => toggleUseCaseTool(useCase.id, tool.id)} />
                                    <div>
                                      <div className="text-sm font-medium">{tool.name}</div>
                                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function CustomAgentOverridesSection({
  workspaceId,
  policy,
  customAgents,
  reload,
  updateAgentProfile,
  toggleAgentTool,
}: {
  workspaceId: string
  policy: WorkspaceAIPolicy
  customAgents: CustomAgentSummary[]
  reload: () => Promise<void>
  updateAgentProfile: (agentId: string, patch: Record<string, unknown>) => void
  toggleAgentTool: (agentId: string, toolId: string) => void
}) {
  return (
    <motion.div initial="hidden" animate="visible" variants={cardEntrance}>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Custom Agent Overrides
              </CardTitle>
              <CardDescription>
                Tune model, tools, and prompt overlays for custom agents in this workspace.
              </CardDescription>
            </div>
            <CustomAgentModal
              workspaceId={workspaceId}
              onSaved={() => void reload()}
              trigger={<Button type="button" variant="outline" size="sm" className="gap-2 self-start"><Bot className="h-4 w-4" />Manage Agents</Button>}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {customAgents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <Bot className="h-5 w-5 text-slate-500" />
              </div>
              <div className="font-medium">No custom agents found for this workspace</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create custom agents first, then their runtime override controls will appear here.
              </div>
            </div>
          ) : (
            customAgents.map((agent, index) => {
              const override = policy.agent_profiles?.[agent.id] ?? {}
              return (
                <motion.div key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.2 }} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{agent.name}</div>
                        <Badge variant="outline">{agent.lane}</Badge>
                        {!agent.active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{agent.description || `Slug: ${agent.slug}`}</div>
                    </div>
                    <CustomAgentModal
                      workspaceId={workspaceId}
                      agentId={agent.id}
                      onSaved={() => void reload()}
                      trigger={<Button type="button" variant="ghost" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />Edit agent</Button>}
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Select value={override.provider ?? '__default__'} onValueChange={(value) => updateAgentProfile(agent.id, { provider: value === '__default__' ? undefined : value })}>
                          <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default__">Inherited provider</SelectItem>
                            {PROVIDER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={override.tool_mode ?? '__default__'} onValueChange={(value) => updateAgentProfile(agent.id, { tool_mode: value === '__default__' ? undefined : value })}>
                          <SelectTrigger><SelectValue placeholder="Tool mode" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default__">Inherited tool mode</SelectItem>
                            {TOOL_MODE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input value={override.model ?? ''} onChange={(event) => updateAgentProfile(agent.id, { model: event.target.value || undefined })} placeholder="Model override" />

                      <div className="grid gap-4 md:grid-cols-3">
                        <Input type="number" min={0} max={2} step={0.05} value={override.temperature ?? ''} onChange={(event) => updateAgentProfile(agent.id, { temperature: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="Temperature" />
                        <Input type="number" min={1} max={32768} step={128} value={override.max_tokens ?? ''} onChange={(event) => updateAgentProfile(agent.id, { max_tokens: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="Max tokens" />
                        <Input value={formatList(override.fallback_chain)} onChange={(event) => updateAgentProfile(agent.id, { fallback_chain: splitList(event.target.value) })} placeholder="Fallback chain" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Textarea rows={4} value={override.system_prompt ?? ''} onChange={(event) => updateAgentProfile(agent.id, { system_prompt: event.target.value || undefined })} placeholder="Optional runtime system prompt override for this agent." className="resize-none" />
                      <Input value={formatList(override.handbook_slugs)} onChange={(event) => updateAgentProfile(agent.id, { handbook_slugs: splitList(event.target.value) })} placeholder="Handbook slugs" />
                      <div className="grid gap-2 md:grid-cols-2">
                        {TOOL_OPTIONS.map((tool) => {
                          const checked = override.allowed_tools?.includes(tool.id) ?? false
                          return (
                            <label key={`${agent.id}-${tool.id}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <Checkbox checked={checked} onCheckedChange={() => toggleAgentTool(agent.id, tool.id)} />
                              <div>
                                <div className="text-sm font-medium">{tool.name}</div>
                                <div className="text-xs text-muted-foreground">{tool.description}</div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function MobileSaveBar({
  hasChanges,
  customizedUseCaseCount,
  isSaving,
  onSave,
}: {
  hasChanges: boolean
  customizedUseCaseCount: number
  isSaving: boolean
  onSave: () => void
}) {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="fixed inset-x-4 bottom-4 z-20 md:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">Unsaved AI settings</div>
                <div className="text-muted-foreground">Routing, prompts, or overrides changed.</div>
              </div>
              <Badge>{customizedUseCaseCount} tuned</Badge>
            </div>
            <Button onClick={onSave} disabled={isSaving} className="w-full gap-2">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { PRIMARY_USE_CASES, ADVANCED_USE_CASES }
