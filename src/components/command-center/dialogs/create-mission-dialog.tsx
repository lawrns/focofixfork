'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { useSwarm } from '@/components/critter/swarm-context'
import type { AgentBackend } from '@/lib/command-center/types'
import { BACKEND_LABELS } from '@/lib/command-center/types'

interface CreateMissionDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateMissionDialog({ open, onClose }: CreateMissionDialogProps) {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [backend, setBackend]   = useState<AgentBackend>('openclaw')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const store = useCommandCenterStore()
  const { dispatchSwarm } = useSwarm()

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await store.createMission({ title: title.trim(), description: description.trim() || undefined, backend })

      // Critter swarm sendoff
      const btn = document.getElementById('create-mission-submit')
      const rect = btn?.getBoundingClientRect()
      if (rect) {
        dispatchSwarm({ sourceRect: rect, label: `Mission: ${title.trim().slice(0, 20)}`, runner: backend })
      }

      setTitle('')
      setDesc('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mission')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Mission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mission-title">Title</Label>
            <Input
              id="mission-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What should the agents do?"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mission-desc">Description (optional)</Label>
            <Textarea
              id="mission-desc"
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Additional context…"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Backend</Label>
            <Select value={backend} onValueChange={v => setBackend(v as AgentBackend)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BACKEND_LABELS) as AgentBackend[]).map(b => (
                  <SelectItem key={b} value={b}>{BACKEND_LABELS[b]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-rose-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            id="create-mission-submit"
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            className="bg-[color:var(--foco-teal)] hover:bg-[color:var(--foco-teal)]/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
