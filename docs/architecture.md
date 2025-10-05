# Foco Architecture Documentation

## Overview

Foco is a project management application built with Next.js 14, Supabase, and modern React patterns. This document describes the architectural decisions and structure following the feature-module refactor.

## Architectural Principles

### 1. Feature Module Organization
The codebase is organized around business domains rather than technical layers. Each feature encapsulates all related code:

```
src/features/
├── projects/          # Project management domain
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   ├── services/      # Business logic
│   ├── validation/    # Form schemas
│   ├── types/         # TypeScript types
│   └── index.ts       # Public API
├── goals/            # Goal tracking domain
├── tasks/            # Task management domain
└── analytics/        # Analytics and reporting domain
```

### 2. Server-First Architecture
- **Server Components by Default**: All components are server-rendered unless client-side interaction is required
- **Client Components Opt-in**: Marked with `'use client'` directive only when necessary
- **Provider Separation**: Client-side providers isolated in `src/app/providers.tsx`

### 3. Security Boundaries
- **Client-Side**: Only anonymous Supabase key, read-only operations
- **Server-Side**: Service role key for admin operations, data mutations
- **API Routes**: Authorization middleware validates all requests

### 4. Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and service layer testing
- **E2E Tests**: Critical user journey validation
- **Unified Structure**: All tests under `tests/` directory

## Directory Structure

```
foco/
├── docs/                    # Documentation
│   ├── architecture.md     # This file
│   ├── services-contracts.md
│   └── database-policies.md
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Authentication routes
│   │   ├── dashboard/      # Main application
│   │   ├── api/           # API routes
│   │   ├── layout.tsx     # Server-rendered layout
│   │   └── providers.tsx  # Client providers
│   ├── features/          # Feature modules
│   │   ├── projects/
│   │   ├── goals/
│   │   ├── tasks/
│   │   └── analytics/
│   ├── components/
│   │   ├── ui/            # Reusable UI primitives
│   │   └── providers/     # App-wide providers
│   ├── lib/
│   │   ├── supabase/      # Database client
│   │   ├── services/      # Legacy services (to be migrated)
│   │   ├── utils/         # Utility functions
│   │   └── validation/    # Shared validation schemas
│   └── styles/            # Consolidated styling
├── tests/                 # Unified test suite
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── config/
├── database/              # Database schema and migrations
│   ├── migrations/
│   └── README.md
└── tools/                 # Development tools and scripts
```

## Feature Module Contracts

### Public API Pattern
Each feature module exposes a clean public API:

```typescript
// src/features/projects/index.ts
export { ProjectForm } from './components/ProjectForm'
export { ProjectList } from './components/ProjectList'
export { useProjects } from './hooks/useProjects'
export { projectService } from './services/projectService'
export type { Project, ProjectStatus } from './types'
```

### Service Layer Responsibilities
- **Data Fetching**: Supabase queries with proper error handling
- **Business Logic**: Domain-specific operations and validations
- **Caching**: Client-side data caching strategies
- **Real-time**: Supabase real-time subscriptions

### Component Guidelines
- **Server Components**: Default for static content
- **Client Components**: Only for interactivity (forms, state)
- **Composition**: Prefer composition over inheritance
- **Accessibility**: WCAG 2.1 AA compliance required

## Data Access Patterns

### Supabase Integration
- **Client**: Read operations, real-time subscriptions
- **Server**: Write operations, admin functions
- **Middleware**: Request authentication and authorization

### Row Level Security
- **Enabled**: Goals, time tracking, project members tables
- **Disabled**: Core tables (projects, tasks, milestones) - application-layer security
- **Policy Types**: Organization-based, user-based, role-based

## State Management

### Local State
- **React State**: Component-level state
- **Custom Hooks**: Shared stateful logic
- **Context**: App-wide state (auth, theme, i18n)

### Server State
- **Supabase**: Primary data source
- **Real-time**: Live updates for collaborative features
- **Caching**: React Query for request caching

## Testing Strategy

### Test Organization
```
tests/
├── unit/           # Component and utility tests
├── integration/    # API and service integration
├── e2e/           # Critical user journeys
├── fixtures/      # Test data and mocks
└── config/        # Test configuration
```

### Testing Principles
- **Component Testing**: UI behavior and interactions
- **Service Testing**: Business logic and data operations
- **Integration Testing**: API contracts and data flow
- **E2E Testing**: Critical user workflows

## Performance Optimizations

### Build Optimizations
- **Tree Shaking**: Feature modules enable better bundling
- **Code Splitting**: Route-based and component-based splitting
- **Image Optimization**: Next.js automatic optimization

### Runtime Optimizations
- **Server Components**: Reduced client JavaScript
- **Streaming**: Progressive loading of content
- **Caching**: Intelligent caching strategies

## Development Workflow

### Feature Development
1. Create feature module directory structure
2. Implement components, services, and tests
3. Add TypeScript types and validation schemas
4. Update public API exports
5. Add integration and E2E tests

### Code Review Checklist
- [ ] Server Components used by default
- [ ] Public API properly exported
- [ ] Tests written and passing
- [ ] TypeScript types complete
- [ ] Accessibility requirements met
- [ ] Security boundaries respected

## Migration Guide

### From Legacy Structure
The refactor consolidates scattered code into cohesive feature modules:

**Before:**
```
src/components/projects/ProjectForm.tsx
src/lib/services/projects.ts
src/lib/hooks/use-projects.ts
```

**After:**
```
src/features/projects/
├── components/ProjectForm.tsx
├── services/projectService.ts
├── hooks/useProjects.ts
└── index.ts
```

### Breaking Changes
- Import paths updated to feature modules
- Service method signatures may change
- Component prop interfaces updated
- Test file locations changed

## Future Considerations

### Scalability
- Feature modules can be extracted to microservices
- Shared components can be published as packages
- Database can be sharded by organization

### Maintainability
- Clear ownership boundaries reduce conflicts
- Feature modules enable independent deployment
- Comprehensive testing ensures reliability

### Developer Experience
- Faster onboarding with clear structure
- Better IDE support and discoverability
- Reduced cognitive load when navigating code
