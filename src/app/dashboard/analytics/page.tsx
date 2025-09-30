'use client'

import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardAnalyticsPage() {
  return (
    <ProtectedRoute>
      <DashboardAnalyticsContent />
    </ProtectedRoute>
  )
}

function DashboardAnalyticsContent() {
  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center justify-between space-y-2 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        </div>
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </MainLayout>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

