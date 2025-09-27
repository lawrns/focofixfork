'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { GoalsService, Goal, GoalProgress } from '@/lib/services/goals';
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
  const [progressHistory, setProgressHistory] = useState<GoalProgress[]>([]);
  const [newValue, setNewValue] = useState(goal.current_value?.toString() || '0');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProgressHistory();
    }
  }, [isOpen, goal.id, user?.id]);

  const loadProgressHistory = async () => {
    try {
      if (!user?.id) return;
      const history = await GoalsService.getGoalProgress(goal.id, user.id);
      setProgressHistory(history);
    } catch (error) {
      console.error('Error loading progress history:', error);
    }
  };

  const handleUpdateProgress = async () => {
    setIsLoading(true);
    try {
      const numericValue = parseFloat(newValue);
      if (isNaN(numericValue)) {
        throw new Error('Please enter a valid number');
      }

      const success = await GoalsService.updateGoalProgress(goal.id, numericValue, note.trim() || undefined);

      if (success) {
        toast.success('Progress updated successfully!');
        setIsOpen(false);
        onProgressUpdated();
        setNote('');
      } else {
        throw new Error('Failed to update progress');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update progress');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNewProgress = (value: number) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, (value / goal.target_value) * 100);
  };

  const newProgressPercentage = calculateNewProgress(parseFloat(newValue) || 0);
  const currentProgressPercentage = goal.progress_percentage;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0052CC]" />
            Update Goal Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Goal Overview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">{goal.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>
                  {goal.current_value || 0} / {goal.target_value || 0}
                  {goal.unit && ` ${goal.unit}`}
                </span>
              </div>
              {goal.end_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Due {new Date(goal.end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Current Progress</span>
                <span>{currentProgressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={currentProgressPercentage} />
            </div>
          </div>

          {/* Update Progress */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_value">New Value</Label>
                <Input
                  id="current_value"
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter new value"
                />
                <p className="text-xs text-muted-foreground">
                  Current: {goal.current_value || 0}
                  {goal.unit && ` ${goal.unit}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Projected Progress</Label>
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="text-2xl font-bold text-[#0052CC]">
                    {newProgressPercentage.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    {newProgressPercentage > currentProgressPercentage ? '+' : ''}
                    {(newProgressPercentage - currentProgressPercentage).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Progress Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what you've accomplished..."
                rows={3}
              />
            </div>
          </div>

          {/* Progress Preview */}
          {newValue !== goal.current_value?.toString() && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Progress Preview</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>After update:</span>
                  <span className="font-medium">
                    {newValue} / {goal.target_value || 0}
                    {goal.unit && ` ${goal.unit}`}
                  </span>
                </div>
                <Progress value={newProgressPercentage} className="h-2" />
                {newProgressPercentage >= 100 && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <Target className="w-4 h-4" />
                    <span>This will mark the goal as completed!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress History */}
          {progressHistory.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Recent Progress</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {progressHistory.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div>
                      <div className="font-medium">{entry.value}{goal.unit && ` ${goal.unit}`}</div>
                      {entry.note && (
                        <div className="text-sm text-muted-foreground">{entry.note}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        +{entry.value - (progressHistory[index + 1]?.value || 0)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProgress}
              disabled={isLoading || newValue === goal.current_value?.toString()}
              className="bg-[#0052CC] hover:bg-[#004299]"
            >
              {isLoading ? 'Updating...' : 'Update Progress'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
