export function isMissingContentPipelineSchema(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as { code?: string; message?: string }
  const message = (err.message || '').toLowerCase()

  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    message.includes("could not find the table 'public.content_sources'") ||
    message.includes("could not find the table 'public.content_items'") ||
    message.includes('relation "content_sources" does not exist') ||
    message.includes('relation "content_items" does not exist')
  )
}
