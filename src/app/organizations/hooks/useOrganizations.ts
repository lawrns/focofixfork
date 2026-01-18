'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { WorkspaceMemberWithDetails, MemberRole } from '@/lib/models/organization-members'
import { InvitationWithDetails } from '@/lib/models/invitations'
import { apiClient } from '@/lib/api-client'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

export interface Workspace {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  is_active: boolean
  owner_id: string
  created_at: string
}

export interface UseWorkspacesReturn {
  workspaces: Workspace[]
  isLoading: boolean
  selectedWorkspace: Workspace | null
  workspaceMembers: WorkspaceMemberWithDetails[]
  workspaceInvitations: InvitationWithDetails[]
  currentUserRole: MemberRole
  showWorkspaceModal: boolean
  showInviteModal: boolean
  showCreateDialog: boolean
  workspaceName: string
  inviteEmail: string
  inviteRole: MemberRole
  editingMember: string | null
  editRole: MemberRole
  memberToRemove: string | null
  invitationToCancel: string | null
  isCreating: boolean
  isInviting: boolean
  createResult: { success: boolean; message: string } | null
  inviteResult: { success: boolean; message: string } | null
  loadWorkspaces: () => Promise<void>
  openWorkspaceModal: (workspace: Workspace) => Promise<void>
  openInviteModalForWs: (workspace: Workspace) => Promise<void>
  handleCreateWorkspace: (e?: React.MouseEvent) => Promise<void>
  handleInviteMember: () => Promise<void>
  handleUpdateRole: (memberId: string, newRole: MemberRole) => Promise<void>
  handleRemoveMember: (memberId: string) => void
  confirmRemoveMember: () => Promise<void>
  handleResendInvitation: (invitationId: string) => Promise<void>
  handleCancelInvitation: (invitationId: string) => void
  confirmCancelInvitation: () => Promise<void>
  setShowWorkspaceModal: (show: boolean) => void
  setShowInviteModal: (show: boolean) => void
  setShowCreateDialog: (show: boolean) => void
  setWorkspaceName: (name: string) => void
  setInviteEmail: (email: string) => void
  setInviteRole: (role: MemberRole) => void
  setEditingMember: (memberId: string | null) => void
  setEditRole: (role: MemberRole) => void
  setMemberToRemove: (memberId: string | null) => void
  setInvitationToCancel: (invitationId: string | null) => void
  setCreateResult: (result: { success: boolean; message: string } | null) => void
  setInviteResult: (result: { success: boolean; message: string } | null) => void
  canManageMembers: boolean
  canRemoveMembers: boolean
}

