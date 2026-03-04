'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function ProposalDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-5 w-36 mb-4" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
