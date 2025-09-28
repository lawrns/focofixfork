'use client'

import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Reports - Foco',
  description: 'Project reports and analytics',
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}

function ReportsContent() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>
      <div className="rounded-lg border p-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Reports Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Generate detailed reports and analytics for your projects. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
