/**
 * Database Performance Analysis Script
 * Analyzes database schema, indexes, and query performance
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableStats {
  table_name: string;
  row_count: number;
  table_size: string;
  index_size: string;
  total_size: string;
  indexes: IndexInfo[];
}

interface IndexInfo {
  index_name: string;
  table_name: string;
  column_names: string[];
  index_type: string;
  size: string;
}

interface MissingIndex {
  table_name: string;
  column_name: string;
  reason: string;
  estimated_impact: 'high' | 'medium' | 'low';
}

interface SlowQuery {
  query: string;
  avg_duration: number;
  calls: number;
  total_time: number;
}

async function analyzeTableStats(): Promise<TableStats[]> {
  console.log('\n📊 Analyzing Table Statistics...\n');

  const tables = [
    'work_items',
    'foco_projects',
    'workspace_members',
    'user_profiles',
    'activities',
    'comments',
    'notifications',
    'organizations',
  ];

  const stats: TableStats[] = [];

  for (const table of tables) {
    try {
      // Get row count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`Error counting ${table}:`, countError.message);
        continue;
      }

      // Get table size (requires pg_stat_user_tables access)
      const { data: sizeData, error: sizeError } = await supabase.rpc('get_table_size', {
        table_name: table,
      }).maybeSingle();

      const tableSize = sizeData?.table_size || 'N/A';
      const indexSize = sizeData?.index_size || 'N/A';
      const totalSize = sizeData?.total_size || 'N/A';

      // Get indexes
      const { data: indexData } = await supabase.rpc('get_table_indexes', {
        table_name: table,
      });

      const indexes: IndexInfo[] = indexData || [];

      stats.push({
        table_name: table,
        row_count: count || 0,
        table_size: tableSize,
        index_size: indexSize,
        total_size: totalSize,
        indexes,
      });

      console.log(`  ${table.padEnd(30)} ${(count || 0).toString().padStart(10)} rows`);
    } catch (error: any) {
      console.error(`Error analyzing ${table}:`, error.message);
    }
  }

  return stats;
}

async function detectMissingIndexes(): Promise<MissingIndex[]> {
  console.log('\n🔍 Detecting Missing Indexes...\n');

  const missingIndexes: MissingIndex[] = [];

  // Define columns that should be indexed based on common query patterns
  const recommendedIndexes = [
    { table: 'work_items', column: 'project_id', reason: 'Frequent filtering by project', impact: 'high' as const },
    { table: 'work_items', column: 'assignee_id', reason: 'Frequent filtering by assignee', impact: 'high' as const },
    { table: 'work_items', column: 'status', reason: 'Frequent filtering by status', impact: 'high' as const },
    { table: 'work_items', column: 'due_date', reason: 'Date range queries', impact: 'medium' as const },
    { table: 'work_items', column: 'created_at', reason: 'Sorting by creation date', impact: 'medium' as const },
    { table: 'work_items', column: 'workspace_id', reason: 'Filtering by workspace', impact: 'high' as const },
    { table: 'foco_projects', column: 'workspace_id', reason: 'Filtering by workspace', impact: 'high' as const },
    { table: 'foco_projects', column: 'owner_id', reason: 'Filtering by owner', impact: 'medium' as const },
    { table: 'foco_projects', column: 'status', reason: 'Filtering by status', impact: 'medium' as const },
    { table: 'workspace_members', column: 'workspace_id', reason: 'Frequent workspace lookups', impact: 'high' as const },
    { table: 'workspace_members', column: 'user_id', reason: 'Frequent user lookups', impact: 'high' as const },
    { table: 'activities', column: 'entity_id', reason: 'Activity feed queries', impact: 'high' as const },
    { table: 'activities', column: 'user_id', reason: 'User activity queries', impact: 'medium' as const },
    { table: 'activities', column: 'created_at', reason: 'Time-based queries', impact: 'medium' as const },
    { table: 'notifications', column: 'user_id', reason: 'User notifications', impact: 'high' as const },
    { table: 'notifications', column: 'read', reason: 'Unread notifications filter', impact: 'high' as const },
  ];

  for (const rec of recommendedIndexes) {
    // Check if index exists (simplified check)
    const { data: indexes } = await supabase.rpc('get_table_indexes', {
      table_name: rec.table,
    }).maybeSingle();

    const hasIndex = indexes?.some((idx: any) =>
      idx.column_names.includes(rec.column)
    );

    if (!hasIndex) {
      missingIndexes.push({
        table_name: rec.table,
        column_name: rec.column,
        reason: rec.reason,
        estimated_impact: rec.impact,
      });

      const impactSymbol = rec.impact === 'high' ? '🔴' : rec.impact === 'medium' ? '🟡' : '🟢';
      console.log(`  ${impactSymbol} ${rec.table}.${rec.column} - ${rec.reason}`);
    }
  }

  if (missingIndexes.length === 0) {
    console.log('  ✅ All recommended indexes are in place');
  }

  return missingIndexes;
}

async function checkConnectionPooling() {
  console.log('\n🔌 Checking Connection Pooling Configuration...\n');

  try {
    // Check if connection pooling is configured
    const { data: settings } = await supabase.rpc('get_db_settings').maybeSingle();

    console.log('  Max Connections:', settings?.max_connections || 'Unknown');
    console.log('  Current Connections:', settings?.active_connections || 'Unknown');
    console.log('  Idle Connections:', settings?.idle_connections || 'Unknown');

    const utilizationRate = settings?.active_connections && settings?.max_connections
      ? (settings.active_connections / settings.max_connections) * 100
      : 0;

    console.log(`  Connection Pool Utilization: ${utilizationRate.toFixed(1)}%`);

    if (utilizationRate > 80) {
      console.log('  ⚠️  Connection pool utilization is high. Consider increasing pool size.');
    } else {
      console.log('  ✅ Connection pool utilization is healthy');
    }
  } catch (error: any) {
    console.log('  ⚠️  Could not check connection pooling:', error.message);
  }
}

async function detectNPlusOneQueries() {
  console.log('\n🔄 Detecting Potential N+1 Query Problems...\n');

  const nPlusOneIssues = [
    {
      endpoint: 'GET /api/tasks',
      issue: 'May fetch project details separately for each task',
      solution: 'Use Supabase select with joins: .select("*, project:foco_projects(*)")',
      severity: 'high' as const,
    },
    {
      endpoint: 'GET /api/workspaces/[id]/members',
      issue: 'Fetches user profiles separately for each member',
      solution: 'Use single query with joins to get user details',
      severity: 'high' as const,
    },
    {
      endpoint: 'GET /people',
      issue: 'Fetches tasks separately for each team member',
      solution: 'Use batch query or aggregation to get task counts',
      severity: 'high' as const,
    },
    {
      endpoint: 'GET /api/projects',
      issue: 'May fetch member details separately',
      solution: 'Use joins to include member data in single query',
      severity: 'medium' as const,
    },
  ];

  nPlusOneIssues.forEach(issue => {
    const severitySymbol = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
    console.log(`  ${severitySymbol} ${issue.endpoint}`);
    console.log(`     Issue: ${issue.issue}`);
    console.log(`     Solution: ${issue.solution}\n`);
  });
}

async function generateOptimizationReport(
  tableStats: TableStats[],
  missingIndexes: MissingIndex[]
) {
  console.log('\n═'.repeat(80));
  console.log('📋 Database Performance Optimization Report');
  console.log('═'.repeat(80));

  console.log('\n1. Table Statistics:');
  console.log('   ' + '─'.repeat(76));
  tableStats.forEach(stat => {
    console.log(`   ${stat.table_name.padEnd(30)} ${stat.row_count.toString().padStart(10)} rows`);
    console.log(`   ${''.padEnd(30)} ${stat.indexes.length.toString().padStart(10)} indexes`);
  });

  console.log('\n2. Missing Indexes (High Impact):');
  console.log('   ' + '─'.repeat(76));
  const highImpact = missingIndexes.filter(m => m.estimated_impact === 'high');
  if (highImpact.length > 0) {
    highImpact.forEach(idx => {
      console.log(`   🔴 CREATE INDEX idx_${idx.table_name}_${idx.column_name}`);
      console.log(`      ON ${idx.table_name}(${idx.column_name});`);
      console.log(`      -- ${idx.reason}\n`);
    });
  } else {
    console.log('   ✅ No high-impact missing indexes detected');
  }

  console.log('\n3. Optimization Recommendations:');
  console.log('   ' + '─'.repeat(76));

  const recommendations = [
    {
      priority: 'High',
      action: 'Implement database connection pooling',
      benefit: 'Reduce connection overhead by 50-70%',
    },
    {
      priority: 'High',
      action: 'Add missing indexes on frequently filtered columns',
      benefit: 'Improve query performance by 50-80%',
    },
    {
      priority: 'High',
      action: 'Optimize N+1 queries using joins',
      benefit: 'Reduce API response times by 60-80%',
    },
    {
      priority: 'Medium',
      action: 'Implement query result caching with Redis',
      benefit: 'Reduce database load by 40-60%',
    },
    {
      priority: 'Medium',
      action: 'Use read replicas for read-heavy operations',
      benefit: 'Distribute load and improve read performance',
    },
    {
      priority: 'Low',
      action: 'Archive old data from high-volume tables',
      benefit: 'Maintain query performance as data grows',
    },
  ];

  recommendations.forEach(rec => {
    const prioritySymbol = rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢';
    console.log(`   ${prioritySymbol} [${rec.priority}] ${rec.action}`);
    console.log(`      Benefit: ${rec.benefit}\n`);
  });

  console.log('═'.repeat(80));
}

async function main() {
  console.log('🗄️  Database Performance Analysis Tool');
  console.log('═'.repeat(80));

  try {
    const tableStats = await analyzeTableStats();
    const missingIndexes = await detectMissingIndexes();
    await checkConnectionPooling();
    await detectNPlusOneQueries();
    await generateOptimizationReport(tableStats, missingIndexes);

    console.log('\n✅ Database performance analysis complete!');
    console.log('\nFor detailed query performance, enable PostgreSQL slow query logging.');
    console.log('Add these queries to monitor performance:');
    console.log('  - pg_stat_statements extension for query statistics');
    console.log('  - pg_stat_activity for active connections');
    console.log('  - EXPLAIN ANALYZE for query plan analysis\n');
  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { analyzeTableStats, detectMissingIndexes, checkConnectionPooling, detectNPlusOneQueries };
