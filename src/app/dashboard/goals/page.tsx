'use client'

import { Suspense, lazy } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'

// Lazy load goals dashboard for better performance
const GoalsDashboard = lazy(() => import('@/features/goals').then(mod => ({ default: mod.GoalsDashboard })))
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardGoalsPage() {
  return (
    <ProtectedRoute>
      <DashboardGoalsContent />
    </ProtectedRoute>
  )
}

function DashboardGoalsContent() {
  return (
    <MainLayout>
      <div className="p-6">
        <Suspense fallback={<GoalsSkeleton />}>
          <GoalsDashboard />
        </Suspense>
      </div>
    </MainLayout>
  )
}

function GoalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

