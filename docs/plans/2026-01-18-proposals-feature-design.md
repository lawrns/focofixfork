# Proposals Feature Design

**Date:** 2026-01-18
**Status:** Approved for Implementation
**Author:** AI-assisted design session

---

## Executive Summary

Proposals is a "parallel universe" planning system where anyone can propose changes to a project. Proposals are created via voice, text, or file upload, processed by AI into structured tasks with intelligent allocation and time estimates, and require manager approval before merging into the real project.

**Key Differentiator:** Unlike simple draft systems, Proposals shows a side-by-side timeline comparison with an impact dashboard—users see exactly how the project would change if the proposal is approved.

---

## Core Concepts

### Mental Model
- **Proposal = Draft Plan + Parallel Timeline**
- Anyone can create proposals (team members, managers, clients, AI)
- Manager approval required by default (configurable per project)
- Line-item approval with optional collaborative refinement
- Instant merge upon approval

### User Journey
1. User speaks/types/uploads their idea
2. AI parses into structured tasks, milestones, and assignments
3. AI auto-allocates based on team workload (explainable + interactive)
4. AI estimates duration with confidence levels (learns over time)
5. Proposal shows side-by-side timeline + impact dashboard
6. Manager reviews, approves/rejects line items, or starts discussion
7. Approved items instantly become real project tasks

---

## Data Model

### `proposals` Table
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'partially_approved', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('voice', 'text', 'file', 'api')),
  source_content JSONB NOT NULL DEFAULT '{}',
  base_snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_analysis JSONB DEFAULT '{}',
  approval_config JSONB DEFAULT '{"require_all_items": false, "auto_approve_threshold": null}',
  submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_workspace ON proposals(workspace_id);
CREATE INDEX idx_proposals_project ON proposals(project_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);
```

### `proposal_items` Table
```sql
CREATE TABLE proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('add', 'modify', 'remove')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'milestone', 'assignment', 'dependency')),
  entity_id UUID,
  original_state JSONB,
  proposed_state JSONB,
  ai_estimate JSONB DEFAULT '{}',
  ai_assignment JSONB DEFAULT '{}',
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'needs_discussion')),
  reviewer_notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX idx_proposal_items_status ON proposal_items(approval_status);
```

### `proposal_discussions` Table
```sql
CREATE TABLE proposal_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  item_id UUID REFERENCES proposal_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_resolution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposal_discussions_proposal ON proposal_discussions(proposal_id);
CREATE INDEX idx_proposal_discussions_item ON proposal_discussions(item_id);
```

### `proposal_impact_summary` Table
```sql
CREATE TABLE proposal_impact_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE UNIQUE,
  total_tasks_added INTEGER DEFAULT 0,
  total_tasks_modified INTEGER DEFAULT 0,
  total_tasks_removed INTEGER DEFAULT 0,
  total_hours_added DECIMAL(10,2) DEFAULT 0,
  total_hours_removed DECIMAL(10,2) DEFAULT 0,
  workload_shifts JSONB DEFAULT '[]',
  deadline_impacts JSONB DEFAULT '[]',
  resource_conflicts JSONB DEFAULT '[]',
  risk_score INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## AI Intelligence Layer

### Auto-Allocation Logic
```typescript
interface AIAssignment {
  assignee_id: string | null;
  confidence: number; // 0-1
  reasoning: string;
  alternatives: Array<{
    assignee_id: string;
    score: number;
    reason: string;
  }>;
  workload_context: {
    current_hours: number;
    capacity_hours: number;
    utilization_percent: number;
  };
}
```

**Allocation Factors:**
1. Current workload (from assigned tasks + estimates)
2. Skill match (from task keywords vs. past task types)
3. Availability (capacity_hours_per_week from workspace_members)
4. Recent similar tasks (if any historical data exists)

### Time Estimation Logic
```typescript
interface AIEstimate {
  hours: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  range: {
    optimistic: number;
    expected: number;
    pessimistic: number;
  };
  basis: 'historical' | 'benchmark' | 'ai_inference';
  comparable_tasks?: Array<{
    id: string;
    title: string;
    actual_hours: number;
  }>;
}
```

