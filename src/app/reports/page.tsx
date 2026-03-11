import { Suspense } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import ReportsPageClient from './reports-page-client';

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageShell><div>Loading reports...</div></PageShell>}>
      <ReportsPageClient />
    </Suspense>
  );
}
