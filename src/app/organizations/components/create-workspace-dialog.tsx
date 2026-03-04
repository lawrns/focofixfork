'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InlineLoadingSkeleton } from '@/components/skeleton-screens';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  onNameChange: (name: string) => void;
  isCreating: boolean;
  createResult: { success: boolean; message: string } | null;
  onCreate: () => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  workspaceName,
  onNameChange,
  isCreating,
  createResult,
  onCreate,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[calc(100%-2rem)] px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name" className="text-sm">Workspace Name</Label>
            <Input
              id="ws-name"
              placeholder="Enter workspace name"
              value={workspaceName}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-10"
            />
          </div>
          {createResult && (
            <Alert variant={createResult.success ? 'default' : 'destructive'}>
              <AlertDescription className="text-xs sm:text-sm">{createResult.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="h-10 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onCreate}
              disabled={!workspaceName.trim() || isCreating}
              className="h-10 text-sm"
            >
              {isCreating ? (
                <>
                  <InlineLoadingSkeleton size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Create Workspace</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
