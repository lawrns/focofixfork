'use client'

import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/protected-route'

export const metadata: Metadata = {
  title: 'Favorites - Foco',
  description: 'Your favorite projects and items',
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  )
}

function FavoritesContent() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Favorites</h2>
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Favorites Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Mark your favorite projects and items for quick access. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
