'use client'

import React, { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCollaborativeCursor } from '@/lib/hooks/use-collaborative-cursor'
import CollaborativeCursor from './collaborative-cursor'

interface CollaborativeWorkspaceProps {
  entityId: string
  entityType: 'project' | 'task'
  pagePath: string
  showPresenceList?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * Wrapper component for collaborative features
 * Integrates cursor tracking and presence indication
 * Usage:
 *   <CollaborativeWorkspace entityId="task-123" entityType="task" pagePath="/tasks/123">
 *     <TaskDetailContent />
 *   </CollaborativeWorkspace>
 */
export default function CollaborativeWorkspace({
  entityId,
  entityType,
  pagePath,
  showPresenceList = true,
  className,
  children,
}: CollaborativeWorkspaceProps) {
  const { user } = useAuth()
  const {
    users,
    isConnected,
    broadcastCursor,
  } = useCollaborativeCursor({
    entityId,
    entityType,
    pagePath,
    currentUserId: user?.id || 'anonymous',
    currentUserName: (user?.user_metadata?.name || user?.email || 'Anonymous') as string,
    currentUserAvatar: user?.user_metadata?.avatar_url,
  })

  const otherUsers = useMemo(
    () => users.filter((u) => u.user_id !== user?.id),
    [users, user?.id]
  )

  return (
    <div className={className}>
      {/* Collaborative cursor overlay */}
      <CollaborativeCursor
        users={otherUsers}
        currentUserId={user?.id || 'anonymous'}
        pagePath={pagePath}
        onBroadcastCursor={broadcastCursor}
        showPresenceList={showPresenceList}
      />

      {/* Main content */}
      {children}

      {/* Connection indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
          Reconnecting to collaboration server...
        </div>
      )}
    </div>
  )
}
