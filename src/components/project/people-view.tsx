'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  MoreHorizontal,
  Mail,
  UserPlus,
  Shield,
  Crown,
  User,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  user_profiles?: {
    full_name?: string;
    email: string;
  };
}

interface PeopleViewProps {
  projectId: string;
  members: TeamMember[];
  onAddMember?: (email: string, role: string) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
  onUpdateRole?: (memberId: string, role: string) => Promise<void>;
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: User,
  guest: User,
};

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

const roleColors: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-700 border-amber-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  member: 'bg-blue-100 text-blue-700 border-blue-200',
  guest: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

function MemberCard({ 
  member, 
  onRemove, 
  onUpdateRole 
}: { 
  member: TeamMember;
  onRemove?: () => void;
  onUpdateRole?: (role: string) => void;
}) {
  const RoleIcon = roleIcons[member.role] || User;
  const initials = member.user_profiles?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('') || member.user_profiles?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
            {member.user_profiles?.full_name || 'Unknown User'}
          </p>
          <p className="text-xs text-zinc-500">
            {member.user_profiles?.email}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('gap-1', roleColors[member.role])}>
          <RoleIcon className="h-3 w-3" />
          {roleLabels[member.role] || member.role}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdateRole?.('admin')}>
              <Shield className="h-4 w-4 mr-2" />
              Make Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateRole?.('member')}>
              <User className="h-4 w-4 mr-2" />
              Make Member
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateRole?.('guest')}>
              <User className="h-4 w-4 mr-2" />
              Make Guest
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function PeopleView({ 
  projectId, 
  members, 
  onAddMember, 
  onRemoveMember,
  onUpdateRole 
}: PeopleViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsAdding(true);
    try {
      await onAddMember?.(newMemberEmail.trim(), newMemberRole);
      toast.success('Team member invited');
      setNewMemberEmail('');
      setNewMemberRole('member');
      setIsAddDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add team member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await onRemoveMember?.(memberId);
      toast.success(`${memberName} removed from project`);
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await onUpdateRole?.(memberId, role);
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  // Group members by role
  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const regularMembers = members.filter(m => m.role === 'member');
  const guests = members.filter(m => m.role === 'guest');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-sm text-zinc-500">{members.length} members in this project</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Invite a new member to this project by email address.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="colleague@company.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="member">Member - Can edit tasks</SelectItem>
                    <SelectItem value="guest">Guest - View only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      <div className="space-y-6">
        {owners.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Owners ({owners.length})
            </h3>
            <div className="space-y-2">
              {owners.map((member) => (
                <MemberCard 
                  key={member.id} 
                  member={member}
                  onRemove={() => handleRemoveMember(member.id, member.user_profiles?.full_name || 'User')}
                  onUpdateRole={(role) => handleUpdateRole(member.id, role)}
                />
              ))}
            </div>
          </div>
        )}

        {admins.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admins ({admins.length})
            </h3>
            <div className="space-y-2">
              {admins.map((member) => (
                <MemberCard 
                  key={member.id} 
                  member={member}
                  onRemove={() => handleRemoveMember(member.id, member.user_profiles?.full_name || 'User')}
                  onUpdateRole={(role) => handleUpdateRole(member.id, role)}
                />
              ))}
            </div>
          </div>
        )}

        {regularMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Members ({regularMembers.length})
            </h3>
            <div className="space-y-2">
              {regularMembers.map((member) => (
                <MemberCard 
                  key={member.id} 
                  member={member}
                  onRemove={() => handleRemoveMember(member.id, member.user_profiles?.full_name || 'User')}
                  onUpdateRole={(role) => handleUpdateRole(member.id, role)}
                />
              ))}
            </div>
          </div>
        )}

        {guests.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Guests ({guests.length})
            </h3>
            <div className="space-y-2">
              {guests.map((member) => (
                <MemberCard 
                  key={member.id} 
                  member={member}
                  onRemove={() => handleRemoveMember(member.id, member.user_profiles?.full_name || 'User')}
                  onUpdateRole={(role) => handleUpdateRole(member.id, role)}
                />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
            <UserPlus className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 mb-3">No team members yet</p>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Member
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
