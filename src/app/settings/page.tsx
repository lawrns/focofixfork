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
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Status customization coming soon')}
            >
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

function MembersSettings() {
  const [members, setMembers] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner', avatar: null, joined: '2024-01-01' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'admin', avatar: null, joined: '2024-02-15' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'member', avatar: null, joined: '2024-03-10' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'viewer', avatar: null, joined: '2024-04-05' },
  ]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  const roles = [
    { value: 'owner', label: 'Owner', description: 'Full access to all settings and billing' },
    { value: 'admin', label: 'Admin', description: 'Can manage members and workspace settings' },
    { value: 'member', label: 'Member', description: 'Can create and edit tasks and projects' },
    { value: 'viewer', label: 'Viewer', description: 'Can only view tasks and projects' },
  ];

  const permissions = [
    { feature: 'Create tasks', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Edit tasks', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Delete tasks', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Create projects', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Edit project settings', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Invite members', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Manage roles', owner: true, admin: false, member: false, viewer: false },
    { feature: 'Billing access', owner: true, admin: false, member: false, viewer: false },
    { feature: 'Delete workspace', owner: true, admin: false, member: false, viewer: false },
  ];

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    toast.success('Role updated');
  };

  const handleRemoveMember = async (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to this workspace
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Users className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-zinc-500">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value)}
                    disabled={member.role === 'owner'}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Overview of permissions for each role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-2 font-medium">Feature</th>
                  {roles.map((role) => (
                    <th key={role.value} className="text-center py-3 px-2 font-medium">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.feature} className="border-b border-zinc-100 dark:border-zinc-800/50">
                    <td className="py-2 px-2">{perm.feature}</td>
                    <td className="text-center py-2 px-2">
                      {perm.owner ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.admin ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.member ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.viewer ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => r.value !== 'owner').map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-zinc-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingSettings() {
  const [currentPlan] = useState('pro');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Up to 5 team members', '100 tasks', 'Basic integrations', 'Community support'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 12,
      features: ['Up to 20 team members', 'Unlimited tasks', 'All integrations', 'Priority support', 'AI features', 'Advanced analytics'],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 49,
      features: ['Unlimited team members', 'Unlimited everything', 'SSO & SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    },
  ];

  const invoices = [
    { id: '1', date: '2026-01-01', amount: 12, status: 'paid' },
    { id: '2', date: '2025-12-01', amount: 12, status: 'paid' },
    { id: '3', date: '2025-11-01', amount: 12, status: 'paid' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the Pro plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Pro Plan</span>
                <Badge variant="secondary">Current</Badge>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                $12/user/month • Billed monthly
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(true)}>
              Change Plan
            </Button>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-3">Usage this month</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">8/20</div>
                <div className="text-sm text-zinc-500">Team members</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">247</div>
                <div className="text-sm text-zinc-500">Tasks created</div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                <div className="text-2xl font-semibold">12</div>
                <div className="text-sm text-zinc-500">Projects</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-14 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-zinc-500" />
              </div>
              <div>
                <div className="font-medium">•••• •••• •••• 4242</div>
                <div className="text-sm text-zinc-500">Expires 12/2027</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Payment method update coming soon')}
            >
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            Download past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">
                      {new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-zinc-500">${invoice.amount}.00</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
                    {invoice.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.success('Invoice download started')}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a Plan</DialogTitle>
            <DialogDescription>
              Select the plan that best fits your team
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 transition-colors',
                  currentPlan === plan.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="text-2xl font-bold mt-2">
                  ${plan.price}
                  <span className="text-sm font-normal text-zinc-500">/user/mo</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  variant={currentPlan === plan.id ? 'outline' : 'default'}
                  disabled={currentPlan === plan.id}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
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
      case 'members':
        return <MembersSettings />;
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
      case 'billing':
        return <BillingSettings />;
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
