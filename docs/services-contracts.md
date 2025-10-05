# Service Layer Contracts

## Overview

This document defines the contracts and boundaries for service layer implementations across Foco's feature modules.

## Service Layer Principles

### 1. Single Responsibility
Each service handles one business domain with clear boundaries.

### 2. Error Handling
Services must handle errors gracefully and return consistent result objects.

### 3. Type Safety
All service methods must have complete TypeScript definitions.

### 4. Testability
Services must be unit testable with dependency injection.

## Standard Service Interface

```typescript
interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

interface BaseService {
  // CRUD operations return ServiceResult
  findById(id: string): Promise<ServiceResult<Entity>>
  findAll(filters?: Filters): Promise<ServiceResult<Entity[]>>
  create(data: CreateData): Promise<ServiceResult<Entity>>
  update(id: string, data: UpdateData): Promise<ServiceResult<Entity>>
  delete(id: string): Promise<ServiceResult<boolean>>

  // Domain-specific operations
  // ... custom methods
}
```

## Feature Service Contracts

### Project Service

```typescript
interface ProjectService {
  // CRUD
  getProject(id: string, userId: string): Promise<ServiceResult<Project>>
  getProjects(userId: string, filters?: ProjectFilters): Promise<ServiceResult<Project[]>>
  createProject(data: CreateProjectData, userId: string): Promise<ServiceResult<Project>>
  updateProject(id: string, data: UpdateProjectData, userId: string): Promise<ServiceResult<Project>>
  deleteProject(id: string, userId: string): Promise<ServiceResult<boolean>>

  // Domain operations
  getProjectMembers(projectId: string, userId: string): Promise<ServiceResult<ProjectMember[]>>
  addProjectMember(projectId: string, userId: string, memberData: AddMemberData): Promise<ServiceResult<ProjectMember>>
  removeProjectMember(projectId: string, memberId: string, userId: string): Promise<ServiceResult<boolean>>
  updateProjectStatus(projectId: string, status: ProjectStatus, userId: string): Promise<ServiceResult<Project>>
}
```

### Goal Service

```typescript
interface GoalService {
  // CRUD
  getGoal(id: string): Promise<ServiceResult<Goal>>
  getGoals(filters?: GoalFilters): Promise<ServiceResult<Goal[]>>
  createGoal(data: CreateGoalData): Promise<ServiceResult<Goal>>
  updateGoal(id: string, data: UpdateGoalData): Promise<ServiceResult<Goal>>
  deleteGoal(id: string): Promise<ServiceResult<boolean>>

  // Domain operations
  updateProgress(goalId: string, newValue: number, note?: string): Promise<ServiceResult<boolean>>
  getProgress(goalId: string): Promise<ServiceResult<GoalProgress[]>>
  addComment(goalId: string, content: string, userId: string): Promise<ServiceResult<GoalComment>>
  getComments(goalId: string): Promise<ServiceResult<GoalComment[]>>
  linkProject(goalId: string, projectId: string): Promise<ServiceResult<GoalProjectLink>>
  unlinkProject(goalId: string, projectId: string): Promise<ServiceResult<boolean>>
}
```

### Task Service

```typescript
interface TaskService {
  // CRUD
  getTask(id: string): Promise<ServiceResult<Task>>
  getTasks(filters?: TaskFilters): Promise<ServiceResult<Task[]>>
  createTask(data: CreateTaskData): Promise<ServiceResult<Task>>
  updateTask(id: string, data: UpdateTaskData): Promise<ServiceResult<Task>>
  deleteTask(id: string): Promise<ServiceResult<boolean>>

  // Domain operations
  updateStatus(taskId: string, status: TaskStatus): Promise<ServiceResult<Task>>
  assignTask(taskId: string, assigneeId: string): Promise<ServiceResult<Task>>
  updatePriority(taskId: string, priority: TaskPriority): Promise<ServiceResult<Task>>
  setDueDate(taskId: string, dueDate: string): Promise<ServiceResult<Task>>
  addTimeEntry(taskId: string, timeData: TimeEntryData): Promise<ServiceResult<TimeEntry>>
}
```

### Analytics Service

