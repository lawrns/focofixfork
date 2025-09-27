'use client'

import { Suspense } from 'react'
import { GoalsDashboard } from '@/components/goals/goals-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardGoalsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Goals</h2>
      </div>
      <Suspense fallback={<GoalsSkeleton />}>
        <GoalsDashboard />
      </Suspense>
    </div>
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

