export function getProjectListHref(params?: {
  create?: boolean
  import?: boolean
  organize?: boolean
}): string {
  const search = new URLSearchParams()
  if (params?.create) search.set('create', 'true')
  if (params?.import) search.set('import', 'true')
  if (params?.organize) search.set('organize', 'true')
  const query = search.toString()
  return query ? `/empire/missions?${query}` : '/empire/missions'
}

export function getProjectDetailHref(slugOrId: string): string {
  return `/projects/${encodeURIComponent(slugOrId)}`
}

export function getProjectStatusReportHref(slugOrId: string): string {
  const search = new URLSearchParams({
    generate: 'status',
    project_slug: slugOrId,
  })
  return `/reports?${search.toString()}`
}
