'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RemoveMemberDialogProps {
  memberToRemove: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RemoveMemberDialog({ memberToRemove, onOpenChange, onConfirm }: RemoveMemberDialogProps) {
  return (
    <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this member from the workspace? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove Member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface CancelInvitationDialogProps {
  invitationToCancel: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CancelInvitationDialog({ invitationToCancel, onOpenChange, onConfirm }: CancelInvitationDialogProps) {
  return (
    <AlertDialog open={!!invitationToCancel} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this invitation? The recipient will no longer be able to join using this invitation link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cancel Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
