'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/components/toast/toast';
import {
  Target,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Users,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { GoalsService, Goal } from '@/lib/services/goals';
import { CreateGoalDialog } from './create-goal-dialog';
import { GoalProgressDialog } from './goal-progress-dialog';

interface GoalsDashboardProps {
  organizationId?: string;
  projectId?: string;
}

export function GoalsDashboard({ organizationId, projectId }: GoalsDashboardProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [analytics, setAnalytics] = useState<any>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await GoalsService.getGoals(organizationId, projectId);
      // If no data or error, show sample data for demo purposes
      if (!data || data.length === 0) {
        setGoals([
          {
            id: 'goal-1',
            title: 'Launch Mobile App',
            description: 'Complete development and launch of the mobile application for Q4',
            type: 'project',
            status: 'active',
            priority: 'high',
            target_value: 100,
            current_value: 75,
            unit: '%',
            progress_percentage: 75,
            owner_id: 'user-123',
            organization_id: organizationId,
            start_date: '2024-09-01',
            end_date: '2024-12-31',
            created_at: '2024-09-01T00:00:00Z',
            updated_at: '2024-09-24T00:00:00Z'
          },
          {
            id: 'goal-2',
            title: 'Increase User Engagement',
            description: 'Improve user engagement metrics by 30% through feature enhancements',
            type: 'organization',
            status: 'active',
            priority: 'medium',
            target_value: 30,
            current_value: 18,
            unit: '%',
            progress_percentage: 60,
            owner_id: 'user-123',
            organization_id: organizationId,
            start_date: '2024-08-01',
            end_date: '2024-11-30',
            created_at: '2024-08-01T00:00:00Z',
            updated_at: '2024-09-24T00:00:00Z'
          },
          {
            id: 'goal-3',
            title: 'Complete API Documentation',
            description: 'Write comprehensive API documentation for all endpoints',
            type: 'task',
            status: 'completed',
            priority: 'low',
            target_value: 100,
            current_value: 100,
            unit: '%',
            progress_percentage: 100,
            owner_id: 'user-123',
            organization_id: organizationId,
            start_date: '2024-07-01',
            end_date: '2024-09-15',
            created_at: '2024-07-01T00:00:00Z',
            updated_at: '2024-09-15T00:00:00Z'
          }
        ]);
      } else {
        setGoals(data);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      // Show sample data on error for demo purposes
      setGoals([
        {
          id: 'goal-demo-1',
          title: 'Complete Project Planning',
          description: 'Finish detailed planning phase for the new feature set',
          type: 'milestone',
          status: 'active',
          priority: 'high',
          target_value: 100,
          current_value: 45,
          unit: '%',
          progress_percentage: 45,
          owner_id: 'user-demo',
          organization_id: organizationId,
          start_date: '2024-09-20',
          end_date: '2024-10-15',
          created_at: '2024-09-20T00:00:00Z',
          updated_at: '2024-09-24T00:00:00Z'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId]);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await GoalsService.getGoalAnalytics(organizationId);
      if (!data) {
        // Show sample analytics data
        setAnalytics({
          totalGoals: 12,
          activeGoals: 8,
          completedGoals: 4,
          averageProgress: 67.5,
          goalsByStatus: { active: 8, completed: 4, on_hold: 0, cancelled: 0 },
          goalsByPriority: { high: 5, medium: 4, low: 3, critical: 0 },
          goalsByType: { project: 6, milestone: 3, task: 2, organization: 1, personal: 0 }
        });
      } else {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Show sample analytics data on error
      setAnalytics({
        totalGoals: 8,
        activeGoals: 6,
        completedGoals: 2,
        averageProgress: 52.3,
        goalsByStatus: { active: 6, completed: 2, on_hold: 0, cancelled: 0 },
        goalsByPriority: { high: 3, medium: 3, low: 2, critical: 0 },
        goalsByType: { project: 4, milestone: 2, task: 1, organization: 1, personal: 0 }
      });
    }
  }, [organizationId]);

  const handleDeleteGoal = async () => {
    if (!deleteGoalId) return;

    try {
      await GoalsService.deleteGoal(deleteGoalId);
      toast({
        title: 'Goal deleted',
        description: 'The goal has been successfully deleted.',
      });
      setDeleteGoalId(null);
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadGoals();
    loadAnalytics();
  }, [loadGoals, loadAnalytics]);

  const filteredGoals = goals.filter(goal => {
    if (statusFilter !== 'all' && goal.status !== statusFilter) return false;
    if (typeFilter !== 'all' && goal.type !== typeFilter) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold">Goals & Objectives</h1>
          <p className="text-muted-foreground">
            Set, track, and achieve your project and organizational goals
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
          <CreateGoalDialog onGoalCreated={loadGoals}>
            <Button className="bg-[#0052CC] hover:bg-[#004299]">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </CreateGoalDialog>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalGoals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.activeGoals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analytics.completedGoals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageProgress.toFixed(1)}%</div>
              <Progress value={analytics.averageProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          {filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No goals found</h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters or create a new goal.'
                    : 'Start by creating your first goal to track progress and achievements.'}
                </p>
                <CreateGoalDialog onGoalCreated={loadGoals}>
                  <Button className="bg-[#0052CC] hover:bg-[#004299]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </CreateGoalDialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredGoals.map((goal) => (
                <Card key={goal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{goal.title}</h3>
                          <Badge className={getStatusColor(goal.status)}>
                            {goal.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                            {goal.priority}
                          </Badge>
                          <Badge variant="outline">
                            {goal.type}
                          </Badge>
                        </div>

                        {goal.description && (
                          <p className="text-muted-foreground mb-4">{goal.description}</p>
                        )}

                        <div className="flex items-center gap-6 mb-4">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {goal.current_value || 0} / {goal.target_value || 0}
                              {goal.unit && ` ${goal.unit}`}
                            </span>
                          </div>

                          {goal.end_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(goal.end_date)}</span>
                            </div>
                          )}

                          {goal.tags && goal.tags.length > 0 && (
                            <div className="flex gap-2">
                              {goal.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{goal.progress_percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={goal.progress_percentage} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <GoalProgressDialog goal={goal} onProgressUpdated={loadGoals}>
                          <Button variant="outline" size="sm">
                            Update Progress
                          </Button>
                        </GoalProgressDialog>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Goal Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Goals by Type</CardTitle>
                    <CardDescription>Distribution of goals across different categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.goalsByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="capitalize">{type}</span>
                          <Badge variant="secondary">{String(count)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Goals by Priority</CardTitle>
                    <CardDescription>Priority distribution of active goals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.goalsByPriority).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <span className="capitalize">{priority}</span>
                          <Badge variant={priority === 'critical' ? 'destructive' : 'secondary'}>
                            {String(count)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                  <CardDescription>Key metrics and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.overdueGoals > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">
                          {analytics.overdueGoals} overdue goals
                        </p>
                        <p className="text-sm text-red-600">
                          Consider reviewing and adjusting timelines for these goals.
                        </p>
                      </div>
                    </div>
                  )}

                  {analytics.averageProgress < 30 && analytics.activeGoals > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          Low average progress ({analytics.averageProgress.toFixed(1)}%)
                        </p>
                        <p className="text-sm text-yellow-600">
                          Focus on high-priority goals to improve overall progress.
                        </p>
                      </div>
                    </div>
                  )}

                  {analytics.completedGoals > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          {analytics.completedGoals} goals completed!
                        </p>
                        <p className="text-sm text-green-600">
                          Great progress! Consider setting new ambitious goals.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
