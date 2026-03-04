'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectData } from './ProjectCardTypes';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProjectName: string;
  editProjectDescription: string;
  editDelegationEnabled: boolean;
  isSavingProject: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDelegationChange: (value: boolean) => void;
  onSave: () => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  editProjectName,
  editProjectDescription,
  editDelegationEnabled,
  isSavingProject,
  onNameChange,
  onDescriptionChange,
  onDelegationChange,
  onSave,
}: EditProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Make changes to your project here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={editProjectName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Project name"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="description"
              value={editProjectDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Project description"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-[13px] font-medium">Agent delegation</p>
              <p className="text-[11px] text-muted-foreground">
                Allow ClawdBot agents to pick up tasks from this project
              </p>
            </div>
            <Switch
              checked={editDelegationEnabled}
              onCheckedChange={onDelegationChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingProject}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSavingProject}>
            {isSavingProject ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newProjectName: string;
  newProjectDescription: string;
  isCreatingProject: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  newProjectName,
  newProjectDescription,
  isCreatingProject,
  onNameChange,
  onDescriptionChange,
  onCreate,
}: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        onNameChange('');
        onDescriptionChange('');
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your work.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              placeholder="Project name"
              autoFocus
              value={newProjectName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onCreate();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              placeholder="What is this project about?"
              rows={3}
              value={newProjectDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreatingProject}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreatingProject || !newProjectName.trim()}>
            {isCreatingProject ? 'Creating...' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
