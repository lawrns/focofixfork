'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { CollaborationUser } from '@/lib/models/realtime-collaboration'
import { Users, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CursorBroadcastPayload {
  user_id: string
  cursor_x: number
  cursor_y: number
  page_path: string
  timestamp?: number
}

interface CollaborativeCursorProps {
  users: CollaborationUser[]
  currentUserId: string
  pagePath: string
  onBroadcastCursor?: (payload: CursorBroadcastPayload) => void
  showPresenceList?: boolean
  className?: string
}

interface RemoteCursor {
  user: CollaborationUser
  x: number
  y: number
  timestamp: number
}

export default function CollaborativeCursor({
  users,
  currentUserId,
  pagePath,
  onBroadcastCursor,
  showPresenceList = false,
  className,
}: CollaborativeCursorProps) {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map())
  const [currentCursorPos, setCurrentCursorPos] = useState({ x: 0, y: 0 })
  const cursorThrottleRef = useRef<number | null>(null)
  const lastBroadcastRef = useRef<number>(0)

  // Throttle cursor broadcast to 100ms
  const throttleCursorBroadcast = useCallback(
    (x: number, y: number) => {
      const now = Date.now()
      if (now - lastBroadcastRef.current < 100) return

      lastBroadcastRef.current = now

      if (onBroadcastCursor) {
        onBroadcastCursor({
          user_id: currentUserId,
          cursor_x: x,
          cursor_y: y,
          page_path: pagePath,
          timestamp: now,
        })
      }
    },
    [currentUserId, pagePath, onBroadcastCursor]
  )

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCurrentCursorPos({ x: e.clientX, y: e.clientY })

      // Throttle broadcast
      if (cursorThrottleRef.current !== null) {
        clearTimeout(cursorThrottleRef.current)
      }

      cursorThrottleRef.current = window.setTimeout(() => {
        throttleCursorBroadcast(e.clientX, e.clientY)
      }, 0)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (cursorThrottleRef.current !== null) {
        clearTimeout(cursorThrottleRef.current)
      }
    }
  }, [throttleCursorBroadcast])

  // Update remote cursors from users with cursor positions
  useEffect(() => {
    const newCursors = new Map<string, RemoteCursor>()

    users.forEach((user) => {
      if (user.user_id !== currentUserId && user.cursor_position) {
        const pos = user.cursor_position
        // Convert line/column to approximate pixel position (rough estimate)
        const x = pos.column * 8 // Average character width
        const y = pos.line * 20 // Average line height

        newCursors.set(user.user_id, {
          user,
          x,
          y,
          timestamp: Date.now(),
        })
      }
    })

    setRemoteCursors(newCursors)
  }, [users, currentUserId])

  // Get other users with cursors for display
  const usersWithCursors = users.filter(
    (user) => user.user_id !== currentUserId && user.cursor_position
  )

  // Get all other users for presence list
  const otherUsers = users.filter((user) => user.user_id !== currentUserId)

  return (
    <>
      {/* Remote cursors overlay */}
      <AnimatePresence>
        {usersWithCursors.map((user) => {
          const cursor = remoteCursors.get(user.user_id)
          if (!cursor) return null

          return (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed pointer-events-none z-50"
              style={{
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
              data-testid="collaborative-cursor"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-start">
                      {/* Cursor dot with user color */}
                      <div
                        data-testid="cursor-dot"
                        className="w-3 h-3 rounded-full border border-white shadow-md"
                        style={{
                          backgroundColor: user.color,
                        }}
                      />

                      {/* User label below cursor */}
                      <div
                        className="mt-1 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
                        style={{
                          backgroundColor: user.color,
                        }}
                      >
                        {user.user_name}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{user.user_name}</p>
                      <p className="text-xs">
                        Line {(user.cursor_position?.line ?? 0) + 1}, Column{' '}
                        {(user.cursor_position?.column ?? 0) + 1}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Presence list sidebar */}
      {showPresenceList && otherUsers.length > 0 && (
        <Card className={cn('fixed bottom-4 right-4 w-72 z-40', className)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="font-medium">Who&apos;s Here</h3>
            </div>

            <div className="space-y-3">
              {/* Online users */}
              {otherUsers
                .filter((u) => u.status === 'online')
                .map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.user_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-background"
                        style={{ backgroundColor: user.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.user_name}</p>
                      {user.cursor_position && (
                        <p className="text-xs text-muted-foreground">
                          Line {user.cursor_position.line + 1}
                        </p>
                      )}
                    </div>

                    <Wifi className="w-3 h-3 text-green-500" />
                  </div>
                ))}

              {/* Away users */}
              {otherUsers
                .filter((u) => u.status === 'away')
                .map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors opacity-75"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.user_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{user.user_name}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
