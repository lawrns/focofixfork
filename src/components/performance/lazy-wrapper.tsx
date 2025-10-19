'use client'

import { Suspense, ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  height?: string
  width?: string
}

export function LazyWrapper({ 
  children, 
  fallback, 
  height = 'h-32', 
  width = 'w-full' 
}: LazyWrapperProps) {
  const defaultFallback = (
    <div className={`${height} ${width} space-y-2`}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}
