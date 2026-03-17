'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useDashboardData } from '@/components/dashboard/use-dashboard-data'
import { DispatchModal } from './dispatch-modal'

interface Props {
  open: boolean
  onClose: () => void
  preferredModel: string
}

export default function DispatchModalLazy({ open, onClose, preferredModel }: Props) {
  const { user } = useAuth()
  const data = useDashboardData(user)

  return (
    <DispatchModal
      open={open}
      onClose={onClose}
      agents={data.agents}
      projects={data.projectOptions}
      preferredModel={preferredModel}
      onDispatched={() => {
        setTimeout(data.fetchAll, 1500)
      }}
    />
  )
}
