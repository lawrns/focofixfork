'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MODEL_CATALOG } from '@/lib/ai/model-catalog';
import { AIRoutingHelp } from './AIRoutingHelp';

const MODES = [
  { value: 'off', label: 'Off', description: 'No actions' },
  { value: 'advisor', label: 'Advisor', description: 'Suggest only' },
  { value: 'bounded', label: 'Bounded', description: 'Guarded execution' },
  { value: 'near_full', label: 'Near Full', description: 'High autonomy' },
] as const;

type CoFounderMode = 'off' | 'advisor' | 'bounded' | 'near_full';

const modeSummary: Record<CoFounderMode, string> = {
  off: 'Off — no autonomous actions',
  advisor: 'Advisor — suggestions only, no execution',
  bounded: 'Bounded — limited execution within guardrails',
  near_full: 'Near Full — high autonomy, minimal oversight',
};

const modeDescription: Record<CoFounderMode, string> = {
  off: 'The cofounder will not take any autonomous action.',
  advisor: 'The cofounder will surface recommendations but wait for your approval before acting.',
  bounded: 'The cofounder can execute within your defined guardrails without asking for each step.',
  near_full: 'The cofounder operates autonomously. High trust required — monitor the audit log regularly.',
};

const PHASE_ROLES = {
  plan: ['plan', 'review'],
  execute: ['execute', 'plan', 'review'],
  review: ['review', 'plan'],
} as const

function modelsForPhase(phase: keyof typeof PHASE_ROLES) {
  return MODEL_CATALOG.filter((m) =>
    (m as any).roles
      ? (m as any).roles.some((r: string) => (PHASE_ROLES[phase] as readonly string[]).includes(r))
      : true
  )
}

interface RoutingStatus {
  clawdbot_reachable: boolean
  workspace_profile: { pipeline_plan: string; pipeline_execute: string; pipeline_review: string }
  provider_status: Record<string, { available: boolean; label: string }>
}