```typescript
interface AnalyticsService {
  // Dashboard data
  getOverviewAnalytics(organizationId?: string, dateRange?: DateRange): Promise<ServiceResult<AnalyticsOverview>>
  getProjectAnalytics(organizationId?: string): Promise<ServiceResult<ProjectAnalytics[]>>
  getTaskAnalytics(organizationId?: string, dateRange?: DateRange): Promise<ServiceResult<TaskAnalytics>>
  getTeamAnalytics(organizationId?: string): Promise<ServiceResult<TeamAnalytics>>
  getTimeTrackingAnalytics(organizationId?: string, dateRange?: DateRange): Promise<ServiceResult<TimeTrackingAnalytics>>

  // Export operations
  exportData(format: ExportFormat, type: ExportType, filters?: ExportFilters): Promise<ServiceResult<Blob>>
  generateReport(reportType: ReportType, dateRange?: DateRange): Promise<ServiceResult<ReportData>>
}
```

## Data Access Patterns

### Supabase Client Usage

```typescript
// Client-side (read-only)
import { supabase } from '@/lib/supabase/client'

export class ProjectService {
  async getProjects(userId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)

    if (error) throw new Error(error.message)
    return data
  }
}
```

### Server-side (write operations)

```typescript
// Server-side (admin operations)
import { supabaseAdmin } from '@/lib/supabase/server'

export class ProjectService {
  async createProject(data: CreateProjectData, userId: string) {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        ...data,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return project
  }
}
```

## Error Handling

### Standard Error Responses

```typescript
// Success response
{
  success: true,
  data: { /* entity data */ },
  pagination?: { /* pagination info */ }
}

// Error response
{
  success: false,
  error: "Human-readable error message",
  code?: "ERROR_CODE" // Optional error code for programmatic handling
}
```

### Error Types

- **ValidationError**: Invalid input data
- **NotFoundError**: Entity not found
- **ForbiddenError**: Permission denied
- **ConflictError**: Business logic conflict
- **InternalError**: Unexpected server error

## Testing Contracts

### Unit Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ProjectService } from './projectService'
import { supabase } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

describe('ProjectService', () => {
  describe('getProjects', () => {
    it('returns projects for user', async () => {
      const mockProjects = [{ id: '1', name: 'Test Project' }]
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockProjects, error: null })
        })
      })

      const result = await ProjectService.getProjects('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockProjects)
    })
  })
})
```

### Integration Testing

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ProjectService } from './projectService'

describe('ProjectService Integration', () => {
  const testClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  describe('CRUD operations', () => {
    it('creates and retrieves project', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'Test project for integration testing'
      }

      const createResult = await ProjectService.createProject(projectData, 'test-user')
      expect(createResult.success).toBe(true)

      const getResult = await ProjectService.getProject(createResult.data!.id, 'test-user')
      expect(getResult.success).toBe(true)
      expect(getResult.data!.name).toBe(projectData.name)
    })
  })
})
```

## Migration Strategy

### Legacy Service Consolidation

1. **Identify duplicates**: Map existing services to feature modules
2. **Create migration plan**: Define which code moves where
3. **Update imports**: Gradually update all import statements
4. **Remove legacy**: Delete old service files after migration

### Breaking Changes

- Service method signatures may change during consolidation
- Error response format standardized across all services
- Import paths updated to feature module structure
- Some services may be split or merged based on domain analysis

## Performance Guidelines

### Query Optimization

- Use appropriate indexes for common query patterns
- Implement pagination for list operations
- Cache frequently accessed data
- Use real-time subscriptions sparingly

### Bundle Size

- Tree-shake unused service methods
- Lazy load feature modules
- Minimize client-side service usage
- Prefer server components for data fetching

## Security Considerations

### Authorization

- All service methods validate user permissions
- Server-side operations use service role key
- Client-side operations limited to read-only
- Row Level Security policies enforced

### Data Validation

- Input validation using Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with proper sanitization
- CSRF protection for state-changing operations

## Monitoring and Observability

### Service Metrics

- Response times for all service methods
- Error rates by service and method
- Cache hit rates for performance monitoring
- Real-time subscription connection health

### Logging

- Structured logging with consistent format
- Error tracking with stack traces
- Performance monitoring for slow queries
- Audit logging for sensitive operations
