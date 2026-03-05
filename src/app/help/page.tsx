import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Help Center</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Operational guides for Critter workflows and migration support.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/help/migration-guide"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
        >
          <h2 className="text-sm font-semibold">Migration Guide</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete migration notes and compatibility checklist.
          </p>
        </Link>

        <Link
          href="/settings"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
        >
          <h2 className="text-sm font-semibold">Workspace Settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage integrations, access, and runtime configuration.
          </p>
        </Link>
      </div>
    </div>
  )
}
