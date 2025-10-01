'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building,
  Users,
  Plus,
  Settings,
  Mail,
  Shield,
  Crown,
  User,
  MoreHorizontal,
  Trash2,
  Edit,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { OrganizationMemberWithDetails, MemberRole } from '@/lib/models/organization-members'
import PermissionsManager from '@/components/permissions/permissions-manager'
import InvitationsManager from '@/components/invitations/invitations-manager'

interface Organization {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  is_active: boolean
  created_by: string
  created_at: string
}

export default function OrganizationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const organizationId = params.id as string
  const { user } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMemberWithDetails[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member')
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<MemberRole>('member')

  useEffect(() => {
    loadOrganization()
    loadMembers()
  }, [organizationId, user, loadOrganization, loadMembers])

  const loadOrganization = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setOrganization(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load organization:', error)
    }
  }, [organizationId])

  const loadMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMembers(data.data || [])
          // Find current user's role
          if (user) {
            const currentUser = data.data?.find((member: any) =>
              member.user_id === user.id
            )
            if (currentUser) {
              setCurrentUserRole(currentUser.role)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, user])

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setInviteResult(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setInviteResult({ success: true, message: data.message || 'Invitation sent successfully!' })
        setInviteEmail('')
        setInviteRole('member')
        setShowInviteModal(false)
        loadMembers() // Refresh member list
      } else {
        setInviteResult({ success: false, message: data.error || 'Failed to send invitation' })
      }
    } catch (error) {
      setInviteResult({ success: false, message: 'An unexpected error occurred' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        loadMembers() // Refresh member list
        setEditingMember(null)
      }
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadMembers() // Refresh member list
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'director':
        return <Crown className="w-4 h-4" />
      case 'lead':
        return <Shield className="w-4 h-4" />
      case 'member':
        return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: MemberRole) => {
    switch (role) {
      case 'director':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'lead':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    }
  }

  const canManageMembers = currentUserRole === 'director' || currentUserRole === 'lead'
  const canRemoveMembers = currentUserRole === 'director'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Organization Not Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              The organization you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push('/organizations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/organizations')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{organization.name}</h1>
                <p className="text-muted-foreground">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canManageMembers && (
              <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
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
                        onClick={() => setShowInviteModal(false)}
                        disabled={isInviting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleInviteMember}
                        disabled={!inviteEmail.trim() || isInviting}
                      >
                        {isInviting ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">
                  {organization.description || 'No description provided'}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Website</h3>
                <p className="text-muted-foreground">
                  {organization.website ? (
                    <a href={organization.website} target="_blank" rel="noopener noreferrer"
                       className="text-primary hover:underline">
                      {organization.website}
                    </a>
                  ) : (
                    'No website provided'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Team, Permissions, and Invitations */}
        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles & Permissions
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <Badge variant="secondary">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnimatePresence>
                {members.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {member.email?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {member.user_name || member.email || 'Unknown User'}
                          </span>
                          {editingMember === member.id ? (
                            <Select
                              value={editRole}
                              onValueChange={(value) => {
                                setEditRole(value as MemberRole)
                                handleUpdateRole(member.id, value as MemberRole)
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="director">Director</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className={getRoleColor(member.role)}>
                              <span className="flex items-center space-x-1">
                                {getRoleIcon(member.role)}
                                <span className="capitalize">{member.role}</span>
                              </span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {canManageMembers && (
                      <div className="flex items-center space-x-1">
                        {editingMember !== member.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingMember(member.id)
                                setEditRole(member.role)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {canRemoveMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                        {editingMember === member.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMember(null)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {members.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite your first team member to start collaborating.
                  </p>
                  {canManageMembers && (
                    <Button onClick={() => setShowInviteModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManager
              organizationId={organizationId}
              currentUserRole={currentUserRole}
            />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationsManager
              organizationId={organizationId}
              currentUserRole={currentUserRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