export function AIPolicySettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [autoApply, setAutoApply] = useState(false);

  // AI Routing model selectors
  const [planModel, setPlanModel] = useState('claude-opus-4-6');
  const [executeModel, setExecuteModel] = useState('claude-sonnet-4-6');
  const [reviewModel, setReviewModel] = useState('claude-opus-4-6');
  const [planFallback, setPlanFallback] = useState('openrouter-gpt-5.4-high');
  const [executeFallback, setExecuteFallback] = useState('glm-5');
  const [reviewFallback, setReviewFallback] = useState('glm-5');
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus | null>(null);

  useEffect(() => {
    fetch('/api/ai/routing-status')
      .then((r) => r.ok ? r.json() : null)
      .then((data: RoutingStatus | null) => {
        if (!data) return
        setRoutingStatus(data)
        if (data.workspace_profile?.pipeline_plan) setPlanModel(data.workspace_profile.pipeline_plan)
        if (data.workspace_profile?.pipeline_execute) setExecuteModel(data.workspace_profile.pipeline_execute)
        if (data.workspace_profile?.pipeline_review) setReviewModel(data.workspace_profile.pipeline_review)
      })
      .catch(() => {})
  }, []);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);
  const [coFounderMode, setCoFounderMode] = useState<CoFounderMode>('bounded');
  const [coFounderProfile, setCoFounderProfile] = useState<'advisor_first' | 'bounded_operator' | 'revenue_only' | 'near_full'>('revenue_only');
  const [overnightWindowEnabled, setOvernightWindowEnabled] = useState(true);
  const [overnightStart, setOvernightStart] = useState('22:00');
  const [overnightEnd, setOvernightEnd] = useState('07:00');
  const [overnightTimezone, setOvernightTimezone] = useState('America/Mexico_City');
  const [spendCapUsdPerWindow, setSpendCapUsdPerWindow] = useState('100');
  const [maxExternalMessages, setMaxExternalMessages] = useState('5');
  const [maxLiveExperiments, setMaxLiveExperiments] = useState('2');
  const [allowProductionDeploys, setAllowProductionDeploys] = useState(false);

  const [dataSources, setDataSources] = useState({
    tasks: true,
    comments: true,
    docs: true,
    history: true,
  });

  const [aiActions, setAiActions] = useState({
    triage: true,
    assign: true,
    schedule: true,
    reports: true,
    subtasks: false,
    reassign: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiPolicy: {
            autoApply,
            confidenceThreshold: confidenceThreshold[0],
            dataSources,
            actions: aiActions,
            model_profiles: {
              pipeline_plan: { model: planModel, fallback_chain: [planFallback].filter(Boolean) },
              pipeline_execute: { model: executeModel, fallback_chain: [executeFallback].filter(Boolean) },
              pipeline_review: { model: reviewModel, fallback_chain: [reviewFallback].filter(Boolean) },
            },
            cofounder: {
              mode: coFounderMode,
              profile: coFounderProfile,
              overnightWindow: {
                enabled: overnightWindowEnabled,
                timezone: overnightTimezone,
                start: overnightStart,
                end: overnightEnd,
              },
              hardLimits: {
                spendCapUsdPerWindow: Number(spendCapUsdPerWindow) || 100,
                maxExternalMessages: Number(maxExternalMessages) || 5,
                maxLiveExperiments: Number(maxLiveExperiments) || 2,
                allowProductionDeploys,
              },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save AI policy settings');
      }

      toast.success('AI policy settings saved successfully');
    } catch (error) {
      toast.error('Failed to save AI policy settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Derived summary strings
  const scheduleText = overnightWindowEnabled
    ? `Overnight only (${overnightStart}–${overnightEnd} ${overnightTimezone.split('/')[1] ?? overnightTimezone})`
    : 'Any time';

  const limitsText = [
    `$${spendCapUsdPerWindow} cap`,
    allowProductionDeploys ? 'deploys on' : 'deploys off',
  ].join(' · ');

  return (
    <div className="space-y-6">

      {/* ── Summary card ── */}
      <Card className="border-[color:var(--foco-teal)]/30 bg-[color:var(--foco-teal)]/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Current policy</p>
          <p className="text-sm font-medium">
            {modeSummary[coFounderMode]} · {scheduleText} · {limitsText}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {modeDescription[coFounderMode]}
          </p>
        </CardContent>
      </Card>

      {/* ── AI Routing ── */}
      <Card>
        <CardHeader>
          <CardTitle>AI Routing</CardTitle>
          <CardDescription>
            Choose which model handles each phase of pipeline execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {routingStatus && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              ClawdBot {routingStatus.clawdbot_reachable ? 'connected' : 'unreachable'} · Active profile:{' '}
              <span className="font-mono">
                {routingStatus.workspace_profile.pipeline_plan} / {routingStatus.workspace_profile.pipeline_execute} / {routingStatus.workspace_profile.pipeline_review}
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Plan */}
            <div className="space-y-2">
              <Label>Planning model</Label>
              <Select value={planModel} onValueChange={setPlanModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Fallback</Label>
              <Select value={planFallback} onValueChange={setPlanFallback}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Execute */}
            <div className="space-y-2">
              <Label>Execution model</Label>
              <Select value={executeModel} onValueChange={setExecuteModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Fallback</Label>
              <Select value={executeFallback} onValueChange={setExecuteFallback}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <Label>Review model</Label>
              <Select value={reviewModel} onValueChange={setReviewModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Fallback</Label>
              <Select value={reviewFallback} onValueChange={setReviewFallback}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {MODEL_CATALOG.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AIRoutingHelp
            providerStatus={routingStatus?.provider_status}
            clawdbotReachable={routingStatus?.clawdbot_reachable}
          />

        </CardContent>
      </Card>

      {/* ── Section A: Mode ── */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Mode</CardTitle>
          <CardDescription>
            Set how much authority the cofounder has to act on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* 4-step tier selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((mode) => {
              const isActive = coFounderMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setCoFounderMode(mode.value)}
                  className={[
                    'flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'border-[color:var(--foco-teal)] bg-[color:var(--foco-teal)]/10'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-sm font-semibold',
                      isActive ? 'text-[color:var(--foco-teal)]' : 'text-foreground',
                    ].join(' ')}
                  >
                    {mode.label}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{mode.description}</span>
                </button>
              );
            })}
          </div>

          {/* Authority Profile */}
          <div className="space-y-2">
            <Label htmlFor="cofounder-profile">Authority Profile</Label>
            <Select
              value={coFounderProfile}
              onValueChange={(value) =>
                setCoFounderProfile(value as 'advisor_first' | 'bounded_operator' | 'revenue_only' | 'near_full')
              }
            >
              <SelectTrigger id="cofounder-profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advisor_first">Advisor First</SelectItem>
                <SelectItem value="bounded_operator">Bounded Operator</SelectItem>
                <SelectItem value="revenue_only">Revenue Only</SelectItem>
                <SelectItem value="near_full">Near Full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plain-language mode explanation */}
          <p className="text-sm text-muted-foreground border-l-2 border-[color:var(--foco-teal)]/40 pl-3">
            {modeDescription[coFounderMode]}
          </p>
        </CardContent>
      </Card>

      {/* ── Section B: Guardrails ── */}
      <Card>
        <CardHeader>
          <CardTitle>Guardrails</CardTitle>
          <CardDescription>
            Caps and constraints that bound autonomous execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Auto-apply */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-apply suggestions</Label>
              <p className="text-sm text-zinc-500">
                Allow AI to make changes without manual approval
              </p>
            </div>
            <Switch checked={autoApply} onCheckedChange={setAutoApply} />
          </div>

          {/* Confidence threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Confidence threshold</Label>
              <span className="text-sm font-medium">{confidenceThreshold[0]}%</span>
            </div>
            <Slider
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              min={50}
              max={99}
              step={1}
            />
            <p className="text-sm text-zinc-500">
              AI suggestions below this confidence level will require manual review
            </p>
          </div>

          {/* Allow production deploys */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Allow production deploys</Label>
              <p className="text-sm text-zinc-500">Disable for safe overnight operation</p>
            </div>
            <Switch checked={allowProductionDeploys} onCheckedChange={setAllowProductionDeploys} />
          </div>

          {/* Hard limits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cofounder-spend-cap">Spend Cap (USD / window)</Label>
              <Input
                id="cofounder-spend-cap"
                type="number"
                min={0}
                value={spendCapUsdPerWindow}
                onChange={(e) => setSpendCapUsdPerWindow(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cofounder-max-messages">Max External Messages</Label>
              <Input
                id="cofounder-max-messages"
                type="number"
                min={0}
                value={maxExternalMessages}
                onChange={(e) => setMaxExternalMessages(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cofounder-max-experiments">Max Live Experiments</Label>
              <Input
                id="cofounder-max-experiments"
                type="number"
                min={0}
                value={maxLiveExperiments}
                onChange={(e) => setMaxLiveExperiments(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section C: Schedule ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>
                Restrict autonomous execution to a configured overnight window
              </CardDescription>
            </div>
            <Switch
              checked={overnightWindowEnabled}
              onCheckedChange={setOvernightWindowEnabled}
            />
          </div>
        </CardHeader>
        {overnightWindowEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="overnight-start">Start Time</Label>
                <Input
                  id="overnight-start"
                  type="time"
                  value={overnightStart}
                  onChange={(e) => setOvernightStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overnight-end">End Time</Label>
                <Input
                  id="overnight-end"
                  type="time"
                  value={overnightEnd}
                  onChange={(e) => setOvernightEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overnight-tz">Timezone</Label>
              <Select value={overnightTimezone} onValueChange={setOvernightTimezone}>
                <SelectTrigger id="overnight-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Mexico_City">America/Mexico_City (CST)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                  <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Advanced settings (collapsed) ── */}
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
          Advanced settings (data sources, allowed actions)
        </summary>
        <div className="mt-4 space-y-4">

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Choose what data AI can access for suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'tasks', label: 'Tasks & Work Items', description: 'Task content, status, and history' },
                { id: 'comments', label: 'Comments & Discussions', description: 'Thread content and mentions' },
                { id: 'docs', label: 'Documents', description: 'Doc content and structure' },
                { id: 'history', label: 'Activity History', description: 'Past actions and patterns' },
              ].map((source) => (
                <div key={source.id} className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">{source.label}</Label>
                    <p className="text-sm text-zinc-500">{source.description}</p>
                  </div>
                  <Switch
                    checked={dataSources[source.id as keyof typeof dataSources]}
                    onCheckedChange={(checked) =>
                      setDataSources({ ...dataSources, [source.id]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Allowed AI Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Allowed AI Actions</CardTitle>
              <CardDescription>
                Select which actions AI can suggest or perform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'triage', label: 'Auto-triage new items' },
                { id: 'assign', label: 'Suggest assignments' },
                { id: 'schedule', label: 'Suggest due dates' },
                { id: 'reports', label: 'Generate status reports' },
                { id: 'subtasks', label: 'Break down tasks' },
                { id: 'reassign', label: 'Reassign blocked items' },
              ].map((action) => (
                <div key={action.id} className="flex items-center justify-between">
                  <Label>{action.label}</Label>
                  <Switch
                    checked={aiActions[action.id as keyof typeof aiActions]}
                    onCheckedChange={(checked) =>
                      setAiActions({ ...aiActions, [action.id]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </details>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save AI Policy Settings'}
      </Button>
    </div>
  );
}
