'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { OrganizationMemberWithDetails, MemberRole } from '@/lib/models/organization-members'
import { InvitationWithDetails } from '@/lib/models/invitations'

export interface Organization {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  is_active: boolean
  created_by: string
  created_at: string
}

export interface UseOrganizationsReturn {
  organizations: Organization[]
  isLoading: boolean
  selectedOrganization: Organization | null
  orgMembers: OrganizationMemberWithDetails[]
  orgInvitations: InvitationWithDetails[]
  currentUserRole: MemberRole
  showOrgModal: boolean
  showInviteModal: boolean
  showCreateDialog: boolean
  orgName: string
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
  loadOrganizations: () => Promise<void>
  openOrganizationModal: (organization: Organization) => Promise<void>
  openInviteModalForOrg: (organization: Organization) => Promise<void>
  handleCreateOrganization: (e?: React.MouseEvent) => Promise<void>
  handleInviteMember: () => Promise<void>
  handleUpdateRole: (memberId: string, newRole: MemberRole) => Promise<void>
  handleRemoveMember: (memberId: string) => void
  confirmRemoveMember: () => Promise<void>
  handleResendInvitation: (invitationId: string) => Promise<void>
  handleCancelInvitation: (invitationId: string) => void
  confirmCancelInvitation: () => Promise<void>
  setShowOrgModal: (show: boolean) => void
  setShowInviteModal: (show: boolean) => void
  setShowCreateDialog: (show: boolean) => void
  setOrgName: (name: string) => void
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

export function useOrganizations(): UseOrganizationsReturn {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrganizationMemberWithDetails[]>([])
  const [orgInvitations, setOrgInvitations] = useState<InvitationWithDetails[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [orgName, setOrgName] = useState('')
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

  const loadOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/api/organizations', {})
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openOrganizationModal = useCallback(async (organization: Organization) => {
    setSelectedOrganization(organization)
    setShowOrgModal(true)
    try {
      const results = await Promise.allSettled([
        fetch(`/api/organizations/${organization.id}`),
        fetch(`/api/organizations/${organization.id}/members`),
        fetch(`/api/organizations/${organization.id}/invitations`)
      ])
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        const orgData = await results[0].value.json()
        if (orgData.success) setSelectedOrganization(orgData.data)
      }
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        const membersData = await results[1].value.json()
        if (membersData.success) {
          setOrgMembers(membersData.data || [])
          if (user) {
            const currentUser = membersData.data?.find((m: OrganizationMemberWithDetails) => m.user_id === user.id)
            if (currentUser) setCurrentUserRole(currentUser.role)
          }
        }
      }
      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        const invitationsData = await results[2].value.json()
        if (invitationsData.success) setOrgInvitations(invitationsData.data || [])
      }
    } catch (error) {
      console.error('Failed to load organization details:', error)
    }
  }, [user])

  const openInviteModalForOrg = useCallback(async (organization: Organization) => {
    await openOrganizationModal(organization)
    setShowInviteModal(true)
  }, [openOrganizationModal])

  const refreshMembers = useCallback(async (organizationId: string) => {
    const response = await fetch(`/api/organizations/${organizationId}/members`)
    if (response.ok) {
      const data = await response.json()
      if (data.success) setOrgMembers(data.data || [])
    }
  }, [])

  const refreshInvitations = useCallback(async (organizationId: string) => {
    const response = await fetch(`/api/organizations/${organizationId}/invitations`)
    if (response.ok) {
      const data = await response.json()
      if (data.success) setOrgInvitations(data.data || [])
    }
  }, [])

  const handleInviteMember = useCallback(async () => {
    if (!inviteEmail.trim() || !selectedOrganization) return
    setIsInviting(true)
    setInviteResult(null)
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, userId: user?.id }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        const msg = data.data?.invitation_sent === false ? 'Invitation created but email could not be sent.' : data.message || 'Invitation sent!'
        setInviteResult({ success: data.data?.invitation_sent !== false, message: msg })
        setInviteEmail('')
        setInviteRole('member')
        setShowInviteModal(false)
        await refreshMembers(selectedOrganization.id)
        await refreshInvitations(selectedOrganization.id)
      } else {
        setInviteResult({ success: false, message: data.error || 'Failed to send invitation' })
      }
    } catch {
      setInviteResult({ success: false, message: 'An unexpected error occurred' })
    } finally {
      setIsInviting(false)
    }
  }, [inviteEmail, inviteRole, selectedOrganization, user?.id, refreshMembers, refreshInvitations])

  const handleUpdateRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    if (!selectedOrganization) return
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, userId: user?.id }),
      })
      if (response.ok) {
        await refreshMembers(selectedOrganization.id)
        setEditingMember(null)
      }
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }, [selectedOrganization, user?.id, refreshMembers])

  const handleRemoveMember = useCallback((memberId: string) => setMemberToRemove(memberId), [])

  const confirmRemoveMember = useCallback(async () => {
    if (!selectedOrganization || !memberToRemove) return
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/members/${memberToRemove}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      })
      if (response.ok) await refreshMembers(selectedOrganization.id)
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setMemberToRemove(null)
    }
  }, [selectedOrganization, memberToRemove, user?.id, refreshMembers])

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    if (!selectedOrganization) return
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/invitations/${invitationId}/resend`, { method: 'POST' })
      if (response.ok) await refreshInvitations(selectedOrganization.id)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }, [selectedOrganization, refreshInvitations])

  const handleCancelInvitation = useCallback((invitationId: string) => setInvitationToCancel(invitationId), [])

  const confirmCancelInvitation = useCallback(async () => {
    if (!selectedOrganization || !invitationToCancel) return
    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/invitations/${invitationToCancel}`, { method: 'DELETE' })
      if (response.ok) await refreshInvitations(selectedOrganization.id)
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    } finally {
      setInvitationToCancel(null)
    }
  }, [selectedOrganization, invitationToCancel, refreshInvitations])

  const handleCreateOrganization = useCallback(async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    if (!orgName.trim() || !user?.id) {
      setCreateResult({ success: false, message: 'Please enter a name and ensure you are logged in' })
      return
    }
    setIsCreating(true)
    setCreateResult(null)
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setCreateResult({ success: true, message: 'Organization created successfully!' })
        setOrgName('')
        setShowCreateDialog(false)
        await loadOrganizations()
      } else {
        setCreateResult({ success: false, message: data.error || 'Failed to create organization' })
      }
    } catch {
      setCreateResult({ success: false, message: 'Network error occurred' })
    } finally {
      setIsCreating(false)
    }
  }, [orgName, user?.id, loadOrganizations])

  return {
    organizations, isLoading, selectedOrganization, orgMembers, orgInvitations, currentUserRole,
    showOrgModal, showInviteModal, showCreateDialog, orgName, inviteEmail, inviteRole,
    editingMember, editRole, memberToRemove, invitationToCancel, isCreating, isInviting,
    createResult, inviteResult, loadOrganizations, openOrganizationModal, openInviteModalForOrg,
    handleCreateOrganization, handleInviteMember, handleUpdateRole, handleRemoveMember,
    confirmRemoveMember, handleResendInvitation, handleCancelInvitation, confirmCancelInvitation,
    setShowOrgModal, setShowInviteModal, setShowCreateDialog, setOrgName, setInviteEmail,
    setInviteRole, setEditingMember, setEditRole, setMemberToRemove, setInvitationToCancel,
    setCreateResult, setInviteResult, canManageMembers: currentUserRole === 'admin', canRemoveMembers: currentUserRole === 'admin',
  }
}
