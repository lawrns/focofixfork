# Performance Quick Wins

Fast-track guide for implementing the highest-impact performance optimizations.

---

## 🔴 Critical Priority: Redis Caching (3-4 days, 60-80% improvement)

### Setup Redis (1 hour)

```bash
# Sign up for Upstash (free tier available)
# Get your Redis URL and token
# Add to .env.local:
UPSTASH_REDIS_URL=your-redis-url
UPSTASH_REDIS_TOKEN=your-redis-token
```

### Install Redis Client (5 minutes)

```bash
npm install @upstash/redis
```

### Create Cache Helper (30 minutes)

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 120
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return cached as T;

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Apply to API Routes (2-3 days)

```typescript
// Example: api/tasks/route.ts
import { cachedFetch } from '@/lib/cache';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cacheKey = `tasks:${searchParams.toString()}`;

  const data = await cachedFetch(
    cacheKey,
    async () => {
      const { data } = await supabase
        .from('work_items')
        .select('*')
        .order('created_at', { ascending: false });
      return data;
    },
    120 // 2 minutes TTL
  );

  return NextResponse.json({ success: true, data });
}

// On mutations, invalidate cache
export async function POST(req: NextRequest) {
  const task = await createTask(body);
  
  await invalidateCache('tasks:*');
  
  return NextResponse.json({ success: true, data: task });
}
```

**Cache TTL Guidelines:**
- User profiles: 5 minutes
- Workspaces: 5 minutes
- Projects: 2 minutes
- Tasks: 2 minutes
- Activity feed: 30 seconds

---

## 🔴 Fix N+1 Queries (2-3 days, 50-80% improvement)

### Problem: Multiple Sequential Queries

```typescript
// ❌ BAD: N+1 queries
const members = await supabase
  .from('workspace_members')
  .select('*')
  .eq('workspace_id', id);

// Then for EACH member:
for (const member of members) {
  const profile = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', member.user_id)
    .single();
}
```

### Solution: Use Joins

```typescript
// ✅ GOOD: Single query with join
const members = await supabase
  .from('workspace_members')
  .select(`
    *,
    user_profiles!inner(id, full_name, email, avatar_url)
  `)
  .eq('workspace_id', id);
```

### Apply to Key Endpoints

**1. GET /api/workspaces/[id]/members**

```typescript
// Before: N+1 problem
const { data: members } = await supabase
  .from('workspace_members')
  .select('*');

const profiles = await supabase
  .from('user_profiles')
  .select('*')
  .in('id', memberIds);

// After: Single query
const { data: members } = await supabase
  .from('workspace_members')
  .select(`
    id,
    role,
    capacity_hours_per_week,
    focus_hours_per_day,
    user_profiles!inner(id, full_name, email, avatar_url)
  `)
  .eq('workspace_id', workspaceId);
```

**2. /people Page - Batch Task Counts**

```typescript
// Before: N queries for task counts
for (const member of members) {
  const tasks = await fetch(`/api/tasks?assignee_id=${member.id}`);
}

// After: Single aggregation query
const taskStats = await supabase.rpc('get_member_task_stats', {
  workspace_id: workspaceId
});
```

**Create Database Function:**

```sql
CREATE OR REPLACE FUNCTION get_member_task_stats(workspace_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  total_tasks BIGINT,
  completed_tasks BIGINT,
  overdue_tasks BIGINT,
  blocked_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    assignee_id as user_id,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue_tasks,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_tasks
  FROM work_items
  WHERE workspace_id = workspace_id_param
  GROUP BY assignee_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔴 Database Indexes (1 day, 40-60% improvement)

### Add Missing Composite Indexes

```sql
-- Run these in Supabase SQL Editor

-- Work Items: Workspace + Status (most common filter)
CREATE INDEX IF NOT EXISTS idx_work_items_workspace_status
  ON work_items(workspace_id, status);

-- Work Items: Assignee + Status (for "My Tasks")
CREATE INDEX IF NOT EXISTS idx_work_items_assignee_status
  ON work_items(assignee_id, status)
  WHERE assignee_id IS NOT NULL;

-- Workspace Members: Composite lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_composite
  ON workspace_members(workspace_id, user_id);

