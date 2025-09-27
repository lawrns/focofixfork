'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  id: string
  name?: string
  email?: string
  avatar_url?: string
  last_seen: string
  online: boolean
}

interface UserPresenceProps {
  projectId?: string
  milestoneId?: string
  organizationId?: string
  maxDisplay?: number
  showNames?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const UserPresence: React.FC<UserPresenceProps> = ({
  projectId,
  milestoneId,
  organizationId,
  maxDisplay = 5,
  showNames = false,
  size = 'md',
  className
}) => {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const avatarSizeClass = sizeClasses[size]

  const updatePresence = useCallback((presences: any[]) => {
    const users: PresenceUser[] = presences.map(presence => ({
      id: presence.user_id || presence.id,
      name: presence.user_metadata?.name || `User ${presence.user_id?.slice(-4) || 'Unknown'}`,
      email: presence.user_metadata?.email,
      avatar_url: presence.user_metadata?.avatar_url,
      last_seen: new Date().toISOString(),
      online: true
    }))

    setPresenceUsers(users)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let channel: RealtimeChannel

    const setupPresence = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous'

      // Determine the channel name based on the context
      const channelName = projectId
        ? `presence:project:${projectId}`
        : milestoneId
        ? `presence:milestone:${milestoneId}`
        : organizationId
        ? `presence:organization:${organizationId}`
        : 'presence:global'

      channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: userId
          }
        }
      })

      // Handle presence events
      channel
        .on('presence', { event: 'sync' }, () => {
          const presences = channel.presenceState()
          updatePresence(Object.values(presences).flat())
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          updatePresence(newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          setPresenceUsers(prev =>
            prev.filter(user => !leftPresences.some(lp => lp.user_id === user.id))
          )
        })

      // Track user's own presence
      const trackPresence = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await channel.track({
            user_id: user.id,
            user_metadata: {
              name: user.user_metadata?.name || user.email?.split('@')[0],
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url
            }
          })
        }
      }

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence()
        }
      })
    }

    setupPresence()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [projectId, milestoneId, organizationId, updatePresence])

  const displayUsers = presenceUsers.slice(0, maxDisplay)
  const remainingCount = Math.max(0, presenceUsers.length - maxDisplay)

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {[...Array(maxDisplay)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-muted animate-pulse',
              avatarSizeClass
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        <AnimatePresence>
          {displayUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className={avatarSizeClass}>
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-green-600">
                      Online now
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>

              {showNames && user.name && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs bg-background border rounded px-1 py-0.5 shadow-sm">
                    {user.name}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Remaining count indicator */}
        {remainingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className={cn(
                    'rounded-full flex items-center justify-center border-2 border-background',
                    size === 'sm' ? 'h-6 w-6 text-xs' :
                    size === 'md' ? 'h-8 w-8 text-sm' :
                    'h-10 w-10 text-base'
                  )}
                >
                  +{remainingCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more user{remainingCount !== 1 ? 's' : ''} online</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}

        {/* Empty state */}
        {presenceUsers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground"
          >
            No one online
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default UserPresence