**Estimation Strategy (bootstrapping from zero data):**
1. Parse task description for complexity signals
2. Use industry benchmarks based on task type
3. Adjust for team velocity once data accumulates
4. Show confidence levels prominently

### Interactive Refinement
Users can:
- Adjust assumptions ("What if Sarah is at 50% capacity?")
- Override assignments (AI recalculates downstream impacts)
- Lock specific items (excluded from auto-recalculation)

---

## UI Components

### 1. Proposal Creation Flow

**Entry Points:**
- "New Proposal" button in project toolbar
- Voice command: "Hey FOCO, I want to propose..."
- File drop zone (accepts .txt, .md, .pdf, .docx)

**Creation Modal:**
```
┌─────────────────────────────────────────────────────────┐
│  Create Proposal                                    ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎤  Speak your idea...                         │   │
│  │      [Voice waveform visualization]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────── or ───────────────                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Type your proposal...                          │   │
│  │                                                 │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📎 Attach file                                        │
│                                                         │
│            [Cancel]  [Create & Process]                │
└─────────────────────────────────────────────────────────┘
```

### 2. Proposal Review View (Side-by-Side Timeline)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Proposal: "Add User Authentication"                    [Submit] [Discard]│
│  by John Doe • Draft • Created 2 hours ago                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────────────────────────────┐ │
│  │ IMPACT DASHBOARD   │  │ TIMELINE COMPARISON                        │ │
│  │                    │  │                                            │ │
│  │ +8 tasks           │  │  Current          If Approved              │ │
│  │ +32 hours          │  │  ────────         ───────────              │ │
│  │ 2 conflicts ⚠️     │  │                                            │ │
│  │                    │  │  Jan 20 ─┬─       Jan 20 ─┬─              │ │
│  │ ────────────────── │  │          │                │ + Auth Setup  │ │
│  │ Workload Shifts:   │  │  Jan 27 ─┼─       Jan 27 ─┼─              │ │
│  │ Sarah: 80% → 95%   │  │          │                │ + OAuth Flow  │ │
│  │ Mike: 60% → 70%    │  │  Feb 3  ─┼─       Feb 3  ─┼─              │ │
│  │                    │  │          │                │ + Testing     │ │
│  │ Deadline Risk:     │  │          ▼                ▼               │ │
│  │ Sprint 3 may slip  │  │                                            │ │
│  │ by 2 days          │  │                                            │ │
│  └────────────────────┘  └────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ PROPOSED CHANGES                                    [Expand All]    ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ ☐ + Create auth middleware      Sarah  ~4h (high) [✓][✗][💬]       ││
│  │     AI: "Assigned to Sarah because she completed 3 similar          ││
│  │     middleware tasks averaging 3.5h. She has 12h available."        ││
│  │                                                                     ││
│  │ ☐ + Implement OAuth2 flow       Mike   ~8h (med)  [✓][✗][💬]       ││
│  │     AI: "Based on industry benchmarks for OAuth integration.        ││
│  │     Mike has prior OAuth experience from Task #142."                ││
│  │                                                                     ││
│  │ ☐ + Add session management      Sarah  ~6h (med)  [✓][✗][💬]       ││
│  │     ⚠️ Warning: Sarah would be at 95% capacity                      ││
│  │     [What if I reassign this?]                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Micro-Animations (Intercom/Miro Level)

**Core Animation Principles:**
- **Purpose-driven:** Every animation communicates state change
- **Snappy:** 150-300ms durations, ease-out curves
- **Delightful:** Subtle spring physics, meaningful choreography
- **Accessible:** Respects prefers-reduced-motion

**Specific Animations:**

1. **Proposal Item Approval**
   - Checkmark: Draw-in animation (stroke-dashoffset)
   - Row: Soft green pulse → slide slight right → settle
   - Duration: 250ms

2. **Proposal Item Rejection**
   - X mark: Cross-fade with slight shake
   - Row: Soft red pulse → opacity fade to 40%
   - Duration: 200ms

3. **Impact Dashboard Updates**
   - Numbers: Counting animation with spring overshoot
   - Progress bars: Width transition with momentum
   - Conflict badges: Pop-in with scale bounce

4. **Timeline Comparison**
   - New tasks: Fade-in from left with stagger (50ms delay each)
   - Comparison view toggle: Crossfade with slight zoom
   - Date markers: Sequential reveal cascade

