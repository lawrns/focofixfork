# Proposal Flow Diagram Design

**Date:** 2026-01-18
**Status:** Ready for Review
**Author:** Claude (with user collaboration)

## Overview

Interactive flow diagram showing how a project would change when a proposal is merged. Stage-based visualization (Kanban-style) with world-class instant morph animations.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visualization type | Stage-based flow | Tasks flow through Backlog → In Progress → Review → Done |
| Location | Inside proposal detail view | Replaces/enhances timeline comparison tab |
| Animation style | Instant morph (400ms) | Snappy Linear-like feel, spring physics |

## Component Architecture

### File Structure

```
src/components/proposals/
├── proposal-flow-diagram.tsx      # Main component
├── flow-diagram-stage.tsx         # Individual stage column
├── flow-diagram-task-card.tsx     # Task card with action indicators
├── flow-diagram-scrubber.tsx      # Timeline scrubber control
└── flow-diagram-animations.ts     # Animation variants & springs
```

### Component: `<ProposalFlowDiagram />`

```typescript
interface ProposalFlowDiagramProps {
  proposalId: string
  items: ProposalItemWithEntity[]
  onItemClick?: (item: ProposalItemWithEntity) => void
  className?: string
}
```

### Data Flow

```
ProposalDetailView
    └── ProposalFlowDiagram
            ├── FlowDiagramStage (Backlog)
            │       └── FlowDiagramTaskCard[]
            ├── FlowDiagramStage (In Progress)
            │       └── FlowDiagramTaskCard[]
            ├── FlowDiagramStage (Review)
            │       └── FlowDiagramTaskCard[]
            ├── FlowDiagramStage (Done)
            │       └── FlowDiagramTaskCard[]
            └── FlowDiagramScrubber
```

## Layout Design

```
┌──────────────────────────────────────────────────────────────────────┐
│  [List View]  [Flow View ●]                    [Preview Merge ▶]     │
├──────────────────────────────────────────────────────────────────────┤
│   Backlog         In Progress        Review            Done          │
│   ─────────────   ─────────────     ─────────────   ─────────────   │
│   ┌───────────┐   ┌───────────┐     ┌───────────┐   ┌───────────┐   │
│   │ Task A    │   │ Task C    │     │           │   │ Task E    │   │
│   └───────────┘   └───────────┘     └───────────┘   └───────────┘   │
│   ┌───────────┐  ← Green border = new task from proposal            │
│   │ + Task B  │                                                      │
│   └───────────┘                                                      │
├──────────────────────────────────────────────────────────────────────┤
│   Legend: ┌─┐ Existing  ┌─┐ +Add  ┌─┐ ~Modify  ┌─┐ -Remove          │
├──────────────────────────────────────────────────────────────────────┤
│   [Before] ●────────────────○ [After]   ← Scrubber                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Visual Indicators

| Action | Border Color | Icon | Background |
|--------|--------------|------|------------|
| Add | `emerald-500` | `+` | `emerald-50` / `emerald-950/30` |
| Modify | `amber-500` | `~` | `amber-50` / `amber-950/30` |
| Remove | `red-500` | `-` | `red-50` / `red-950/30` |
| Existing | `zinc-200` | none | `white` / `zinc-900` |

## Animation Choreography

### Spring Physics Configuration

```typescript
// Snappy Linear-like springs
const springs = {
  snappy: { stiffness: 400, damping: 25 },
  removal: { stiffness: 500, damping: 30 },
  addition: { stiffness: 300, damping: 20 },
  settle: { stiffness: 200, damping: 15 },
}
```

### Animation Sequence (Total: ~600ms)

**Phase 1: Prepare (0-50ms)**
- Button transforms to "Merging..." with subtle pulse
- Existing cards scale down to 0.98 (anticipation)

**Phase 2: Removals (50-150ms)**
- Tasks marked for deletion dissolve out
- Scale: 1.0 → 0.9, Opacity: 1.0 → 0
- Red border flashes briefly before disappearing
- Spring: `removal` (stiffness: 500, damping: 30)

**Phase 3: Movements (150-350ms)**
- Tasks changing status slide to new column
- Path: horizontal slide with y-arc (+8px at midpoint)
- Yellow border pulses during transit
- Spring: `snappy` (stiffness: 400, damping: 25)

**Phase 4: Additions (350-500ms)**
- New tasks materialize from scale 0.8
- Scale: 0.8 → 1.0, Opacity: 0 → 1
- Green glow pulses outward (box-shadow)
- Stagger: 50ms between cards
- Spring: `addition` (stiffness: 300, damping: 20)

**Phase 5: Settle (500-600ms)**
- All action borders fade to neutral
- Button transforms to "✓ Preview Complete"
- Subtle shimmer left-to-right across cards

### Framer Motion Variants

```typescript
const taskCardVariants = {
  initial: { scale: 1, opacity: 1, x: 0, y: 0 },

  // Removal animation
  removing: {
    scale: 0.9,
    opacity: 0,
    transition: { type: 'spring', ...springs.removal }
  },

  // Movement to new column
  moving: (targetX: number) => ({
    x: targetX,
    y: [0, -8, 0], // Arc path
    transition: { type: 'spring', ...springs.snappy }
  }),

  // Addition animation
  adding: {
    scale: [0.8, 1.02, 1],
    opacity: [0, 1, 1],
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0)',
      '0 0 20px 4px rgba(16, 185, 129, 0.4)',
      '0 0 0 0 rgba(16, 185, 129, 0)',
    ],
    transition: { type: 'spring', ...springs.addition }
  },

  // Settle back to neutral
  settled: {
    scale: 1,
    borderColor: 'rgba(228, 228, 231, 1)', // zinc-200
    transition: { type: 'spring', ...springs.settle }
  }
}
```

## Interaction States

| State | Visual Behavior |
|-------|-----------------|
| Hover on proposed task | Lift (y: -2px), shadow grows, tooltip shows change details |
| Click proposed task | Expands inline showing before/after diff |
| Hover "Revert" button | Card glows red, preview shows undo |
| Drag task | Manual status adjustment (optional enhancement) |

## Timeline Scrubber

```typescript
interface FlowDiagramScrubberProps {
  progress: number // 0-1
  onChange: (progress: number) => void
  isPlaying: boolean
  onPlayPause: () => void
}
```

**Features:**
- Drag handle to scrub animation progress
- Progress interpolates all animation states
- Play/pause button for auto-playback
- Labels: "Before" (0) and "After" (1)

## Integration with ProposalDetailView

Add new tab option to existing tab system:

```typescript
// In proposal-detail-view.tsx
const [viewMode, setViewMode] = useState<'list' | 'flow' | 'timeline'>('list')

