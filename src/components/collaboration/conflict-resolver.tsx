'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  GitMerge,
  GitBranch,
  Clock,
  User,
  FileText,
  ArrowRight,
  RotateCcw
} from 'lucide-react'
import { OperationalTransform, ConflictResolution } from '@/lib/models/realtime-collaboration'
import { cn } from '@/lib/utils'

interface ConflictResolverProps {
  conflicts: ConflictResolution[]
  onResolve: (resolution: ConflictResolution) => void
  onDismiss: (conflictId: string) => void
  currentUserId: string
  className?: string
}

interface ConflictDisplay {
  id: string
  entity_type: string
  entity_id: string
  field: string
  your_change: {
    operation: string
    old_value: any
    new_value: any
    timestamp: string
  }
  their_change: {
    operation: string
    old_value: any
    new_value: any
    timestamp: string
    user_name: string
    user_avatar?: string
  }
  suggested_resolution: 'accept' | 'reject' | 'merge'
  can_resolve: boolean
}

export default function ConflictResolver({
  conflicts,
  onResolve,
  onDismiss,
  currentUserId,
  className
}: ConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictDisplay | null>(null)
  const [resolutionChoice, setResolutionChoice] = useState<'accept' | 'reject' | 'merge'>('merge')
  const [isResolving, setIsResolving] = useState(false)

  const activeConflicts = conflicts.filter(c => c.resolution === null)

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'empty'
    if (typeof value === 'string') {
      return value.length > 50 ? `${value.substring(0, 50)}...` : `"${value}"`
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const getConflictDisplay = (conflict: ConflictResolution): ConflictDisplay => {
    // This would be constructed from the conflict data
    // For now, creating a mock display object
    return {
      id: conflict.operation_id,
      entity_type: 'project', // Would come from conflict data
      entity_id: 'entity123', // Would come from conflict data
      field: 'description', // Would come from conflict data
      your_change: {
        operation: 'update',
        old_value: 'Old content',
        new_value: 'Your new content',
        timestamp: conflict.timestamp
      },
      their_change: {
        operation: 'update',
        old_value: 'Old content',
        new_value: 'Their conflicting content',
        timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        user_name: 'Jane Smith',
        user_avatar: undefined
      },
      suggested_resolution: 'merge',
      can_resolve: true
    }
  }

  const handleResolve = async (conflict: ConflictDisplay) => {
    setIsResolving(true)
    try {
      const resolution: ConflictResolution = {
        operation_id: conflict.id,
        conflicting_operations: [], // Would be populated from actual conflict data
        resolution: resolutionChoice,
        timestamp: new Date().toISOString()
      }

      await onResolve(resolution)
      setSelectedConflict(null)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setIsResolving(false)
    }
  }

  const getTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const hours = Math.floor(diffMinutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (activeConflicts.length === 0) {
    return null
  }

  return (
    <>
      <Card className={cn('border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertTriangle className="w-5 h-5" />
            Collaboration Conflicts
            <Badge variant="outline" className="ml-auto">
              {activeConflicts.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              There are conflicting edits that need to be resolved to continue collaborating.
            </p>

            <div className="space-y-2">
              {activeConflicts.slice(0, 3).map((conflict) => {
                const display = getConflictDisplay(conflict)
                return (
                  <motion.div
                    key={conflict.operation_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 border rounded-lg bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                    onClick={() => setSelectedConflict(display)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="font-medium text-sm">
                            Conflict in {display.entity_type} {display.field}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getTimeAgo(display.their_change.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={display.their_change.user_avatar} />
                          <AvatarFallback className="text-xs">
                            {display.their_change.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {display.their_change.user_name}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {activeConflicts.length > 3 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  +{activeConflicts.length - 3} more conflicts
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Resolve Edit Conflict
            </DialogTitle>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-6">
              {/* Conflict Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">Conflict Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Entity:</span> {selectedConflict.entity_type}
                  </div>
                  <div>
                    <span className="font-medium">Field:</span> {selectedConflict.field}
                  </div>
                </div>
              </div>

              {/* Changes Comparison */}
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="comparison">Compare Changes</TabsTrigger>
                  <TabsTrigger value="your-change">Your Change</TabsTrigger>
                  <TabsTrigger value="their-change">Their Change</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Your Change */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Your Change</span>
                        <Badge variant="outline" className="text-xs">
                          {getTimeAgo(selectedConflict.your_change.timestamp)}
                        </Badge>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Operation:</span>
                            <Badge variant="secondary">{selectedConflict.your_change.operation}</Badge>
                          </div>

                          <div>
                            <span className="font-medium text-sm">Old Value:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                              {formatValue(selectedConflict.your_change.old_value)}
                            </pre>
                          </div>

                          <ArrowRight className="w-4 h-4 text-blue-600 mx-auto" />

                          <div>
                            <span className="font-medium text-sm">New Value:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                              {formatValue(selectedConflict.your_change.new_value)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Their Change */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={selectedConflict.their_change.user_avatar} />
                          <AvatarFallback className="text-xs">
                            {selectedConflict.their_change.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedConflict.their_change.user_name}&apos;s Change</span>
                        <Badge variant="outline" className="text-xs">
                          {getTimeAgo(selectedConflict.their_change.timestamp)}
                        </Badge>
                      </div>

                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Operation:</span>
                            <Badge variant="secondary">{selectedConflict.their_change.operation}</Badge>
                          </div>

                          <div>
                            <span className="font-medium text-sm">Old Value:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                              {formatValue(selectedConflict.their_change.old_value)}
                            </pre>
                          </div>

                          <ArrowRight className="w-4 h-4 text-orange-600 mx-auto" />

                          <div>
                            <span className="font-medium text-sm">New Value:</span>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-x-auto">
                              {formatValue(selectedConflict.their_change.new_value)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="your-change">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium mb-3">Your Change Details</h4>
                    <pre className="text-sm overflow-x-auto">
{`Operation: ${selectedConflict.your_change.operation}
Timestamp: ${selectedConflict.your_change.timestamp}
Old Value: ${formatValue(selectedConflict.your_change.old_value)}
New Value: ${formatValue(selectedConflict.your_change.new_value)}`}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="their-change">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <h4 className="font-medium mb-3">{selectedConflict.their_change.user_name}&apos;s Change Details</h4>
                    <pre className="text-sm overflow-x-auto">
{`Operation: ${selectedConflict.their_change.operation}
Timestamp: ${selectedConflict.their_change.timestamp}
Old Value: ${formatValue(selectedConflict.their_change.old_value)}
New Value: ${formatValue(selectedConflict.their_change.new_value)}`}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Resolution Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Choose Resolution</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      resolutionChoice === 'accept' ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                    )}
                    onClick={() => setResolutionChoice('accept')}
                  >
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <h4 className="font-medium mb-1">Accept Yours</h4>
                      <p className="text-sm text-muted-foreground">
                        Keep your changes and discard theirs
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      resolutionChoice === 'reject' ? 'ring-2 ring-red-500 bg-red-50/50' : ''
                    )}
                    onClick={() => setResolutionChoice('reject')}
                  >
                    <CardContent className="p-4 text-center">
                      <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                      <h4 className="font-medium mb-1">Accept Theirs</h4>
                      <p className="text-sm text-muted-foreground">
                        Keep their changes and discard yours
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      resolutionChoice === 'merge' ? 'ring-2 ring-purple-500 bg-purple-50/50' : ''
                    )}
                    onClick={() => setResolutionChoice('merge')}
                  >
                    <CardContent className="p-4 text-center">
                      <GitMerge className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <h4 className="font-medium mb-1">Merge Changes</h4>
                      <p className="text-sm text-muted-foreground">
                        Combine both changes intelligently
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onDismiss(selectedConflict.id)}
                >
                  Dismiss for Now
                </Button>

                <Button
                  onClick={() => handleResolve(selectedConflict)}
                  disabled={isResolving}
                >
                  {isResolving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Resolve Conflict
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}


