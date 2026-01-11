'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUIPreferencesStore } from '@/lib/stores/foco-store';
import {
  Settings,
  Users,
  Palette,
  Zap,
  Shield,
  CreditCard,
  Bell,
  Plug,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import type { DensitySetting } from '@/types/foco';

const settingsSections = [
  { id: 'workspace', label: 'Workspace', icon: Settings },
  { id: 'members', label: 'Members & Roles', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Policy', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

function WorkspaceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>
            Basic information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input id="workspace-name" defaultValue="Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-slug">Workspace URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">foco.app/</span>
              <Input id="workspace-slug" defaultValue="acme-corp" className="max-w-[200px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Input id="workspace-description" defaultValue="Demo workspace for Foco 2.0" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statuses & Labels</CardTitle>
          <CardDescription>
            Customize work item statuses and labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Default Statuses</Label>
              <div className="flex flex-wrap gap-2">
                {['Backlog', 'Next', 'In Progress', 'Review', 'Blocked', 'Done'].map((status) => (
                  <Badge key={status} variant="outline">{status}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm">
              Customize Statuses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useUIPreferencesStore();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const densities: { value: DensitySetting; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'More information, less whitespace' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced layout (recommended)' },
    { value: 'spacious', label: 'Spacious', description: 'More whitespace, easier scanning' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  theme === t.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <t.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{t.label}</span>
                {theme === t.value && (
                  <Check className="h-4 w-4 text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Density</CardTitle>
          <CardDescription>
            Adjust the spacing and information density
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {densities.map((d) => (
              <button
                key={d.value}
                onClick={() => setDensity(d.value)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left',
                  density === d.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div>
                  <div className="font-medium">{d.label}</div>
                  <div className="text-sm text-zinc-500">{d.description}</div>
                </div>
                {density === d.value && (
                  <Check className="h-5 w-5 text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIPolicySettings() {
  const [autoApply, setAutoApply] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);

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
              <Switch defaultChecked />
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
              <Switch defaultChecked={action.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'in_app', label: 'In-app notifications', description: 'Show in the Inbox', enabled: true },
            { id: 'email', label: 'Email notifications', description: 'Daily digest to your email', enabled: true },
            { id: 'push', label: 'Push notifications', description: 'Browser and mobile push', enabled: false },
            { id: 'slack', label: 'Slack notifications', description: 'Send to connected Slack workspace', enabled: false },
          ].map((channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div>
                <Label className="text-base">{channel.label}</Label>
                <p className="text-sm text-zinc-500">{channel.description}</p>
              </div>
              <Switch defaultChecked={channel.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'mentions', label: 'Mentions', enabled: true },
            { id: 'assigned', label: 'Assigned to me', enabled: true },
            { id: 'comments', label: 'Comments on my tasks', enabled: true },
            { id: 'status', label: 'Status changes', enabled: false },
            { id: 'due_soon', label: 'Due date reminders', enabled: true },
            { id: 'ai_flags', label: 'AI flags and suggestions', enabled: true },
          ].map((type) => (
            <div key={type.id} className="flex items-center justify-between">
              <Label>{type.label}</Label>
              <Switch defaultChecked={type.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsSettings() {
  const integrations = [
    { id: 'slack', name: 'Slack', description: 'Send notifications and create tasks from Slack', connected: true },
    { id: 'github', name: 'GitHub', description: 'Link PRs and issues to work items', connected: false },
    { id: 'figma', name: 'Figma', description: 'Embed designs and sync comments', connected: false },
    { id: 'calendar', name: 'Google Calendar', description: 'Sync due dates and meetings', connected: true },
    { id: 'jira', name: 'Jira', description: 'Import and sync with Jira projects', connected: false },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Manage your workspace integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="font-medium">{integration.name}</div>
                <div className="text-sm text-zinc-500">{integration.description}</div>
              </div>
              {integration.connected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    Connected
                  </Badge>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm">Connect</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('workspace');

  const renderContent = () => {
    switch (activeSection) {
      case 'workspace':
        return <WorkspaceSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'ai':
        return <AIPolicySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      default:
        return (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              {settingsSections.find(s => s.id === activeSection)?.label} settings coming soon
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-zinc-500 mt-1">
          Manage your workspace preferences and configuration
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-56 shrink-0">
          <div className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
