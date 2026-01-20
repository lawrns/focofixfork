'use client'

import { BaseEmptyState } from './base-empty-state'
import Image from 'next/image'
import { Users, Lock, Bell } from 'lucide-react'

interface SettingsMembersEmptyProps {
  onInviteMember: () => void
}

export function SettingsMembersEmpty({ onInviteMember }: SettingsMembersEmptyProps) {
  const illustration = (
    <div className="relative w-full h-full">
      <Image
        src="/images/empty-states/settings-members.png"
        alt="Invite team members"
        width={192}
        height={192}
        className="mx-auto dark:opacity-90"
        priority
      />
    </div>
  )

  return (
    <BaseEmptyState
      title="No team members yet"
      description="Invite your team to collaborate on projects, share tasks, and work together more effectively."
      illustration={illustration}
      primaryAction={{
        label: 'Invite Member',
        onClick: onInviteMember,
        variant: 'default'
      }}
    >
      {/* Benefits */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-500" />
          Real-time collaboration
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-500" />
          Role-based permissions
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-500" />
          Smart notifications
        </div>
      </div>
    </BaseEmptyState>
  )
}
