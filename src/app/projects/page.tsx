import { Suspense } from 'react';
import ProjectsPageClient from './ProjectsPageClient';

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageClient />
    </Suspense>
  );
}
