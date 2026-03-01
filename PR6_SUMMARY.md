# PR 6: Styling Unification + Swarm Progress Visualization

## Summary
Successfully unified the styling across the application and implemented a real-time Swarm Progress visualization tied to run steps.

## Files Created

### Motion System
- `src/lib/animations/motion-system.ts` - Centralized animation rules
  - TIMING, EASING, STAGGER constants
  - Card entrance/exit animations
  - Swarm node animations (spawn/active/processing/complete/merge)
  - Progress step animations
  - Page transitions
  - Reduced motion support

### UI Components
- `src/components/ui/unified-card.tsx` - UnifiedCard, UnifiedCardList
- `src/components/ui/unified-badge.tsx` - UnifiedBadge, StatusBadge, PriorityBadge
- `src/components/ui/index.ts` - Barrel exports
- `src/components/layout/unified-page-shell.tsx` - Standardized page container
- `src/components/layout/index.ts` - Barrel exports

### Swarm Visualization
- `src/components/swarm/SwarmProgress.tsx` - Main progress component
  - SwarmProgress (detailed view)
  - SwarmProgressCompact (inline)
  - SwarmProgressDots (minimal)
- `src/components/swarm/index.ts` - Barrel exports

### Supporting Components
- `src/features/delegation/components/ProjectEmptyState.tsx`

## Files Modified

### Pages
- `src/app/runs/page.tsx` - Refactored with unified styling
- `src/app/runs/[id]/page.tsx` - Added SwarmProgress visualization

## Key Features

### 1. Unified Design System
- Consistent spacing, colors, and typography
- All components use shadcn-based primitives
- No legacy styling islands

### 2. Motion Rules
- Every animation communicates state
- Subtle, natural-feeling transitions
- Consistent timing (150ms fast, 200ms normal, 300ms medium)
- Reduced motion support throughout

### 3. Swarm Progress Visualization
- Tied to REAL run steps (not decorative)
- Motion states: spawn → progress → complete/error
- Visual indicators: pending, running, completed, error, skipped
- Progress bar with percentage
- Step durations displayed

### 4. Status Communication
- Pulsing indicators for running/pending states
- Color-coded status badges
- Animated progress bars
- Connector lines between steps

## Usage Example

```tsx
import { SwarmProgress } from '@/components/swarm'
import { UnifiedCard } from '@/components/ui/unified-card'
import { UnifiedPageShell } from '@/components/layout/unified-page-shell'

// In a run detail page:
<UnifiedPageShell>
  <UnifiedCard>
    <SwarmProgress 
      steps={runSteps} 
      variant="detailed" 
      showDurations 
    />
  </UnifiedCard>
</UnifiedPageShell>
```

## Acceptance Criteria Met
✅ All pages feel like one product - unified components used consistently
✅ No legacy styling islands - shadcn-based primitives throughout
✅ Motion communicates state changes - spawn/progress/complete/error
✅ Swarm Progress tied to real run steps - not decorative
