'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IntegrationsEmpty } from '@/components/empty-states/integrations-empty';
import { WhatsAppSettings } from '@/components/settings/whatsapp-settings';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
}

export function IntegrationsSettings() {
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
      <WhatsAppSettings />

      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Manage your workspace integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.filter(i => i.connected).length === 0 ? (
            <IntegrationsEmpty onBrowseIntegrations={() => {
              const firstUnconnected = integrations.find(i => !i.connected);
              if (firstUnconnected) handleConnect(firstUnconnected);
            }} />
          ) : (
            integrations.map((integration) => (
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
            ))
          )}
        </CardContent>
      </Card>

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
