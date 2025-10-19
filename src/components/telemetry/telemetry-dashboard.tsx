'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  Clock,
  Target
} from 'lucide-react'
import { telemetryService, TelemetryMetrics } from '@/lib/telemetry/telemetry-service'

interface TelemetryDashboardProps {
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

interface TelemetryData {
  events: any[]
  sessions: any[]
  dailyMetrics: any[]
  errorRate: number
  topFeatures: Array<{ feature: string; count: number }>
  userActions: Array<{ action: string; count: number }>
}

export function TelemetryDashboard({ 
  onRefresh, 
  autoRefresh = false, 
  refreshInterval = 60000
}: TelemetryDashboardProps) {
  const [data, setData] = useState<TelemetryData | null>(null)
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load telemetry data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get local metrics
      const localMetrics = telemetryService.getMetrics()
      setMetrics(localMetrics)

      // Fetch server data
      const response = await fetch('/api/telemetry?limit=1000')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const events = result.events || []

      // Process data
      const processedData: TelemetryData = {
        events,
        sessions: [],
        dailyMetrics: [],
        errorRate: 0,
        topFeatures: [],
        userActions: []
      }

      // Calculate error rate
      const errorEvents = events.filter((e: any) => e.category === 'error')
      processedData.errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0

      // Get top features
      const featureEvents = events.filter((e: any) => e.type.startsWith('feature-usage:'))
      const featureCounts = featureEvents.reduce((acc: any, event: any) => {
        const feature = event.type.replace('feature-usage:', '')
        acc[feature] = (acc[feature] || 0) + 1
        return acc
      }, {})

      processedData.topFeatures = Object.entries(featureCounts)
        .map(([feature, count]) => ({ feature, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Get user actions
      const actionEvents = events.filter((e: any) => e.type.startsWith('user-action:'))
      const actionCounts = actionEvents.reduce((acc: any, event: any) => {
        const action = event.type.replace('user-action:', '')
        acc[action] = (acc[action] || 0) + 1
        return acc
      }, {})

      processedData.userActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setData(processedData)
      setLastUpdated(new Date())
      onRefresh?.()
    } catch (err) {
      setError(`Failed to load telemetry data: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, loadData])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Format percentage
  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  // Get error rate color
  const getErrorRateColor = (rate: number): string => {
    if (rate < 1) return 'text-green-600'
    if (rate < 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get error rate background
  const getErrorRateBackground = (rate: number): string => {
    if (rate < 1) return 'bg-green-100'
    if (rate < 5) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span>Loading telemetry data...</span>
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

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No telemetry data available</h3>
          <p>Telemetry service is not initialized</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Telemetry Dashboard</h2>
          <p className="text-gray-600">
            Monitor application usage and performance metrics
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
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(data.events.length)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className={`text-2xl font-bold ${getErrorRateColor(data.errorRate)}`}>
                {formatPercentage(data.errorRate)}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Queue Size</p>
              <p className="text-2xl font-bold text-green-600">
                {telemetryService.getQueueSize()}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Service Status</p>
              <p className="text-2xl font-bold text-green-600">
                {telemetryService.isEnabled() ? 'Active' : 'Disabled'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="actions">User Actions</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {/* Local Metrics */}
            {metrics && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Local Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-xl font-bold">{metrics.totalEvents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Response Time</p>
                    <p className="text-xl font-bold">{metrics.averageResponseTime.toFixed(2)}ms</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Event Categories */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Event Categories</h3>
              <div className="space-y-2">
                {Object.entries(metrics?.eventsByCategory || {}).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="capitalize">{category.replace('-', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(count as number / data.events.length) * 100} className="w-20" />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Top Features</h3>
            <div className="space-y-2">
              {data.topFeatures.map((item, index) => (
                <div key={item.feature} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="capitalize">{item.feature.replace('-', ' ')}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
              
              {data.topFeatures.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No feature usage data available</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* User Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">User Actions</h3>
            <div className="space-y-2">
              {data.userActions.map((item, index) => (
                <div key={item.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="capitalize">{item.action.replace('-', ' ')}</span>
                  </div>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
              
              {data.userActions.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No user action data available</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Error Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Error Rate</span>
                <Badge className={`${getErrorRateBackground(data.errorRate)} ${getErrorRateColor(data.errorRate)}`}>
                  {formatPercentage(data.errorRate)}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                {data.errorRate < 1 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Excellent error rate - system is stable</span>
                  </div>
                ) : data.errorRate < 5 ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Moderate error rate - monitor closely</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>High error rate - immediate attention required</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
