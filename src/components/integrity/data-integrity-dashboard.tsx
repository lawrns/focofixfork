'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Database,
  Users,
  Target,
  Clock,
  FileText,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { DataIntegrityService, DataIntegrityReport, IntegrityCheckResult } from '@/lib/services/data-integrity';
import { toast } from 'sonner';

interface DataIntegrityDashboardProps {
  organizationId?: string;
}

export function DataIntegrityDashboard({ organizationId }: DataIntegrityDashboardProps) {
  const [report, setReport] = useState<DataIntegrityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const runIntegrityCheck = async () => {
    setIsRunning(true);
    try {
      const result = await DataIntegrityService.performIntegrityCheck(organizationId);
      setReport(result);
      setLastCheck(new Date().toLocaleString());

      if (result.overallHealth === 'critical' || result.overallHealth === 'poor') {
        toast.error(`Data integrity issues found: ${result.totalIssues} issues (${result.criticalIssues} critical)`);
      } else if (result.overallHealth === 'fair') {
        toast.warning(`Data integrity check completed with ${result.totalIssues} issues to review`);
      } else {
        toast.success('Data integrity check completed successfully!');
      }
    } catch (error) {
      toast.error('Failed to run integrity check');
      console.error('Integrity check error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const autoFixIssues = async () => {
    if (!report) return;

    setIsFixing(true);
    try {
      const result = await DataIntegrityService.autoFixIntegrityIssues(report);
      toast.success(`Auto-fixed ${result.fixed} issues, ${result.failed} failed`);

      // Re-run integrity check to see updated results
      await runIntegrityCheck();
    } catch (error) {
      toast.error('Failed to auto-fix issues');
      console.error('Auto-fix error:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-integrity-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'organizations': return Users;
      case 'projects': return Target;
      case 'tasks': return CheckCircle;
      case 'time_entries': return Clock;
      case 'comments': return FileText;
      default: return Database;
    }
  };

  if (!report) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0052CC]" />
              Data Integrity Dashboard
            </CardTitle>
            <CardDescription>
              Monitor and maintain the integrity of your project data
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Integrity Check Run</h3>
            <p className="text-muted-foreground mb-6">
              Run an integrity check to analyze your data for consistency issues, orphaned records, and validation errors.
            </p>
            <Button onClick={runIntegrityCheck} disabled={isRunning} className="bg-[#0052CC] hover:bg-[#004299]">
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Check...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Integrity Check
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalIssues = report.results.flatMap(r => r.issues.filter(i => i.severity === 'critical'));
  const highIssues = report.results.flatMap(r => r.issues.filter(i => i.severity === 'high'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Integrity Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and maintain the integrity of your project data
            {lastCheck && ` • Last checked: ${lastCheck}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={runIntegrityCheck} disabled={isRunning}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Re-run Check
          </Button>
        </div>
      </div>

      {/* Overall Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Overall Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(report.overallHealth)}`}>
                {report.overallHealth.toUpperCase()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Health Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{report.criticalIssues}</div>
              <p className="text-sm text-muted-foreground">Critical Issues</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{report.totalIssues}</div>
              <p className="text-sm text-muted-foreground">Total Issues</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(report.duration / 1000).toFixed(1)}s</div>
              <p className="text-sm text-muted-foreground">Check Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {(criticalIssues.length > 0 || highIssues.length > 0) && (
        <Alert className={criticalIssues.length > 0 ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}>
          <AlertTriangle className={`w-4 h-4 ${criticalIssues.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription>
            {criticalIssues.length > 0 && (
              <div className="font-medium text-red-800 mb-1">
                {criticalIssues.length} critical issues require immediate attention
              </div>
            )}
            {highIssues.length > 0 && (
              <div className="font-medium text-orange-800">
                {highIssues.length} high-priority issues should be addressed soon
              </div>
            )}
            {report.recommendations.length > 0 && (
              <div className="mt-2">
                <strong>Recommendations:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {report.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-fix Button */}
      {report.totalIssues > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Auto-fix Common Issues</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically fix simple issues like expired invitations
                </p>
              </div>
              <Button onClick={autoFixIssues} disabled={isFixing} variant="outline">
                {isFixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-fix Issues
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Entity Summary */}
          <div className="grid gap-4">
            {report.results.map((result) => {
              const IconComponent = getEntityIcon(result.entity);
              const healthScore = result.totalRecords > 0
                ? ((result.validRecords / result.totalRecords) * 100)
                : 100;

              return (
                <Card key={result.entity}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-[#0052CC]" />
                        <div>
                          <h3 className="font-medium capitalize">{result.entity.replace('_', ' ')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.totalRecords} records • {result.issues.length} issues
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{healthScore.toFixed(1)}% healthy</div>
                        <Progress value={healthScore} className="w-20 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Detailed Results */}
          {report.results.map((result) => {
            if (result.issues.length === 0) return null;

            return (
              <Card key={result.entity}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    {getEntityIcon(result.entity)({ className: "w-5 h-5" })}
                    {result.entity.replace('_', ' ')} Issues
                  </CardTitle>
                  <CardDescription>
                    {result.totalRecords} records checked • {result.issues.length} issues found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.issues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge className={`mt-0.5 ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-medium">{issue.issue}</h4>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">ID: {issue.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrity Recommendations</CardTitle>
              <CardDescription>
                Actions to improve and maintain data integrity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#0052CC] rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
