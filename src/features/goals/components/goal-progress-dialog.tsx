'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';
import { GoalsService, type Goal } from '@/lib/services/goals.service';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface GoalProgressDialogProps {
  goal: Goal;
  children: React.ReactNode;
  onProgressUpdated: () => void;
}

export function GoalProgressDialog({ goal, children, onProgressUpdated }: GoalProgressDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [note, setNote] = useState('');

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error('You must be logged in');
      }

      const success = await GoalsService.updateGoal(goal.id, user.id, {
        name: goal.name,
      });

      if (success) {
        toast.success('Goal marked as completed!');
        setIsOpen(false);
        onProgressUpdated();
        setNote('');
      } else {
        throw new Error('Failed to update goal');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0052CC]" />
            Goal Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">{goal.name}</h3>
            {goal.description && (
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            )}
            {goal.targetDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Target: {new Date(goal.targetDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Progress Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe your progress..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkComplete}
              disabled={isLoading}
              className="bg-[#0052CC] hover:bg-[#004299]"
            >
              {isLoading ? 'Updating...' : 'Update Goal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
