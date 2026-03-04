'use client'

import { useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings } from 'lucide-react'
import { PageLoadingSkeleton } from '@/components/skeleton-screens'
import { WorkspacesEmpty } from '@/components/empty-states/workspaces-empty'
import { WorkspaceCard } from './components/workspace-card'
import { WorkspaceDetailModal } from './components/workspace-detail-modal'
import { InviteMemberModal } from './components/invite-member-modal'
import { CreateWorkspaceDialog } from './components/create-workspace-dialog'
import { RemoveMemberDialog, CancelInvitationDialog } from './components/confirm-dialogs'
import { useWorkspaces } from './use-workspaces'

export default function WorkspacesPage() {
  useEffect(() => {
    document.title = 'Workspaces | Foco'
  }, [])

  return (
    <ProtectedRoute>
      <WorkspacesContent />
    </ProtectedRoute>
  )
}

function WorkspacesContent() {
  const {
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
  } = useWorkspaces()

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  const canManageMembers = currentUserRole === 'admin'
  const canRemoveMembers = currentUserRole === 'admin'

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
              console.log('Join workspace clicked')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                ws={ws}
                onOpen={openWorkspaceModal}
                onInvite={openInviteModalForWs}
              />
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

        <WorkspaceDetailModal
          open={showWorkspaceModal}
          onOpenChange={setShowWorkspaceModal}
          selectedWorkspace={selectedWorkspace}
          workspaceMembers={workspaceMembers}
          workspaceInvitations={workspaceInvitations}
          canManageMembers={canManageMembers}
          canRemoveMembers={canRemoveMembers}
          editingMember={editingMember}
          editRole={editRole}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          isInviting={isInviting}
          inviteResult={inviteResult}
          onSetShowInviteModal={setShowInviteModal}
          onSetEditingMember={setEditingMember}
          onSetEditRole={setEditRole}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
          onResendInvitation={handleResendInvitation}
          onCancelInvitation={handleCancelInvitation}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onInviteMember={handleInviteMember}
        />

        <InviteMemberModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          inviteEmail={inviteEmail}
          onEmailChange={setInviteEmail}
          inviteRole={inviteRole}
          onRoleChange={setInviteRole}
          isInviting={isInviting}
          inviteResult={inviteResult}
          onInvite={handleInviteMember}
        />

        <RemoveMemberDialog
          memberToRemove={memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          onConfirm={confirmRemoveMember}
        />

        <CancelInvitationDialog
          invitationToCancel={invitationToCancel}
          onOpenChange={(open) => !open && setInvitationToCancel(null)}
          onConfirm={confirmCancelInvitation}
        />

        <CreateWorkspaceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          workspaceName={workspaceName}
          onNameChange={setWorkspaceName}
          isCreating={isCreating}
          createResult={createResult}
          onCreate={handleCreateWorkspace}
        />
      </div>
    </MainLayout>
  )
}
