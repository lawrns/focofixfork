# Testing Strategy for Cursos Learning Platform

**Document Version:** 1.0
**Date:** January 24, 2026
**Author:** Testing & QA Analysis
**Status:** Comprehensive Testing Plan

---

## Executive Summary

This document provides a comprehensive testing strategy for the **Cursos Learning Platform**, a newly implemented feature in the Foco application. The platform is an internal education system for Fyves organization members (@fyves.com) designed to transform conventional developers into "vibe coders."

### Key Findings

- **Current Test Coverage:** 0 tests for Cursos functionality (brand new feature)
- **Existing Infrastructure:** Robust testing setup with Jest, Vitest, and Playwright
- **Test Coverage Goals:** 70% across all layers (unit, integration, e2e)
- **Critical Risk Areas:** Access control, progress persistence, video playback, certification logic

---

## Table of Contents

1. [Current Test Coverage Assessment](#1-current-test-coverage-assessment)
2. [Testing Framework Inventory](#2-testing-framework-inventory)
3. [Critical User Flows Requiring Testing](#3-critical-user-flows-requiring-testing)
4. [Unit Testing Strategy](#4-unit-testing-strategy)
5. [Integration Testing Strategy](#5-integration-testing-strategy)
6. [E2E Testing Strategy](#6-e2e-testing-strategy)
7. [Accessibility Testing](#7-accessibility-testing)
8. [Performance Testing](#8-performance-testing)
9. [Priority Matrix (P0/P1/P2)](#9-priority-matrix-p0p1p2)
10. [Mocking Strategy](#10-mocking-strategy)
11. [Test Data Management](#11-test-data-management)
12. [CI/CD Integration](#12-cicd-integration)
13. [Implementation Timeline](#13-implementation-timeline)

---

## 1. Current Test Coverage Assessment

### 1.1 Existing Test Infrastructure

**Testing Frameworks Configured:**
- ✅ **Vitest** (Unit/Integration Tests) - `/home/laurence/downloads/focofixfork/vitest.config.ts`
- ✅ **Jest** (Legacy/Component Tests) - `/home/laurence/downloads/focofixfork/jest.config.js`
- ✅ **Playwright** (E2E Tests) - `/home/laurence/downloads/focofixfork/playwright.config.ts`
- ✅ **Coverage Reporting** - V8 provider with 70% threshold

**Existing Test Suites (200+ tests):**
- Authentication flows
- Task management
- Project management
- Settings pages
- UI components (buttons, dialogs, forms)
- Accessibility tests
- Performance tests
- Security tests

### 1.2 Cursos Feature Test Coverage

**Current Status:** ❌ **ZERO TESTS**

**Files Requiring Tests:**
```
src/app/api/cursos/
├── route.ts                    ❌ No tests
├── progress/route.ts           ❌ No tests
├── certified/route.ts          ❌ No tests
├── check-access/route.ts       ❌ No tests
└── [slug]/route.ts             ❌ No tests

src/app/organizations/[id]/cursos/
├── page.tsx                    ❌ No tests
└── [slug]/page.tsx             ❌ No tests

src/lib/
├── repositories/cursos-repository.ts         ❌ No tests
└── middleware/cursos-access.ts               ❌ No tests
```

**Database Objects:**
- `cursos_courses` table - No migration tests
- `cursos_sections` table - No migration tests
- `cursos_progress` table - No migration tests
- `cursos_checkpoint_attempts` table - No migration tests
- `cursos_certifications` table - No migration tests
- RLS policies - No policy tests
- Triggers - No trigger tests

---

## 2. Testing Framework Inventory

### 2.1 Framework Configuration

**Vitest Configuration** (`vitest.config.ts`):
```typescript
{
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
}
```

**Playwright Configuration** (`playwright.config.ts`):
```typescript
{
  testDir: './tests',
  fullyParallel: true,
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002'
  }
}
```

### 2.2 Available Testing Utilities

**Test Setup File** (`tests/unit/setup.tsx`):
- Mock Supabase client with chainable queries
- Mock Framer Motion components
- Mock Lucide React icons (all icons)
- Mock localStorage, sessionStorage, IndexedDB
- Mock ResizeObserver, IntersectionObserver
- Mock Service Worker, Notification API
- Helper functions: `createMockUser`, `createMockTask`, etc.
- Accessibility checking utilities
- Mobile viewport mocking
- Network condition mocking

**Existing Test Patterns:**
- API route tests (see: `src/app/api/tags/__tests__/tags.test.ts`)
- E2E authentication tests (see: `tests/e2e/authentication.spec.ts`)
- Component tests with React Testing Library
- Accessibility tests with axe-core

---

## 3. Critical User Flows Requiring Testing

### 3.1 P0 Critical Flows (MVP Blockers)

**Flow 1: Access Control Verification**
```
User navigates to /org/:orgId/cursos
  → Check if user is @fyves.com
  → Check if workspace.website is 'fyves.com'
  → If neither: Redirect to /dashboard with error
  → If authorized: Show courses page
```

**Flow 2: Course Discovery and Selection**
```
User lands on /org/:orgId/cursos
  → Load all published courses for workspace
  → Calculate progress for each course
  → Display course cards with status (not_started/in_progress/completed)
  → User clicks "Comenzar" on a course
  → Navigate to course player
```

**Flow 3: Course Content Consumption**
```
User opens /org/:orgId/cursos/:slug
  → Load course with sections
  → Load user's last position
  → Auto-save progress every 30 seconds
  → Mark section as complete when navigating forward
  → Update progress bar
  → Prevent access to future sections (sequential access)
```

**Flow 4: Progress Persistence**
```
User completes a section
  → POST /api/cursos/progress
  → Update completed_section_ids array
  → Update last_position
  → Trigger cursos_update_progress_completion() function
  → Check if all sections completed → set is_completed=true
  → Persist to database
```

### 3.2 P1 Important Flows

**Flow 5: Certification Award**
```
User completes 100% of course sections
  → Trigger creates certification record
  → Display certification badge on user profile
  → Show in "Miembros Certificados" list
  → Allow certificate PDF download (optional)
```

**Flow 6: Checkpoint Validation**
```
User encounters checkpoint section
  → Display exercise/question
  → User submits answer
  → Validate response
  → If correct: Allow progression
  → If incorrect: Show feedback, prevent advancement
  → Log attempt to cursos_checkpoint_attempts
```

**Flow 7: Video Content Playback**
```
User navigates to video section
  → Load Remotion player or HTML5 video
  → Handle video loading errors
  → Fallback to markdown if video unavailable
  → Track completion (user watches X% of video)
```

---

## 4. Unit Testing Strategy

### 4.1 Repository Layer Tests

**File:** `src/lib/repositories/__tests__/cursos-repository.test.ts`

```typescript
describe('CursosRepository', () => {
  describe('findPublishedByWorkspace', () => {
    it('should return published courses with sections ordered by sort_order')
    it('should return empty array if no courses found')
    it('should handle database errors gracefully')
    it('should filter out unpublished courses')
  })

  describe('findBySlug', () => {
    it('should return course with sections by slug')
    it('should return error if course not found')
    it('should include all sections ordered by sort_order')
  })

  describe('getUserProgress', () => {
    it('should return user progress for a course')
    it('should return null if no progress exists')
    it('should handle database errors')
  })

  describe('upsertProgress', () => {
    it('should create new progress record')
    it('should update existing progress record')
    it('should preserve completed_section_ids')
    it('should update last_position')
  })

  describe('markSectionComplete', () => {
    it('should add section to completed_section_ids')
    it('should not duplicate section IDs')
    it('should preserve existing completed sections')
    it('should handle database errors')
  })

  describe('getCertifiedMembers', () => {
    it('should return all certified members for workspace')
    it('should include user and course details')
    it('should return empty array if no certifications')
  })

  describe('createCertification', () => {
    it('should create certification record')
    it('should prevent duplicate certifications')
    it('should set default level to "Nivel 1"')
  })
})
```

### 4.2 Middleware Tests

**File:** `src/lib/middleware/__tests__/cursos-access.test.ts`

```typescript
describe('cursosAccessMiddleware', () => {
  describe('Authentication Check', () => {
    it('should redirect to login if no session')
    it('should log unauthorized access attempts')
    it('should include IP and user agent in logs')
  })

  describe('Workspace Validation', () => {
    it('should redirect if workspace not found')
    it('should load workspace details from database')
  })

  describe('Fyves Domain Check', () => {
    it('should authorize users with @fyves.com email')
    it('should authorize users in fyves.com workspace')
    it('should reject non-fyves users')
    it('should log rejection with user details')
  })

  describe('Role Detection', () => {
    it('should detect user role from workspace_members')
    it('should default to guest if no membership exists')
  })
})
```

### 4.3 API Route Tests

**File:** `src/app/api/cursos/__tests__/route.test.ts`

```typescript
describe('GET /api/cursos', () => {
  it('should return 401 if user not authenticated')
  it('should return 400 if workspaceId missing')
  it('should return courses with progress for authenticated user')
  it('should calculate progress percentage correctly')
  it('should determine course status (not_started/in_progress/completed)')
  it('should handle database errors')
})

describe('POST /api/cursos/progress', () => {
  it('should return 401 if user not authenticated')
  it('should return 400 if courseId missing')
  it('should update last_position if only lastPosition provided')
  it('should mark section as complete if sectionId provided')
  it('should not duplicate completed sections')
  it('should handle concurrent updates')
  it('should return updated progress object')
})

describe('GET /api/cursos/check-access', () => {
  it('should return 401 if user not authenticated')
  it('should return 400 if workspaceId missing')
  it('should authorize @fyves.com users')
  it('should authorize users in fyves.com workspace')
  it('should reject non-fyves users with reason')
  it('should include workspace details in response')
})
```

### 4.4 Component Tests

**File:** `src/app/organizations/[id]/cursos/__tests__/page.test.tsx`

```typescript
describe('CursosPage', () => {
  describe('Access Control', () => {
    it('should check access on mount')
    it('should show error if not authorized')
    it('should redirect after 3 seconds if unauthorized')
  })

  describe('Course Loading', () => {
    it('should show loading skeleton while fetching')
    it('should display course cards when loaded')
    it('should show empty state if no courses')
    it('should handle load errors gracefully')
  })

  describe('Course Card Display', () => {
    it('should show course title and description')
    it('should display progress percentage')
    it('should show correct status badge')
    it('should display duration and lesson count')
    it('should animate cards on load')
  })

  describe('Certified Members', () => {
    it('should display certified members section if any exist')
    it('should show member count correctly')
    it('should display member emails')
    it('should not show section if no certified members')
  })
})

describe('CoursePlayerPage', () => {
  describe('Content Loading', () => {
    it('should load course and sections')
    it('should restore last position from progress')
    it('should show loading state while fetching')
  })

  describe('Progress Tracking', () => {
    it('should auto-save every 30 seconds')
    it('should mark section complete when navigating forward')
    it('should update progress bar')
    it('should show saving indicator')
  })

  describe('Section Navigation', () => {
    it('should display section list in sidebar')
    it('should mark completed sections')
    it('should lock future sections')
    it('should highlight current section')
    it('should show section duration')
  })

  describe('Content Rendering', () => {
    it('should render markdown content')
    it('should render video player')
    it('should render checkpoint cards')
    it('should render exercise cards')
    it('should handle unknown content types')
  })
})
```

---

## 5. Integration Testing Strategy

### 5.1 Database Integration Tests

**File:** `tests/integration/cursos-database.test.ts`

```typescript
describe('Cursos Database Integration', () => {
  describe('RLS Policies', () => {
    it('should allow workspace members to view published courses')
    it('should prevent non-members from viewing courses')
    it('should allow admins to manage courses')
    it('should prevent non-admins from modifying courses')
    it('should allow users to manage their own progress')
    it('should prevent users from viewing others progress')
  })

  describe('Triggers', () => {
    it('should set is_completed when all sections done')
    it('should set completed_at on completion')
    it('should update updated_at on all tables')
  })

  describe('Foreign Keys', () => {
    it('should cascade delete sections when course deleted')
    it('should cascade delete progress when course deleted')
    it('should cascade delete progress when user deleted')
  })
})
```

### 5.2 API Integration Tests

**File:** `tests/integration/cursos-api-flow.test.ts`

```typescript
describe('Cursos API Integration', () => {
  describe('Full Course Progress Flow', () => {
    it('should complete end-to-end progress tracking', async () => {
      // 1. Check access
      // 2. Load courses
      // 3. Start course
      // 4. Complete sections
      // 5. Verify progress saved
      // 6. Verify completion status
    })
  })
})
```

---

## 6. E2E Testing Strategy

### 6.1 Critical User Journeys

**File:** `tests/e2e/cursos-user-journey.spec.ts`

```typescript
test.describe('Cursos User Journey', () => {
  test('should complete full course flow', async ({ page }) => {
    // Login as @fyves.com user
    // Navigate to cursos page
    // Verify access granted
    // Select first course
    // Complete first section
    // Verify progress saved
    // Navigate away and back
    // Verify progress restored
    // Complete remaining sections
    // Verify certification awarded
  })

  test('should reject non-fyves users', async ({ page }) => {
    // Login as @other.com user
    // Try to access /org/:id/cursos
    // Verify redirect to /dashboard
    // Verify error message
  })

  test('should handle video playback', async ({ page }) => {
    // Login and start course
    // Navigate to video section
    // Verify video player loads
    // Verify video plays
    // Verify completion tracked
  })

  test('should enforce sequential access', async ({ page }) => {
    // Login and start course
    // Try to access section 3 without completing 1-2
    // Verify section locked
    // Complete section 1
    // Verify section 2 unlocked
  })
})
```

### 6.2 Cross-Browser Testing

**Browsers to Test:**
- Chrome (Desktop & Mobile)
- Firefox (Desktop)
- Safari (Desktop & Mobile)
- Edge (Desktop)

**Mobile-Specific Tests:**
- Responsive layout on small screens
- Touch interactions
- Video playback on mobile
- Navigation on mobile

---

## 7. Accessibility Testing

### 7.1 Automated Accessibility Tests

**File:** `tests/accessibility/cursos-accessibility.spec.ts`

```typescript
test.describe('Cursos Accessibility', () => {
  test('should not have accessibility violations', async ({ page }) => {
    // Run axe-core on courses page
    // Run axe-core on course player page
    // Verify no violations
  })

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through courses page
    // Verify focus visible
    // Verify all interactive elements reachable
  })

  test('should have proper ARIA labels', async ({ page }) => {
    // Verify all buttons have labels
    // Verify video player has labels
    // Verify progress bar has label
  })

  test('should support screen readers', async ({ page }) => {
    // Verify course cards announced
    // Verify progress announced
    // Verify section changes announced
  })
})
```

### 7.2 Manual Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All interactive elements have focus indicators
- [ ] Videos have captions/subtitles
- [ ] Forms have proper labels and error messages
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces progress changes
- [ ] Reduced motion preference respected
- [ ] Touch targets are at least 44x44px

---

## 8. Performance Testing

### 8.1 Load Time Testing

**File:** `tests/performance/cursos-performance.spec.ts`

```typescript
test.describe('Cursos Performance', () => {
  test('should load courses page quickly', async ({ page }) => {
    // Measure time to interactive
    // Target: < 2 seconds
  })

  test('should load course player quickly', async ({ page }) => {
    // Measure time to interactive
    // Target: < 1 second
  })

  test('should handle lazy loading of videos', async ({ page }) => {
    // Verify videos not loaded until needed
    // Verify placeholder shown
  })

  test('should handle large course lists', async ({ page }) => {
    // Test with 50+ courses
    // Verify pagination or virtualization
  })
})
```

### 8.2 Database Performance

**Queries to Optimize:**
- `findPublishedByWorkspace` - Should use index on (workspace_id, is_published)
- `getUserProgress` - Should use index on (user_id, course_id)
- `getCertifiedMembers` - Should use join indexes
- Progress update queries - Should be idempotent

**Performance Targets:**
- Course list load: < 200ms
- Course detail load: < 100ms
- Progress save: < 50ms
- Certification query: < 150ms

---

## 9. Priority Matrix (P0/P1/P2)

### P0 Tests (MVP Blockers - Week 1)

**Must-have before launch:**

| Test Category | Test Cases | Est. Time |
|--------------|-----------|-----------|
| Access Control | 5 tests | 2h |
| Repository Layer | 15 tests | 4h |
| API Routes (basic) | 10 tests | 3h |
| Course Page Component | 8 tests | 3h |
| Course Player Component | 10 tests | 4h |
| Progress Persistence | 6 tests | 2h |
| E2E Happy Path | 3 tests | 3h |
| **Total** | **57 tests** | **21h** |

**P0 Test Files:**
1. `src/lib/repositories/__tests__/cursos-repository.test.ts`
2. `src/lib/middleware/__tests__/cursos-access.test.ts`
3. `src/app/api/cursos/__tests__/route.test.ts`
4. `src/app/api/cursos/progress/__tests__/route.test.ts`
5. `src/app/api/cursos/check-access/__tests__/route.test.ts`
6. `src/app/organizations/[id]/cursos/__tests__/page.test.tsx`
7. `src/app/organizations/[id]/cursos/[slug]/__tests__/page.test.tsx`
8. `tests/e2e/cursos-critical-flows.spec.ts`

### P1 Tests (Important - Week 2)

**Should-have for robustness:**

| Test Category | Test Cases | Est. Time |
|--------------|-----------|-----------|
| Certification Flow | 8 tests | 3h |
| Checkpoint Validation | 6 tests | 2h |
| Video Playback | 5 tests | 2h |
| Error Handling | 8 tests | 3h |
| Edge Cases | 10 tests | 3h |
| Accessibility | 6 tests | 2h |
| E2E Cross-browser | 4 tests | 3h |
| **Total** | **47 tests** | **18h** |

**P1 Test Files:**
1. `src/app/api/cursos/certified/__tests__/route.test.ts`
2. `src/features/cursos/checkpoints/__tests__/validation.test.ts`
3. `src/features/cursos/video/__tests__/player.test.tsx`
4. `tests/e2e/cursos-certification.spec.ts`
5. `tests/accessibility/cursos-a11y.spec.ts`

### P2 Tests (Nice-to-have - Week 3-4)

**Nice-to-have for completeness:**

| Test Category | Test Cases | Est. Time |
|--------------|-----------|-----------|
| Analytics Dashboard | 10 tests | 4h |
| Advanced Scenarios | 8 tests | 3h |
| Performance | 6 tests | 2h |
| Security | 5 tests | 2h |
| Mobile Specific | 6 tests | 2h |
| **Total** | **35 tests** | **13h** |

---

## 10. Mocking Strategy

### 10.1 External Dependencies

**Supabase Client Mock:**
```typescript
// Already exists in tests/unit/setup.tsx
// Use createChainableMock() for repository tests
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockCourse, error: null })
        })
      })
    })
  })
}
```

**Auth Mock:**
```typescript
vi.mock('@/lib/api/auth-helper', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'test@fyves.com' },
    supabase: mockSupabase,
    response: mockAuthResponse
  })
}))
```

### 10.2 Mock Data Factory

**File:** `tests/unit/cursos-mocks.ts`

```typescript
export const createMockCourse = (overrides = {}) => ({
  id: 'course-123',
  workspace_id: 'workspace-123',
  slug: 'vibe-coding-101',
  title: 'De Developer a Vibe Coder',
  description: 'Curso introductorio',
  duration_minutes: 240,
  is_published: true,
  sort_order: 1,
  sections: [
    createMockSection({ id: 'section-1', sort_order: 1 }),
    createMockSection({ id: 'section-2', sort_order: 2 }),
  ],
  ...overrides
})

export const createMockSection = (overrides = {}) => ({
  id: 'section-123',
  course_id: 'course-123',
  title: 'Introducción',
  content_type: 'markdown',
  content: '# Introducción\n\n...',
  sort_order: 1,
  duration_minutes: 10,
  ...overrides
})

export const createMockProgress = (overrides = {}) => ({
  id: 'progress-123',
  user_id: 'user-123',
  course_id: 'course-123',
  completed_section_ids: ['section-1'],
  last_position: 1,
  is_completed: false,
  completed_at: null,
  ...overrides
})

export const createMockCertification = (overrides = {}) => ({
  id: 'cert-123',
  user_id: 'user-123',
  course_id: 'course-123',
  certification_level: 'Nivel 1',
  certified_at: new Date().toISOString(),
  ...overrides
})
```

### 10.3 Network Mocking

For API route tests, use MSW (Mock Service Worker):

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const cursosHandlers = [
  http.get('/api/cursos', () => {
    return HttpResponse.json({ courses: [createMockCourse()] })
  }),

  http.post('/api/cursos/progress', () => {
    return HttpResponse.json({ progress: createMockProgress() })
  })
]
```

---

## 11. Test Data Management

### 11.1 Database Seeding

**File:** `scripts/seed-test-data-cursos.ts`

```typescript
// Seed test database with:
// - 1 fyves.com workspace
// - 3 published courses
// - 1 unpublished course (for testing)
// - 10 sections per course
// - 5 test users (@fyves.com)
// - 3 test users (@other.com)
// - Various progress states
// - 2 certified users
```

### 11.2 Test Isolation

**Strategies:**
- Use database transactions (rollback after each test)
- Use unique IDs (UUIDs) for each test
- Clear Redis/Upstash cache before tests
- Reset localStorage/sessionStorage between tests

---

## 12. CI/CD Integration

### 12.1 Test Commands

**Add to package.json:**
```json
{
  "scripts": {
    "test:cursos": "vitest run src/**/*cursos*.test.ts",
    "test:cursos:watch": "vitest src/**/*cursos*.test.ts",
    "test:cursos:coverage": "vitest run src/**/*cursos*.test.ts --coverage",
    "test:e2e:cursos": "playwright test tests/e2e/cursos-*.spec.ts",
    "test:cursos:all": "npm run test:cursos && npm run test:e2e:cursos"
  }
}
```

### 12.2 GitHub Actions Workflow

**File:** `.github/workflows/test-cursos.yml`

```yaml
name: Test Cursos

on:
  pull_request:
    paths:
      - 'src/app/api/cursos/**'
      - 'src/app/organizations/**/cursos/**'
      - 'src/lib/repositories/cursos-*.ts'
      - 'src/lib/middleware/cursos-*.ts'

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:cursos:coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e:cursos
```

---

## 13. Implementation Timeline

### Week 1: P0 Critical Tests (21 hours)

**Day 1-2: Repository & Middleware (6h)**
- [ ] Create `cursos-repository.test.ts` (4h)
- [ ] Create `cursos-access.test.ts` (2h)

**Day 3-4: API Routes (6h)**
- [ ] Create `route.test.ts` (2h)
- [ ] Create `progress.test.ts` (2h)
- [ ] Create `check-access.test.ts` (2h)

**Day 5: Components (7h)**
- [ ] Create `page.test.tsx` (courses list) (3h)
- [ ] Create `page.test.tsx` (course player) (4h)

**Day 6-7: E2E (6h)**
- [ ] Create `cursos-critical-flows.spec.ts` (6h)

### Week 2: P1 Important Tests (18 hours)

**Day 1-2: Certification & Checkpoints (5h)**
- [ ] Create `certified.test.ts` (2h)
- [ ] Create checkpoint validation tests (3h)

**Day 3: Video Playback (2h)**
- [ ] Create video player tests (2h)

**Day 4: Error Handling (3h)**
- [ ] Add error scenarios to all test files (3h)

**Day 5: Edge Cases (3h)**
- [ ] Create edge case tests (3h)

**Day 6: Accessibility (2h)**
- [ ] Create `cursos-a11y.spec.ts` (2h)

**Day 7: Cross-browser E2E (3h)**
- [ ] Run E2E on all browsers (3h)

### Week 3-4: P2 Tests (13 hours)

**Day 1-2: Analytics Dashboard (4h)**
- [ ] Create analytics tests (4h)

**Day 3: Performance (2h)**
- [ ] Create performance tests (2h)

**Day 4: Security (2h)**
- [ ] Create security tests (2h)

**Day 5: Mobile (2h)**
- [ ] Create mobile-specific tests (2h)

**Day 6-7: Documentation & CI (3h)**
- [ ] Update CI/CD pipelines (2h)
- [ ] Document test strategy (1h)

---

## 14. Success Metrics

### 14.1 Coverage Targets

| Layer | Target | Current | Gap |
|-------|--------|---------|-----|
| Repository | 90% | 0% | -90% |
| API Routes | 85% | 0% | -85% |
| Components | 80% | 0% | -80% |
| E2E Flows | 100% (P0) | 0% | -100% |
| **Overall** | **70%** | **0%** | **-70%** |

### 14.2 Quality Gates

**Before Merge:**
- All P0 tests passing
- Coverage threshold met (70%)
- No accessibility violations
- E2E tests passing on Chrome

**Before Release:**
- All P0 + P1 tests passing
- Coverage threshold met (80%)
- All browser tests passing
- Performance benchmarks met

---

## 15. Risk Mitigation

### 15.1 Testing Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Flaky E2E tests | High | Use explicit waits, avoid hard-coded delays |
| Slow test suite | Medium | Parallelize tests, use mocks appropriately |
| Test data conflicts | Medium | Use unique IDs, transactions, cleanup |
| False positives | Low | Regular test maintenance, code review |

### 15.2 Coverage Risks

| Risk | Mitigation |
|------|------------|
| Uncovered edge cases | Exploratory testing sessions |
| Missing error scenarios | Fuzz testing, chaos engineering |
| Browser-specific bugs | Cross-browser testing matrix |
| Accessibility regressions | Automated a11y tests in CI |

---

## 16. Maintenance Strategy

### 16.1 Test Review Process

**Weekly:**
- Review flaky tests
- Update slow tests
- Check for false positives

**Monthly:**
- Review coverage reports
- Update test data
- Refactor test utilities

**Quarterly:**
- Audit test suite for redundancies
- Update testing dependencies
- Review test documentation

### 16.2 Test Documentation

**Each test file should include:**
- Purpose of the test suite
- What's being tested
- Key scenarios covered
- Any known limitations

**Example:**
```typescript
/**
 * Test Suite: CursosRepository
 * Purpose: Verify database operations for courses
 * Coverage: CRUD operations, progress tracking, certifications
 * Limitations: Does not test RLS policies (see integration tests)
 */
describe('CursosRepository', () => {
  // ...
})
```

---

## 17. Next Steps

### Immediate Actions (This Week)

1. **Create Test Structure**
   ```bash
   mkdir -p src/lib/repositories/__tests__
   mkdir -p src/lib/middleware/__tests__
   mkdir -p src/app/api/cursos/__tests__
   mkdir -p src/app/organizations/[id]/cursos/__tests__
   mkdir -p tests/e2e
   ```

2. **Implement Mock Data Factory**
   - Create `tests/unit/cursos-mocks.ts`
   - Add mock courses, sections, progress

3. **Write First P0 Tests**
   - Start with repository tests (isolated, fast)
   - Then API route tests
   - Then component tests
   - Finally E2E tests

4. **Setup CI/CD**
   - Add test script to package.json
   - Create GitHub Actions workflow
   - Configure coverage reporting

### Success Criteria

**Week 1:**
- 57 P0 tests written
- All tests passing
- Coverage at 60%+

**Week 2:**
- 104 P0+P1 tests written
- All tests passing
- Coverage at 70%+

**Week 3-4:**
- 139 total tests written
- All tests passing
- Coverage at 75%+
- CI/CD fully integrated

---

## 18. Appendix

### A. Test File Templates

**Repository Test Template:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CursosRepository } from '@/lib/repositories/cursos-repository'

describe('CursosRepository', () => {
  let repo: CursosRepository
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabase()
    repo = new CursosRepository(mockSupabase)
  })

  describe('methodName', () => {
    it('should description', async () => {
      // Arrange
      const input = {}

      // Act
      const result = await repo.methodName(input)

      // Assert
      expect(result.ok).toBe(true)
      expect(result.data).toBeDefined()
    })
  })
})
```

**E2E Test Template:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, navigate
  })

  test('should do something', async ({ page }) => {
    // Act
    await page.click('button')

    // Assert
    await expect(page).toHaveURL(/expected-url/)
  })
})
```

### B. Useful Commands

```bash
# Run all Cursos tests
npm run test:cursos

# Run with coverage
npm run test:cursos:coverage

# Watch mode
npm run test:cursos:watch

# Run E2E tests
npm run test:e2e:cursos

# Run on specific browser
npm run test:e2e:cursos -- --project=chromium

# Debug E2E tests
npm run test:e2e:cursos -- --debug
```

### C. Resources

**Documentation:**
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- React Testing Library: https://testing-library.com/react
- axe-core: https://www.deque.com/axe/

**Internal:**
- Test setup: `/home/laurence/downloads/focofixfork/tests/unit/setup.tsx`
- Example API tests: `/home/laurence/downloads/focofixfork/src/app/api/tags/__tests__/tags.test.ts`
- Example E2E tests: `/home/laurence/downloads/focofixfork/tests/e2e/authentication.spec.ts`

---

## Conclusion

This testing strategy provides a comprehensive plan for achieving 70%+ test coverage for the Cursos Learning Platform. The phased approach (P0 → P1 → P2) ensures critical functionality is tested first, with important and nice-to-have tests following in subsequent weeks.

**Key Takeaways:**

1. **Start with P0 tests** - Focus on access control, CRUD operations, and happy path E2E
2. **Leverage existing infrastructure** - Use the well-established test setup and utilities
3. **Mock appropriately** - Mock Supabase, auth, and external dependencies
4. **Test in layers** - Unit → Integration → E2E, with appropriate coverage at each layer
5. **Automate in CI/CD** - Prevent regressions by running tests on every PR

**Estimated Effort:**
- P0: 21 hours (1 week)
- P1: 18 hours (1 week)
- P2: 13 hours (1-2 weeks)
- **Total: 52 hours (3-4 weeks)**

With dedicated testing effort, the Cursos platform can achieve robust test coverage, ensuring reliability and preventing regressions as the feature evolves.
