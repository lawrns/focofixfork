'use client';

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineLoadingSkeleton } from '@/components/skeleton-screens';
import { MemberRole } from '@/lib/models/organization-members';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteEmail: string;
  onEmailChange: (email: string) => void;
  inviteRole: MemberRole;
  onRoleChange: (role: MemberRole) => void;
  isInviting: boolean;
  inviteResult: { success: boolean; message: string } | null;
  onInvite: () => void;
}

export function InviteMemberModal({
  open,
  onOpenChange,
  inviteEmail,
  onEmailChange,
  inviteRole,
  onRoleChange,
  isInviting,
  inviteResult,
  onInvite,
}: InviteMemberModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[calc(100%-2rem)] px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-lg">Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              placeholder="member@example.com"
              value={inviteEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role" className="text-sm">Role</Label>
            <Select value={inviteRole} onValueChange={(value) => onRoleChange(value as MemberRole)}>
              <SelectTrigger className="h-10">
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
                  <AlertDescription className="text-xs sm:text-sm">{inviteResult.message}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
              className="h-10 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={onInvite}
              disabled={!inviteEmail.trim() || isInviting}
              className="h-10 text-sm"
            >
              {isInviting ? (
                <>
                  <InlineLoadingSkeleton size="sm" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Send Invitation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
