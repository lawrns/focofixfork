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
import { WorkspacesEmpty } from '@/components/empty-states/workspaces-empty'

export default function WorkspacesPage() {
  // Set page title
  useEffect(() => {
    document.title = 'Workspaces | Foco'
  }, [])

  return (
    <ProtectedRoute>
      <WorkspacesContent />
    </ProtectedRoute>
  )
}

interface Workspace {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  is_active: boolean
  created_by: string
  created_at: string
}

function WorkspacesContent() {
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  // Workspace modal state
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState<OrganizationMemberWithDetails[]>([])
  const [workspaceInvitations, setWorkspaceInvitations] = useState<InvitationWithDetails[]>([])
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

  const loadWorkspaces = useCallback(async () => {
    // Don't load if user is not authenticated yet
    if (!user) {
      console.log('[Workspaces] Waiting for authentication...')
      return
    }
    
    try {
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data.data || [])
      } else {
        console.error('Failed to load workspaces:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  const openWorkspaceModal = async (workspace: any) => {
    setSelectedWorkspace(workspace)
    setShowWorkspaceModal(true)

    // Load workspace details, members, and invitations in parallel
    try {
      const results = await Promise.allSettled([
        fetch(`/api/workspaces/${workspace.id}`),
        fetch(`/api/workspaces/${workspace.id}/members`),
        fetch(`/api/workspaces/${workspace.id}/invitations`)
      ])

      // Handle workspace details response
      if (results[0].status === 'fulfilled') {
        const workspaceResponse = results[0].value
        if (workspaceResponse.ok) {
          try {
            const workspaceData = await workspaceResponse.json()
            if (workspaceData.success) {
              setSelectedWorkspace(workspaceData.data)
            }
          } catch (error) {
            console.error('Failed to parse workspace details:', error)
          }
        } else {
          console.error('Failed to load workspace details:', workspaceResponse.status)
        }
      } else {
        console.error('Failed to fetch workspace details:', results[0].reason)
      }

      // Handle members response
      if (results[1].status === 'fulfilled') {
        const membersResponse = results[1].value
        if (membersResponse.ok) {
          try {
            const membersData = await membersResponse.json()
            if (membersData.success) {
              setWorkspaceMembers(membersData.data || [])
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
              setWorkspaceInvitations(invitationsData.data || [])
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
      console.error('Failed to load workspace details:', error)
    }
  }

  const openInviteModalForWs = async (workspace: any) => {
    await openWorkspaceModal(workspace)
    setShowInviteModal(true)
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) return

    setIsInviting(true)
    setInviteResult(null)

    try {
      console.log('[DEBUG] Sending invitation request:', {
        workspaceId: selectedWorkspace.id,
        email: inviteEmail,
        role: inviteRole,
        userId: user?.id,
      })

      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`, {
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
        const membersResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setWorkspaceMembers(membersData.data || [])
          }
        }
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/invitations`)
        console.log('[DEBUG] Invitations fetch response:', {
          status: invitationsResponse.status,
          ok: invitationsResponse.ok,
        })
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setWorkspaceInvitations(invitationsData.data || [])
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
    if (!selectedWorkspace) return

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole, userId: user?.id }),
      })

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setWorkspaceMembers(membersData.data || [])
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
    if (!selectedWorkspace || !memberToRemove) return

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberToRemove}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (response.ok) {
        // Refresh members list
        const membersResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData.success) {
            setWorkspaceMembers(membersData.data || [])
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
    if (!selectedWorkspace) return

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/invitations`)
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setWorkspaceInvitations(invitationsData.data || [])
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
    if (!selectedWorkspace || !invitationToCancel) return

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/invitations/${invitationToCancel}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh invitations list
        const invitationsResponse = await fetch(`/api/workspaces/${selectedWorkspace.id}/invitations`)
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          if (invitationsData.success) {
            setWorkspaceInvitations(invitationsData.data || [])
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

  const handleCreateWorkspace = async (e?: React.MouseEvent) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!workspaceName.trim() || !user?.id) {
      console.error('Validation failed:', { workspaceName: workspaceName.trim(), userId: user?.id })
      setCreateResult({ success: false, message: 'Please enter a name and ensure you are logged in' })
      return
    }

    setIsCreating(true)
    setCreateResult(null)

    try {
      console.log('Making API call...')
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName.trim()
        })
      })

      console.log('API response received:', response.status)
      const data = await response.json()
      console.log('API response data:', data)

      if (response.ok && data.success) {
        console.log('Workspace created successfully')
        setCreateResult({ success: true, message: 'Workspace created successfully!' })
        setWorkspaceName('')
        console.log('Setting showCreateDialog to false')
        setShowCreateDialog(false)
        console.log('Calling loadWorkspaces')
        await loadWorkspaces() // Refresh the list
        console.log('Dialog closed and workspaces reloaded')
      } else {
        console.error('Workspace creation failed:', data)
        setCreateResult({ success: false, message: data.error || 'Failed to create workspace' })
      }
    } catch (error) {
      console.error('Network error:', error)
      setCreateResult({ success: false, message: 'Network error occurred' })
    } finally {
      setIsCreating(false)
      console.log('handleCreateWorkspace completed')
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
      <div className="space-y-6 px-4 py-6 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Manage your workspaces and team members
            </p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <WorkspacesEmpty
            onCreateWorkspace={() => setShowCreateDialog(true)}
            onJoinWorkspace={() => {
              // TODO: Implement join workspace flow
              console.log('Join workspace clicked')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {workspaces.map((ws) => (
              <Card key={ws.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openWorkspaceModal(ws)}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-primary rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{ws.name}</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Created {new Date(ws.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openInviteModalForWs(ws)
                        }}
                        title="Invite member"
                        className="h-9 w-9 p-0"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm line-clamp-2">
                    {ws.description || 'No description provided'}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {ws.members_count || 0} members
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        {ws.role || 'Member'}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Projects</span>
                      <span className="font-medium">{ws.projects_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {workspaces.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Button variant="outline" className="justify-start h-10 text-sm" onClick={() => setShowInviteModal(true)}>
                  <Plus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">Invite Team Members</span>
                </Button>
                <Button variant="outline" className="justify-start h-10 text-sm">
                  <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">Workspace Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workspace Detail Modal */}
        <Dialog open={showWorkspaceModal} onOpenChange={setShowWorkspaceModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full sm:w-[calc(100%-2rem)] px-4 sm:px-6">
            {selectedWorkspace && (
              <>
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-primary rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Building className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-lg sm:text-xl truncate">{selectedWorkspace.name}</DialogTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {canManageMembers && (
                      <Button onClick={() => setShowInviteModal(true)} className="sm:flex-shrink-0 text-sm h-9 sm:h-10">
                        <Plus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span className="hidden sm:inline">Invite Member</span>
                      </Button>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Workspace Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Workspace Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <h3 className="font-medium mb-2">Description</h3>
                          <p className="text-muted-foreground">
                            {selectedWorkspace.description || 'No description provided'}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-medium mb-2">Website</h3>
                          <p className="text-muted-foreground">
                            {selectedWorkspace.website ? (
                              <a href={selectedWorkspace.website} target="_blank" rel="noopener noreferrer"
                                 className="text-primary hover:underline">
                                {selectedWorkspace.website}
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
                  <Tabs defaultValue="team" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto overflow-hidden">

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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Users className="w-5 h-5" />
                              Team Members
                            </CardTitle>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <Badge variant="secondary" className="text-xs sm:text-sm">
                                {workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''}
                              </Badge>
                              {canManageMembers && (
                                <Button onClick={() => setShowInviteModal(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                                  <Mail className="w-4 h-4 flex-shrink-0" />
                                  <span className="hidden sm:inline">Add Members by Email</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <AnimatePresence>
                              {workspaceMembers.map((member) => (
                                <motion.div
                                  key={member.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="flex-shrink-0">
                                      <AvatarImage src="" />
                                      <AvatarFallback>
                                        {member.email?.charAt(0).toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                        <span className="font-medium text-sm truncate">
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
                                            <SelectTrigger className="w-32 text-xs h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="member">Member</SelectItem>
                                              <SelectItem value="lead">Lead</SelectItem>
                                              <SelectItem value="director">Director</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Badge variant="secondary" className={`${getRoleColor(member.role)} text-xs`}>
                                            <span className="flex items-center gap-1">
                                              {getRoleIcon(member.role)}
                                              <span className="capitalize">{member.role}</span>
                                            </span>
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                        {member.email}
                                      </p>
                                    </div>
                                  </div>

                                  {canManageMembers && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {editingMember !== member.id && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingMember(member.id)
                                              setEditRole(member.role)
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          {canRemoveMembers && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveMember(member.id)}
                                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
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
                                          className="text-xs h-8"
                                        >
                                          Cancel
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {workspaceMembers.length === 0 && (
                              <div className="text-center py-12">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                                <p className="text-muted-foreground">
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
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="w-5 h-5" />
                            Invite Team Member
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address</Label>
                                <Input
                                  id="invite-email"
                                  type="email"
                                  inputMode="email"
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Mail className="w-5 h-5" />
                              Invitations
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
                              {workspaceInvitations.length} invitation{workspaceInvitations.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {/* Invitations List */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold">Invitation History</h3>

                              <AnimatePresence>
                                {workspaceInvitations.map((invitation) => (
                                  <motion.div
                                    key={invitation.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 bg-primary rounded-lg flex-shrink-0 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-primary-foreground" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                          <span className="font-medium text-sm truncate">{invitation.email}</span>
                                          <Badge variant="secondary" className={`${InvitationModel.getStatusInfo(invitation.status).color} text-xs`}>
                                            {InvitationModel.getStatusInfo(invitation.status).icon} {InvitationModel.getStatusInfo(invitation.status).label}
                                          </Badge>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
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
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleResendInvitation(invitation.id)}
                                          title="Resend invitation"
                                          className="h-8 w-8 p-0"
                                        >
                                          <Mail className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleCancelInvitation(invitation.id)}
                                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                          title="Cancel invitation"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>

                              {workspaceInvitations.length === 0 && (
                                <div className="text-center py-12">
                                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                  <h3 className="text-lg font-semibold mb-2">No invitations yet</h3>
                                  <p className="text-muted-foreground">
                                    Send your first invitation to bring new members to your workspace.
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
          <DialogContent className="w-full sm:w-[calc(100%-2rem)] px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-lg">Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-sm">Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as MemberRole)}>
                  <SelectTrigger className="h-10">
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
                      <AlertDescription className="text-xs sm:text-sm">{inviteResult.message}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  disabled={isInviting}
                  className="h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim() || isInviting}
                  className="h-10 text-sm"
                >
                  {isInviting ? (
                    <>
                      <InlineLoadingSkeleton size="sm" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Send Invitation</span>
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
                Are you sure you want to remove this member from the workspace? This action cannot be undone.
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

        {/* Create Workspace Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="w-full sm:w-[calc(100%-2rem)] px-4 sm:px-6">
            <DialogHeader>
              <DialogTitle className="text-lg">Create New Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name" className="text-sm">Workspace Name</Label>
                <Input
                  id="ws-name"
                  placeholder="Enter workspace name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="h-10"
                />
              </div>
              {createResult && (
                <Alert variant={createResult.success ? 'default' : 'destructive'}>
                  <AlertDescription className="text-xs sm:text-sm">{createResult.message}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                  className="h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={!workspaceName.trim() || isCreating}
                  className="h-10 text-sm"
                >
                  {isCreating ? (
                    <>
                      <InlineLoadingSkeleton size="sm" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Create Workspace</span>
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


