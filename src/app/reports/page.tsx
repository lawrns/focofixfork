'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Download,
  Share2,
  RefreshCw,
  Zap,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { buttons } from '@/lib/copy';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface MetricCard {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  positive: boolean;
}

interface ProjectStatus {
  name: string;
  status: 'on_track' | 'at_risk' | 'behind';
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
}

interface ReportItem {
  id: string;
  title: string;
  type: string;
  date: string;
  aiGenerated: boolean;
}

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-500">{metric.label}</span>
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            metric.positive ? 'text-green-600' : 'text-red-600'
          )}>
            {metric.trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(metric.change)}%
          </div>
        </div>
        <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {metric.value}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyStatusReport({ projectStatus }: { projectStatus: ProjectStatus[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Weekly Status Report</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              <Zap className="h-3 w-3 mr-0.5" />
              AI Generated
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="prose dark:prose-invert max-w-none">
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            This week the team has been working across {projectStatus.length} active projects.
            Overall progress is trending positively, though some items require attention.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Project Status</h4>
          <div className="space-y-3">
            {projectStatus.map((project) => (
              <div key={project.name} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{project.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-[10px]',
                        project.status === 'on_track' && 'text-green-600 border-green-200 bg-green-50',
                        project.status === 'at_risk' && 'text-amber-600 border-amber-200 bg-amber-50',
                        project.status === 'behind' && 'text-red-600 border-red-200 bg-red-50'
                      )}
                    >
                      {project.status === 'on_track' && 'On Track'}
                      {project.status === 'at_risk' && 'At Risk'}
                      {project.status === 'behind' && 'Behind'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-zinc-500 w-20">
                      {project.tasksCompleted}/{project.totalTasks} tasks
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Generated by Foco AI based on recent activity.
            <Button variant="link" className="h-auto p-0 text-xs">Show sources</Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus[]>([]);
  const [recentReports, setRecentReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      // In a real app, these would be separate or a combined analytics endpoint
      const response = await fetch(`/api/reports?timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setMetrics(data.data.metrics || []);
        setProjectStatus(data.data.projectStatus || []);
        setRecentReports(data.data.recentReports || []);
      } else {
        // Fallback or empty states if no data
        setMetrics([
          { label: 'Tasks Completed', value: 0, change: 0, trend: 'up', positive: true },
          { label: 'Cycle Time', value: '0 days', change: 0, trend: 'stable', positive: true },
          { label: 'Blocked Items', value: 0, change: 0, trend: 'stable', positive: true },
          { label: 'On-Time Delivery', value: '0%', change: 0, trend: 'stable', positive: true },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Reports" subtitle="Loading analytics..." />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2 h-96 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-6">
            <Card className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
            <Card className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        subtitle="Insights and analytics for your workspace"
        primaryAction={
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchReportData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button>
              <Zap className="h-4 w-4" />
              {buttons.generateReport}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <MetricCardComponent key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyStatusReport projectStatus={projectStatus} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer group"
                  >
                    <FileText className="h-4 w-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.title}</p>
                      <p className="text-xs text-zinc-500">{report.date}</p>
                    </div>
                    {report.aiGenerated && (
                      <Zap className="h-3 w-3 text-indigo-500" />
                    )}
                    <ArrowRight className="h-4 w-4 text-zinc-300 opacity-0 group-hover:opacity-100" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 py-4 text-center">No recent reports found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
