# Database Schema Changelog

## 2025-11-13
- Applied `015_add_voice_planning_tables.sql` to create voice planning tables and indexes; fixed policies to reference `organization_members` instead of `user_organizations`; replaced unsupported `ADD CONSTRAINT IF NOT EXISTS` with existence-guarded blocks.
- Applied `999_comprehensive_database_fixes.sql` updates:
  - Added `idx_projects_updated_at_desc`, `idx_tasks_updated_at_desc`, and `idx_milestones_updated_at_desc` for recency queries.
  - Added `check_task_due_date_after_created` to ensure `tasks.due_date >= created_at` when present.
- Verified RLS enabled and policy counts, indexes across core and voice tables.

## Notes
- Migrations executed against `postgresql://postgres@db.czijxfbkihrauyjwcgfn.supabase.co:5432/postgres` using URL-encoded password.
- All changes are backward compatible; constraints use guarded additions to avoid runtime errors.

