'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Save,
  Trash2,
  Archive,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  brief?: string;
  color?: string;
  workspace_id: string;
}

interface SettingsViewProps {
  project: Project;
  onSave?: (updates: Partial<Project>) => Promise<void>;
  onArchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

const colorOptions = [
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Zinc', value: '#71717A' },
];

export function SettingsView({ 
  project, 
  onSave, 
  onArchive, 
  onDelete 
}: SettingsViewProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [brief, setBrief] = useState(project.brief || '');
  const [color, setColor] = useState(project.color || '#6366F1');
  const [isSaving, setIsSaving] = useState(false);
  const [requireClosureNote, setRequireClosureNote] = useState(false);

  const hasChanges = 
    name !== project.name ||
    description !== (project.description || '') ||
    brief !== (project.brief || '') ||
    color !== (project.color || '#6366F1');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({
        name: name.trim(),
        description: description.trim() || undefined,
        brief: brief.trim() || undefined,
        color,
      });
      toast.success('Project settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    try {
      await onArchive?.();
      toast.success('Project archived');
    } catch (error) {
      toast.error('Failed to archive project');
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete?.();
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* General Settings */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">General</h2>
          <p className="text-sm text-zinc-500">Basic project information</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the project"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief">Project Brief</Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Detailed project brief, goals, and context..."
              rows={4}
            />
            <p className="text-xs text-zinc-500">
              This brief provides context for AI features and team members
            </p>
          </div>

          <div className="space-y-2">
            <Label>Project Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all',
                    color === option.value && 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-50'
                  )}
                  style={{ backgroundColor: option.value }}
                  title={option.name}
                />
              ))}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Separator />

      {/* Workflow Settings */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Workflow</h2>
          <p className="text-sm text-zinc-500">Configure project workflow settings</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Closure Note</Label>
              <p className="text-xs text-zinc-500">
                Require a note when marking tasks as done
              </p>
            </div>
            <Switch
              checked={requireClosureNote}
              onCheckedChange={setRequireClosureNote}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-zinc-500">Irreversible and destructive actions</p>
        </div>

        <div className="space-y-4 p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Archive Project</p>
              <p className="text-xs text-zinc-500">
                Hide project from active views. Can be restored later.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the project from your active projects list. 
                    All tasks and data will be preserved and you can restore it later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>
                    Archive Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-red-600">Delete Project</p>
              <p className="text-xs text-zinc-500">
                Permanently delete this project and all its tasks.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Project Permanently?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the 
                    project <strong>&quot;{project.name}&quot;</strong> and all {' '}
                    associated tasks, comments, and data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
