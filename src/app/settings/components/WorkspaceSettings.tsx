'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/foco-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function WorkspaceSettings() {
  const [isMounted, setIsMounted] = useState(false);
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name || '');
      setWorkspaceSlug(currentWorkspace.slug || '');
      setWorkspaceDescription('');
    }
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspace?.id) {
      toast.error('No workspace selected');
      return;
    }

    setIsSaving(true);
    try {
      if (currentWorkspace) {
        setCurrentWorkspace({
          ...currentWorkspace,
          name: workspaceName,
          slug: workspaceSlug,
        });
      }
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              onClick={() => console.log('Status customization clicked')}
            >
              Customize Statuses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
