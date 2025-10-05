# Architectural Migration Plan

## Executive Summary

This document outlines the systematic migration from the current scattered architecture to a feature-module based structure. The migration will be executed in phases with clear rollback points and validation criteria.

## Current State Assessment

### Architecture Issues
- **Scattered Code**: Components, services, and hooks distributed across multiple directories
- **Duplicate Services**: Parallel implementations (goals.service.ts vs goals.ts)
- **Client-Heavy Layout**: Forced client rendering blocking SSR benefits
- **Test Fragmentation**: Tests spread across 5+ directories
- **Styling Disorganization**: CSS files duplicated and scattered

### Impact
- Slow developer onboarding
- Difficult feature development
- Maintenance overhead
- Performance issues from client rendering
- Testing complexity

## Migration Phases

### Phase 1: Preparation (✅ Complete)
- [x] Created architectural documentation
- [x] Generated comprehensive codebase audit
- [x] Created feature/refactor/cleanup branch
- [x] Established success criteria

### Phase 2: Directory Restructure (In Progress)

#### Step 2.1: Clean Root Directory
```bash
# Move audit artifacts to docs/
mkdir -p docs/audit-reports docs/architecture
mv *.md docs/audit-reports/ 2>/dev/null || true
mv *.json docs/architecture/ 2>/dev/null || true

# Update .gitignore for generated content
echo "test-results/" >> .gitignore
echo "playwright-report/" >> .gitignore
echo "api-test-screenshots/" >> .gitignore
echo ".next/" >> .gitignore
echo "node_modules/" >> .gitignore
```

#### Step 2.2: Create Feature Module Structure
```bash
# Create feature directories
mkdir -p src/features/projects/{components,hooks,services,validation,types}
mkdir -p src/features/goals/{components,hooks,services,validation,types}
mkdir -p src/features/tasks/{components,hooks,services,validation,types}
mkdir -p src/features/analytics/{components,hooks,services,validation,types}

# Create public API files
touch src/features/projects/index.ts
touch src/features/goals/index.ts
touch src/features/tasks/index.ts
touch src/features/analytics/index.ts
```

#### Step 2.3: Consolidate Test Structure
```bash
# Create unified test structure
mkdir -p tests/{unit,integration,e2e,scripts,fixtures,config}

# Move existing tests (will be done incrementally)
# mv src/__tests__/* tests/unit/ 2>/dev/null || true
# mv tests/* tests/integration/ 2>/dev/null || true
```

#### Step 2.4: Consolidate Styling
```bash
# Create organized style structure
mkdir -p src/styles/{base,components,themes,utilities}

# Move and consolidate CSS files
# mv src/styles/*.css src/styles/base/ 2>/dev/null || true
# rm -f src/app/styles/accessibility.css  # Remove duplicate
```

### Phase 3: Service Consolidation

#### Step 3.1: Merge Goals Services
```typescript
// Create src/features/goals/services/goalService.ts
// Merge functionality from:
// - src/lib/services/goals.service.ts (Supabase integration)
// - src/lib/services/goals.ts (complete interface)
```

#### Step 3.2: Move Project Components
```typescript
// Move to src/features/projects/
mv src/components/projects/* src/features/projects/components/
mv src/lib/services/projects.ts src/features/projects/services/
mv src/lib/hooks/use-projects.ts src/features/projects/hooks/
```

#### Step 3.3: Update Import Statements
```typescript
// Systematic import updates across codebase
// Old: import { ProjectService } from '@/lib/services/projects'
// New: import { projectService } from '@/features/projects'
```

### Phase 4: Layout Refactor

#### Step 4.1: Split Layout Components
```typescript
// src/app/layout.tsx (server component)
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// src/app/providers.tsx (client component)
'use client'
export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Other providers */}
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}
```

#### Step 4.2: Extract PWA Logic
```typescript
// src/components/providers/pwa-provider.tsx
'use client'
export function PWAProvider({ children }) {
  // PWA initialization logic
  useEffect(() => {
    // PWA setup
  }, [])

  return <>{children}</>
}
```

### Phase 5: Security and Documentation Updates

#### Step 5.1: Security Boundary Audit
```bash
# Verify no service keys in client bundles
npm run build
grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/ || echo "No service keys found"
```

#### Step 5.2: Documentation Updates
- Update all import examples in docs/
- Create migration guide for team
- Update CI/CD references

## Rollback Strategy

### Phase-Level Rollbacks
- **Phase 2**: Delete feature directories, restore from git
- **Phase 3**: Revert import changes, restore service files
- **Phase 4**: Restore original layout.tsx

### Emergency Rollback
```bash
git checkout main
git branch -D feature/refactor/cleanup
```

## Validation Criteria

### Per-Phase Validation
- **Phase 2**: `tree src/features/` shows proper structure
- **Phase 3**: All imports resolve, tests pass
- **Phase 4**: Layout renders correctly, SSR works
- **Phase 5**: Security audit passes

### End-to-End Validation
- All existing features work
- No build errors
- Test suite passes
- Performance unchanged

## Risk Mitigation

### Technical Risks
- **Import Failures**: Use TypeScript compiler to validate all imports
- **Build Breaks**: Run builds after each phase
- **Performance Impact**: Monitor bundle size and load times

### Team Risks
- **Learning Curve**: Provide migration guide and pair programming
- **Productivity Dip**: Schedule during low-activity period
- **Knowledge Loss**: Document all decisions and reasoning

## Success Metrics

### Quantitative
- Root directory files: 85 → <20
- Test directories: 5 → 1
- Bundle size change: < ±5%
- Build time change: < ±10%

### Qualitative
- Developer feedback on new structure
- Feature development speed improvement
- Bug reports related to architecture issues

## Timeline

- **Phase 1**: 1 day (Preparation)
- **Phase 2**: 3 days (Directory restructure)
- **Phase 3**: 4 days (Service consolidation)
- **Phase 4**: 2 days (Layout refactor)
- **Phase 5**: 2 days (Security & docs)
- **Testing**: 2 days (Validation & fixes)
- **Buffer**: 2 days (Unexpected issues)

**Total: 16 days**

## Communication Plan

- **Daily Standups**: Progress updates and blocker resolution
- **Weekly Demos**: Show progress and gather feedback
- **Migration Guide**: Comprehensive documentation for team
- **Post-Migration**: Retrospective and lessons learned

## Dependencies

- Team availability during migration window
- Staging environment for testing
- CI/CD pipeline updates
- Documentation hosting setup
