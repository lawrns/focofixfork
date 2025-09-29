'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Copy,
  Eye,
  UserPlus,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { InvitationWithDetails, InvitationStatus, CreateInvitationData, InvitationModel } from '@/lib/models/invitations'
import { MemberRole } from '@/lib/models/organization-members'

interface InvitationsManagerProps {
  organizationId: string
  currentUserRole?: MemberRole
  className?: string
}

export default function InvitationsManager({
  organizationId,
  currentUserRole = 'member',
  className
}: InvitationsManagerProps) {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [showCreateInvitation, setShowCreateInvitation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)

  // Create invitation form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('member')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    loadInvitations()
  }, [organizationId])

  const loadInvitations = async () => {
    try {
      setIsLoading(true)
      // TODO: Load invitations from API
      // For now, show empty state
      setInvitations([])
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInvitation = async () => {
    if (!inviteEmail.trim()) return

    const invitationData: CreateInvitationData = {
      email: inviteEmail.trim(),
      role: inviteRole
    }

    const validation = InvitationModel.validateCreate(invitationData)
    if (!validation.isValid) {
      setInviteResult({ success: false, message: validation.errors.join(', ') })
      return
    }

    setIsInviting(true)
    setInviteResult(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...invitationData,
          message: inviteMessage.trim() || undefined,
          userId: user?.id
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setInviteResult({ success: true, message: 'Invitation sent successfully!' })
        setInviteEmail('')
        setInviteRole('member')
        setInviteMessage('')
        setShowCreateInvitation(false)
        loadInvitations() // Refresh invitations list
      } else {
        setInviteResult({ success: false, message: data.error || 'Failed to send invitation' })
      }
    } catch (error) {
      setInviteResult({ success: false, message: 'An unexpected error occurred' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id
        }),
      })

      if (response.ok) {
        loadInvitations() // Refresh invitations list
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadInvitations() // Refresh invitations list
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(invitationUrl)
    // TODO: Show toast notification
  }

  const canManageInvitations = currentUserRole === 'director' || currentUserRole === 'lead'

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted')
  const expiredInvitations = invitations.filter(inv => inv.status === 'expired')
  const cancelledInvitations = invitations.filter(inv => inv.status === 'cancelled')

  const getStatusBadge = (status: InvitationStatus) => {
    const statusInfo = InvitationModel.getStatusInfo(status)
    return (
      <Badge variant="secondary" className={`${statusInfo.color} flex items-center gap-1`}>
        <span>{statusInfo.icon}</span>
        {statusInfo.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-48"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Team Invitations
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage pending and completed team invitations
          </p>
        </div>

        {canManageInvitations && (
          <Dialog open={showCreateInvitation} onOpenChange={setShowCreateInvitation}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="member@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as MemberRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Input
                    id="message"
                    placeholder="Welcome to our team!"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>

                <AnimatePresence>
                  {inviteResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Alert variant={inviteResult.success ? 'default' : 'destructive'}>
                        <AlertDescription>{inviteResult.message}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateInvitation(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={!inviteEmail.trim() || isInviting}
                  >
                    {isInviting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Accepted ({acceptedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Expired ({expiredInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Cancelled ({cancelledInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                  <p className="text-muted-foreground mb-4">
                    Send invitations to add new team members
                  </p>
                  {canManageInvitations && (
                    <Button onClick={() => setShowCreateInvitation(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Send First Invitation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pendingInvitations.map((invitation) => (
                      <motion.div
                        key={invitation.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{invitation.email}</span>
                              <Badge variant="outline" className="capitalize">
                                {invitation.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Invited by {invitation.invited_by_name || 'Unknown'} • {formatDate(invitation.invited_at)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires {formatDate(invitation.expires_at)}
                            </p>
                          </div>
                        </div>

                        {canManageInvitations && (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInvitationLink(invitation.token)}
                              title="Copy invitation link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation.id)}
                              title="Resend invitation"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-destructive hover:text-destructive"
                              title="Cancel invitation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accepted">
          <Card>
            <CardHeader>
              <CardTitle>Accepted Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {acceptedInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No accepted invitations yet</h3>
                  <p className="text-muted-foreground">
                    Accepted invitations will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptedInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invitation.email}</span>
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Accepted {invitation.accepted_at ? formatDate(invitation.accepted_at) : 'recently'}
                          </p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardHeader>
              <CardTitle>Expired Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {expiredInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No expired invitations</h3>
                  <p className="text-muted-foreground">
                    Expired invitations will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expiredInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-900/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invitation.email}</span>
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Expired {formatDate(invitation.expires_at)}
                          </p>
                        </div>
                      </div>
                      {canManageInvitations && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resend
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {cancelledInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cancelled invitations</h3>
                  <p className="text-muted-foreground">
                    Cancelled invitations will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cancelledInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/40 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invitation.email}</span>
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Cancelled invitation
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


