import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import DashboardPageClient from './DashboardPageClient';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardFallback() {
  return (
    <div className="w-full py-6 space-y-3">
      <div className="mb-4">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: { view?: string }
}) {
  if (!searchParams?.view) {
    redirect('/cockpit')
  }

  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardPageClient />
    </Suspense>
  );
}
