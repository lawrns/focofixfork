'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  ArrowRight,
  Zap,
  BarChart,
  Activity,
  RefreshCw
} from 'lucide-react'
import { CriticalPathService, CriticalPathResult, TaskNode } from '@/lib/services/critical-path'
import { cn } from '@/lib/utils'

interface CriticalPathAnalysisProps {
  tasks: Array<{
    id: string
    name: string
    duration: number
    dependencies: string[]
  }>
  onUpdateTasks?: (updates: Partial<TaskNode>[]) => void
  className?: string
}

export default function CriticalPathAnalysis({
  tasks,
  onUpdateTasks,
  className
}: CriticalPathAnalysisProps) {
  const [analysis, setAnalysis] = useState<CriticalPathResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)

    try {
      // Convert tasks to TaskNode format
      const taskNodes = tasks.map(task => ({
        id: task.id,
        name: task.name,
        duration: task.duration,
        dependencies: task.dependencies,
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: 0,
        latestFinish: 0,
        slack: 0,
        isCritical: false
      }))

      const result = CriticalPathService.analyze(taskNodes)
      const analysisMetrics = CriticalPathService.getScheduleMetrics(result)

      setAnalysis(result)
      setMetrics(analysisMetrics)
    } catch (error) {
      console.error('Critical path analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [tasks])

  useEffect(() => {
    if (tasks.length > 0) {
      runAnalysis()
    }
  }, [runAnalysis, tasks])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/40 dark:text-gray-300'
    }
  }

  const getSlackColor = (slack: number) => {
    if (slack === 0) return 'text-red-600' // Critical
    if (slack <= 2) return 'text-yellow-600' // Tight
    return 'text-green-600' // Flexible
  }

  if (!analysis || !metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing critical path...</p>
            </>
          ) : (
            <>
              <BarChart className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Critical Path Analysis</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add tasks with dependencies to see critical path analysis
              </p>
              {tasks.length > 0 && (
                <Button onClick={runAnalysis} disabled={isAnalyzing}>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Analysis
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Project Duration</p>
                <p className="text-2xl font-bold">{analysis.projectDuration} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Critical Tasks</p>
                <p className="text-2xl font-bold">{metrics.criticalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Avg Slack</p>
                <p className="text-2xl font-bold">{metrics.averageSlack} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Risk Level</p>
                <Badge className={getRiskColor(metrics.riskLevel)}>
                  {metrics.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Critical Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Path:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {analysis.criticalPath.map((taskId, index) => {
                  const task = analysis.nodes.find(n => n.id === taskId)
                  return (
                    <React.Fragment key={taskId}>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {task?.name || taskId}
                      </Badge>
                      {index < analysis.criticalPath.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                These {analysis.criticalTasks.length} tasks determine your minimum project duration.
                Any delay in these tasks will delay the entire project.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Task Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Task Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.nodes.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.name}</span>
                    {task.isCritical && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                        Critical
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{task.duration} days</span>
                    <span className={getSlackColor(task.slack)}>
                      {task.slack} days slack
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Earliest Start:</span>
                    <span className="ml-1 font-medium">Day {task.earliestStart}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Latest Start:</span>
                    <span className="ml-1 font-medium">Day {task.latestStart}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Earliest Finish:</span>
                    <span className="ml-1 font-medium">Day {task.earliestFinish}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Latest Finish:</span>
                    <span className="ml-1 font-medium">Day {task.latestFinish}</span>
                  </div>
                </div>

                {task.dependencies.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Dependencies:</span>
                    <span className="ml-1">
                      {task.dependencies.map(depId => {
                        const depTask = analysis.nodes.find(n => n.id === depId)
                        return depTask?.name || depId
                      }).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {(analysis.recommendations.length > 0 || analysis.bottlenecks.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations & Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Bottlenecks */}
              {analysis.bottlenecks.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Potential Bottlenecks
                  </h4>
                  <ul className="space-y-2">
                    {analysis.bottlenecks.map((bottleneck, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{bottleneck}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Optimization Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={runAnalysis} disabled={isAnalyzing} variant="outline">
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  )
}


