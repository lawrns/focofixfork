'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  )
}

function FavoritesContent() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-12 text-center">
              <Star className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">Favorites Coming Soon</h2>
              <p className="text-muted-foreground">
                This feature is currently under development. You&apos;ll be able to save your favorite projects, tasks, and milestones here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
