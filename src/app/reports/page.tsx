'use client'

import { useState, Suspense, lazy } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'

// Lazy load analytics dashboard for better performance
const AnalyticsDashboard = lazy(() => import('@/features/analytics').then(mod => ({ default: mod.AnalyticsDashboard })))
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Calendar,
  Clock
} from 'lucide-react'

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
        <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}

function ReportsContent() {
  const [reportType, setReportType] = useState('overview')
  const [dateRange, setDateRange] = useState('30d')

  const handleExportPDF = async () => {
    try {
      const response = await fetch('/api/reports/export?format=pdf&type=' + reportType + '&range=' + dateRange)
      if (!response.ok) throw new Error('PDF export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/reports/export?format=csv&type=' + reportType + '&range=' + dateRange)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/reports/export?format=excel&type=' + reportType + '&range=' + dateRange)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting Excel:', error)
    }
  }

  const reportTypes = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'Comprehensive project and team overview',
      icon: BarChart3
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Team and individual performance metrics',
      icon: TrendingUp
    },
    {
      id: 'time',
      name: 'Time Tracking',
      description: 'Detailed time tracking and productivity',
      icon: Clock
    },
    {
      id: 'projects',
      name: 'Projects',
      description: 'Project-specific analytics and insights',
      icon: PieChart
    }
  ]

  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Generate and export detailed analytics reports
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card
                key={type.id}
                className={`cursor-pointer glass-card hover-lift ${
                  reportType === type.id ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => setReportType(type.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      reportType === type.id ? 'bg-primary/10 text-primary' : 'bg-slate-500/10 text-slate-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">{type.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">{type.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Report Content */}
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsContent value="overview" className="space-y-6">
            <Suspense fallback={<AnalyticsSkeleton />}>
              <AnalyticsDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Report</CardTitle>
                <CardDescription>
                  Analyze team productivity and individual contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<AnalyticsSkeleton />}>
                  <AnalyticsDashboard />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Time Tracking Report</CardTitle>
                <CardDescription>
                  Detailed breakdown of time spent across projects and tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<AnalyticsSkeleton />}>
                  <AnalyticsDashboard />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Analytics Report</CardTitle>
                <CardDescription>
                  Comprehensive analysis of project status, progress, and health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<AnalyticsSkeleton />}>
                  <AnalyticsDashboard />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common report export options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto flex-col gap-2 p-6" onClick={handleExportPDF}>
                <FileText className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-semibold">Export to PDF</p>
                  <p className="text-xs text-muted-foreground">Formatted report for printing</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-6" onClick={handleExportCSV}>
                <Download className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-semibold">Export to CSV</p>
                  <p className="text-xs text-muted-foreground">Raw data for analysis</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-6" onClick={handleExportExcel}>
                <FileText className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-semibold">Export to Excel</p>
                  <p className="text-xs text-muted-foreground">Spreadsheet with formulas</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
