'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit } from 'lucide-react';
import { GoalsService, type Goal } from '@/lib/services/goals.service';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast as sonnerToast } from 'sonner';
import { CreateGoalDialog } from './create-goal-dialog';
import { GoalProgressDialog } from './goal-progress-dialog';

interface GoalsDashboardProps {
  organizationId?: string;
  projectId?: string;
}

export function GoalsDashboard({ organizationId, projectId }: GoalsDashboardProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const goalsData = await GoalsService.getGoals(user.id, organizationId, projectId);
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      sonnerToast.error('Failed to load goals. Please try again.');
      setGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, organizationId, projectId]);

  const handleDeleteGoal = async () => {
    if (!deleteGoalId || !user?.id) return;

    try {
      await GoalsService.deleteGoal(deleteGoalId, user.id);

      sonnerToast.success('Goal deleted successfully.');

      setDeleteGoalId(null);
      await loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      sonnerToast.error(error instanceof Error ? error.message : 'Failed to delete goal. Please try again.');
      setDeleteGoalId(null);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">
            Create and track your goals
          </p>
        </div>
        <CreateGoalDialog
          onGoalCreated={loadGoals}
        >
          <Button className="bg-[#0052CC] hover:bg-[#004299]">
            <Plus className="w-4 h-4 mr-2" />
            New Goal
          </Button>
        </CreateGoalDialog>
      </div>

      {/* Goals List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Goals ({goals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No goals yet</p>
                  <CreateGoalDialog
                    onGoalCreated={loadGoals}
                  >
                    <Button className="bg-[#0052CC] hover:bg-[#004299]">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Goal
                    </Button>
                  </CreateGoalDialog>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{goal.name}</h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.description}
                          </p>
                        )}
                        {goal.targetDate && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <GoalProgressDialog
                          goal={goal}
                          onProgressUpdated={loadGoals}
                        >
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </GoalProgressDialog>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteGoalId(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      {deleteGoalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Delete Goal?</CardTitle>
              <CardDescription>
                This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteGoalId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteGoal}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
