# Bulk Operations for Admins - Implementation Plan

## Executive Summary

Transform the existing task batch operations into a comprehensive, permission-controlled admin system supporting multiple entity types with full CRUD capabilities, audit logging, and undo/redo functionality.

---

## Current State Analysis

### Existing Infrastructure (What We Have)

| Component | Location | Status |
|-----------|----------|--------|
| BatchToolbar UI | `src/features/tasks/components/batch-toolbar.tsx` | Working |
| useBatchOperations hook | `src/features/tasks/hooks/use-batch-operations.ts` | Working |
| Batch API endpoint | `src/app/api/tasks/batch/route.ts` | Working |
| TaskRepository batch methods | `src/lib/repositories/task-repository.ts` | Working |
| usePermissions hook | `src/hooks/usePermissions.ts` | Working |
| Role hierarchy | owner > admin > member > guest | Defined |

### Critical Gaps Identified

| Gap | Severity | Impact |
|-----|----------|--------|
| **No role check at API level** | HIGH | Any workspace member can delete tasks |
| **Only verifies workspace membership** | HIGH | Guest users can perform admin operations |
| **No audit logging** | MEDIUM | No compliance record of bulk changes |
| **No partial failure handling** | MEDIUM | Silent failures, inconsistent state |
| **Single entity type (tasks only)** | LOW | Limited admin capabilities |
| **Tags operation incomplete** | LOW | Placeholder in UI |

---

## Recommended Architecture

### Core Principle
**Operation-specific permissions, not blanket bulk permission.**

Different operations have different risk profiles:
- **Low risk:** complete, priority, tag (reversible, affects own work)
- **Medium risk:** move, assign (affects project structure)
- **High risk:** delete (irreversible without audit system)

### Permission Matrix

| Entity | Operation | Required Role | Scope |
|--------|-----------|---------------|-------|
| Tasks | complete/priority/tag | member+ | Own workspace |
| Tasks | move/assign | admin+ | Own workspace |
| Tasks | delete | admin+ | Own workspace |
| Projects | update/archive | admin+ | Own workspace |
| Projects | delete | owner | Own workspace |
| Users | deactivate | admin | Org-level |
| Users | delete | owner | Org-level |
| Workspaces | archive | owner | Own organization |

---

## Implementation Phases

### Phase 1: Security Hardening (Priority: CRITICAL)

**Goal:** Fix the permission gap where any workspace member can perform admin-only operations.

#### 1.1 Add Role Verification to Batch API

**File:** `src/app/api/tasks/batch/route.ts`

```typescript
// Add after verifyUserAccess check
const OPERATION_PERMISSIONS: Record<BatchOperation, TeamMemberRole[]> = {
  complete: ['member', 'admin', 'owner'],
  priority: ['member', 'admin', 'owner'],
  tag: ['member', 'admin', 'owner'],
  move: ['admin', 'owner'],
  assign: ['admin', 'owner'],
  delete: ['admin', 'owner'],
}

// Verify user has required role for operation
const userRole = await getUserRoleInWorkspace(user.id, workspaceId)
const allowedRoles = OPERATION_PERMISSIONS[operation]
if (!allowedRoles.includes(userRole)) {
  return forbiddenResponse('Insufficient permissions for this operation')
}
```

#### 1.2 Update BatchToolbar to Respect Permissions

**File:** `src/features/tasks/components/batch-toolbar.tsx`

- Add `workspaceId` and `teamMembers` props
- Integrate `usePermissions` hook
- Conditionally render operations based on user role
- Hide delete button for non-admins

#### 1.3 Add Rate Limiting

```typescript
const BATCH_LIMITS = {
  maxEntitiesPerRequest: 100,
  maxRequestsPerMinute: 10,
  maxDeletesPerHour: 500,
}
```

**Tasks:**
- [ ] Update `/api/tasks/batch/route.ts` with role verification
- [ ] Add `getUserRoleInWorkspace()` helper function
- [ ] Update `BatchToolbar` to accept permission props
- [ ] Add rate limiting middleware
- [ ] Add tests for permission enforcement

---

### Phase 2: Audit Infrastructure

**Goal:** Track all bulk operations for compliance and undo capability.

#### 2.1 Create Audit Log Table

