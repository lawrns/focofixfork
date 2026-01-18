'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/toast/toast'
import { Loader2, UserPlus, Trash2, Crown, Users, Eye } from 'lucide-react'
import { useRealtimeTeam } from '@/hooks/useRealtimeTeam'
import { usePermissions } from '@/hooks/usePermissions'
import {
  AddTeamMemberSchema,
  type AddTeamMember,
  type TeamMember,
  TeamMemberRole
} from '@/lib/validation/schemas/team-member.schema'

interface TeamManagementDialogProps {
  projectId: string
  projectName: string
  currentUserId: string
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMember: (projectId: string, data: AddTeamMember) => Promise<void>
  onRemoveMember: (projectId: string, userId: string) => Promise<void>
  onUpdateRole: (projectId: string, userId: string, role: TeamMemberRole) => Promise<void>
}

interface TeamMemberWithDetails extends TeamMember {
  name?: string
  email?: string
}

export default function TeamManagementDialog({
  projectId,
  projectName,
  currentUserId,
  teamMembers: initialTeamMembers,
  open,
  onOpenChange,
  onAddMember,
  onRemoveMember,
  onUpdateRole
}: TeamManagementDialogProps) {
  // Use real-time team updates
  const { teamMembers: realtimeTeamMembers, isLoading: realtimeLoading, error: realtimeError } = useRealtimeTeam({
    projectId,
    enabled: open
  })

  // Use permissions hook
  const permissions = usePermissions({
    projectId,
    teamMembers: realtimeTeamMembers as any,
    requireSpecificRole: true
  })

  const [isLoading, setIsLoading] = useState(false)
  const [teamMembersWithDetails, setTeamMembersWithDetails] = useState<TeamMemberWithDetails[]>([])
  const [organizationUsers, setOrganizationUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const { toast } = useToast()

  // Use real-time team members if available, otherwise fall back to props
  const currentTeamMembers = realtimeTeamMembers.length > 0 ? realtimeTeamMembers : initialTeamMembers

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<AddTeamMember>({
    resolver: zodResolver(AddTeamMemberSchema),
  })

  // Fetch organization users from API
  useEffect(() => {
    const fetchOrgUsers = async () => {
      try {
        // Get workspace ID first
        const workspaceResponse = await fetch('/api/user/workspace')
        if (!workspaceResponse.ok) return

        const workspaceData = await workspaceResponse.json()
        const workspaceId = workspaceData.workspace_id

        const response = await fetch(`/api/workspaces/${workspaceId}/members`)
        if (response.ok) {
          const data = await response.json()
          const members = data.members || data || []
          const users = members.map((member: any) => ({
            id: member.user_id,
            name: member.full_name || member.email.split('@')[0],
            email: member.email
          }))
          setOrganizationUsers(users)
        }
      } catch (error) {
        console.error('Error fetching organization users:', error)
      }
    }

    if (open) {
      fetchOrgUsers()
    }
  }, [open])

  useEffect(() => {
    // Combine team members with user details from organization
    const enhancedMembers = currentTeamMembers.map(member => {
      const userDetails = organizationUsers.find(u => u.id === member.user_id)
      return {
        ...member,
        name: userDetails?.name || 'Unknown User',
        email: userDetails?.email || 'No email'
      }
    })
    setTeamMembersWithDetails(enhancedMembers)
  }, [currentTeamMembers, organizationUsers])

  // Show real-time error if any
  useEffect(() => {
    if (realtimeError) {
      toast({
        title: 'Connection Issue',
        description: 'Real-time updates may be unavailable. Some changes might not appear immediately.',
        variant: 'destructive',
      })
    }
  }, [realtimeError, toast])

  const onSubmit = async (data: AddTeamMember) => {
    // Check if user is already a member
    if (currentTeamMembers.some(m => m.user_id === data.user_id)) {
      toast({
        title: 'Error',
        description: 'User is already a team member',
        variant: 'destructive',
      })
      return
    }

    // Check permissions
    if (!permissions.canManageTeam) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to manage team members',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await onAddMember(projectId, data)
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      })
      reset()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add team member. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: 'Error',
        description: 'You cannot remove yourself from the project',
        variant: 'destructive',
      })
      return
    }

    if (!permissions.canManageTeam) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to remove team members',
        variant: 'destructive',
      })
      return
    }

    const confirm = window.confirm('Are you sure you want to remove this team member?')
    if (!confirm) return

    setIsLoading(true)
    try {
      await onRemoveMember(projectId, userId)
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove team member. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: TeamMemberRole) => {
    if (!permissions.canManageTeam) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to change team member roles',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await onUpdateRole(projectId, userId, newRole)
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: TeamMemberRole) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />
      case 'member': return <Users className="h-4 w-4" />
      case 'guest': return <Eye className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: TeamMemberRole) => {
    switch (role) {
      case 'admin': return 'default'
      case 'member': return 'secondary'
      case 'guest': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Manage Team - {projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Team Member Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Team Member
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id" className="text-sm font-semibold">Select User</Label>
                  <Select onValueChange={(value) => setValue('user_id', value)}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationUsers
                        .filter(user => !currentTeamMembers.some(m => m.user_id === user.id))
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.user_id && (
                    <p className="text-sm text-destructive">{errors.user_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-semibold">Role</Label>
                  <Select onValueChange={(value: TeamMemberRole) => setValue('role', value)}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="member">Member - Edit access</SelectItem>
                      <SelectItem value="guest">Guest - View only</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full min-h-[44px] font-bold">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Team Member
              </Button>
            </form>
          </div>

          {/* Current Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Current Team ({teamMembersWithDetails.length})
              </h3>
              {realtimeLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </div>
              )}
            </div>

            {!permissions.canView && (
              <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                You don&apos;t have permission to view team members
              </div>
            )}

            {permissions.canView && (
              teamMembersWithDetails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No team members yet. Add some above!
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembersWithDetails.map((member) => (
                    <div key={member.user_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {member.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                          value={member.role}
                          onValueChange={(value: TeamMemberRole) =>
                            handleRoleChange(member.user_id, value)
                          }
                          disabled={isLoading || member.user_id === currentUserId || !permissions.canManageTeam}
                        >
                          <SelectTrigger className="w-32 sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>

                        <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>

                        {member.user_id !== currentUserId && permissions.canManageTeam && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
