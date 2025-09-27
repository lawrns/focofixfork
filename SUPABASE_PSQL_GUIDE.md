# Supabase & PostgreSQL (PSQL) Setup Guide for Foco Project

## 🔍 What is PSQL's Role in This Project?

**PostgreSQL (PSQL)** is the underlying database engine that powers **Supabase**. Here's how they relate to your Foco project:

### 🏗️ Architecture Overview

```
Foco Frontend (Next.js) 
    ↓
Supabase Client (JavaScript SDK)
    ↓
Supabase Platform (Backend-as-a-Service)
    ↓
PostgreSQL Database (PSQL)
```

### 🎯 Key Relationships

1. **Supabase = PostgreSQL + More**
   - Supabase is built on top of PostgreSQL
   - Provides REST API, real-time subscriptions, authentication
   - Adds Row Level Security (RLS), Edge Functions, and more

2. **PSQL in Your Project**
   - All your data is stored in PostgreSQL tables
   - Supabase exposes these tables through a JavaScript SDK
   - You can access PSQL directly for advanced operations

3. **Current Database Schema**
   - ✅ `organizations` - Company/team data
   - ✅ `projects` - Project management data
   - ✅ `tasks` - Task tracking and assignments
   - ✅ `milestones` - Project milestones and deadlines
   - ✅ `user_profiles` - User information and preferences
   - ✅ `ai_suggestions` - AI-generated recommendations
   - ✅ `milestone_comments` - Comments on milestones
   - ✅ `milestone_labels` - Labels for milestone categorization
   - ✅ `real_time_events` - Real-time activity tracking

## 🚀 Current Setup Status

### ✅ What's Already Working

1. **Environment Configuration**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=✅ Set
   NEXT_PUBLIC_SUPABASE_ANON_KEY=✅ Set
   SUPABASE_SERVICE_ROLE_KEY=✅ Set
   ```

2. **Database Connection**
   - ✅ Supabase client initialized
   - ✅ All tables accessible
   - ✅ Authentication system working
   - ✅ Real-time subscriptions configured

3. **Database Service Layer**
   - ✅ Type-safe database operations
   - ✅ Error handling and retry logic
   - ✅ Connection pooling and health checks
   - ✅ CRUD operations for all entities

## 🛠️ PSQL Setup Options

### Option 1: Use Supabase Dashboard (Recommended)

**Advantages:**
- No local setup required
- Web-based SQL editor
- Built-in query optimization
- Automatic backups and scaling

**Access Methods:**
1. **Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor"
   - Run PostgreSQL queries directly

2. **Database URL Connection**
   ```bash
   # Your connection string format:
   postgresql://postgres:[password]@[host]:5432/postgres
   ```

### Option 2: Local PSQL Client

**When to Use:**
- Advanced database administration
- Complex migrations
- Performance tuning
- Bulk data operations

**Installation:**
```bash
# Windows (using Chocolatey)
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

**Connection:**
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[password]@[host]:5432/postgres"
```

### Option 3: Database Management Tools

**Recommended Tools:**
- **pgAdmin** - Full-featured PostgreSQL administration
- **DBeaver** - Universal database tool
- **TablePlus** - Modern database client
- **VS Code Extensions** - PostgreSQL extensions

## 🔧 Common PSQL Operations for Your Project

### 1. View Database Schema
```sql
-- List all tables
\dt

-- Describe a specific table
\d organizations

-- View table relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### 2. Database Maintenance
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Analyze table statistics
ANALYZE organizations;

-- View active connections
SELECT * FROM pg_stat_activity;
```

### 3. Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🔐 Security Considerations

### Row Level Security (RLS)
Your Supabase database uses RLS policies to secure data:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Enable RLS on a table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
```

### User Management
```sql
-- View database users
SELECT usename, usesuper, usecreatedb, usecanlogin 
FROM pg_user;

-- Check user permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'organizations';
```

## 📊 Monitoring and Maintenance

### 1. Database Health Checks
```javascript
// Use the built-in health check
import { databaseService } from '@/lib/database/service'

const health = await databaseService.healthCheck()
console.log('Database status:', health)
```

### 2. Connection Monitoring
```sql
-- Monitor connection pool
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Timeouts**
   ```javascript
   // Increase timeout in your Supabase client
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     global: { headers: { 'x-client-info': 'foco-app' } }
   })
   ```

2. **RLS Policy Errors**
   ```sql
   -- Temporarily disable RLS for debugging (be careful!)
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```

3. **Performance Issues**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_projects_organization_id ON projects(organization_id);
   CREATE INDEX idx_tasks_project_id ON tasks(project_id);
   ```

## 📝 Next Steps

### Immediate Actions
1. ✅ Database connection is stable and working
2. ✅ All tables are accessible
3. ✅ Type-safe service layer implemented

### Optional Enhancements
1. **Set up local PSQL client** for advanced operations
2. **Configure database monitoring** for production
3. **Implement database migrations** for schema changes
4. **Set up automated backups** (Supabase handles this automatically)

### Development Workflow
1. Use the **Supabase Dashboard** for quick queries and schema changes
2. Use the **database service layer** in your Next.js application
3. Use **PSQL client** for complex operations and maintenance

## 🔗 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Your Foco project is now fully configured with a stable Supabase/PostgreSQL connection!** 🎉

The database service layer provides type-safe operations, error handling, and connection management. You can start building your application features immediately using the provided database service methods.