5. **Discussion Thread**
   - New comment: Slide-in from bottom with fade
   - Resolution badge: Confetti-style micro-burst
   - Thread collapse: Accordion with smooth height transition

6. **Processing State**
   - AI thinking: Shimmer gradient sweep
   - Progress: Indeterminate bar with glow effect
   - Completion: Checkmark morph from loading spinner

**Implementation:**
```typescript
// Use Framer Motion for complex animations
// CSS transitions for simple state changes
// Spring physics: { type: "spring", stiffness: 400, damping: 25 }

const itemApprovalVariants = {
  pending: { x: 0, backgroundColor: "transparent" },
  approved: {
    x: 4,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
  rejected: {
    opacity: 0.4,
    transition: { duration: 0.2 }
  }
};
```

---

## API Routes

### Proposals CRUD
```
POST   /api/proposals                    Create proposal
GET    /api/proposals                    List proposals (with filters)
GET    /api/proposals/:id                Get proposal with items
PATCH  /api/proposals/:id                Update proposal
DELETE /api/proposals/:id                Delete proposal
POST   /api/proposals/:id/submit         Submit for review
POST   /api/proposals/:id/merge          Merge approved items
```

### Proposal Items
```
GET    /api/proposals/:id/items          List items
PATCH  /api/proposals/:id/items/:itemId  Update item (approve/reject/edit)
POST   /api/proposals/:id/items/:itemId/discuss  Add discussion
```

### AI Operations
```
POST   /api/proposals/:id/process        Process source into items
POST   /api/proposals/:id/recalculate    Recalculate with new assumptions
GET    /api/proposals/:id/impact         Get impact summary
```

---

## State Machine

```
                    ┌──────────────┐
                    │    draft     │
                    └──────┬───────┘
                           │ submit
                           ▼
                    ┌──────────────┐
              ┌─────│pending_review│─────┐
              │     └──────────────┘     │
              │ reject_all    approve_*  │ partial
              ▼                          ▼
       ┌──────────┐              ┌───────────────┐
       │ rejected │              │partially_appr.│
       └──────────┘              └───────────────┘
                                        │
                           approve_remaining
                                        ▼
                                 ┌──────────┐
                                 │ approved │
                                 └────┬─────┘
                                      │ merge
                                      ▼
                                 ┌──────────┐
                                 │ archived │
                                 └──────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Current Sprint)
- [ ] Database migrations
- [ ] Core types and Zod schemas
- [ ] Proposal repository and service
- [ ] Basic CRUD API routes with tests
- [ ] AI proposal parser (text → structured items)

### Phase 2: UI Core
- [ ] Proposal list view with filters
- [ ] Create proposal modal (text input)
- [ ] Proposal detail view (basic)
- [ ] Line-item approval UI

### Phase 3: Intelligence
- [ ] AI auto-allocation service
- [ ] AI time estimation service
- [ ] Interactive refinement ("what-if")
- [ ] Impact summary calculation

### Phase 4: Visual Polish
- [ ] Side-by-side timeline comparison
- [ ] Impact dashboard
- [ ] Micro-animations throughout
- [ ] Discussion threads

### Phase 5: Multi-modal Input
- [ ] Voice input with transcription
- [ ] File upload processing
- [ ] Real-time processing feedback

---

## Security Considerations

- RLS policies enforce workspace/project access
- Only project managers (or configured approvers) can approve
- Proposal content sanitized before storage
- AI processing logs audited
- Rate limiting on AI-heavy endpoints

---

## Success Metrics

1. **Adoption:** % of projects using proposals
2. **Efficiency:** Time from idea to approved tasks
3. **Accuracy:** AI estimate accuracy over time
4. **Engagement:** Proposals created per user per week
5. **Approval Rate:** % of proposals approved (indicates quality)

---

## Open Questions (Resolved)

1. ~~Naming: "Branch" vs "Proposal"~~ → **Proposal**
2. ~~Approval granularity~~ → **Line-item with collaborative refinement**
3. ~~Merge behavior~~ → **Instant apply**
4. ~~AI transparency~~ → **Full explainability + interactive refinement**
