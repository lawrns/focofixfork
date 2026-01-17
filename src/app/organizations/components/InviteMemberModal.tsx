'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InlineLoadingSkeleton } from '@/components/skeleton-screens'
import { MemberRole } from '@/lib/models/organization-members'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteEmail: string
  setInviteEmail: (email: string) => void
  inviteRole: MemberRole
  setInviteRole: (role: MemberRole) => void
  isInviting: boolean
  inviteResult: { success: boolean; message: string } | null
  onSubmit: () => void
}

export function InviteMemberModal({
  open,
  onOpenChange,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  inviteResult,
  onSubmit,
}: InviteMemberModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
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
      </DialogContent>
    </Dialog>
  )
}
