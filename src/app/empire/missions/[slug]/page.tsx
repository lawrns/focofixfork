import { redirect } from 'next/navigation'
import { getProjectDetailHref } from '@/lib/routes/project-routes'

interface MissionProjectRedirectPageProps {
  params: {
    slug: string
  }
}

export default function MissionProjectRedirectPage({ params }: MissionProjectRedirectPageProps) {
  redirect(getProjectDetailHref(params.slug))
}
