'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Users, Plus, Edit, Trash2, Crown, User, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrganizationMemberWithDetails, MemberRole } from '@/lib/models/organization-members'

interface TeamMembersListProps {
  members: OrganizationMemberWithDetails[]
  canManageMembers: boolean
  canRemoveMembers: boolean
  editingMember: string | null
  editRole: MemberRole
  setEditingMember: (memberId: string | null) => void
  setEditRole: (role: MemberRole) => void
  onUpdateRole: (memberId: string, newRole: MemberRole) => void
  onRemoveMember: (memberId: string) => void
  onInviteClick: () => void
}

function getRoleIcon(role: MemberRole) {
  switch (role) {
    case 'admin':
      return <Crown className="w-4 h-4" />
    case 'member':
      return <User className="w-4 h-4" />
  }
}

function getRoleColor(role: MemberRole) {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
    case 'member':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  }
}

export function TeamMembersList({
  members,
  canManageMembers,
  canRemoveMembers,
  editingMember,
  editRole,
  setEditingMember,
  setEditRole,
  onUpdateRole,
  onRemoveMember,
  onInviteClick,
}: TeamMembersListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Badge>
            {canManageMembers && (
              <Button onClick={onInviteClick} size="sm">
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
            {members.map((member) => (
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
                            onUpdateRole(member.id, value as MemberRole)
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
                            onClick={() => onRemoveMember(member.id)}
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

          {members.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Invite your first team member to start collaborating.
              </p>
              {canManageMembers && (
                <Button onClick={onInviteClick}>
                  <Plus className="w-4 h-4" />
                  Invite Member
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
