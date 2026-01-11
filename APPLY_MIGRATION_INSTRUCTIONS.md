# Apply Missing Tables Migration

## Quick Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/ouvqnyfqipgnrjnuqsqq/sql
2. Copy the entire contents of `database/migrations/102_add_missing_foco_2_tables.sql`
3. Paste into the SQL editor
4. Click "Run"

### Option 2: Using psql
```bash
psql $DATABASE_URL -f database/migrations/102_add_missing_foco_2_tables.sql
```

### Option 3: Using Netlify CLI (if you have psql access)
```bash
netlify functions:execute sql --file database/migrations/102_add_missing_foco_2_tables.sql
```

## What This Migration Does

1. **Creates activity_logs table** - For tracking workspace activities
2. **Creates milestones table** - For project milestones in Foco 2.0
3. **Creates goals table** - For workspace and project goals
4. **Creates a comments view** - For backward compatibility with foco_comments
5. **Applies RLS policies** - To secure the new tables
6. **Adds triggers** - For auto-updating updated_at columns

## After Applying

Run the check script again to verify:
```bash
npx tsx check-db-schema.ts
```

All tables should now exist and be properly secured.
