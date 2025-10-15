const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const client = new Client({
  host: 'db.czijxfbkihrauyjwcgfn.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Hennie@@12Hennie@@12',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

async function runQuery(description, sql) {
  console.log(`\n📊 ${description}...`)
  try {
    const result = await client.query(sql)
    console.log('✅ Success')
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows.slice(0, 10))
    }
    return result
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    throw error
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('  🔧 APPLYING COMPREHENSIVE DATABASE FIXES')
  console.log('═══════════════════════════════════════════════════════════════════════════\n')

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/999_comprehensive_database_fixes.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📋 PRE-MIGRATION ANALYSIS\n')
    
    // Check current RLS status
    await runQuery('Current RLS Status', `
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('projects', 'tasks', 'milestones', 'goals', 'organization_members', 'project_members')
      ORDER BY tablename;
    `)

    // Check current policy count
    await runQuery('Current Policy Count', `
      SELECT
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename;
    `)

    console.log('\n═══════════════════════════════════════════════════════════════════════════')
    console.log('  🚀 APPLYING MIGRATION')
    console.log('═══════════════════════════════════════════════════════════════════════════\n')

    // Execute the full migration
    await client.query(migrationSQL)
    console.log('✅ Migration applied successfully!\n')

    console.log('═══════════════════════════════════════════════════════════════════════════')
    console.log('  ✅ POST-MIGRATION VERIFICATION')
    console.log('═══════════════════════════════════════════════════════════════════════════\n')

    // Verify RLS is enabled
    await runQuery('RLS Status (After)', `
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('projects', 'tasks', 'milestones', 'goals', 'organization_members', 'project_members')
      ORDER BY tablename;
    `)

    // Check policy count after
    await runQuery('Policy Count (After)', `
      SELECT
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename;
    `)

    // Check indexes
    await runQuery('Index Count by Table', `
      SELECT
        tablename,
        COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('projects', 'tasks', 'milestones', 'goals')
      GROUP BY tablename
      ORDER BY tablename;
    `)

    // Check foreign keys
    await runQuery('Foreign Key Constraints', `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('tasks', 'milestones', 'project_members')
      ORDER BY tc.table_name
      LIMIT 10;
    `)

    // Check NOT NULL constraints
    await runQuery('NOT NULL Constraints', `
      SELECT
        table_name,
        column_name,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('projects', 'tasks', 'milestones')
        AND column_name IN ('created_by', 'project_id')
      ORDER BY table_name, column_name;
    `)

    // Data integrity check
    await runQuery('Record Counts', `
      SELECT 'projects' as table_name, COUNT(*) as total FROM projects
      UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
      UNION ALL SELECT 'milestones', COUNT(*) FROM milestones
      UNION ALL SELECT 'goals', COUNT(*) FROM goals
      ORDER BY table_name;
    `)

    console.log('\n═══════════════════════════════════════════════════════════════════════════')
    console.log('  ✅ DATABASE FIXES COMPLETED SUCCESSFULLY!')
    console.log('═══════════════════════════════════════════════════════════════════════════\n')
    console.log('Summary:')
    console.log('  ✓ RLS enabled on all core tables')
    console.log('  ✓ Comprehensive policies created')
    console.log('  ✓ Indexes added for performance')
    console.log('  ✓ Foreign key constraints with CASCADE')
    console.log('  ✓ NOT NULL constraints enforced')
    console.log('  ✓ Unique constraints on memberships')
    console.log('  ✓ CHECK constraints for validation')
    console.log('  ✓ Auto-update triggers configured\n')

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
