'use client';

import { Building, Mail, Plus, Shield, Users, Edit, Trash2, Crown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineLoadingSkeleton } from '@/components/skeleton-screens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar';
import { WorkspaceMemberWithDetails, MemberRole } from '@/lib/models/organization-members';
import { InvitationWithDetails, InvitationModel } from '@/lib/models/invitations';

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

interface WorkspaceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWorkspace: Workspace | null;
  workspaceMembers: WorkspaceMemberWithDetails[];
  workspaceInvitations: InvitationWithDetails[];
  canManageMembers: boolean;
  canRemoveMembers: boolean;
  editingMember: string | null;
  editRole: MemberRole;
  inviteEmail: string;
  inviteRole: MemberRole;
  isInviting: boolean;
  inviteResult: { success: boolean; message: string } | null;
  onSetShowInviteModal: (show: boolean) => void;
  onSetEditingMember: (id: string | null) => void;
  onSetEditRole: (role: MemberRole) => void;
  onUpdateRole: (memberId: string, role: MemberRole) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onInviteEmailChange: (email: string) => void;
  onInviteRoleChange: (role: MemberRole) => void;
  onInviteMember: () => void;
}

function getRoleIcon(role: MemberRole) {
  switch (role) {
    case 'admin': return <Crown className="w-4 h-4" />;
    case 'member': return <User className="w-4 h-4" />;
    default: return <User className="w-4 h-4" />;
  }
}

function getRoleColor(role: MemberRole) {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    case 'member': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    default: return '';
  }
}

export function WorkspaceDetailModal({
  open,
  onOpenChange,
  selectedWorkspace,
  workspaceMembers,
  workspaceInvitations,
  canManageMembers,
  canRemoveMembers,
  editingMember,
  editRole,
  inviteEmail,
  inviteRole,
  isInviting,
  inviteResult,
  onSetShowInviteModal,
  onSetEditingMember,
  onSetEditRole,
  onUpdateRole,
  onRemoveMember,
  onResendInvitation,
  onCancelInvitation,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteMember,
}: WorkspaceDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  <Button onClick={() => onSetShowInviteModal(true)} className="sm:flex-shrink-0 text-sm h-9 sm:h-10">
                    <Plus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">Invite Member</span>
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6">
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
                            <Button onClick={() => onSetShowInviteModal(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
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
                                          onSetEditRole(value as MemberRole);
                                          onUpdateRole(member.id, value as MemberRole);
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
                                          onSetEditingMember(member.id);
                                          onSetEditRole(member.role);
                                        }}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      {canRemoveMembers && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onRemoveMember(member.id)}
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
                                      onClick={() => onSetEditingMember(null)}
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
                              <Button onClick={() => onSetShowInviteModal(true)}>
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
                              onChange={(e) => onInviteEmailChange(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={(value) => onInviteRoleChange(value as MemberRole)}>
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
                            onClick={onInviteMember}
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
                                      onClick={() => onResendInvitation(invitation.id)}
                                      title="Resend invitation"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onCancelInvitation(invitation.id)}
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
  );
}
