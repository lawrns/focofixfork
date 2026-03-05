import { Suspense } from 'react';
import ProjectsPageClient from '@/app/projects/ProjectsPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

function MissionsFallback() {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function MissionBoardsPage() {
  return (
    <div className="space-y-4">
      <div className="w-full">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Mission board uses your shared projects workspace. Manage Night Mode in{' '}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>{' '}
          and run live autonomy controls in{' '}
          <Link href="/empire/command" className="font-medium underline">
            Command Center
          </Link>.
        </div>
      </div>
      <Suspense fallback={<MissionsFallback />}>
        <ProjectsPageClient pageTitle="Missions" />
      </Suspense>
    </div>
  );
}
