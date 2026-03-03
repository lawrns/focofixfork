import { redirect } from 'next/navigation'

type GuidePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const params = (await searchParams) ?? {}
  const create = Array.isArray(params.create) ? params.create[0] : params.create
  const target = create === 'true' ? '/empire/missions?create=true' : '/docs'
  redirect(target)
}
