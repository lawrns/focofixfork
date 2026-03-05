import { redirect } from 'next/navigation'
import { getProjectListHref } from '@/lib/routes/project-routes'

interface ProjectsPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  redirect(getProjectListHref({
    create: searchParams?.create === 'true',
    import: searchParams?.import === 'true',
    organize: searchParams?.organize === 'true',
  }))
}
