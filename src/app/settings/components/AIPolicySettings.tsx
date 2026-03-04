'use client';

import { useState } from 'react';
import Link from 'next/link';
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

export function AIPolicySettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);
  const [coFounderMode, setCoFounderMode] = useState<'off' | 'advisor' | 'bounded' | 'near_full'>('bounded');
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior</CardTitle>
          <CardDescription>
            Control how AI interacts with your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-apply suggestions</Label>
              <p className="text-sm text-zinc-500">
                Allow AI to make changes without manual approval
              </p>
            </div>
            <Switch
              checked={autoApply}
              onCheckedChange={setAutoApply}
            />
          </div>

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
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Allowed AI Actions</CardTitle>
          <CardDescription>
            Select which actions AI can suggest or perform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'triage', label: 'Auto-triage new items', enabled: true },
            { id: 'assign', label: 'Suggest assignments', enabled: true },
            { id: 'schedule', label: 'Suggest due dates', enabled: true },
            { id: 'reports', label: 'Generate status reports', enabled: true },
            { id: 'subtasks', label: 'Break down tasks', enabled: false },
            { id: 'reassign', label: 'Reassign blocked items', enabled: false },
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

      <Card>
        <CardHeader>
          <CardTitle>Co-Founder Autonomy Mode</CardTitle>
          <CardDescription>
            Configure how autonomous the co-founder can operate overnight
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cofounder-mode">Autonomy Mode</Label>
            <Select value={coFounderMode} onValueChange={(value) => setCoFounderMode(value as 'off' | 'advisor' | 'bounded' | 'near_full')}>
              <SelectTrigger id="cofounder-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="advisor">Advisor</SelectItem>
                <SelectItem value="bounded">Bounded Operator</SelectItem>
                <SelectItem value="near_full">Near Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cofounder-profile">Authority Profile</Label>
            <Select value={coFounderProfile} onValueChange={(value) => setCoFounderProfile(value as 'advisor_first' | 'bounded_operator' | 'revenue_only' | 'near_full')}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Night Mode Controls</CardTitle>
          <CardDescription>
            Configure policy here, then start or stop live execution in Command Center.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/empire/command">Open Command Center</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/empire/missions">Open Mission Boards</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Night Schedule</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Hard Limits</CardTitle>
          <CardDescription>
            Caps that cannot be bypassed by agent confidence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Allow production deploys</Label>
              <p className="text-sm text-zinc-500">Disable for safe overnight operation</p>
            </div>
            <Switch
              checked={allowProductionDeploys}
              onCheckedChange={setAllowProductionDeploys}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save AI Policy Settings'}
      </Button>
    </div>
  );
}
