'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { WorkspaceMemberWithDetails, MemberRole } from '@/lib/models/organization-members';
import { InvitationWithDetails } from '@/lib/models/invitations';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  is_active: boolean;
  owner_id: string;
  created_at: string;
}

export function useWorkspaces() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberWithDetails[]>([]);
  const [workspaceInvitations, setWorkspaceInvitations] = useState<InvitationWithDetails[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('member');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const normalizeWorkspacesPayload = (payload: unknown): Workspace[] => {
    if (!payload || typeof payload !== 'object') return [];

    const root = payload as Record<string, unknown>;
    const candidates = [
      root.data,
      root.workspaces,
      root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>).workspaces : undefined,
    ];

    const list = candidates.find(Array.isArray);
    return Array.isArray(list) ? (list as Workspace[]) : [];
  };

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      console.log('[Workspaces] Waiting for authentication...');
      return;
    }
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(normalizeWorkspacesPayload(data));
      } else {
        console.error('Failed to load workspaces:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshMembers = async (workspaceId: string) => {
    const membersResponse = await fetch(`/api/workspaces/${workspaceId}/members`);
    if (membersResponse.ok) {
      const membersData = await membersResponse.json();
      if (membersData.success) {
        setWorkspaceMembers(membersData.data || []);
      }
    }
  };

  const refreshInvitations = async (workspaceId: string) => {
    const invitationsResponse = await fetch(`/api/workspaces/${workspaceId}/invitations`);
    if (invitationsResponse.ok) {
      const invitationsData = await invitationsResponse.json();
      if (invitationsData.success) {
        setWorkspaceInvitations(invitationsData.data || []);
      }
    }
  };

  const openWorkspaceModal = async (workspace: any) => {
    setSelectedWorkspace(workspace);
    setShowWorkspaceModal(true);

    try {
      const results = await Promise.allSettled([
        fetch(`/api/workspaces/${workspace.id}`),
        fetch(`/api/workspaces/${workspace.id}/members`),
        fetch(`/api/workspaces/${workspace.id}/invitations`),
      ]);

      if (results[0].status === 'fulfilled') {
        const workspaceResponse = results[0].value;
        if (workspaceResponse.ok) {
          try {
            const workspaceData = await workspaceResponse.json();
            if (workspaceData.success) setSelectedWorkspace(workspaceData.data);
          } catch (error) {
            console.error('Failed to parse workspace details:', error);
          }
        } else {
          console.error('Failed to load workspace details:', workspaceResponse.status);
        }
      } else {
        console.error('Failed to fetch workspace details:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        const membersResponse = results[1].value;
        if (membersResponse.ok) {
          try {
            const membersData = await membersResponse.json();
            if (membersData.success) {
              setWorkspaceMembers(membersData.data || []);
              if (user) {
                const currentUser = membersData.data?.find((member: any) => member.user_id === user.id);
                if (currentUser) setCurrentUserRole(currentUser.role);
              }
            }
          } catch (error) {
            console.error('Failed to parse members data:', error);
          }
        } else {
          console.error('Failed to load members:', membersResponse.status);
        }
      } else {
        console.error('Failed to fetch members:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        const invitationsResponse = results[2].value;
        if (invitationsResponse.ok) {
          try {
            const invitationsData = await invitationsResponse.json();
            if (invitationsData.success) setWorkspaceInvitations(invitationsData.data || []);
          } catch (error) {
            console.error('Failed to parse invitations data:', error);
          }
        } else {
          console.error('Failed to load invitations:', invitationsResponse.status);
        }
      } else {
        console.error('Failed to fetch invitations:', results[2].reason);
      }
    } catch (error) {
      console.error('Failed to load workspace details:', error);
    }
  };

  const openInviteModalForWs = async (workspace: any) => {
    await openWorkspaceModal(workspace);
    setShowInviteModal(true);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) return;

    setIsInviting(true);
    setInviteResult(null);

    try {
      console.log('[DEBUG] Sending invitation request:', {
        workspaceId: selectedWorkspace.id,
        email: inviteEmail,
        role: inviteRole,
        userId: user?.id,
      });

      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, userId: user?.id }),
      });

      const data = await response.json();

      console.log('[DEBUG] Invitation API response:', { status: response.status, ok: response.ok, data });

      if (response.ok && data.success) {
        console.log('[DEBUG] Invitation sent successfully, refreshing lists');
        const message = data.data?.invitation_sent === false
          ? 'Invitation created but email could not be sent. Please check email service configuration.'
          : data.message || 'Invitation sent successfully!';
        setInviteResult({ success: data.data?.invitation_sent !== false, message });
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteModal(false);
        await refreshMembers(selectedWorkspace.id);
        console.log('[DEBUG] Refreshing invitations...');
        await refreshInvitations(selectedWorkspace.id);
      } else {
        console.error('[DEBUG] Invitation failed:', data.error);
        setInviteResult({ success: false, message: data.error || 'Failed to send invitation' });
      }
    } catch (error) {
      console.error('[DEBUG] Invitation error:', error);
      setInviteResult({ success: false, message: 'An unexpected error occurred' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    if (!selectedWorkspace) return;

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, userId: user?.id }),
      });

      if (response.ok) {
        await refreshMembers(selectedWorkspace.id);
        setEditingMember(null);
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberToRemove(memberId);
  };

  const confirmRemoveMember = async () => {
    if (!selectedWorkspace || !memberToRemove) return;

    try {
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/members/${memberToRemove}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (response.ok) {
        await refreshMembers(selectedWorkspace.id);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setMemberToRemove(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!selectedWorkspace) return;

    try {
      const response = await fetch(
        `/api/workspaces/${selectedWorkspace.id}/invitations/${invitationId}/resend`,
        { method: 'POST' }
      );

      if (response.ok) {
        await refreshInvitations(selectedWorkspace.id);
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const handleCancelInvitation = (invitationId: string) => {
    setInvitationToCancel(invitationId);
  };

  const confirmCancelInvitation = async () => {
    if (!selectedWorkspace || !invitationToCancel) return;

    try {
      const response = await fetch(
        `/api/workspaces/${selectedWorkspace.id}/invitations/${invitationToCancel}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await refreshInvitations(selectedWorkspace.id);
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    } finally {
      setInvitationToCancel(null);
    }
  };

  const handleCreateWorkspace = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!workspaceName.trim() || !user?.id) {
      console.error('Validation failed:', { workspaceName: workspaceName.trim(), userId: user?.id });
      setCreateResult({ success: false, message: 'Please enter a name and ensure you are logged in' });
      return;
    }

    setIsCreating(true);
    setCreateResult(null);

    try {
      console.log('Making API call...');
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      console.log('API response received:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (response.ok && data.success) {
        console.log('Workspace created successfully');
        setCreateResult({ success: true, message: 'Workspace created successfully!' });
        setWorkspaceName('');
        console.log('Setting showCreateDialog to false');
        setShowCreateDialog(false);
        console.log('Calling loadWorkspaces');
        await loadWorkspaces();
        console.log('Dialog closed and workspaces reloaded');
      } else {
        console.error('Workspace creation failed:', data);
        setCreateResult({ success: false, message: data.error || 'Failed to create workspace' });
      }
    } catch (error) {
      console.error('Network error:', error);
      setCreateResult({ success: false, message: 'Network error occurred' });
    } finally {
      setIsCreating(false);
      console.log('handleCreateWorkspace completed');
    }
  };

  return {
    user,
    workspaces,
    isLoading,
    showCreateDialog,
    setShowCreateDialog,
    workspaceName,
    setWorkspaceName,
    isCreating,
    createResult,
    selectedWorkspace,
    showWorkspaceModal,
    setShowWorkspaceModal,
    workspaceMembers,
    workspaceInvitations,
    currentUserRole,
    showInviteModal,
    setShowInviteModal,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isInviting,
    inviteResult,
    editingMember,
    setEditingMember,
    editRole,
    setEditRole,
    memberToRemove,
    setMemberToRemove,
    invitationToCancel,
    setInvitationToCancel,
    loadWorkspaces,
    openWorkspaceModal,
    openInviteModalForWs,
    handleInviteMember,
    handleUpdateRole,
    handleRemoveMember,
    confirmRemoveMember,
    handleResendInvitation,
    handleCancelInvitation,
    confirmCancelInvitation,
    handleCreateWorkspace,
  };
}
