'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import {
  Save,
  Users,
  User,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react'
import { RealtimeCollaborationService, OperationalTransform, CollaborationState } from '@/lib/services/realtime-collaboration'
import { CollaborationEntityType, CollaborationUser, PresenceStatus } from '@/lib/models/realtime-collaboration'
import { cn } from '@/lib/utils'

interface CollaborativeEditorProps {
  entityType: CollaborationEntityType
  entityId: string
  field: string // The field being edited (e.g., 'description', 'name')
  initialValue: string
  currentUser: {
    id: string
    name: string
    avatar?: string
  }
  onSave?: (value: string) => void
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showToolbar?: boolean
  showPresence?: boolean
  autoSave?: boolean
  autoSaveDelay?: number
}

interface CursorIndicator {
  user: CollaborationUser
  position: { top: number; left: number }
  visible: boolean
}

export default function CollaborativeEditor({
  entityType,
  entityId,
  field,
  initialValue,
  currentUser,
  onSave,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  className,
  showToolbar = true,
  showPresence = true,
  autoSave = true,
  autoSaveDelay = 2000
}: CollaborativeEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [isConnected, setIsConnected] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([])
  const [cursors, setCursors] = useState<CursorIndicator[]>([])
  const [selections, setSelections] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const collaborationServiceRef = useRef<RealtimeCollaborationService | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle state changes from collaboration service
  const handleStateChange = useCallback((state: CollaborationState) => {
    setIsConnected(state.isConnected)

    if (state.document) {
      const newValue = state.document.content[field] || ''
      if (newValue !== value) {
        setValue(newValue)
        onChange?.(newValue)
      }
    }
  }, [field, value, onChange])

  // Handle incoming operations
  const handleOperation = useCallback((operation: OperationalTransform) => {
    // Operations are handled automatically by the service
    // This callback is for UI updates if needed
  }, [])

  // Handle presence changes
  const handlePresenceChange = useCallback((users: CollaborationUser[]) => {
    setCollaborators(users.filter(u => u.user_id !== currentUser.id))
  }, [currentUser.id])

  // Initialize collaboration service
  useEffect(() => {
    const service = new RealtimeCollaborationService(
      currentUser.id,
      currentUser.name,
      handleStateChange,
      handleOperation,
      handlePresenceChange
    )

    collaborationServiceRef.current = service

    // Join collaboration session
    service.joinSession(entityType, entityId).catch(error => {
      console.error('Failed to join collaboration session:', error)
    })

    return () => {
      service.leaveSession()
    }
  }, [entityType, entityId, currentUser.id, currentUser.name, handleStateChange, handleOperation, handlePresenceChange])

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    setHasUnsavedChanges(true)
    onChange?.(newValue)

    // Apply operation through collaboration service
    if (collaborationServiceRef.current) {
      collaborationServiceRef.current.applyOperation({
        entity_type: entityType,
        entity_id: entityId,
        operation: 'update',
        path: [field],
        old_value: value,
        new_value: newValue
      }).catch(error => {
        console.error('Failed to apply operation:', error)
      })
    }

    // Auto-save
    if (autoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, autoSaveDelay)
    }
  }

  // Handle cursor position updates
  const handleCursorMove = useCallback(() => {
    if (!textareaRef.current || !collaborationServiceRef.current) return

    const textarea = textareaRef.current
    const cursorPosition = textarea.selectionStart

    // Calculate cursor coordinates (simplified)
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lines = textBeforeCursor.split('\n')
    const currentLine = lines.length - 1
    const currentColumn = lines[currentLine].length

    collaborationServiceRef.current.updateCursor({
      line: currentLine,
      column: currentColumn,
      offset: cursorPosition
    })
  }, [value])

  // Handle selection updates
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current || !collaborationServiceRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    if (start !== end) {
      const textBeforeStart = value.substring(0, start)
      const textBeforeEnd = value.substring(0, end)

      const startLines = textBeforeStart.split('\n')
      const endLines = textBeforeEnd.split('\n')

      collaborationServiceRef.current.updateSelection({
        start: {
          line: startLines.length - 1,
          column: startLines[startLines.length - 1].length,
          offset: start
        },
        end: {
          line: endLines.length - 1,
          column: endLines[endLines.length - 1].length,
          offset: end
        },
        direction: start < end ? 'forward' : 'backward'
      })
    }
  }, [value])

  // Save changes
  const handleSave = async () => {
    if (!hasUnsavedChanges) return

    setIsSaving(true)
    try {
      await onSave?.(value)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Get presence status color
  const getPresenceColor = (status: PresenceStatus) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  // Get user's cursor indicator
  const getCursorIndicator = (user: CollaborationUser): CursorIndicator | null => {
    if (!user.cursor_position || !textareaRef.current) return null

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()

    // Simplified cursor positioning (would need more sophisticated calculation)
    const lines = value.substring(0, user.cursor_position.offset).split('\n')
    const lineNumber = lines.length - 1
    const charPosition = lines[lineNumber].length

    // Estimate position (this is approximate)
    const lineHeight = 20 // Approximate line height
    const charWidth = 8 // Approximate character width

    return {
      user,
      position: {
        top: rect.top + (lineNumber * lineHeight),
        left: rect.left + (charPosition * charWidth)
      },
      visible: true
    }
  }

  return (
    <Card className={className}>
      {showToolbar && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showPresence && (
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  )}

                  <div className="flex -space-x-1">
                    {collaborators.slice(0, 3).map((user) => (
                      <div
                        key={user.user_id}
                        className="relative"
                        title={`${user.user_name} (${user.status})`}
                      >
                        <Avatar className="w-6 h-6 border-2 border-background">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs">
                            {user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                            getPresenceColor(user.status)
                          )}
                        />
                      </div>
                    ))}

                    {collaborators.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs font-medium">+{collaborators.length - 3}</span>
                      </div>
                    )}
                  </div>

                  {collaborators.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {collaborators.length} other{collaborators.length !== 1 ? 's' : ''} editing
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600">
                  Unsaved changes
                </Badge>
              )}

              {isLocked && (
                <Badge variant="destructive">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}

              {autoSave ? (
                <Badge variant="secondary">
                  <Save className="w-3 h-3 mr-1" />
                  Auto-save
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            onSelect={handleSelectionChange}
            placeholder={placeholder}
            disabled={disabled || isLocked}
            className={cn(
              'w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'font-mono text-sm leading-relaxed',
              (disabled || isLocked) && 'opacity-50 cursor-not-allowed bg-muted'
            )}
            style={{
              lineHeight: '1.5',
              tabSize: 2
            }}
          />

          {/* Remote cursors */}
          <AnimatePresence>
            {cursors.map((cursor) => (
              <motion.div
                key={cursor.user.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none z-10"
                style={{
                  top: cursor.position.top,
                  left: cursor.position.left,
                  transform: 'translateY(-100%)'
                }}
              >
                <div
                  className="w-0.5 h-5"
                  style={{ backgroundColor: cursor.user.color }}
                />
                <div
                  className="px-1 py-0.5 text-xs text-white rounded text-nowrap"
                  style={{ backgroundColor: cursor.user.color }}
                >
                  {cursor.user.user_name}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Remote selections */}
          <AnimatePresence>
            {selections.map((selection, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none"
                style={{
                  backgroundColor: selection.user.color,
                  // Position and size based on selection coordinates
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {showToolbar && (
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{value.length} characters</span>
              <span>{value.split('\n').length} lines</span>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Wifi className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
