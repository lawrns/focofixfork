'use client'

import { Keyboard } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                    Esc
                  </kbd>
                  <span>Close view</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                    ?
                  </kbd>
                  <span>Show shortcuts</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                    A
                  </kbd>
                  <span>Approve all pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                    E
                  </kbd>
                  <span>Expand/collapse all</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