**Migration:** `supabase/migrations/YYYYMMDD_create_batch_audit_log.sql`

```sql
CREATE TABLE batch_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  operation VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_ids UUID[] NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  result VARCHAR(20) NOT NULL, -- 'success' | 'partial' | 'failure'
  error_details JSONB,
  ip_address INET,
  user_agent TEXT,
  undo_token UUID,
  undo_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batch_audit_user ON batch_audit_log(user_id);
CREATE INDEX idx_batch_audit_workspace ON batch_audit_log(workspace_id);
CREATE INDEX idx_batch_audit_timestamp ON batch_audit_log(timestamp DESC);
CREATE INDEX idx_batch_audit_undo ON batch_audit_log(undo_token) WHERE undo_token IS NOT NULL;
```

#### 2.2 Audit Service

**File:** `src/lib/services/batch-audit-service.ts`

```typescript
interface BatchAuditEntry {
  userId: string
  workspaceId: string
  operation: string
  entityType: string
  entityIds: string[]
  previousValues?: Record<string, unknown>[]
  newValues?: Record<string, unknown>[]
  result: 'success' | 'partial' | 'failure'
  errorDetails?: string
}

class BatchAuditService {
  async logOperation(entry: BatchAuditEntry): Promise<string>
  async getRecentOperations(workspaceId: string, limit?: number): Promise<AuditEntry[]>
  async getUndoableOperation(undoToken: string): Promise<AuditEntry | null>
}
```

**Tasks:**
- [ ] Create migration for `batch_audit_log` table
- [ ] Create `BatchAuditService` class
- [ ] Integrate audit logging into batch endpoint
- [ ] Capture previous values before updates
- [ ] Add undo token generation

---

### Phase 3: Entity Extension

**Goal:** Extend batch operations to projects, workspaces, and users.

#### 3.1 Generic Batch Repository

**File:** `src/lib/repositories/batch-operations-mixin.ts`

```typescript
export interface IBatchOperations<T> {
  batchUpdate(ids: string[], data: Partial<T>, options?: BatchOptions): Promise<Result<BatchResult<T>>>
  batchDelete(ids: string[], options?: BatchOptions): Promise<Result<number>>
  batchCreate(items: Partial<T>[], options?: BatchOptions): Promise<Result<BatchResult<T>>>
}

export function withBatchOperations<T>(supabase: SupabaseClient, tableName: string): IBatchOperations<T>
```

#### 3.2 Entity-Specific Endpoints

| Endpoint | File |
|----------|------|
| `/api/projects/batch` | `src/app/api/projects/batch/route.ts` |
| `/api/workspaces/batch` | `src/app/api/workspaces/batch/route.ts` |
| `/api/users/batch` | `src/app/api/admin/users/batch/route.ts` |

#### 3.3 Generic Batch Hook

**File:** `src/lib/hooks/use-generic-batch-operations.ts`

- Entity-agnostic batch operation hook
- Supports all entity types via configuration
- Handles optimistic updates
- Integrates with undo/redo context

**Tasks:**
- [ ] Create `withBatchOperations` mixin
- [ ] Add batch methods to ProjectRepository
- [ ] Add batch methods to WorkspaceRepository
- [ ] Create `/api/projects/batch` endpoint
- [ ] Create `/api/workspaces/batch` endpoint
- [ ] Create generic batch operations hook

---

### Phase 4: Undo/Redo System

**Goal:** Enable reversible bulk operations with time-limited undo.

#### 4.1 Undo/Redo Context

**File:** `src/lib/contexts/undo-redo-context.tsx`

```typescript
interface UndoRedoContextValue {
  canUndo: boolean
  canRedo: boolean
  isProcessing: boolean
  executeCommand: <T>(command: Command<T>) => Promise<T>
  undo: () => Promise<void>
  redo: () => Promise<void>
  clearHistory: () => void
}
```

#### 4.2 Undo Endpoint

**File:** `src/app/api/batch/undo/route.ts`

- Accept undo token
- Verify token hasn't expired (5-minute window)
- Restore previous values from audit log
- Log the undo operation itself

