'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  HardDrive,
  Cpu,
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react'
import { 
  performanceMonitor, 
  PerformanceReport, 
  PerformanceMetric 
} from '@/lib/performance/performance-monitor'
import { bundleAnalyzer, BundleAnalysis } from '@/lib/performance/code-splitting'

interface PerformanceDashboardProps {
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

export function PerformanceDashboard({ 
  onRefresh, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: PerformanceDashboardProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [bundles, setBundles] = useState<BundleAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load performance data
  const loadPerformanceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const performanceReport = performanceMonitor.getReport()
      const bundleAnalysis = bundleAnalyzer.analyzeBundles()
      
      setReport(performanceReport)
      setBundles(bundleAnalysis)
      setLastUpdated(new Date())
      
      onRefresh?.()
    } catch (err) {
      setError(`Failed to load performance data: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, loadPerformanceData])

  // Load data on mount
  useEffect(() => {
    loadPerformanceData()
  }, [loadPerformanceData])

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Get performance score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get performance score background
  const getScoreBackground = (score: number): string => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  // Get budget status color
  const getBudgetStatusColor = (passed: boolean, severity: string): string => {
    if (passed) return 'text-green-600'
    return severity === 'error' ? 'text-red-600' : 'text-yellow-600'
  }

  // Get budget status background
  const getBudgetStatusBackground = (passed: boolean, severity: string): string => {
    if (passed) return 'bg-green-100'
    return severity === 'error' ? 'bg-red-100' : 'bg-yellow-100'
  }

  if (loading && !report) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span>Loading performance data...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!report) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No performance data available</h3>
          <p>Performance monitoring is not initialized</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-600">
            Monitor application performance and identify optimization opportunities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadPerformanceData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance Score</h3>
          <Badge className={`${getScoreBackground(report.summary.score)} ${getScoreColor(report.summary.score)}`}>
            {report.summary.score}/100
          </Badge>
        </div>
        
        <div className="space-y-4">
          <Progress value={report.summary.score} className="w-full" />
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{report.summary.totalMetrics}</div>
              <div className="text-sm text-gray-600">Total Metrics</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{report.summary.totalMetrics - report.summary.failedBudgets}</div>
              <div className="text-sm text-gray-600">Passed Budgets</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{report.summary.warnings}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{report.summary.errors}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budgets">Performance Budgets</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="bundles">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Performance Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="grid gap-4">
            {report.budgets.map((budgetResult, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {budgetResult.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <h4 className="font-semibold">{budgetResult.budget.name}</h4>
                  </div>
                  
                  <Badge className={`${getBudgetStatusBackground(budgetResult.passed, budgetResult.budget.severity)} ${getBudgetStatusColor(budgetResult.passed, budgetResult.budget.severity)}`}>
                    {budgetResult.budget.severity}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    {budgetResult.budget.description}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Threshold: {formatDuration(budgetResult.budget.threshold)}</span>
                    <span>Actual: {formatDuration(budgetResult.actual)}</span>
                    <span className={budgetResult.passed ? 'text-green-600' : 'text-red-600'}>
                      {budgetResult.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  
                  {!budgetResult.passed && (
                    <div className="text-sm text-red-600">
                      Variance: +{formatDuration(budgetResult.variance)}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4">
            {report.metrics.map((metric, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{metric.name}</h4>
                  <Badge variant="outline">{metric.category}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatDuration(metric.value)}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Recorded at {new Date(metric.timestamp).toLocaleTimeString()}
                  </div>
                  
                  {metric.metadata && Object.keys(metric.metadata).length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">Metadata:</div>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        {JSON.stringify(metric.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Bundle Analysis Tab */}
        <TabsContent value="bundles" className="space-y-4">
          <div className="grid gap-4">
            {bundles.map((bundle, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{bundle.name}</h4>
                  <Badge variant="outline">
                    {formatBytes(bundle.size)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Load Time</div>
                      <div className="text-blue-600">{formatDuration(bundle.loadTime)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Size</div>
                      <div className="text-blue-600">{formatBytes(bundle.size)}</div>
                    </div>
                  </div>
                  
                  {bundle.dependencies.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">Dependencies:</div>
                      <div className="flex flex-wrap gap-1">
                        {bundle.dependencies.map((dep, depIndex) => (
                          <Badge key={depIndex} variant="outline" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {performanceMonitor.getRecommendations().map((recommendation, index) => (
              <Alert key={index}>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
            
            {performanceMonitor.getRecommendations().length === 0 && (
              <Card className="p-6 text-center">
                <div className="text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Great Performance!</h3>
                  <p>No optimization recommendations at this time</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}