// Render flow diagram when selected
{viewMode === 'flow' && (
  <ProposalFlowDiagram
    proposalId={proposal.id}
    items={proposal.items}
    onItemClick={handleItemClick}
  />
)}
```

## State Management

```typescript
interface FlowDiagramState {
  animationPhase: 'idle' | 'preparing' | 'removing' | 'moving' | 'adding' | 'settling' | 'complete'
  scrubberProgress: number // 0-1
  isPlaying: boolean
  selectedItem: string | null
  showBefore: boolean // Toggle between before/after states
}
```

## Performance Considerations

1. **Layout calculation**: Pre-calculate target positions before animation starts
2. **Will-change**: Apply `will-change: transform, opacity` during animation
3. **Reduce motion**: Respect `prefers-reduced-motion` - skip to end state
4. **Virtualization**: For proposals with 50+ items, virtualize off-screen cards

## Accessibility

- Keyboard navigation between cards (arrow keys)
- Screen reader announces: "Task [name] will be [added/moved/removed]"
- Scrubber accessible via keyboard (left/right arrows)
- Focus management during animation completion
- Reduced motion fallback: instant state change

## Implementation Order

1. **Core component structure** - ProposalFlowDiagram with static layout
2. **Stage columns** - FlowDiagramStage with task grouping
3. **Task cards** - FlowDiagramTaskCard with action indicators
4. **Animation system** - Framer Motion variants and orchestration
5. **Scrubber** - FlowDiagramScrubber with progress interpolation
6. **Integration** - Wire into ProposalDetailView

## Testing Strategy

- Unit tests for position calculations
- Visual regression tests for animation states
- Integration test: Preview Merge → verify final state
- Accessibility audit with axe-core
- Performance test: 100 items render < 16ms

## Open Questions

1. Should we support drag-to-reorder within the flow diagram?
2. Do we want real-time collaboration (multiple users viewing same preview)?
3. Should the scrubber support speed adjustment (0.5x, 1x, 2x)?
