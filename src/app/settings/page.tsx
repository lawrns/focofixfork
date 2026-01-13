'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import type { DensitySetting } from '@/types/foco';
import { PageShell } from '@/components/layout/page-shell';
import { buttons } from '@/lib/copy';
import { toast } from 'sonner';
import { TwoFactorSettings } from '@/components/settings/two-factor-settings';

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
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('Acme Corp');
  const [workspaceSlug, setWorkspaceSlug] = useState('acme-corp');
  const [workspaceDescription, setWorkspaceDescription] = useState('Demo workspace for Foco 2.0');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceName,
          workspaceSlug,
          workspaceDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

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
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-slug">Workspace URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">foco.app/</span>
              <Input
                id="workspace-slug"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description</Label>
            <Input
              id="workspace-description"
              value={workspaceDescription}
              onChange={(e) => setWorkspaceDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
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
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

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
  const [isSaving, setIsSaving] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState([85]);

  // Data sources state
  const [dataSources, setDataSources] = useState({
    tasks: true,
    comments: true,
    docs: true,
    history: true,
  });

  // AI actions state
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

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save AI Policy Settings'}
      </Button>
    </div>
  );
}

function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);

  // Notification channels state
  const [channels, setChannels] = useState({
    in_app: true,
    email: true,
    push: false,
    slack: false,
  });

  // Notification types state
  const [types, setTypes] = useState({
    mentions: true,
    assigned: true,
    comments: true,
    status: false,
    due_soon: true,
    ai_flags: true,
  });

  // Quiet hours state
  const [quietHours, setQuietHours] = useState({
    start: '22:00',
    end: '08:00',
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
          notifications: {
            channels,
            types,
            quietHours,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }

      toast.success('Notification settings saved successfully');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

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
              <Switch
                checked={channels[channel.id as keyof typeof channels]}
                onCheckedChange={(checked) =>
                  setChannels({ ...channels, [channel.id]: checked })
                }
              />
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
              <Switch
                checked={types[type.id as keyof typeof types]}
                onCheckedChange={(checked) =>
                  setTypes({ ...types, [type.id]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>
            Mute notifications during your designated do-not-disturb time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietHours.start}
                onChange={(e) =>
                  setQuietHours({ ...quietHours, start: e.target.value })
                }
                aria-label="Quiet hours start time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietHours.end}
                onChange={(e) =>
                  setQuietHours({ ...quietHours, end: e.target.value })
                }
                aria-label="Quiet hours end time"
              />
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            Email notifications will be delayed during these hours. Other channels will be suppressed entirely.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Notification Settings'}
      </Button>
    </div>
  );
}

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
}

function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'slack', name: 'Slack', description: 'Send notifications and create tasks from Slack', connected: true },
    { id: 'github', name: 'GitHub', description: 'Link PRs and issues to work items', connected: false },
    { id: 'figma', name: 'Figma', description: 'Embed designs and sync comments', connected: false },
    { id: 'calendar', name: 'Google Calendar', description: 'Sync due dates and meetings', connected: true },
    { id: 'jira', name: 'Jira', description: 'Import and sync with Jira projects', connected: false },
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isConfigureDialogOpen, setIsConfigureDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsConnectDialogOpen(true);
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsConfigureDialogOpen(true);
  };

  const confirmConnect = async () => {
    if (!selectedIntegration) return;

    setIsConnecting(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId: selectedIntegration.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect integration');
      }

      // Update integration state
      setIntegrations(prev =>
        prev.map(int =>
          int.id === selectedIntegration.id
            ? { ...int, connected: true }
            : int
        )
      );

      toast.success(`${selectedIntegration.name} connected successfully`);
      setIsConnectDialogOpen(false);
      setSelectedIntegration(null);
    } catch (error) {
      toast.error(`Failed to connect ${selectedIntegration.name}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedIntegration) return;

    setIsDisconnecting(true);
    try {
      const response = await fetch(`/api/integrations/${selectedIntegration.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect integration');
      }

      // Update integration state
      setIntegrations(prev =>
        prev.map(int =>
          int.id === selectedIntegration.id
            ? { ...int, connected: false }
            : int
        )
      );

      toast.success(`${selectedIntegration.name} disconnected successfully`);
      setIsConfigureDialogOpen(false);
      setSelectedIntegration(null);
    } catch (error) {
      toast.error(`Failed to disconnect ${selectedIntegration.name}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigure(integration)}
                  >
                    Configure
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(integration)}
                >
                  Connect
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Connect {selectedIntegration?.name} to your workspace to enable integration features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {isConnecting ? 'Connecting...' : `You will be redirected to authorize ${selectedIntegration?.name}.`}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConnectDialogOpen(false)}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button onClick={confirmConnect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Dialog */}
      <Dialog open={isConfigureDialogOpen} onOpenChange={setIsConfigureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedIntegration?.name} Settings</DialogTitle>
            <DialogDescription>
              Manage your {selectedIntegration?.name} integration configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Connected
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Integration Settings</Label>
              <p className="text-sm text-zinc-500">
                Configure how {selectedIntegration?.name} interacts with your workspace.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="sm:mr-auto"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsConfigureDialogOpen(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsConfigureDialogOpen(false)} disabled={isDisconnecting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecuritySettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  return (
    <div className="space-y-6">
      <TwoFactorSettings twoFactorEnabled={twoFactorEnabled} />
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('workspace');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Fetch user's current 2FA status
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.twoFactorEnabled || false);
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    fetchUserStatus();
  }, []);

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
      case 'security':
        return <SecuritySettings twoFactorEnabled={twoFactorEnabled} />;
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
    <PageShell maxWidth="6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your workspace preferences
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
    </PageShell>
  );
}
