# Fixes Implementation Plan

## Overview
This document tracks the implementation of fixes for all broken features identified in [BROKEN_FEATURES_INVENTORY.json](BROKEN_FEATURES_INVENTORY.json).

## Status: Phase 1 - Database Setup ✅ COMPLETE

### Database Tables Created
- ✅ `goals` table - added columns (title, type, status, priority, target_value, current_value, etc.)
- ✅ `goal_milestones` table - created with full schema
- ✅ `goal_project_links` table - created with full schema
- ✅ `time_entries` table - created (needs column additions)
- ✅ `file_storage_quotas` table - created with full schema
- ✅ `conflicts` table - created for conflict resolution logging

### Migration Files Created
- `database/migrations/009_create_goals_tables.sql`
- `database/migrations/010_create_time_tracking_tables.sql`
- `database/migrations/011_alter_goals_tables.sql`

## Phase 2 - Critical Fixes (PRIORITY 1)

### 1. Goals Functionality ⏳ IN PROGRESS
**Files to Update:**
- `src/lib/services/goals.service.ts` - Implement all CRUD operations
- `src/app/api/goals/route.ts` - Create GET/POST endpoints
- `src/app/api/goals/[id]/route.ts` - Create PUT/DELETE endpoints
- `src/app/api/goals/[id]/milestones/route.ts` - Milestone endpoints

**Implementation Steps:**
1. Update GoalsService.getGoals() to query database
2. Update GoalsService.createGoal() to insert into database
3. Update GoalsService.updateGoal() to update database
4. Update GoalsService.deleteGoal() to delete from database
5. Implement milestone operations
6. Create API routes for all operations
7. Update goals-dashboard.tsx to use real APIs

### 2. Settings Save Functionality ⏳ NEXT
**Files to Update:**
- `src/app/api/settings/profile/route.ts` - CREATE
- `src/app/api/settings/notifications/route.ts` - CREATE
- `src/app/api/settings/organization/route.ts` - CREATE
- `src/components/settings/settings-dashboard.tsx` - Update save functions

**Implementation:**
```typescript
// Profile Settings API
export async function PUT(request: Request) {
  const { full_name, timezone, language } = await request.json()
  const { data, error } = await supabase
    .from('users')
    .update({ full_name, timezone, language })
    .eq('id', userId)
  return NextResponse.json({ success: true })
}
```

### 3. Analytics Real Data ⏳ NEXT
**Files to Update:**
- `src/lib/services/analytics.ts` - Fix topContributors and projectHours queries

**Implementation:**
```typescript
// Top Contributors - query time_entries
const { data: entries } = await supabase
  .from('time_entries')
  .select('user_id, duration_minutes, users(full_name)')
  .gte('start_time', startDate)
  .lte('start_time', endDate)

const topContributors = Object.entries(
  entries.reduce((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] || 0) + e.duration_minutes
    return acc
  }, {})
).map(([userId, minutes]) => ({
  userId,
  name: entries.find(e => e.user_id === userId).users.full_name,
  hours: minutes / 60
}))
```

### 4. Report Exports ⏳ NEXT
**Files to Create:**
- `src/lib/services/export/pdf.service.ts`
- `src/lib/services/export/csv.service.ts`
- `src/lib/services/export/excel.service.ts`
- `src/app/api/reports/pdf/route.ts`
- `src/app/api/reports/csv/route.ts`
- `src/app/api/reports/excel/route.ts`

**Dependencies to Install:**
```bash
npm install jspdf jspdf-autotable
npm install papaparse
npm install xlsx
```

## Phase 3 - High Priority Fixes

### 5. Email Notifications
**Files to Update:**
- `src/lib/services/notifications.ts` - Integrate SendGrid/AWS SES

**Environment Variables Needed:**
```env
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@foco.mx
```

### 6. Time Tracking
**Files to Create:**
- `src/app/api/time-entries/route.ts`
- `src/app/api/time-entries/[id]/route.ts`
- `src/components/time-tracking/time-entry-form.tsx`

## Phase 4 - Medium Priority Fixes

### 7. File Upload Quotas
**Files to Update:**
- `src/lib/services/file-uploads.ts` - Implement quota tracking

### 8. Conflict Logging
**Files to Update:**
- `src/lib/services/conflict-resolution.ts` - Log to conflicts table

### 9. Push Notifications
**Files to Create:**
- `src/lib/services/push-notifications.ts`

## Implementation Order (By Priority)

1. ✅ Database tables created
2. ⏳ Goals CRUD operations
3. ⏳ Settings save APIs
4. ⏳ Analytics real data
5. ⏳ Report exports
6. ⏳ Email notifications
7. ⏳ Time tracking
8. ⏳ File quotas
9. ⏳ Conflict logging
10. ⏳ Push notifications

## Quick Wins (Can implement immediately)

### Settings Save - Profile
```typescript
// src/app/api/settings/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function PUT(request: NextRequest) {
  const { full_name, timezone, language } = await request.json()
  const supabase = supabaseAdmin

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('users')
    .update({ full_name, timezone, language, updated_at: new Date() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

### Settings Save - Notifications
```typescript
// src/app/api/settings/notifications/route.ts
export async function PUT(request: NextRequest) {
  const settings = await request.json()
  const supabase = supabaseAdmin

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('users')
    .update({
      notification_settings: settings,
      updated_at: new Date()
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

## Testing Checklist

After each implementation:
- [ ] Unit tests pass
- [ ] API endpoints return correct data
- [ ] UI updates correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] RLS policies work correctly

## Deployment Steps

1. Run database migrations
2. Deploy backend changes
3. Deploy frontend changes
4. Test on production
5. Monitor for errors

## Notes

- All database tables now exist but may need additional columns
- RLS policies are in place for all tables
- Indexes created for performance
- Triggers set up for updated_at columns

## Next Steps

1. Complete Goals service implementation
2. Create Settings API endpoints
3. Fix Analytics queries
4. Implement export services
5. Integrate email service
