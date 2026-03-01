'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'

interface DeleteMissionConfirmProps {
  open: boolean
  missionId: string | null
  onClose: () => void
}

export function DeleteMissionConfirm({ open, missionId, onClose }: DeleteMissionConfirmProps) {
  const store = useCommandCenterStore()
  const [loading, setLoading] = useState(false)

  const mission = missionId ? store.missions.find(m => m.id === missionId) : null

  const handleDelete = async () => {
    if (!missionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/command-center/missions?id=${missionId}`, { method: 'DELETE' })
      if (res.ok) {
        store.setMissions(store.missions.filter(m => m.id !== missionId))
      }
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel mission?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel <strong>{mission?.title ?? 'this mission'}</strong> and mark the run as cancelled.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cancel Mission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
