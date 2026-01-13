'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus } from 'lucide-react'
import { InlineLoadingSkeleton } from '@/components/skeleton-screens'

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgName: string
  setOrgName: (name: string) => void
  isCreating: boolean
  createResult: { success: boolean; message: string } | null
  onSubmit: (e?: React.MouseEvent) => void
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  orgName,
  setOrgName,
  isCreating,
  createResult,
  onSubmit,
}: CreateOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              placeholder="Enter organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          {createResult && (
            <Alert variant={createResult.success ? 'default' : 'destructive'}>
              <AlertDescription>{createResult.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!orgName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <InlineLoadingSkeleton size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Organization
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
