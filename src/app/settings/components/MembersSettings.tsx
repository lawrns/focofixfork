'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, Trash2, Check } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/foco-store';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SettingsMembersEmpty } from '@/components/empty-states/settings-members-empty';
import { toast } from 'sonner';

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  user_name: string;
  email: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
  created_at: string;
}

export function MembersSettings() {
  const [isMounted, setIsMounted] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  useEffect(() => setIsMounted(true), []);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  const roles = [
    { value: 'owner', label: 'Owner', description: 'Full access to all settings and billing' },
    { value: 'admin', label: 'Admin', description: 'Can manage members and workspace settings' },
    { value: 'member', label: 'Member', description: 'Can create and edit tasks and projects' },
    { value: 'viewer', label: 'Viewer', description: 'Can only view tasks and projects' },
  ];

  const permissions = [
    { feature: 'Create tasks', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Edit tasks', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Delete tasks', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Create projects', owner: true, admin: true, member: true, viewer: false },
    { feature: 'Edit project settings', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Invite members', owner: true, admin: true, member: false, viewer: false },
    { feature: 'Manage roles', owner: true, admin: false, member: false, viewer: false },
    { feature: 'Billing access', owner: true, admin: false, member: false, viewer: false },
    { feature: 'Delete workspace', owner: true, admin: false, member: false, viewer: false },
  ];

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setMembers(result.data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspace?.id) return;
    setIsInviting(true);
    try {
      const response = await fetch(`/api/organizations/${currentWorkspace.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!currentWorkspace?.id) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      const response = await fetch(`/api/organizations/${currentWorkspace.id}/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace?.id) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      const response = await fetch(`/api/organizations/${currentWorkspace.id}/members/${member.user_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const getMemberDisplayName = (member: WorkspaceMember) => {
    return member.user?.full_name || member.user_name || member.email?.split('@')[0] || 'Unknown User';
  };

  const getMemberInitials = (member: WorkspaceMember) => {
    const name = getMemberDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isCurrentUser = (member: WorkspaceMember) => {
    return member.user_id === user?.id;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to this workspace
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Users className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : members.length === 0 ? (
            <SettingsMembersEmpty onInviteMember={() => setShowInviteDialog(true)} />
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-secondary dark:bg-secondary/30 flex items-center justify-center text-[color:var(--foco-teal)] dark:text-[color:var(--foco-teal)] font-medium">
                      {getMemberInitials(member)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {getMemberDisplayName(member)}
                        {isCurrentUser(member) && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 truncate">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.id, value)}
                      disabled={member.role === 'owner' || isCurrentUser(member)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {member.role !== 'owner' && !isCurrentUser(member) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Overview of permissions for each role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-2 font-medium">Feature</th>
                  {roles.map((role) => (
                    <th key={role.value} className="text-center py-3 px-2 font-medium">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.feature} className="border-b border-zinc-100 dark:border-zinc-800/50">
                    <td className="py-2 px-2">{perm.feature}</td>
                    <td className="text-center py-2 px-2">
                      {perm.owner ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.admin ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.member ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="text-center py-2 px-2">
                      {perm.viewer ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => r.value !== 'owner').map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-zinc-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
