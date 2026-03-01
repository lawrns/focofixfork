'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandCenterStore } from '@/lib/stores/command-center-store'
import { DeleteMissionConfirm } from '../dialogs/delete-mission-confirm'
import { BACKEND_LABELS } from '@/lib/command-center/types'
import type { UnifiedMission } from '@/lib/command-center/types'

const MISSION_STATUS_COLORS: Record<UnifiedMission['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  active:  'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  met:     'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed:  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
}

export function MissionTable() {
  const store = useCommandCenterStore()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Backend</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Agents</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Created</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {store.missions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No missions yet
                </td>
              </tr>
            ) : store.missions.map(m => (
              <tr key={m.id} className="bg-card hover:bg-accent/30 transition-colors">
                <td className="px-3 py-2">
                  <span className="font-medium truncate block max-w-[200px]">{m.title}</span>
                  {m.description && (
                    <span className="text-[11px] text-muted-foreground truncate block max-w-[200px]">
                      {m.description}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 hidden sm:table-cell">
                  <Badge variant="outline" className="text-[10px]">{BACKEND_LABELS[m.backend]}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge className={cn('text-[10px] border-0', MISSION_STATUS_COLORS[m.status])}>
                    {m.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-[11px] text-muted-foreground">
                  {m.assignedAgentIds.length}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-[11px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                    onClick={() => setDeleteId(m.id)}
                    title="Cancel mission"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteMissionConfirm
        open={!!deleteId}
        missionId={deleteId}
        onClose={() => setDeleteId(null)}
      />
    </>
  )
}
