'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Clock,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi,
  Users
} from 'lucide-react';
import { PerformanceService, PerformanceReport, PerformanceMetrics } from '@/lib/services/performance';

export function PerformanceDashboard() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const loadPerformanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await PerformanceService.getPerformanceReport(timeRange);
      setReport(data);
      setRealTimeMetrics(PerformanceService.getRealTimeMetrics());
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadPerformanceData();
    // Update real-time metrics every 5 seconds
    const interval = setInterval(() => {
      setRealTimeMetrics(PerformanceService.getRealTimeMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [loadPerformanceData]);

  const handleExportReport = async () => {
    try {
      await PerformanceService.exportPerformanceData();
    } catch (error) {
      console.error('Error exporting performance report:', error);
    }
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

  if (!report) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
        <p className="text-muted-foreground">Performance monitoring will begin tracking data as users interact with the application.</p>
      </div>
    );
  }

  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor application performance, API response times, and user experience metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadPerformanceData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(realTimeMetrics.memoryUsage)}</div>
              <Progress value={realTimeMetrics.memoryUsage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Requests</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{realTimeMetrics.networkRequests}</div>
              <p className="text-xs text-muted-foreground">This session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Load Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(realTimeMetrics.pageLoadTime)}</div>
              <p className="text-xs text-muted-foreground">Current page</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(realTimeMetrics.apiResponseTime)}</div>
              <p className="text-xs text-muted-foreground">Latest request</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Page Load Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(report.summary.averagePageLoadTime)}</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt; 3s
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg API Response</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(report.summary.averageAPIResponseTime)}</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt; 500ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(report.summary.errorRate)}</div>
                <Progress value={report.summary.errorRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(report.summary.uptimePercentage)}</div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.totalRequests} total requests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Recent performance metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Page Load Time</span>
                    <Badge variant="secondary">
                      {report.trends.pageLoadTimeTrend.length > 1 ?
                        (report.trends.pageLoadTimeTrend[report.trends.pageLoadTimeTrend.length - 1] >
                         report.trends.pageLoadTimeTrend[report.trends.pageLoadTimeTrend.length - 2] ?
                         <TrendingUp className="w-3 h-3 text-red-500" /> :
                         <TrendingDown className="w-3 h-3 text-green-500" />) :
                        <Activity className="w-3 h-3" />
                      }
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    {report.trends.pageLoadTimeTrend.length > 0 ?
                      formatTime(report.trends.pageLoadTimeTrend[report.trends.pageLoadTimeTrend.length - 1]) :
                      'N/A'
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Response Time</span>
                    <Badge variant="secondary">
                      {report.trends.apiResponseTimeTrend.length > 1 ?
                        (report.trends.apiResponseTimeTrend[report.trends.apiResponseTimeTrend.length - 1] >
                         report.trends.apiResponseTimeTrend[report.trends.apiResponseTimeTrend.length - 2] ?
                         <TrendingUp className="w-3 h-3 text-red-500" /> :
                         <TrendingDown className="w-3 h-3 text-green-500" />) :
                        <Activity className="w-3 h-3" />
                      }
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    {report.trends.apiResponseTimeTrend.length > 0 ?
                      formatTime(report.trends.apiResponseTimeTrend[report.trends.apiResponseTimeTrend.length - 1]) :
                      'N/A'
                    }
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Error Rate</span>
                    <Badge variant="secondary">
                      {report.trends.errorRateTrend.length > 1 ?
                        (report.trends.errorRateTrend[report.trends.errorRateTrend.length - 1] >
                         report.trends.errorRateTrend[report.trends.errorRateTrend.length - 2] ?
                         <TrendingUp className="w-3 h-3 text-red-500" /> :
                         <TrendingDown className="w-3 h-3 text-green-500" />) :
                        <Activity className="w-3 h-3" />
                      }
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    {report.trends.errorRateTrend.length > 0 ?
                      formatPercentage(report.trends.errorRateTrend[report.trends.errorRateTrend.length - 1]) :
                      'N/A'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Performance Metrics</CardTitle>
              <CardDescription>Core Web Vitals and loading performance by page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.pageMetrics.slice(-10).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="font-medium">{metric.page}</div>
                        <Badge variant="outline">{new Date(metric.timestamp).toLocaleString()}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Load Time:</span>
                          <span className="font-medium ml-1">{formatTime(metric.loadTime)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">LCP:</span>
                          <span className="font-medium ml-1">{formatTime(metric.largestContentfulPaint)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">FID:</span>
                          <span className="font-medium ml-1">{formatTime(metric.firstInputDelay)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CLS:</span>
                          <span className="font-medium ml-1">{metric.cumulativeLayoutShift.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {report.pageMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No page performance data available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Performance Metrics</CardTitle>
              <CardDescription>Response times and error rates by endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.apiMetrics.slice(-20).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <Badge variant={metric.statusCode >= 400 ? "destructive" : "secondary"}>
                          {metric.method}
                        </Badge>
                        <div className="font-medium font-mono text-sm">{metric.endpoint}</div>
                        <Badge variant={metric.statusCode >= 400 ? "destructive" : "default"}>
                          {metric.statusCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className="font-medium ml-1">{formatTime(metric.responseTime)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="font-medium ml-1">{new Date(metric.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      {metric.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {metric.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {report.apiMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No API performance data available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>Suggestions to improve application performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="w-6 h-6 bg-[#0052CC] rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  </div>
                ))}
                {report.recommendations.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Performance Looks Good!</h3>
                    <p className="text-muted-foreground">
                      Your application is performing well. Continue monitoring as your user base grows.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
