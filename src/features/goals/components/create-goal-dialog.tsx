'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GoalsService, type Goal } from '@/lib/services/goals.service';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/use-auth';

interface CreateGoalDialogProps {
  children: React.ReactNode;
  onGoalCreated: () => void;
  initialData?: Partial<Goal>;
}

export function CreateGoalDialog({ children, onGoalCreated, initialData }: CreateGoalDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    targetDate: initialData?.targetDate || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('You must be logged in to create a goal');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Goal name is required');
      return;
    }

    setIsLoading(true);

    try {
      const result = await GoalsService.createGoal(user.id, {
        name: formData.name,
        description: formData.description || undefined,
        targetDate: formData.targetDate || undefined,
      });

      if (result) {
        toast.success('Goal created successfully!');
        setIsOpen(false);
        onGoalCreated();
        // Reset form
        setFormData({
          name: '',
          description: '',
          targetDate: '',
        });
      } else {
        throw new Error('Failed to create goal');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
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
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter goal name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#0052CC] hover:bg-[#004299]">
              {isLoading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
