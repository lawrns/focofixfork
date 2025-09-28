'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  )
}

function TasksContent() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Tasks Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Your personal tasks and assignments will be managed here. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
