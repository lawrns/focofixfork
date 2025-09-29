'use client'

import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SettingsDashboard } from '@/components/settings/settings-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import MainLayout from '@/components/layout/MainLayout'

export default function DashboardSettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardSettingsContent />
    </ProtectedRoute>
  )
}

function DashboardSettingsContent() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsDashboard />
        </Suspense>
      </div>
    </MainLayout>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

