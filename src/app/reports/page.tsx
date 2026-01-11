'use client';

import { useState } from 'react';
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

interface MetricCard {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  positive: boolean;
}

const metrics: MetricCard[] = [
  { label: 'Tasks Completed', value: 47, change: 12, trend: 'up', positive: true },
  { label: 'Cycle Time', value: '3.2 days', change: -8, trend: 'down', positive: true },
  { label: 'Blocked Items', value: 2, change: 50, trend: 'up', positive: false },
  { label: 'On-Time Delivery', value: '94%', change: 5, trend: 'up', positive: true },
];

const projectStatus = [
  { name: 'Website Redesign', status: 'on_track', progress: 45, tasksCompleted: 12, totalTasks: 26 },
  { name: 'Mobile App v2', status: 'at_risk', progress: 68, tasksCompleted: 22, totalTasks: 32 },
  { name: 'API Platform', status: 'on_track', progress: 23, tasksCompleted: 7, totalTasks: 30 },
  { name: 'Q1 Marketing', status: 'behind', progress: 15, tasksCompleted: 3, totalTasks: 20 },
];

const recentReports = [
  { id: '1', title: 'Weekly Status - Jan 6-10', type: 'weekly', date: 'Jan 10, 2026', aiGenerated: true },
  { id: '2', title: 'Mobile App v2 - Risk Assessment', type: 'risk', date: 'Jan 9, 2026', aiGenerated: true },
  { id: '3', title: 'Q4 2025 Retrospective', type: 'quarterly', date: 'Jan 2, 2026', aiGenerated: false },
];

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

function WeeklyStatusReport() {
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
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="prose dark:prose-invert max-w-none">
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            This week the team completed <strong>47 tasks</strong> across 4 active projects, 
            a 12% increase from last week. The Website Redesign project remains on track for 
            the January 20th milestone, while Mobile App v2 shows some risk due to 2 blocked items.
          </p>
        </div>

        {/* Project Status */}
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

        {/* Risks & Blockers */}
        <div>
          <h4 className="text-sm font-medium mb-3">Risks & Blockers</h4>
          <div className="space-y-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Mobile App v2 - Beta Release at risk
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                    Memory leak bug blocking 2 dependent tasks. Needs senior engineer attention.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-zinc-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">SEO optimization audit blocked</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Waiting for design mockups to be finalized
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Week */}
        <div>
          <h4 className="text-sm font-medium mb-3">Next Week Priorities</h4>
          <ol className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-zinc-400">1.</span>
              Complete homepage mockups for Website Redesign (due Jan 15)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-zinc-400">2.</span>
              Resolve memory leak blocking Mobile App v2 beta
            </li>
            <li className="flex items-start gap-2">
              <span className="text-zinc-400">3.</span>
              Begin checkout flow redesign implementation
            </li>
          </ol>
        </div>

        {/* AI Attribution */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Generated by Foco AI based on 47 task updates, 23 comments, and 4 project changes this week.
            <Button variant="link" className="h-auto p-0 text-xs">Show sources</Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CycleTimeChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cycle Time Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end justify-between gap-2">
          {[4.1, 3.8, 4.2, 3.5, 3.2, 3.0, 3.2].map((value, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-indigo-500 rounded-t"
                style={{ height: `${(value / 5) * 100}%` }}
              />
              <span className="text-[10px] text-zinc-400">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium">Average: 3.6 days</p>
            <p className="text-xs text-zinc-500">-8% from last week</p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <TrendingDown className="h-3 w-3 mr-1" />
            Improving
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ThroughputChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Throughput</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end justify-between gap-2">
          {[8, 12, 6, 10, 11, 0, 0].map((value, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-green-500 rounded-t"
                style={{ height: `${(value / 15) * 100}%` }}
              />
              <span className="text-[10px] text-zinc-400">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium">47 tasks completed</p>
            <p className="text-xs text-zinc-500">+12% from last week</p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <TrendingUp className="h-3 w-3 mr-1" />
            Up
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('week');

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        subtitle="Insights and analytics for your workspace"
        primaryAction={
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              {buttons.generateReport}
            </Button>
          </div>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((metric) => (
          <MetricCardComponent key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Weekly Status */}
        <div className="col-span-2">
          <WeeklyStatusReport />
        </div>

        {/* Right Column - Charts & Recent */}
        <div className="space-y-6">
          <CycleTimeChart />
          <ThroughputChart />
          
          {/* Recent Reports */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports.map((report) => (
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
