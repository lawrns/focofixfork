# Local Database Stack

`focofixfork` currently has three database paths in the repo, but only one of them is a good full local runtime.

## What exists

- `SQLite`
  - Files: [sqlite-adapter.ts](/home/laurence/focofixfork/src/lib/db/sqlite-adapter.ts), [sqlite-schema.sql](/home/laurence/focofixfork/src/lib/db/sqlite-schema.sql)
  - Purpose: older `foco` local-first CLI path and a few seed utilities.
  - Status: legacy compatibility path, not the main app database.

- `Supabase / PostgreSQL`
  - Files: [supabase-server.ts](/home/laurence/focofixfork/src/lib/supabase-server.ts), [config.toml](/home/laurence/focofixfork/supabase/config.toml), [database/README.md](/home/laurence/focofixfork/database/README.md)
  - Purpose: primary application data layer.
  - Status: canonical runtime for the app.

- Bare Docker Postgres
  - File: [docker-compose.yml](/home/laurence/focofixfork/docker-compose.yml)
  - Purpose: lightweight standalone Postgres container.
  - Status: useful for raw SQL work, but incomplete for the app because it does not provide Supabase auth, realtime, storage, or REST.

## Canonical local setup

Use local Supabase for development:

```bash
npm run db:local:start
npm run db:local:env
```

This writes `.env.local.supabase-local` from the live local stack. Merge it into `.env.local` when you want the app to point at local Supabase instead of the remote project.

Useful commands:

```bash
npm run db:local:status
npm run db:local:reset
npm run db:local:stop
```

## Recommendation

- Treat `Supabase local` as the single source of truth for local app development.
- Treat `SQLite` as a legacy utility path for the `foco` CLI only.
- Treat `docker-compose.yml` as non-canonical unless the app is explicitly refactored to support plain Postgres without Supabase services.
