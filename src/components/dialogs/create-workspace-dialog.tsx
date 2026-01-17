'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleCreate = async () => {
    if (!name.trim() || !user) {
      setError('Please enter a workspace name')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const slug = generateSlug(name)

      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          slug,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.workspace) {
        audioService.play('error')
        hapticService.error()
        throw new Error(data.error || 'Failed to create workspace')
      }

      // Success
      audioService.play('complete')
      hapticService.success()
      setName('')
      onOpenChange(false)
      onSuccess?.()

      // Navigate to new workspace
      router.push(`/${slug}/dashboard`)
    } catch (err: any) {
      console.error('Create workspace error:', err)
      audioService.play('error')
      hapticService.error()
      setError(err.message || 'Failed to create workspace')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Building className="h-5 w-5" />
            Create New Workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-semibold">Workspace Name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g., Product Team, Marketing Dept"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={isCreating}
              className="min-h-[44px]"
            />
            {name && (
              <p className="text-xs text-muted-foreground">
                Slug: <span className="font-mono">{generateSlug(name)}</span>
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="min-h-[44px] sm:min-h-[40px] order-2 sm:order-1 flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || isCreating}
            className="min-h-[44px] sm:min-h-[40px] order-1 sm:order-2 flex-1 font-bold"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
