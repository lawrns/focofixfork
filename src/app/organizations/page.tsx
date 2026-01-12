'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Users, Building, Settings, Mail, Crown, Shield, User, Edit, Trash2, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { PageLoadingSkeleton, InlineLoadingSkeleton } from '@/components/skeleton-screens'
import { OrganizationMemberWithDetails, MemberRole } from '@/lib/models/organization-members'
import { InvitationWithDetails } from '@/lib/models/invitations'
import { InvitationModel } from '@/lib/models/invitations'
import { OrganizationsEmpty } from '@/components/empty-states/organizations-empty'

export default function OrganizationsPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Organizaciones | Foco'
  }, [])

  return (
    <ProtectedRoute>
      <OrganizationsContent />
    </ProtectedRoute>
  )
}

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

function OrganizationsContent() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  // Organization modal state
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrganizationMemberWithDetails[]>([])
  const [orgInvitations, setOrgInvitations] = useState<InvitationWithDetails[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<MemberRole>('member')
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null)

  const loadOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/api/organizations', {
              })
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.data || [])
      } else {
        console.error('Failed to load organizations:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  const openOrganizationModal = async (organization: any) => {
    setSelectedOrganization(organization)
    setShowOrgModal(true)

    // Load organization details, members, and invitations in parallel
    try {
      const results = await Promise.allSettled([
        fetch(`/api/organizations/${organization.id}`),
        fetch(`/api/organizations/${organization.id}/members`),
        fetch(`/api/organizations/${organization.id}/invitations`)
      ])

      // Handle organization details response
      if (results[0].status === 'fulfilled') {
        const orgResponse = results[0].value
        if (orgResponse.ok) {
          try {
            const orgData = await orgResponse.json()
            if (orgData.success) {
              setSelectedOrganization(orgData.data)
            }
          } catch (error) {
            console.error('Failed to parse organization details:', error)
          }
        } else {
          console.error('Failed to load organization details:', orgResponse.status)
        }
      } else {
        console.error('Failed to fetch organization details:', results[0].reason)
      }

      // Handle members response
      if (results[1].status === 'fulfilled') {
        const membersResponse = results[1].value
        if (membersResponse.ok) {
          try {
            const membersData = await membersResponse.json()
            if (membersData.success) {
              setOrgMembers(membersData.data || [])
              // Find current user's role
              if (user) {
                const currentUser = membersData.data?.find((member: any) =>
                  member.user_id === user.id
                )
                if (currentUser) {
                  setCurrentUserRole(currentUser.role)
                }
              }
            }
          } catch (error) {
            console.error('Failed to parse members data:', error)
          }
        } else {
          console.error('Failed to load members:', membersResponse.status)
        }
      } else {
        console.error('Failed to fetch members:', results[1].reason)
      }

      // Handle invitations response
      if (results[2].status === 'fulfilled') {
        const invitationsResponse = results[2].value
        if (invitationsResponse.ok) {
          try {
            const invitationsData = await invitationsResponse.json()
            if (invitationsData.success) {
              setOrgInvitations(invitationsData.data || [])
            }
          } catch (error) {
            console.error('Failed to parse invitations data:', error)
          }
        } else {
          console.error('Failed to load invitations:', invitationsResponse.status)
        }
      } else {
        console.error('Failed to fetch invitations:', results[2].reason)
      }
    } catch (error) {
      console.error('Failed to load organization details:', error)
    }
  }

  const openInviteModalForOrg = async (organization: any) => {
    await openOrganizationModal(organization)
    setShowInviteModal(true)
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedOrganization) return

    setIsInviting(true)
    setInviteResult(null)

    try {
      console.log('[DEBUG] Sending invitation request:', {
        organizationId: selectedOrganization.id,
        email: inviteEmail,
        role: inviteRole,
        userId: user?.id,
      })

      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          userId: user?.id,
        }),
      })

      const data = await response.json()

      console.log('[DEBUG] Invitation API response:', {
        status: response.status,
        ok: response.ok,
        data: data,
      })

      if (response.ok && data.success) {
        console.log('[DEBUG] Invitation sent successfully, refreshing lists')
        // Show appropriate message based on email sending status
        const message = data.data?.invitation_sent === false
          ? 'Invitation created but email could not be sent. Please check email service configuration.'
          : data.message || 'Invitation sent successfully!'
        setInviteResult({ success: data.data?.invitation_sent !== false, message })
        setInviteEmail('')
        setInviteRole('member')
        setShowInviteModal(false)
        // Refresh members list
        const membersResponse = await fetch(`/api/organizations/${selectedOrganization.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setOrgMembers(membersData.data || [])
          }
        }
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/organizations/${selectedOrganization.id}/invitations`, {
                  })
        console.log('[DEBUG] Invitations fetch response:', {
          status: invitationsResponse.status,
          ok: invitationsResponse.ok,
        })
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setOrgInvitations(invitationsData.data || [])
          }
        } else {
          console.error('[DEBUG] Failed to refresh invitations:', invitationsResponse.status)
        }
      } else {
        console.error('[DEBUG] Invitation failed:', data.error)
        setInviteResult({ success: false, message: data.error || 'Failed to send invitation' })
      }
    } catch (error) {
      console.error('[DEBUG] Invitation error:', error)
      setInviteResult({ success: false, message: 'An unexpected error occurred' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    if (!selectedOrganization) return

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole, userId: user?.id }),
      })

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetch(`/api/organizations/${selectedOrganization.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setOrgMembers(membersData.data || [])
          }
        }
        setEditingMember(null)
      }
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    setMemberToRemove(memberId)
  }

  const confirmRemoveMember = async () => {
    if (!selectedOrganization || !memberToRemove) return

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members/${memberToRemove}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetch(`/api/organizations/${selectedOrganization.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setOrgMembers(membersData.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setMemberToRemove(null)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (!selectedOrganization) return

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/organizations/${selectedOrganization.id}/invitations`)
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setOrgInvitations(invitationsData.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }

  const handleCancelInvitation = (invitationId: string) => {
    setInvitationToCancel(invitationId)
  }

  const confirmCancelInvitation = async () => {
    if (!selectedOrganization || !invitationToCancel) return

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/invitations/${invitationToCancel}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/organizations/${selectedOrganization.id}/invitations`)
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setOrgInvitations(invitationsData.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    } finally {
      setInvitationToCancel(null)
    }
  }

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />
      case 'member':
        return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: MemberRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'member':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    }
  }

  const canManageMembers = currentUserRole === 'admin'
  const canRemoveMembers = currentUserRole === 'admin'

  const handleCreateOrganization = async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!orgName.trim() || !user?.id) {
      console.error('Validation failed:', { orgName: orgName.trim(), userId: user?.id })
      setCreateResult({ success: false, message: 'Please enter a name and ensure you are logged in' })
      return
    }

    setIsCreating(true)
    setCreateResult(null)

    try {
      console.log('Making API call...')
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName.trim()
        })
      })

      console.log('API response received:', response.status)
      const data = await response.json()
      console.log('API response data:', data)

      if (response.ok && data.success) {
        console.log('Organization created successfully')
        setCreateResult({ success: true, message: 'Organization created successfully!' })
        setOrgName('')
        console.log('Setting showCreateDialog to false')
        setShowCreateDialog(false)
        console.log('Calling loadOrganizations')
        await loadOrganizations() // Refresh the list
        console.log('Dialog closed and organizations reloaded')
      } else {
        console.error('Organization creation failed:', data)
        setCreateResult({ success: false, message: data.error || 'Failed to create organization' })
      }
    } catch (error) {
      console.error('Network error:', error)
      setCreateResult({ success: false, message: 'Network error occurred' })
    } finally {
      setIsCreating(false)
      console.log('handleCreateOrganization completed')
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-2"></div>
              <div className="h-4 bg-muted rounded w-96"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  // Don't render anything if user is not loaded yet
  if (!user) {
    return (
      <MainLayout>
        <PageLoadingSkeleton />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground mt-2">
              Manage your organizations and team members
            </p>
          </div>
        </div>

        {organizations.length === 0 ? (
          <OrganizationsEmpty
            onCreateOrganization={() => setShowCreateDialog(true)}
            onJoinOrganization={() => {
              // TODO: Implement join organization flow
              console.log('Join organization clicked')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openOrganizationModal(org)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(org.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openInviteModalForOrg(org)
                        }}
                        title="Invite member"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {org.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {org.members_count || 0} members
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {org.role || 'Member'}
                      </Badge>
                    </div>
                  </div>

                  {/* Mock projects count - would come from API */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-medium">{org.projects_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions - only show when organizations exist */}
        {organizations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Invite Team Members
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  Organization Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Detail Modal */}
        <Dialog open={showOrgModal} onOpenChange={setShowOrgModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedOrganization && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl">{selectedOrganization.name}</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          {orgMembers.length} member{orgMembers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {canManageMembers && (
                      <Button onClick={() => setShowInviteModal(true)}>
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        Invite Member
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
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
                            {selectedOrganization.description || 'No description provided'}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Website</h3>
                          <p className="text-muted-foreground">
                            {selectedOrganization.website ? (
                              <a href={selectedOrganization.website} target="_blank" rel="noopener noreferrer"
                                 className="text-primary hover:underline">
                                {selectedOrganization.website}
                              </a>
                            ) : (
                              'No website provided'
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabs for Team, Invite, Permissions, and Invitations */}
                  <Tabs defaultValue="invite" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                      <TabsTrigger value="team" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Team Members
                      </TabsTrigger>
                      <TabsTrigger value="invite" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Invite
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
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {orgMembers.length} member{orgMembers.length !== 1 ? 's' : ''}
                              </Badge>
                              {canManageMembers && (
                                <Button onClick={() => setShowInviteModal(true)} size="sm">
                                  <Mail className="w-4 h-4" />
                                  Add Members by Email
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <AnimatePresence>
                              {orgMembers.map((member) => (
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

                            {orgMembers.length === 0 && (
                              <div className="text-center py-12">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                                <p className="text-muted-foreground mb-4">
                                  Invite your first team member to start collaborating.
                                </p>
                                {canManageMembers && (
                                  <Button onClick={() => setShowInviteModal(true)}>
                                    <Plus className="w-4 h-4" />
                                    Invite Member
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="invite">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Invite Team Member
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address</Label>
                                <Input
                                  id="invite-email"
                                  type="email"
                                  placeholder="member@example.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="invite-role">Role</Label>
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

                            <div className="flex justify-end">
                              <Button
                                onClick={handleInviteMember}
                                disabled={!inviteEmail.trim() || isInviting}
                              >
                                {isInviting ? (
                                  <>
                                    <InlineLoadingSkeleton size="sm" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-4 h-4" />
                                    Send Invitation
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="permissions">
                      <Card>
                        <CardContent className="py-12">
                          <div className="text-center">
                            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Roles & Permissions</h3>
                            <p className="text-muted-foreground">
                              Permission management features coming soon.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="invitations">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <Mail className="w-5 h-5" />
                              Invitations
                            </CardTitle>
                            <Badge variant="secondary">
                              {orgInvitations.length} invitation{orgInvitations.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {/* Invitations List */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold">Invitation History</h3>

                              <AnimatePresence>
                                {orgInvitations.map((invitation) => (
                                  <motion.div
                                    key={invitation.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-primary-foreground" />
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{invitation.email}</span>
                                          <Badge variant="secondary" className={InvitationModel.getStatusInfo(invitation.status).color}>
                                            {InvitationModel.getStatusInfo(invitation.status).icon} {InvitationModel.getStatusInfo(invitation.status).label}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Invited by {invitation.invited_by_name} • {new Date(invitation.invited_at).toLocaleDateString()}
                                        </p>
                                        {invitation.status === 'pending' && (
                                          <p className="text-xs text-muted-foreground">
                                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {canManageMembers && invitation.status === 'pending' && (
                                      <div className="flex items-center space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleResendInvitation(invitation.id)}
                                          title="Resend invitation"
                                        >
                                          <Mail className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
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

                              {orgInvitations.length === 0 && (
                                <div className="text-center py-12">
                                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                  <h3 className="text-lg font-semibold mb-2">No invitations yet</h3>
                                  <p className="text-muted-foreground">
                                    Send your first invitation to bring new members to your organization.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Invite Member Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
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
                      <InlineLoadingSkeleton size="sm" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this member from the organization? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Invitation Confirmation Dialog */}
        <AlertDialog open={!!invitationToCancel} onOpenChange={(open) => !open && setInvitationToCancel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this invitation? The recipient will no longer be able to join using this invitation link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelInvitation}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel Invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Organization Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              {createResult && (
                <Alert variant={createResult.success ? 'default' : 'destructive'}>
                  <AlertDescription>{createResult.message}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  disabled={!orgName.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <InlineLoadingSkeleton size="sm" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Organization
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}


