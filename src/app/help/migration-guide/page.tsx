import fs from 'node:fs/promises'
import path from 'node:path'
import Link from 'next/link'

async function loadGuide(): Promise<string> {
  const migrationGuidePath = path.join(process.cwd(), 'docs', 'migration-guide.md')
  try {
    return await fs.readFile(migrationGuidePath, 'utf8')
  } catch {
    return 'Migration guide is unavailable in this environment.'
  }
}

export default async function MigrationGuidePage() {
  const guide = await loadGuide()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Migration Guide</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Source: <code>docs/migration-guide.md</code>
          </p>
        </div>
        <Link href="/help" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to Help
        </Link>
      </div>

      <article className="rounded-lg border border-border bg-card p-4 text-sm leading-6 whitespace-pre-wrap">
        {guide}
      </article>
    </div>
  )
}