export function useWorkspaces(): UseWorkspacesReturn {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberWithDetails[]>([])
  const [workspaceInvitations, setWorkspaceInvitations] = useState<InvitationWithDetails[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null)
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
    try {
      const response = await fetch('/api/workspaces', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openWorkspaceModal = useCallback(async (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    setShowWorkspaceModal(true)
    try {
      const results = await Promise.allSettled([
        fetch(`/api/workspaces/${workspace.id}`, { credentials: 'include' }),
        fetch(`/api/workspaces/${workspace.id}/members`, { credentials: 'include' }),
        fetch(`/api/workspaces/${workspace.id}/invitations`, { credentials: 'include' })
      ])
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        const workspaceData = await results[0].value.json()
        if (workspaceData.success) setSelectedWorkspace(workspaceData.data)
      }
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        const membersData = await results[1].value.json()
        if (membersData.success) {
          setWorkspaceMembers(membersData.data || [])
          if (user) {
            const currentUser = membersData.data?.find((m: WorkspaceMemberWithDetails) => m.user_id === user.id)
            if (currentUser) setCurrentUserRole(currentUser.role)
          }
        }
      }
      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        const invitationsData = await results[2].value.json()
        if (invitationsData.success) setWorkspaceInvitations(invitationsData.data || [])
      }
    } catch (error) {
      console.error('Failed to load workspace details:', error)
    }
  }, [user])

  const openInviteModalForWs = useCallback(async (workspace: Workspace) => {
    await openWorkspaceModal(workspace)
    setShowInviteModal(true)
  }, [openWorkspaceModal])

  const refreshMembers = useCallback(async (workspaceId: string) => {
    const response = await fetch(`/api/workspaces/${workspaceId}/members`, { credentials: 'include' })
    if (response.ok) {
      const data = await response.json()
      if (data.success) setWorkspaceMembers(data.data || [])
    }
  }, [])

  const refreshInvitations = useCallback(async (workspaceId: string) => {
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, { credentials: 'include' })
    if (response.ok) {
      const data = await response.json()
      if (data.success) setWorkspaceInvitations(data.data || [])
    }
  }, [])

  const handleInviteMember = useCallback(async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) return
    setIsInviting(true)
    setInviteResult(null)
    try {
      const response = await apiClient.post(`/api/workspaces/${selectedWorkspace.id}/members`, {
        email: inviteEmail,
        role: inviteRole,
        userId: user?.id
      })
      
      if (response.success && response.data) {
        const data = response.data
        const msg = data.invitation_sent === false ? 'Invitation created but email could not be sent.' : response.error || 'Invitation sent!'
        
        audioService.play('complete')
        hapticService.success()
        
        setInviteResult({ success: data.invitation_sent !== false, message: msg })
        setInviteEmail('')
        setInviteRole('member')
        setShowInviteModal(false)
        await refreshMembers(selectedWorkspace.id)
        await refreshInvitations(selectedWorkspace.id)
      } else {
        audioService.play('error')
        hapticService.error()
        setInviteResult({ success: false, message: response.error || 'Failed to send invitation' })
      }
    } catch {
      audioService.play('error')
      hapticService.error()
      setInviteResult({ success: false, message: 'An unexpected error occurred' })
    } finally {
      setIsInviting(false)
    }
  }, [inviteEmail, inviteRole, selectedWorkspace, user?.id, refreshMembers, refreshInvitations])

  const handleUpdateRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    if (!selectedWorkspace) return
    try {
      const response = await apiClient.patch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
        role: newRole,
        userId: user?.id
      })
      
      if (response.success) {
        audioService.play('sync')
        hapticService.light()
        await refreshMembers(selectedWorkspace.id)
        setEditingMember(null)
      } else {
        audioService.play('error')
        hapticService.error()
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to update member role:', error)
    }
  }, [selectedWorkspace, user?.id, refreshMembers])

  const handleRemoveMember = useCallback((memberId: string) => setMemberToRemove(memberId), [])

  const confirmRemoveMember = useCallback(async () => {
    if (!selectedWorkspace || !memberToRemove) return
    try {
      const response = await apiClient.delete(`/api/workspaces/${selectedWorkspace.id}/members/${memberToRemove}`, {
        body: { userId: user?.id }
      })
      
      if (response.success) {
        audioService.play('error') // Use error sound for removal
        hapticService.medium()
        await refreshMembers(selectedWorkspace.id)
      } else {
        audioService.play('error')
        hapticService.error()
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to remove member:', error)
    } finally {
      setMemberToRemove(null)
    }
  }, [selectedWorkspace, memberToRemove, user?.id, refreshMembers])

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    if (!selectedWorkspace) return
    try {
      const response = await apiClient.post(`/api/workspaces/${selectedWorkspace.id}/invitations/${invitationId}/resend`, {})
      
      if (response.success) {
        audioService.play('complete')
        hapticService.light()
        await refreshInvitations(selectedWorkspace.id)
      } else {
        audioService.play('error')
        hapticService.error()
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to resend invitation:', error)
    }
  }, [selectedWorkspace, refreshInvitations])

  const handleCancelInvitation = useCallback((invitationId: string) => setInvitationToCancel(invitationId), [])

  const confirmCancelInvitation = useCallback(async () => {
    if (!selectedWorkspace || !invitationToCancel) return
    try {
      const response = await apiClient.delete(`/api/workspaces/${selectedWorkspace.id}/invitations/${invitationToCancel}`)
      
      if (response.success) {
        audioService.play('error')
        hapticService.light()
        await refreshInvitations(selectedWorkspace.id)
      } else {
        audioService.play('error')
        hapticService.error()
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to cancel invitation:', error)
    } finally {
      setInvitationToCancel(null)
    }
  }, [selectedWorkspace, invitationToCancel, refreshInvitations])

  const handleCreateWorkspace = useCallback(async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    if (!workspaceName.trim() || !user?.id) {
      setCreateResult({ success: false, message: 'Please enter a name and ensure you are logged in' })
      return
    }
    setIsCreating(true)
    setCreateResult(null)
    try {
      const response = await apiClient.post('/api/workspaces', {
        name: workspaceName.trim()
      })
      
      if (response.success && response.data) {
        audioService.play('complete')
        hapticService.success()
        setCreateResult({ success: true, message: 'Workspace created successfully!' })
        setWorkspaceName('')
        setShowCreateDialog(false)
        await loadWorkspaces()
      } else {
        audioService.play('error')
        hapticService.error()
        setCreateResult({ success: false, message: response.error || 'Failed to create workspace' })
      }
    } catch {
      audioService.play('error')
      hapticService.error()
      setCreateResult({ success: false, message: 'Network error occurred' })
    } finally {
      setIsCreating(false)
    }
  }, [workspaceName, user?.id, loadWorkspaces])

  return {
    workspaces, isLoading, selectedWorkspace, workspaceMembers, workspaceInvitations, currentUserRole,
    showWorkspaceModal, showInviteModal, showCreateDialog, workspaceName, inviteEmail, inviteRole,
    editingMember, editRole, memberToRemove, invitationToCancel, isCreating, isInviting,
    createResult, inviteResult, loadWorkspaces, openWorkspaceModal, openInviteModalForWs,
    handleCreateWorkspace, handleInviteMember, handleUpdateRole, handleRemoveMember,
    confirmRemoveMember, handleResendInvitation, handleCancelInvitation, confirmCancelInvitation,
    setShowWorkspaceModal, setShowInviteModal, setShowCreateDialog, setWorkspaceName, setInviteEmail,
    setInviteRole, setEditingMember, setEditRole, setMemberToRemove, setInvitationToCancel,
    setCreateResult, setInviteResult, canManageMembers: currentUserRole === 'admin', canRemoveMembers: currentUserRole === 'admin',
  }
}
