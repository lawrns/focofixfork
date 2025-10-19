'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Accessibility, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Keyboard, 
  RefreshCw,
  Volume2,
  Zap
} from 'lucide-react'
import { 
  accessibilityAuditor, 
  AccessibilityAuditResult, 
  AccessibilityIssue,
  AccessibilityAuditOptions
} from '@/lib/accessibility/accessibility-audit'

interface AccessibilityDashboardProps {
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
  auditOptions?: AccessibilityAuditOptions
}

export function AccessibilityDashboard({ 
  onRefresh, 
  autoRefresh = false, 
  refreshInterval = 60000,
  auditOptions = {}
}: AccessibilityDashboardProps) {
  const [result, setResult] = useState<AccessibilityAuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Run accessibility audit
  const runAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const auditResult = await accessibilityAuditor.runAudit()
      setResult(auditResult)
      setLastUpdated(new Date())
      onRefresh?.()
    } catch (err) {
      setError(`Failed to run accessibility audit: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runAudit, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, runAudit])

  // Run audit on mount
  useEffect(() => {
    runAudit()
  }, [runAudit])

  // Get severity color
  const getSeverityColor = (severity: AccessibilityIssue['severity']): string => {
    switch (severity) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  // Get severity background
  const getSeverityBackground = (severity: AccessibilityIssue['severity']): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100'
      case 'high': return 'bg-orange-100'
      case 'medium': return 'bg-yellow-100'
      case 'low': return 'bg-blue-100'
      default: return 'bg-gray-100'
    }
  }

  // Get category icon
  const getCategoryIcon = (category: AccessibilityIssue['category']) => {
    switch (category) {
      case 'keyboard': return <Keyboard className="w-4 h-4" />
      case 'screen-reader': return <Volume2 className="w-4 h-4" />
      case 'color-contrast': return <Eye className="w-4 h-4" />
      case 'focus': return <Zap className="w-4 h-4" />
      case 'semantics': return <Accessibility className="w-4 h-4" />
      case 'aria': return <Accessibility className="w-4 h-4" />
      default: return <Accessibility className="w-4 h-4" />
    }
  }

  // Get WCAG level color
  const getWCAGLevelColor = (level: AccessibilityIssue['wcagLevel']): string => {
    switch (level) {
      case 'A': return 'text-green-600'
      case 'AA': return 'text-blue-600'
      case 'AAA': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  // Get WCAG level background
  const getWCAGLevelBackground = (level: AccessibilityIssue['wcagLevel']): string => {
    switch (level) {
      case 'A': return 'bg-green-100'
      case 'AA': return 'bg-blue-100'
      case 'AAA': return 'bg-purple-100'
      default: return 'bg-gray-100'
    }
  }

  if (loading && !result) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span>Running accessibility audit...</span>
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

  if (!result) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <Accessibility className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No accessibility data available</h3>
          <p>Accessibility audit has not been run</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accessibility Dashboard</h2>
          <p className="text-gray-600">
            Monitor and improve accessibility compliance
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
            onClick={runAudit}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Audit
          </Button>
        </div>
      </div>

      {/* Accessibility Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Accessibility Score</h3>
          <Badge className={`${result.score >= 90 ? 'bg-green-100 text-green-600' : result.score >= 70 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
            {result.score}/100
          </Badge>
        </div>
        
        <div className="space-y-4">
          <Progress value={result.score} className="w-full" />
          
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{result.totalIssues}</div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            <div className="p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{result.criticalIssues}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">{result.highIssues}</div>
              <div className="text-sm text-gray-600">High</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{result.mediumIssues}</div>
              <div className="text-sm text-gray-600">Medium</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{result.lowIssues}</div>
              <div className="text-sm text-gray-600">Low</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <div className="space-y-4">
            {result.issues.map((issue, index) => (
              <Card key={issue.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(issue.category)}
                    <h4 className="font-semibold">{issue.message}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSeverityBackground(issue.severity)} ${getSeverityColor(issue.severity)}`}>
                      {issue.severity}
                    </Badge>
                    <Badge className={`${getWCAGLevelBackground(issue.wcagLevel)} ${getWCAGLevelColor(issue.wcagLevel)}`}>
                      WCAG {issue.wcagLevel}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <strong>Element:</strong> {issue.element}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Category:</strong> {issue.category}
                  </div>
                  
                  <div className="text-sm">
                    <strong>Suggestion:</strong> {issue.suggestion}
                  </div>
                </div>
              </Card>
            ))}
            
            {result.issues.length === 0 && (
              <Card className="p-6 text-center">
                <div className="text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Accessibility Issues Found!</h3>
                  <p>Your application meets accessibility standards</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4">
            {['keyboard', 'screen-reader', 'color-contrast', 'focus', 'semantics', 'aria'].map((category) => {
              const categoryIssues = result.issues.filter(issue => issue.category === category)
              const criticalCount = categoryIssues.filter(issue => issue.severity === 'critical').length
              const highCount = categoryIssues.filter(issue => issue.severity === 'high').length
              const mediumCount = categoryIssues.filter(issue => issue.severity === 'medium').length
              const lowCount = categoryIssues.filter(issue => issue.severity === 'low').length
              
              return (
                <Card key={category} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category as AccessibilityIssue['category'])}
                      <h4 className="font-semibold capitalize">{category.replace('-', ' ')}</h4>
                    </div>
                    
                    <Badge variant="outline">
                      {categoryIssues.length} issues
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-red-50 rounded">
                      <div className="text-lg font-bold text-red-600">{criticalCount}</div>
                      <div className="text-xs text-gray-600">Critical</div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded">
                      <div className="text-lg font-bold text-orange-600">{highCount}</div>
                      <div className="text-xs text-gray-600">High</div>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <div className="text-lg font-bold text-yellow-600">{mediumCount}</div>
                      <div className="text-xs text-gray-600">Medium</div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-lg font-bold text-blue-600">{lowCount}</div>
                      <div className="text-xs text-gray-600">Low</div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-4">
            {result.recommendations.map((recommendation, index) => (
              <Alert key={index}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
            
            {result.recommendations.length === 0 && (
              <Card className="p-6 text-center">
                <div className="text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations</h3>
                  <p>Your application is already accessible</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
