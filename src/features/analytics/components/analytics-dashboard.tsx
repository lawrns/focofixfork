'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Activity,
  PieChart,
  LineChart,
  Download
} from 'lucide-react';
import type { AnalyticsData } from '@/lib/services/analytics.service';

interface AnalyticsDashboardProps {
  organizationId?: string;
}

export const AnalyticsDashboard = React.memo(function AnalyticsDashboard({ organizationId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      // Fetch analytics from API instead of direct database access
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/analytics/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      // Transform new API format to expected format if needed
      const data = result.data;
      if (data && !data.projects && data.summary) {
        // New API format - transform to old format
        const now = new Date();
        const startDateObj = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        setAnalytics({
          projects: {
            totalProjects: data.summary.totalProjects || 0,
            activeProjects: data.summary.activeProjects || 0,
            completedProjects: data.summary.completedProjects || 0,
            overdueProjects: 0,
            projectCompletionRate: data.summary.completedProjects / (data.summary.totalProjects || 1) * 100,
            averageProjectDuration: 0
          },
          tasks: {
            totalTasks: data.summary.totalTasks || 0,
            completedTasks: data.summary.completedTasks || 0,
            overdueTasks: data.summary.overdueTasks || 0,
            taskCompletionRate: data.summary.completedTasks / (data.summary.totalTasks || 1) * 100,
            tasksByPriority: {},
            tasksByStatus: {}
          },
          team: {
            totalMembers: Array.isArray(data.teamMetrics) ? data.teamMetrics.length : 0,
            activeMembers: Array.isArray(data.teamMetrics) ? data.teamMetrics.filter((m: any) => m.tasksCompleted > 0).length : 0,
            averageTasksPerMember: 0,
            teamProductivity: 0,
            memberContributions: []
          },
          timeTracking: {
            totalHoursTracked: 0,
            averageHoursPerDay: 0,
            mostProductiveDay: '',
            topContributors: [],
            projectHours: []
          },
          milestones: {
            totalMilestones: 0,
            completedMilestones: 0,
            overdueMilestones: 0,
            milestoneCompletionRate: 0,
            averageMilestoneDuration: 0
          },
          period: {
            startDate: startDateObj.toISOString(),
            endDate: now.toISOString()
          }
        });
      } else {
        // Old format or already transformed
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

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

  if (!analytics && !isLoading) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Start creating projects to see your analytics dashboard.</p>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !analytics) {
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

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Insights and metrics for your projects and team performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="glass-card hover-lift border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Total Projects</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary opacity-70" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                  {formatNumber(analytics.projects.totalProjects)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.projects.activeProjects} active
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Task Completion</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 opacity-70" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  {formatPercentage(analytics.tasks.taskCompletionRate)}
                </div>
                <Progress value={analytics.tasks.taskCompletionRate} className="mt-2 h-1.5 sm:h-2" />
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Team Members</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 opacity-70" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {formatNumber(analytics.team.totalMembers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.team.activeMembers} active
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Hours Tracked</CardTitle>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 opacity-70" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                  {formatNumber(analytics.timeTracking.totalHoursTracked)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Avg {analytics.timeTracking.averageHoursPerDay.toFixed(1)} hrs/day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card hover-lift">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <PieChart className="h-4 w-4 text-primary opacity-70" />
                  </div>
                  <div>
                    <CardTitle>Project Status</CardTitle>
                    <CardDescription>Distribution of project statuses</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active</span>
                    <Badge className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90">{analytics.projects.activeProjects}</Badge>
                  </div>
                  <Progress value={(analytics.projects.activeProjects / analytics.projects.totalProjects) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed</span>
                    <Badge className="bg-emerald-600 text-white font-semibold hover:bg-emerald-700">{analytics.projects.completedProjects}</Badge>
                  </div>
                  <Progress value={(analytics.projects.completedProjects / analytics.projects.totalProjects) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overdue</span>
                    <Badge className="bg-red-600 text-white font-semibold hover:bg-red-700">{analytics.projects.overdueProjects}</Badge>
                  </div>
                  <Progress value={(analytics.projects.overdueProjects / analytics.projects.totalProjects) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-600 opacity-70" />
                  </div>
                  <div>
                    <CardTitle>Task Priorities</CardTitle>
                    <CardDescription>Tasks by priority level</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.tasks.tasksByPriority || {}).map(([priority, count]: [string, any]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{priority}</span>
                      <Badge variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'secondary' : 'outline'}>
                        {String(count)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Top contributors this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.timeTracking.topContributors.slice(0, 5).map((contributor, index) => (
                  <div key={`contributor-${index}-${contributor.userId}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0052CC] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {contributor.name.charAt(0)}
                      </div>
                      <span className="font-medium">{contributor.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{contributor.hours}h</div>
                      <div className="text-xs text-muted-foreground">tracked</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Projects</span>
                  <span className="font-semibold">{analytics.projects.totalProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active</span>
                  <span className="font-semibold text-[#0052CC]">{analytics.projects.activeProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-semibold text-[#00B894]">{analytics.projects.completedProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overdue</span>
                  <span className="font-semibold text-red-600">{analytics.projects.overdueProjects}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0052CC] mb-2">
                  {formatPercentage(analytics.projects.projectCompletionRate)}
                </div>
                <Progress value={analytics.projects.projectCompletionRate} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00B894] mb-2">
                  {analytics.projects.averageProjectDuration.toFixed(1)}
                </div>
                <span className="text-sm text-muted-foreground">days</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatNumber(analytics.tasks.totalTasks)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00B894]">{formatNumber(analytics.tasks.completedTasks)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{formatNumber(analytics.tasks.overdueTasks)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0052CC]">{formatPercentage(analytics.tasks.taskCompletionRate)}</div>
                <Progress value={analytics.tasks.taskCompletionRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.tasks.tasksByStatus || {}).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="capitalize">{status}</span>
                    <Badge variant="secondary">{String(count)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.team.totalMembers}</div>
                <p className="text-sm text-muted-foreground">{analytics.team.activeMembers} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Tasks/Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0052CC]">{analytics.team.averageTasksPerMember.toFixed(1)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Productivity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00B894]">{analytics.team.teamProductivity.toFixed(1)}h</div>
                <p className="text-sm text-muted-foreground">total hours</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Member Contributions</CardTitle>
              <CardDescription>Task completion and time tracking by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.team.memberContributions.map((member, index) => (
                  <div key={`member-${index}-${member.userId}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0052CC] rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.tasksCompleted} tasks completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{member.hoursTracked}h</p>
                      <p className="text-sm text-muted-foreground">tracked</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0052CC]">{formatNumber(analytics.timeTracking.totalHoursTracked)}</div>
                <p className="text-sm text-muted-foreground">hours tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00B894]">{analytics.timeTracking.averageHoursPerDay.toFixed(1)}</div>
                <p className="text-sm text-muted-foreground">hours per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Productive Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#0052CC]">
                  {analytics.timeTracking.mostProductiveDay ?
                    new Date(analytics.timeTracking.mostProductiveDay).toLocaleDateString() :
                    'N/A'
                  }
                </div>
                <p className="text-sm text-muted-foreground">highest activity</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Team members with most hours tracked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.timeTracking.topContributors.map((contributor, index) => (
                    <div key={`time-contributor-${index}-${contributor.userId}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0052CC] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {contributor.name.charAt(0)}
                        </div>
                        <span className="font-medium">{contributor.name}</span>
                      </div>
                      <Badge variant="secondary">{contributor.hours}h</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Hours</CardTitle>
                <CardDescription>Time tracked per project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.timeTracking.projectHours.map((project, index) => (
                    <div key={`project-hours-${index}-${project.projectId}`} className="flex items-center justify-between">
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="outline">{project.hours}h</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});