-- Activities: Entity lookup with timestamp
CREATE INDEX IF NOT EXISTS idx_activities_entity_created
  ON activities(entity_id, entity_type, created_at DESC);

-- Analyze tables after creating indexes
ANALYZE work_items;
ANALYZE workspace_members;
ANALYZE activities;
```

### Verify Index Usage

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM work_items 
WHERE workspace_id = 'xxx' AND status = 'in_progress';

-- Should show "Index Scan" instead of "Seq Scan"
```

---

## 🔴 React Query Configuration (1 day, 40-60% fewer API calls)

### Configure Global Defaults

```typescript
// app/layout.tsx or providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Apply to Data Fetching

```typescript
// Before: No caching
const [members, setMembers] = useState([]);

useEffect(() => {
  fetch('/api/members').then(r => r.json()).then(setMembers);
}, []);

// After: With React Query caching
import { useQuery } from '@tanstack/react-query';

const { data: members } = useQuery({
  queryKey: ['members', workspaceId],
  queryFn: () => fetch(`/api/workspaces/${workspaceId}/members`).then(r => r.json()),
  staleTime: 2 * 60 * 1000, // 2 minutes
});
```

### Invalidate on Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createTask = useMutation({
  mutationFn: (data) => fetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

---

## 🟡 Bundle Optimization (3-4 days, 30-50% reduction)

### Dynamic Import Heavy Components

```typescript
// Before: Static import
import CodeEditor from '@/components/CodeEditor';
import MermaidDiagram from '@/components/MermaidDiagram';

// After: Dynamic import
import dynamic from 'next/dynamic';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  loading: () => <div>Loading editor...</div>,
  ssr: false, // Disable SSR for client-only components
});

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), {
  loading: () => <div className="animate-pulse h-64 bg-gray-100" />,
});
```

### Key Components to Dynamic Import

1. **Code Editor** (@codemirror) - ~200KB
2. **Mermaid Diagrams** (mermaid) - ~150KB
3. **Charts** (recharts) - ~100KB
4. **Markdown Editor** (if used)
5. **QR Code Generator** (qrcode)

### Optimize next.config.js

```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};
```

---

## Testing Improvements

### Before Optimization

```bash
# Run baseline tests
npm run test:performance
playwright test tests/performance/
```

### After Each Optimization

```bash
# Test API improvements
playwright test tests/performance/api-performance.test.ts

# Test frontend improvements
playwright test tests/performance/frontend-performance.test.ts

# Load test
k6 run tests/performance/load-test.js
```

### Validate Results

Expected improvements after Phase 1:
- API p95: 800ms → 200-300ms (60-75% faster)
- Page load: 3-4s → 1-1.5s (60-70% faster)
- Database queries: -70%
- API calls (client): -50%

---

## Monitoring Setup

### Add Performance Logging

```typescript
// lib/performance.ts
export function logPerformance(label: string, startTime: number) {
  const duration = Date.now() - startTime;
  
  if (duration > 1000) {
    console.warn(`⚠️ Slow operation: ${label} took ${duration}ms`);
  }
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to DataDog/New Relic
  }
}

// Usage
const start = Date.now();
const data = await fetchData();
logPerformance('fetchData', start);
```

### Set Up Alerts

Monitor these metrics:
- API p95 > 500ms
- Page load LCP > 2.5s
- Error rate > 5%
- Cache hit rate < 60%

---

## Checklist

Phase 1 (Week 1-2):
- [ ] Set up Redis (Upstash)
- [ ] Implement cache helper
- [ ] Add caching to GET /api/tasks
- [ ] Add caching to GET /api/projects
- [ ] Add caching to GET /api/workspaces
- [ ] Fix N+1 in /api/workspaces/[id]/members
- [ ] Fix N+1 in /people page
- [ ] Add database indexes
- [ ] Configure React Query defaults
- [ ] Test improvements
- [ ] Verify 70%+ improvement

**Expected Time:** 7-9 days  
**Expected Impact:** 70-85% performance improvement

---

**Next:** See `PERFORMANCE_ANALYSIS_REPORT.md` for Phase 2 & 3 details.
