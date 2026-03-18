import { Suspense } from 'react';
import ProjectsPageClient from '@/app/projects/ProjectsPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

function ProjectsFallback() {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Button disabled>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <div className="w-full">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Manage Night Mode in{' '}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>{' '}
          and view system health on the{' '}
          <Link href="/system" className="font-medium underline">
            System Status
          </Link>{' '}
          page.
        </div>
      </div>
      <Suspense fallback={<ProjectsFallback />}>
        <ProjectsPageClient pageTitle="Projects" />
      </Suspense>
    </div>
  );
}