**Tasks:**
- [ ] Create `UndoRedoProvider` context
- [ ] Create `useUndoRedo` hook
- [ ] Add undo token to batch operation response
- [ ] Create `/api/batch/undo` endpoint
- [ ] Add "Undo" action to toast notifications
- [ ] Implement keyboard shortcuts (Ctrl+Z/Cmd+Z)

---

### Phase 5: Admin Dashboard (Optional Enhancement)

**Recommendation:** Rather than a monolithic admin dashboard, enhance existing views with admin capabilities.

#### Option A: Contextual Admin Features (Recommended)
- Add admin-only batch operations to existing entity lists
- Create admin audit panel at `/admin/audit-log`
- Keep UX familiar for admins

#### Option B: Centralized Dashboard
- Create `/admin/bulk-operations` page
- Entity tabs for tasks/projects/users/workspaces
- Full CRUD capabilities
- Higher maintenance burden

**Tasks (Option A):**
- [ ] Add `isAdmin` prop to BatchToolbar
- [ ] Create `/admin/audit-log` page
- [ ] Add audit log viewer component
- [ ] Add export functionality for audit logs

---

## TypeScript Interfaces

```typescript
// Core types for bulk operations system
export type BulkEntityType = 'task' | 'project' | 'workspace' | 'user'
export type BulkOperationType = 'update' | 'delete' | 'archive' | 'restore' | 'assign' | 'move' | 'tag' | 'complete'

export interface BulkOperationRequest<TPayload = unknown> {
  entityType: BulkEntityType
  ids: string[]
  operation: BulkOperationType
  payload?: TPayload
  options?: {
    dryRun?: boolean
    captureForUndo?: boolean
  }
}

export interface BulkOperationResponse<TEntity> {
  success: boolean
  operation: BulkOperationType
  results: {
    successful: TEntity[]
    failed: Array<{ id: string; error: string; code: string }>
  }
  metadata: {
    totalRequested: number
    successCount: number
    failureCount: number
    executionTimeMs: number
  }
  undoToken?: string
}
```

---

## UX Specifications

### Selection Pattern
- Individual selection via checkbox
- Range selection via Shift+Click
- Select all with "Select all X matching items" option
- Selection persists across pagination

### Action Toolbar
- Sticky positioning with backdrop blur (existing pattern)
- Entity-specific actions based on user role
- Confirmation dialogs for destructive actions
- Type-to-confirm for high-impact operations (>10 items)

### Feedback
- Toast notifications with undo action
- Progress indicator for large batches
- Partial failure handling with retry option
- Detailed error dialog with per-item errors

### Accessibility
- Full keyboard navigation (Space/Enter to select, Ctrl+A for all)
- ARIA live regions for status updates
- Focus management in dialogs
- Screen reader announcements for selection changes

### Mobile
- Card-based layout instead of table
- Bottom sheet for confirmations
- Touch-optimized selection (44px targets)
- Haptic feedback on selection

---

## Testing Strategy

### Unit Tests
- Permission enforcement at API level
- Role hierarchy validation
- Batch operation result handling
- Undo token generation and validation

### Integration Tests
- Full flow: select -> operate -> verify
- Permission denied scenarios
- Partial failure handling
- Undo/redo functionality

### E2E Tests
- Admin performing bulk delete
- Member blocked from delete
- Audit log verification
- Cross-entity operations

---

## Migration Path

1. **Week 1:** Phase 1 (Security Hardening) - CRITICAL
2. **Week 2:** Phase 2 (Audit Infrastructure)
3. **Weeks 3-4:** Phase 3 (Entity Extension)
4. **Week 5:** Phase 4 (Undo/Redo)
5. **Optional:** Phase 5 (Admin Dashboard)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Feature flag for new permission checks |
| Performance with large batches | Chunk operations (100 items max) |
| Partial failures | Transaction boundaries + audit log |
| Cross-workspace operations | Validate all entities same workspace |
| Race conditions | Optimistic locking with version column |

---

## Success Criteria

- [ ] Admin-only operations require admin role at API level
- [ ] All bulk operations logged with previous values
- [ ] Undo available within 5-minute window
- [ ] Batch operations work for tasks, projects, workspaces
- [ ] Partial failures reported with per-item details
- [ ] Rate limiting prevents abuse
- [ ] Full keyboard accessibility
- [ ] Mobile-responsive UI
