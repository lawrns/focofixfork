# CRICO: THE WORLD'S MOST ADVANCED AI-DRIVEN PRODUCTIVITY & IDE INTELLIGENCE PLATFORM

## MASTER ARCHITECTURE DOCUMENT

**Version:** 1.0  
**Status:** Implementation-Ready  
**Classification:** Strategic Foundation Document

---

## EXPLICIT ASSUMPTIONS

1. **Crico has working IDE integration** — Claude Code-style agent workflows functional
2. **Multi-model access available** — Claude, Gemini, and local models accessible
3. **Codebase indexing exists** — Vector embeddings + AST parsing operational
4. **Team of 5-10 elite engineers** — Ready to execute immediately
5. **6-month runway minimum** — Resources for full v1.0 delivery
6. **Target users are professional developers** — Not hobbyists, not beginners
7. **Primary languages: TypeScript, Python, Rust, Go** — Others secondary
8. **Database-backed applications are primary use case** — CRUD + API + UI patterns
9. **Git-based workflows assumed** — No exotic VCS support needed initially

---

## EXECUTIVE POSITIONING

### One-Sentence Mission
**Crico is the cognitive operating system that maintains perfect alignment between what developers intend, what code expresses, and what systems actually do.**

### Category Creation
Crico creates the category of **"Alignment Intelligence"** — distinct from:
- Code generation (Copilot, Cursor)
- Task management (Linear, Jira)
- Documentation (Notion, Confluence)
- Observability (Datadog, Sentry)

Crico is the **connective tissue** between all of these.

### Why Crico Exists
> "Every bug is a misalignment. Every regression is drift. Every 'it worked on my machine' is a truth gap. Crico closes these gaps continuously, not reactively."

---

## SECTION 1: THE PROBLEM SPACE — WHY DEVELOPERS ARE OVERWHELMED

### 1.1 Taxonomy of Developer Pain

#### Cognitive Pain
| Pain Type | Manifestation | Current "Solutions" | Why They Fail |
|-----------|---------------|---------------------|---------------|
| **Context Collapse** | Forgetting why code exists after 2 weeks | Comments, docs | Docs rot; comments lie |
| **Mental Model Decay** | Losing system understanding over time | Architecture diagrams | Static, never updated |
| **Decision Fatigue** | Too many micro-choices per hour | Linters, formatters | Cover syntax, not semantics |
| **Anxiety Spirals** | Fear of breaking unknown things | Test suites | Coverage ≠ confidence |
| **Ownership Ambiguity** | "Who knows how this works?" | Code owners files | Tribal, incomplete |

#### Structural Pain
| Pain Type | Manifestation | Current "Solutions" | Why They Fail |
|-----------|---------------|---------------------|---------------|
| **Schema-Code Drift** | DB column doesn't match type | ORMs, migrations | No continuous enforcement |
| **API-UI Mismatch** | Frontend expects field that doesn't exist | TypeScript | Types can lie; runtime diverges |
| **Test-Reality Gap** | Tests pass, prod breaks | CI/CD | Tests mock too much |
| **Spec-Implementation Drift** | Built wrong thing correctly | PRDs, tickets | Disconnected from code |

#### Temporal Pain
| Pain Type | Manifestation | Current "Solutions" | Why They Fail |
|-----------|---------------|---------------------|---------------|
| **Accretion Blindness** | Can't see how code evolved | Git blame | Per-line, not conceptual |
| **Refactor Paralysis** | Too risky to improve | Feature flags | Doesn't reduce fear |
| **Onboarding Cliff** | New devs take months to be productive | Wikis, pairing | Knowledge silos |

### 1.2 Why "AI Autocomplete" Is Insufficient

Current AI coding tools are **reactive generators**, not **proactive reasoners**.

**What Copilot/Cursor do:**
- Complete the line you're typing
- Generate code from prompts
- Refactor on command

**What they don't do:**
- Know if the code you're writing contradicts the database schema
- Warn that this function has no tests and touches payment logic
- Notice that three other files assume the opposite behavior
- Track that the spec says X but implementation does Y

**The Gap:** AI autocomplete is a **faster typewriter**. Crico is a **thinking partner**.

### 1.3 Why "Column Does Not Exist" Bugs Are Systemic

This class of bug reveals the fundamental failure:

```
ERROR: column "user_id" does not exist
```

**Root Causes:**
1. Migration ran in staging, not locally
2. Type definition generated from old schema
3. Code merged before migration applied
4. ORM cache stale
5. Environment variable pointed to wrong DB

**Why This Is Hard:**
- No tool connects: migration files ↔ ORM types ↔ API handlers ↔ frontend types
- Each layer has its own "source of truth"
- Verification happens at runtime, not write-time

**Crico's Answer:** Continuous cross-layer alignment verification.

### 1.4 What Developers Secretly Want (But Don't Articulate)

1. **"Tell me what I don't know I don't know"** — Surface hidden risks before they bite
2. **"Make it safe to change things"** — Confidence that refactors won't break production
3. **"Remember why we did this"** — Institutional memory that survives turnover
4. **"Don't make me ask"** — Proactive insights, not just reactive answers
5. **"Be honest about uncertainty"** — Don't fake confidence; show me risk zones

---

## SECTION 2: CRICO'S CORE DIFFERENTIATION — THE ALIGNMENT ENGINE

### 2.1 Core Concept: Alignment Over Generation

| Traditional AI Tools | Crico |
|---------------------|-------|
| Generate code from prompt | Verify code matches intent |
| Complete what you're typing | Warn when typing contradicts reality |
| Answer questions about code | Surface questions you should be asking |
| React to commands | Proactively hunt for problems |

### 2.2 The Continuous Mental Model

Crico maintains a **living graph** of:

```
┌─────────────────────────────────────────────────────────────┐
│                    CRICO ALIGNMENT GRAPH                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │   SPEC   │────▶│   CODE   │────▶│  RUNTIME │            │
│  │ (Intent) │     │ (Express)│     │ (Reality)│            │
│  └──────────┘     └──────────┘     └──────────┘            │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │   DOCS   │     │   TYPES  │     │   LOGS   │            │
│  └──────────┘     └──────────┘     └──────────┘            │
│       │                │                │                   │
│       └────────────────┼────────────────┘                   │
│                        ▼                                    │
│               ┌────────────────┐                            │
│               │ ALIGNMENT SCORE│                            │
│               │   per module   │                            │
│               └────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 What Crico Detects

#### Schema Drift
- **Signal:** Migration file adds column; TypeScript type doesn't have it
- **Detection:** AST diff between migration and generated types
- **Action:** Surface in IDE with one-click fix

#### Contract Mismatches
- **Signal:** API returns `{ userId: 123 }` but frontend expects `{ user_id: 123 }`
- **Detection:** Runtime trace analysis + type comparison
- **Action:** Highlight in both files simultaneously

#### Orphaned Logic
- **Signal:** Function exists but no call path reaches it
- **Detection:** Static call graph analysis
- **Action:** Suggest deletion or flag as "potentially dead"

#### UI Illusions vs Backend Truth
- **Signal:** Form has 10 fields; API only accepts 7
- **Detection:** Form schema extraction + API schema extraction + diff
- **Action:** List discrepancies with confidence scores

### 2.4 Reasoning About Intent, Not Just Syntax

**Traditional static analysis:** "This variable is unused"
**Crico:** "This variable was probably meant to be passed to `calculateTotal()` based on naming patterns and similar functions in this codebase"

**How:**
1. Embed all identifiers with semantic meaning
2. Build "concept clusters" (e.g., all user-related variables)
3. Detect when a concept is referenced but not connected
4. Use LLM to hypothesize intent, then verify statically

---

## SECTION 3: THE IDE AS A LIVING SYSTEM

### 3.1 Paradigm Shift: From Text Editor to Diagnostic Cockpit

The IDE must evolve from:
- **File browser** → **System map**
- **Syntax highlighter** → **Truth surface**
- **Error reporter** → **Risk radar**
- **Search tool** → **Relationship explorer**

### 3.2 Continuous Background Analysis

Crico runs these analyzers **constantly**, not on-demand:

| Analyzer | Frequency | Output |
|----------|-----------|--------|
| **Type Coherence** | On save | Mismatches flagged inline |
| **Test Coverage Reality** | Every 5 min | Heatmap overlay |
| **Schema Alignment** | On migration change | Drift warnings |
| **Dead Code Detection** | Hourly | Grayed-out suggestions |
| **Complexity Creep** | On commit | Trend indicators |
| **Dependency Freshness** | Daily | Security + staleness flags |
| **Doc Freshness** | On related code change | "Doc may be stale" markers |

### 3.3 Non-Interruptive Suggestion System

**Principle:** Never steal focus. Never block. Never nag.

**Implementation:**

```
┌─────────────────────────────────────────────────────────────┐
│  SUGGESTION PRIORITY MATRIX                                 │
├──────────────┬──────────────┬───────────────────────────────┤
│   URGENCY    │  CONFIDENCE  │  PRESENTATION                 │
├──────────────┼──────────────┼───────────────────────────────┤
│   Critical   │    High      │  Modal (blocks deploy only)   │
│   Critical   │    Medium    │  Banner + sound               │
│   High       │    High      │  Sidebar badge + inline       │
│   High       │    Medium    │  Sidebar badge only           │
│   Medium     │    High      │  Inline subtle highlight      │
│   Medium     │    Medium    │  Suggestion panel (passive)   │
│   Low        │    Any       │  Weekly digest only           │
└──────────────┴──────────────┴───────────────────────────────┘
```

### 3.4 Confidence Indicators

Every file, function, and module displays:

```
┌─────────────────────────────────────────┐
│  user-service.ts                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Stability:    ████████░░  78%          │
│  Test Reality: ██████░░░░  62%          │
│  Doc Sync:     █████████░  91%          │
│  Last Touch:   3 days ago (you)         │
│  Risk Level:   LOW                      │
└─────────────────────────────────────────┘
```

**Stability:** How often this code changes + breaks
**Test Reality:** Actual path coverage, not line coverage
**Doc Sync:** Semantic similarity between docs and implementation

### 3.5 Visual Overlays

#### Data Flow Overlay
- Show how data moves from API → service → DB
- Highlight where transformations happen
- Mark where validation occurs (or doesn't)

#### Ownership Overlay
- Color-code by team/person
- Show "knowledge concentration risk" (one person knows everything)
- Identify orphaned code (last committer left company)

#### Runtime vs Compile-Time Assumptions
- Mark code that assumes runtime values
- Highlight where types lie (e.g., `as any`, `!`)
- Show where null checks are missing but nulls are possible

### 3.6 What the IDE Should Surface Automatically

**Do This:**
1. Show alignment score when opening a file
2. Highlight lines that touch untested paths
3. Warn when editing code with high downstream impact
4. Surface related files when making changes
5. Show recent runtime errors in this code path
6. Display "other places that assume this behavior"

**Never Require User to Ask:**
- "What tests cover this?"
- "What calls this function?"
- "Is this field used in the frontend?"
- "When did this break last?"
- "Who knows how this works?"

### 3.7 Ideal IDE UX Flows

#### Flow 1: Opening a File
```
1. File opens
2. Crico overlay shows: stability, coverage, ownership
3. Subtle highlights on risky lines
4. Sidebar shows: related files, recent issues, suggestions
5. Developer has full context in <2 seconds
```

#### Flow 2: Making a Change
```
1. Developer edits function
2. Real-time: affected tests highlighted
3. Real-time: downstream consumers shown
4. On save: alignment check runs
5. If drift detected: inline warning with fix suggestion
6. Developer sees impact before committing
```

#### Flow 3: Pre-Commit
```
1. Developer initiates commit
2. Crico runs quick audit:
   - Type alignment ✓
   - Schema sync ✓
   - Test coverage Δ: -2% ⚠️
   - Doc freshness: 1 file stale ⚠️
3. Shows summary, doesn't block
4. Developer makes informed decision
```

---

## SECTION 4: MULTI-AGENT ORCHESTRATION — CRICO'S SECRET WEAPON

### 4.1 Agent Society Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CRICO AGENT ORCHESTRA                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   CONDUCTOR AGENT                    │   │
│  │  - Routes tasks to specialists                       │   │
│  │  - Resolves disagreements                            │   │
│  │  - Synthesizes final recommendations                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│       ┌────────────────────┼────────────────────┐          │
│       ▼                    ▼                    ▼          │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐       │
│  │ PLANNER │         │ AUDITOR │         │  TEST   │       │
│  │  AGENT  │         │  AGENT  │         │ AGENT   │       │
│  └─────────┘         └─────────┘         └─────────┘       │
│       │                    │                    │          │
│       ▼                    ▼                    ▼          │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐       │
│  │ SCHEMA  │         │   UX    │         │  RISK   │       │
│  │  AGENT  │         │  AGENT  │         │  AGENT  │       │
│  └─────────┘         └─────────┘         └─────────┘       │
│       │                    │                    │          │
│       └────────────────────┼────────────────────┘          │
│                            ▼                                │
│                    ┌─────────────┐                          │
│                    │   MEMORY    │                          │
│                    │   AGENT     │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Agent Roles & Responsibilities

#### Planner Agent
**Purpose:** Break complex tasks into verifiable steps
**Inputs:** User intent, codebase context, constraints
**Outputs:** Ordered task list with success criteria
**Runs When:** New feature request, refactor request, ambiguous command
**Trust Level:** High (deterministic planning, LLM for intent parsing)

#### Code Auditor Agent
**Purpose:** Continuous code quality and pattern enforcement
**Inputs:** Code changes, historical patterns, style guide
**Outputs:** Violations, suggestions, pattern drift warnings
**Runs When:** On save, on commit, on PR
**Trust Level:** High (mostly static analysis)

#### Test Architect Agent
**Purpose:** Ensure test coverage matches risk
**Inputs:** Code paths, change impact, historical failure data
**Outputs:** Missing test suggestions, test quality scores
**Runs When:** After code changes, before merges
**Trust Level:** Medium (requires LLM for test generation)

#### Schema/DB Integrity Agent
**Purpose:** Maintain database-code alignment
**Inputs:** Migration files, ORM definitions, API contracts
**Outputs:** Drift warnings, migration suggestions, type fixes
**Runs When:** Schema changes, type errors, deploy prep
**Trust Level:** High (deterministic comparison)

#### UX Coherence Agent
**Purpose:** Detect UI-backend misalignment
**Inputs:** Component props, API responses, form schemas
**Outputs:** Missing field warnings, type mismatches, dead UI paths
**Runs When:** Frontend changes, API changes
**Trust Level:** Medium (requires inference for intent)

#### Risk & Regression Agent
**Purpose:** Predict what might break
**Inputs:** Change graph, historical failures, dependency map
**Outputs:** Risk scores, regression predictions, blast radius
**Runs When:** Every commit, pre-deploy
**Trust Level:** Medium (probabilistic)

#### Documentation & Memory Agent
**Purpose:** Maintain institutional knowledge
**Inputs:** Code comments, commit messages, PR descriptions, docs
**Outputs:** Doc freshness scores, knowledge gap warnings, auto-summaries
**Runs When:** Code changes, periodic sweeps
**Trust Level:** Low for generation, High for detection

### 4.3 Cross-Checking & Hallucination Prevention

**Principle:** No single agent's output is trusted alone.

```
┌─────────────────────────────────────────────────────────────┐
│  CROSS-VALIDATION MATRIX                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LLM Output → Static Analysis Verification                  │
│  "This function is unused" → Verify with call graph         │
│                                                             │
│  Agent A Claim → Agent B Challenge                          │
│  "Tests are sufficient" → Risk Agent: "Payment path untested"│
│                                                             │
│  Suggestion → Confidence Gating                             │
│  confidence < 70% → Require human review                    │
│  confidence < 40% → Suppress entirely                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Disagreement Resolution Protocol

When agents disagree:

1. **Collect all claims** with confidence scores
2. **Identify disagreement type:**
   - Factual (verifiable) → Run deterministic check
   - Interpretive (subjective) → Surface both views to user
   - Risk-based (probabilistic) → Use historical data
3. **Escalation path:**
   - If resolvable programmatically → Auto-resolve
   - If requires judgment → Present options with tradeoffs
   - If critical + uncertain → Block and explain why

### 4.5 Trust & Confidence Scoring

Each agent output includes:

```typescript
interface AgentOutput {
  claim: string;
  confidence: number;        // 0-100
  evidence: Evidence[];      // What supports this
  methodology: string;       // How was this determined
  falsifiable: boolean;      // Can this be verified?
  verificationSteps?: string[]; // How to check
}
```

**Confidence Sources:**
- Static analysis: 90-100% (deterministic)
- Pattern matching: 70-90% (historical accuracy)
- LLM inference: 40-70% (requires verification)
- Heuristic guess: 20-40% (low confidence flag)

---

## SECTION 5: SUGGESTION HUNTING MODE

### 5.1 Philosophy

Crico doesn't wait to be asked. It **continuously hunts** for improvement opportunities and surfaces them **without overwhelming**.

**Key Insight:** Developers miss improvements not because they're incompetent, but because they lack:
- Time to audit
- Context to see patterns
- Permission to suggest changes
- Tools to verify safety of changes

### 5.2 Suggestion Taxonomy

#### Architectural Simplifications
- **Pattern:** Complex abstraction with single implementation
- **Signal:** Abstract class/interface with one concrete class
- **Suggestion:** "Consider inlining; abstraction adds no value currently"
- **Confidence:** High (static analysis)

#### Test Gaps
- **Pattern:** Critical path without test coverage
- **Signal:** Payment/auth/data-mutation code with low coverage
- **Suggestion:** "This payment flow has 12% test coverage; risk is HIGH"
- **Confidence:** High (coverage + criticality analysis)

#### Performance Risks
- **Pattern:** N+1 queries, unbounded loops, missing indexes
- **Signal:** Query patterns, loop analysis, DB schema inspection
- **Suggestion:** "This query runs once per item; consider batching"
- **Confidence:** Medium-High (requires runtime validation)

#### UX Inconsistencies
- **Pattern:** Similar components with different behaviors
- **Signal:** Component similarity analysis + behavior diff
- **Suggestion:** "These 3 modals have inconsistent close behaviors"
- **Confidence:** Medium (requires design judgment)

#### Over-Engineering
- **Pattern:** Premature optimization, unused flexibility
- **Signal:** Config options never changed, abstract factories with one product
- **Suggestion:** "This factory pattern has one product; simplify?"
- **Confidence:** Medium (requires understanding of future plans)

#### Under-Engineering
- **Pattern:** Copy-paste code, missing abstractions
- **Signal:** Code similarity analysis, repeated patterns
- **Suggestion:** "These 5 handlers share 80% code; extract?"
- **Confidence:** High (similarity is measurable)

#### Dead Code
- **Pattern:** Unreachable code, unused exports
- **Signal:** Static analysis, import graph
- **Suggestion:** "This export is never imported; consider removal"
- **Confidence:** High (deterministic)

#### Naming Drift
- **Pattern:** Same concept, different names
- **Signal:** Semantic similarity + different identifiers
- **Suggestion:** "userId, user_id, UserId used interchangeably; standardize?"
- **Confidence:** High (string analysis)

#### Concept Duplication
- **Pattern:** Same logic implemented multiple ways
- **Signal:** Semantic code similarity, AST pattern matching
- **Suggestion:** "These 2 functions compute the same thing differently"
- **Confidence:** Medium (requires semantic understanding)

### 5.3 Prioritization Logic

```
PRIORITY = (IMPACT × CONFIDENCE × FRESHNESS) / EFFORT

Where:
- IMPACT: How much improvement if fixed (1-10)
- CONFIDENCE: How sure we are this is correct (0-1)
- FRESHNESS: Recency of the code (newer = lower priority to change)
- EFFORT: Estimated fix complexity (1-10, inverted)
```

**Buckets:**
- **P0 (Fix Now):** Security, data loss, breaking production
- **P1 (This Sprint):** High impact, high confidence, low effort
- **P2 (Backlog):** Medium impact or medium confidence
- **P3 (Someday):** Low impact, nice-to-have

### 5.4 Presentation UX

#### The Suggestion Panel (Non-Modal)
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 CRICO SUGGESTIONS                          [Hide] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ HIGH PRIORITY (2)                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Payment handler lacks error boundary                 │   │
│  │ payment-service.ts:142                               │   │
│  │ Risk: User sees raw error on payment failure         │   │
│  │ [View] [Fix] [Dismiss] [Why?]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 IMPROVEMENTS (7)                                        │
│  ├─ Extract duplicate validation (3 files)                  │
│  ├─ Unused dependency: lodash.throttle                      │
│  ├─ Test gap: checkout flow (23% coverage)                  │
│  └─ [Show all...]                                           │
│                                                             │
│  📊 This Week: 4 fixed, 12 dismissed, 3 new                 │
└─────────────────────────────────────────────────────────────┘
```

#### "Why This Matters" Expansion
Each suggestion expandable to show:
- **What:** Precise description of issue
- **Where:** File, line, function
- **Why:** Impact if not fixed
- **How:** Suggested fix with preview
- **Risk:** What could go wrong with the fix
- **Evidence:** Links to similar issues that caused problems

### 5.5 Suppression & Learning

**User Actions:**
- **Fix:** Suggestion resolved, similar patterns flagged elsewhere
- **Dismiss:** Suggestion hidden for this instance
- **Dismiss Type:** All suggestions of this type suppressed
- **Disagree:** Feedback loop, reduces confidence for similar suggestions

**Learning Loop:**
```
User dismisses "extract duplicate code" for test files
→ Crico learns: "Duplication in test files is often intentional"
→ Future: Lower confidence for test file duplication suggestions
```

**Decay:**
- Dismissed suggestions resurface after 90 days if code changes
- Snoozed suggestions return after specified time
- "Disagree" feedback decays over 6 months unless reinforced

---

## SECTION 6: ALIGNMENT & DRIFT DETECTION SYSTEMS

### 6.1 The Four Alignment Axes

```
┌─────────────────────────────────────────────────────────────┐
│                  CRICO ALIGNMENT AXES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AXIS 1: UI ↔ API ↔ DB                                     │
│  ─────────────────────                                      │
│  Form fields match API params match DB columns              │
│                                                             │
│  AXIS 2: SPEC ↔ IMPLEMENTATION                              │
│  ───────────────────────────                                │
│  What was requested matches what was built                  │
│                                                             │
│  AXIS 3: TEST ↔ BEHAVIOR                                    │
│  ──────────────────────                                     │
│  Tests verify actual behavior, not imagined behavior        │
│                                                             │
│  AXIS 4: DOCS ↔ REALITY                                     │
│  ───────────────────────                                    │
│  Documentation describes current system, not past/future    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 UI ↔ API ↔ DB Alignment

#### Detection Mechanisms

**Schema Extraction:**
```typescript
// Crico extracts schemas from all layers
const dbSchema = await extractFromMigrations('./migrations/');
const apiSchema = await extractFromOpenAPI('./api/openapi.yaml');
const uiSchema = await extractFromReactForms('./components/**/*.tsx');

// Diff across layers
const mismatches = diffSchemas(dbSchema, apiSchema, uiSchema);
```

**Mismatch Types:**
| Type | Example | Severity |
|------|---------|----------|
| Missing Field | UI has `middleName`, API doesn't accept it | HIGH |
| Type Mismatch | DB: `integer`, API: `string` | CRITICAL |
| Nullable Drift | DB: `NOT NULL`, UI: optional field | HIGH |
| Enum Drift | DB: 3 values, UI: 5 values | MEDIUM |
| Naming Inconsistency | DB: `user_id`, API: `userId` | LOW |

**Action on Detection:**
1. Inline warning in all affected files
2. Suggest migration, type update, or UI fix
3. Pre-deploy gate if CRITICAL

#### Continuous Enforcement

```
On file save:
  If file is migration → Run full schema alignment check
  If file is API handler → Check against DB + UI
  If file is React component → Check against API schema

On git commit:
  Block if CRITICAL alignment issues exist
  Warn if HIGH alignment issues exist
```

### 6.3 Spec ↔ Implementation Alignment

#### The Spec Graph

Crico maintains links between:
- **Ticket/Issue** → **PR/Commits** → **Code** → **Tests**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   TICKET    │───▶│   COMMIT    │───▶│    CODE     │
│  "Add auth" │    │ "impl auth" │    │ auth.ts     │
└─────────────┘    └─────────────┘    └─────────────┘
      │                                      │
      ▼                                      ▼
┌─────────────┐                        ┌─────────────┐
│ ACCEPTANCE  │─ ─ ─ ─ ─ verify ─ ─ ─ ▶│   TESTS     │
│  CRITERIA   │                        │ auth.test.ts│
└─────────────┘                        └─────────────┘
```

#### Drift Detection

**Semantic Comparison:**
```
Spec says: "User can reset password via email"
Implementation does: "User can reset password via email OR SMS"

Drift detected: Implementation exceeds spec
Action: Flag for spec update or implementation trim
```

**Coverage Mapping:**
- Extract acceptance criteria from tickets (LLM-assisted)
- Map criteria to test assertions
- Identify untested criteria
- Identify tests without corresponding criteria

### 6.4 Test ↔ Behavior Alignment

#### The Test Reality Problem

**False Confidence Sources:**
1. Tests mock the thing they should test
2. Tests pass with wrong assertions
3. Tests cover lines but not behaviors
4. Tests are flaky but marked as passing

#### Crico's Test Analysis

**Mock Depth Analysis:**
```typescript
// Flag tests that mock too deeply
function analyzeTestMocks(testFile: string): MockAnalysis {
  const mocks = extractMocks(testFile);
  const realCode = mocks.filter(m => !m.isMocked);
  
  if (realCode.length / mocks.length < 0.3) {
    return { warning: "Test mocks 70%+ of dependencies; low reality" };
  }
}
```

**Assertion Quality:**
```
WEAK: expect(result).toBeDefined()
WEAK: expect(result.length).toBeGreaterThan(0)
STRONG: expect(result).toEqual({ id: 1, name: 'Test User' })
STRONG: expect(service.save).toHaveBeenCalledWith(expectedPayload)
```

**Behavior Coverage (not Line Coverage):**
```
Lines covered: 94%
Behaviors covered:
  ✓ Happy path: login success
  ✓ Error path: invalid password
  ✗ Edge case: expired token
  ✗ Edge case: concurrent sessions
  
Reality score: 65%
```

### 6.5 Docs ↔ Reality Alignment

#### Documentation Freshness Score

```typescript
interface DocFreshness {
  file: string;
  lastDocUpdate: Date;
  lastCodeUpdate: Date;
  semanticDrift: number;  // 0-1, how different doc is from code
  staleScore: number;     // 0-100, higher = more stale
}
```

**Semantic Drift Detection:**
1. Extract concepts from documentation (LLM)
2. Extract concepts from related code (AST + LLM)
3. Compare concept sets
4. Flag divergence > threshold

**Example:**
```
README says: "Supports PostgreSQL and MySQL"
Code: Only PostgreSQL driver imported

Drift: Documentation claims unsupported feature
Action: Update README or implement MySQL support
```

### 6.6 Migration Safety System

#### Pre-Migration Checks

Before any schema change:

1. **Impact Analysis**
   - Which models affected?
   - Which API endpoints affected?
   - Which UI components affected?

2. **Backwards Compatibility**
   - Can old code work with new schema?
   - Is migration reversible?
   - What's the rollback plan?

3. **Data Safety**
   - Does migration touch existing data?
   - Is there data loss risk?
   - Has backup been verified?

#### Migration Workflow

```
1. Developer creates migration
2. Crico analyzes impact
3. Shows affected files with required changes
4. Generates type updates automatically
5. Runs alignment check
6. Developer reviews and approves
7. Migration applies to test DB
8. Integration tests run
9. Crico verifies alignment post-migration
10. Ready for staging deploy
```

### 6.7 Pre-Deploy & Post-Deploy Alignment

#### Pre-Deploy Gates

```
┌─────────────────────────────────────────────────────────────┐
│  DEPLOY READINESS CHECK                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ All tests passing                                        │
│  ✓ No type errors                                           │
│  ✓ Schema alignment: 100%                                   │
│  ⚠️ Doc freshness: 3 files stale (non-blocking)             │
│  ✓ No CRITICAL suggestions pending                          │
│  ✓ Migrations verified on staging                           │
│                                                             │
│  DECISION: READY TO DEPLOY                                  │
│  [Deploy] [Review Warnings] [Cancel]                        │
└─────────────────────────────────────────────────────────────┘
```

#### Post-Deploy Monitoring

After deploy, Crico watches for:
- New error types in logs
- API response shape changes
- Performance regression
- User-reported issues matching code changes

If regression detected:
```
Alert: New 500 errors in /api/users endpoint
Likely cause: Commit abc123 changed response shape
Suggested action: Rollback or hotfix
Confidence: 78%
```

### 6.8 Single Source of Truth Mechanics

**Principle:** Every fact should be defined once and derived everywhere else.

**Implementation:**

| Truth | Source | Derived Artifacts |
|-------|--------|-------------------|
| DB Schema | Migration files | ORM types, API types, form schemas |
| API Contract | OpenAPI spec | Client SDKs, mock servers, docs |
| Business Rules | Rule engine config | Validation logic, UI constraints |
| Feature Flags | Flag service | Conditional UI, API behavior |

**Crico's Role:**
- Detect when derived artifacts diverge from source
- Auto-generate derived artifacts when possible
- Warn when manual duplication is detected

---

## SECTION 7: AI STRATEGY — NO SELF-DECEPTION

### 7.1 The AI Routing Principle

**Rule:** Use LLMs where they excel; use deterministic logic where it's sufficient.

```
┌─────────────────────────────────────────────────────────────┐
│              AI ROUTING DECISION TREE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Is the task...                                             │
│                                                             │
│  Deterministic?                                             │
│  ├─ YES → Use static analysis / AST / regex                 │
│  └─ NO ↓                                                    │
│                                                             │
│  Requires semantic understanding?                           │
│  ├─ YES → Use LLM with verification                         │
│  └─ NO ↓                                                    │
│                                                             │
│  Pattern matching sufficient?                               │
│  ├─ YES → Use embeddings + similarity                       │
│  └─ NO ↓                                                    │
│                                                             │
│  Requires creativity/generation?                            │
│  ├─ YES → Use LLM with human review                         │
│  └─ NO → Probably shouldn't use AI at all                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Where Deterministic Logic Beats LLMs

| Task | Why Deterministic Wins |
|------|------------------------|
| Type checking | 100% accuracy required |
| Import resolution | Exact path matching |
| Syntax validation | Grammar is deterministic |
| Call graph analysis | AST traversal is exact |
| Dead code detection | Reachability is provable |
| Rename refactoring | Token matching, not understanding |
| Dependency analysis | Package.json parsing |

**Do This:**
- Use TypeScript compiler for type analysis
- Use ESLint/Biome for style enforcement
- Use tree-sitter for AST operations
- Use ripgrep for text search

**Don't Do This:**
- Use LLM to check types (it will hallucinate)
- Use LLM to find unused imports (it will miss some)
- Use LLM for regex matching (it's slower and less accurate)

### 7.3 Where LLMs Add Leverage

| Task | Why LLM Helps |
|------|---------------|
| Intent parsing | "Make this faster" → specific optimizations |
| Code explanation | Summarize complex logic |
| Test generation | Create meaningful test cases |
| Doc generation | Write human-readable descriptions |
| Pattern detection | "This looks like an anti-pattern" |
| Semantic search | "Find code that handles payments" |
| Fix suggestion | "This error probably means X" |

**Always Pair With:**
- Static verification of LLM output
- Confidence scoring
- Human review for critical changes

### 7.4 Where LLMs Are Dangerous

| Task | Risk | Mitigation |
|------|------|------------|
| Code generation | Introduces bugs | Always run tests |
| Security analysis | Misses vulnerabilities | Combine with SAST tools |
| Performance claims | Unfounded optimism | Benchmark everything |
| Refactoring | Breaks behavior | Require test coverage |
| Migration generation | Data loss | Dry-run on copy of prod |

**Red Lines (Never Trust LLM Alone):**
- Deleting production data
- Security-critical code changes
- Financial calculations
- Authentication/authorization logic
- Encryption key handling

### 7.5 Tool-Calling Architecture

```typescript
interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  validation: ValidationRule[];
  fallback: () => void;
  timeout: number;
}

const toolRegistry: Tool[] = [
  {
    name: 'read_file',
    description: 'Read file contents',
    parameters: { path: 'string' },
    execute: async (args) => fs.readFile(args.path),
    validation: [{ rule: 'path_exists', message: 'File not found' }]
  },
  {
    name: 'run_tests',
    description: 'Execute test suite',
    parameters: { pattern: 'string?' },
    execute: async (args) => exec(`npm test ${args.pattern || ''}`),
    validation: [{ rule: 'no_prod_env', message: 'Cannot run tests in prod' }]
  },
  // ... more tools
];
```

**Tool Safety Rules:**
1. All file writes require explicit confirmation
2. All external API calls are logged
3. No tool can delete without soft-delete first
4. All tools have timeout limits
5. All tools have rate limits

### 7.6 Memory & Summarization Strategy

**Short-Term Memory (Session):**
- Current file context
- Recent changes
- Active task
- Conversation history (last 20 turns)

**Medium-Term Memory (Project):**
- Codebase embeddings
- Learned patterns
- User preferences
- Suppressed suggestions

**Long-Term Memory (Persistent):**
- Architectural decisions
- Known issues
- Historical failures
- Team conventions

**Summarization Triggers:**
- Conversation > 10 turns → Summarize and compress
- Session idle > 30 min → Persist key learnings
- Project switch → Save context, load new context

### 7.7 Prompt Discipline

**Prompt Archetypes:**

1. **Analysis Prompt**
```
Given this code:
{code}

Identify potential issues in these categories:
- Type safety
- Error handling
- Performance
- Security

For each issue, provide:
- Location (file:line)
- Description (1 sentence)
- Severity (low/medium/high/critical)
- Suggested fix (code snippet if applicable)
- Confidence (0-100)
```

2. **Generation Prompt**
```
Generate a unit test for this function:
{function_code}

Requirements:
- Test happy path
- Test at least 2 edge cases
- Use existing test patterns from this codebase
- Include setup and teardown if needed
- Use these testing libraries: {test_libs}

Do not:
- Mock database calls unnecessarily
- Use any/unknown types
- Skip error case testing
```

3. **Explanation Prompt**
```
Explain this code to a developer unfamiliar with this codebase:
{code}

Provide:
- One sentence summary
- Key concepts involved
- Dependencies on other parts of the codebase
- Potential gotchas

Keep explanation under 200 words.
```

### 7.8 Cost Controls

**Token Budget per Operation:**
| Operation | Max Tokens | Model |
|-----------|------------|-------|
| Quick analysis | 1,000 | Claude Haiku |
| Code generation | 4,000 | Claude Sonnet |
| Complex reasoning | 8,000 | Claude Opus |
| Batch processing | 500/item | Haiku |

**Cost Optimization:**
- Cache embeddings (don't re-embed unchanged files)
- Batch similar requests
- Use cheaper models for simple tasks
- Rate limit expensive operations

### 7.9 Confidence Gating

```typescript
function shouldSurfaceSuggestion(
  suggestion: Suggestion
): { show: boolean; mode: 'auto' | 'review' | 'suppress' } {
  
  if (suggestion.confidence >= 90) {
    return { show: true, mode: 'auto' };
  }
  
  if (suggestion.confidence >= 70) {
    return { show: true, mode: 'review' };
  }
  
  if (suggestion.confidence >= 40 && suggestion.severity === 'critical') {
    return { show: true, mode: 'review' };
  }
  
  return { show: false, mode: 'suppress' };
}
```

### 7.10 Guardrails & Refusal Rules

**Crico Must Refuse To:**
1. Execute code without sandbox in production environment
2. Delete files without explicit confirmation
3. Push to protected branches
4. Modify security-critical code without tests
5. Claim certainty when uncertain
6. Hide uncertainty behind confident language

**Refusal Template:**
```
I cannot {action} because {reason}.

What I can do instead:
- {alternative_1}
- {alternative_2}

Would you like me to proceed with one of these alternatives?
```

---

## SECTION 8: COLLABORATION WITHOUT CHAOS

### 8.1 Scaling Model: Solo → Small Team → Large Team

```
┌─────────────────────────────────────────────────────────────┐
│              CRICO SCALING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SOLO DEVELOPER                                             │
│  ───────────────                                            │
│  • Personal context only                                    │
│  • Local analysis                                           │
│  • No permission model                                      │
│  • Suggestions optimized for speed                          │
│                                                             │
│  SMALL TEAM (2-10)                                          │
│  ─────────────────                                          │
│  • Shared codebase context                                  │
│  • Ownership mapping                                        │
│  • Async awareness (who's working on what)                  │
│  • Team conventions learned                                 │
│                                                             │
│  LARGE TEAM (10-100)                                        │
│  ──────────────────                                         │
│  • Domain boundaries                                        │
│  • Cross-team impact analysis                               │
│  • Governance workflows                                     │
│  • Institutional memory preservation                        │
│                                                             │
│  ENTERPRISE (100+)                                          │
│  ─────────────────                                          │
│  • Multi-repo coherence                                     │
│  • Compliance & audit trails                                │
│  • Role-based intelligence                                  │
│  • Central policy enforcement                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Shared Understanding Mechanics

#### The Living Architecture Map

```typescript
interface ArchitectureMap {
  domains: Domain[];
  owners: Map<Domain, Team>;
  dependencies: DependencyGraph;
  conventions: Convention[];
  decisions: ArchitecturalDecision[];
}

interface Domain {
  name: string;
  paths: string[];
  publicApi: Symbol[];
  internalApi: Symbol[];
  healthMetrics: HealthMetrics;
}
```

**Auto-Discovery:**
- Crico infers domain boundaries from directory structure
- Learns ownership from commit patterns
- Identifies implicit conventions from code patterns
- Surfaces undocumented architectural decisions

#### Concept Dictionary

```
┌─────────────────────────────────────────────────────────────┐
│  CRICO CONCEPT DICTIONARY                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "User" means:                                              │
│  • DB: users table (id, email, name, created_at)            │
│  • API: UserDTO (id, email, displayName)                    │
│  • UI: UserProfile component                                │
│  • Tests: createTestUser() factory                          │
│                                                             │
│  "Order" means:                                             │
│  • DB: orders table + order_items table                     │
│  • API: OrderWithItems aggregate                            │
│  • UI: OrderCard, OrderDetail, OrderList                    │
│  • State: useOrder hook, orderSlice                         │
│                                                             │
│  [Auto-generated from codebase analysis]                    │
│  [Last updated: 2 hours ago]                                │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Ownership Clarity

#### Ownership Model

```typescript
interface OwnershipRecord {
  path: string;                    // File or directory
  primaryOwner: Person | Team;     // Who's responsible
  secondaryOwners: (Person | Team)[];
  lastActiveContributor: Person;
  expertiseScore: number;          // 0-100, based on contribution depth
  orphanRisk: boolean;             // True if owner left/inactive
}
```

#### Ownership Signals

| Signal | Weight | Source |
|--------|--------|--------|
| CODEOWNERS file | High | Explicit declaration |
| Recent commits | Medium | Git history |
| PR reviews | Medium | Review patterns |
| Issue assignment | Low | Issue tracker |
| Code expertise | High | Complexity of contributions |

#### Orphan Detection

```
WARNING: Orphaned Code Detected
─────────────────────────────────

File: src/legacy/payment-processor.ts
Last meaningful commit: 8 months ago
Original author: [left company]
Primary reviewer: [left company]

Risk: No current team member has deep knowledge
Suggestion: Assign ownership or document heavily
```

### 8.4 Async Collaboration Awareness

#### Real-Time Activity Surface

```
┌─────────────────────────────────────────────────────────────┐
│  TEAM ACTIVITY (Live)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 Alice is editing: src/components/Checkout.tsx           │
│     └─ Related to: TICKET-123 (Checkout redesign)           │
│                                                             │
│  🟢 Bob is editing: src/api/orders.ts                       │
│     └─ Related to: TICKET-456 (Order validation)            │
│     ⚠️ POTENTIAL CONFLICT with your changes                 │
│                                                             │
│  🟡 Carol was editing: src/utils/formatters.ts (idle 30m)   │
│                                                             │
│  Recent merges:                                             │
│  • TICKET-789: User preferences (Dave, 2h ago)              │
│  • TICKET-012: Bug fix auth (Eve, 5h ago)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Conflict Prevention

```typescript
interface ConflictRisk {
  files: string[];
  users: string[];
  probability: number;     // 0-1
  type: 'merge_conflict' | 'semantic_conflict' | 'behavioral_conflict';
  suggestion: string;
}

// Example detection
{
  files: ['src/api/orders.ts'],
  users: ['You', 'Bob'],
  probability: 0.7,
  type: 'semantic_conflict',
  suggestion: 'Bob is adding validation; coordinate to avoid duplicate logic'
}
```

### 8.5 Onboarding Without Tribal Knowledge Loss

#### The Codebase Tour

New developer experience:

```
┌─────────────────────────────────────────────────────────────┐
│  WELCOME TO PROJECT-X                                       │
│  Your personalized onboarding path                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📚 UNDERSTANDING THE SYSTEM (Est: 2 hours)                 │
│  ├─ [x] Architecture overview (auto-generated)              │
│  ├─ [x] Key concepts and where they live                    │
│  ├─ [ ] Data flow: User request → Response                  │
│  └─ [ ] Common patterns in this codebase                    │
│                                                             │
│  🔧 YOUR FIRST TASK (Est: 4 hours)                          │
│  ├─ [ ] Set up local environment                            │
│  ├─ [ ] Run tests and understand test patterns              │
│  ├─ [ ] Complete guided fix: TICKET-ONBOARD-1               │
│  └─ [ ] Submit first PR with Crico assistance               │
│                                                             │
│  📍 AREAS YOU'LL WORK IN                                    │
│  Based on your team assignment:                             │
│  • src/features/checkout/ - Primary                         │
│  • src/api/orders/ - Secondary                              │
│  • src/components/ui/ - Shared                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Knowledge Capture

Every time an expert explains something:

```
Crico notices: You asked Bob about payment retry logic
Bob's explanation captured and linked to:
  → src/services/payment/retry.ts
  → docs/payment-retry.md (auto-generated)

Future developers asking similar questions will see this context.
```

### 8.6 Collaboration Primitives

#### Code Pointers

```typescript
// @crico:pointer This is the entry point for all auth flows
// @crico:decision Using JWT because of X, Y, Z (see ADR-003)
// @crico:warning This is sensitive - get security review before changing
// @crico:todo Refactor when we migrate to new auth system
```

These are indexed, searchable, and surfaced contextually.

#### Team Insights Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  TEAM HEALTH DASHBOARD                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CODE HEALTH                                                │
│  ├─ Overall alignment score: 87%                            │
│  ├─ Test coverage trend: ↑ 2% this week                     │
│  ├─ Tech debt backlog: 23 items (3 critical)                │
│  └─ Recent regressions: 1 (fixed)                           │
│                                                             │
│  TEAM DYNAMICS                                              │
│  ├─ Knowledge distribution: ⚠️ 3 single-point-of-failures   │
│  ├─ Review turnaround: 4.2 hours avg                        │
│  ├─ Conflict rate: Low (2 this week)                        │
│  └─ Onboarding progress: 1 new member (Day 3)               │
│                                                             │
│  SUGGESTIONS FOR TEAM                                       │
│  ├─ Schedule knowledge transfer for payment module          │
│  ├─ Consider breaking up auth.ts (2500 lines)               │
│  └─ 5 tests are flaky - fix before they erode trust         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.7 Permission & Trust Models

#### Intelligence Access Levels

| Level | Can See | Can Suggest | Can Auto-Apply |
|-------|---------|-------------|----------------|
| Viewer | Code structure, docs | Nothing | Nothing |
| Contributor | Full analysis | Personal files | Nothing |
| Maintainer | Full analysis | All files | Style fixes |
| Admin | Full analysis + team | All files | Approved patterns |

#### Audit Trail

All Crico actions logged:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "alice@company.com",
  "action": "auto_fix",
  "target": "src/utils/format.ts",
  "change": "Fixed unused import",
  "confidence": 95,
  "reversible": true
}
```

---

## SECTION 9: QUALITY, TRUST & FAILURE MODES

### 9.1 Enumeration of Failure Modes

#### Category 1: False Confidence

| Failure | Example | Impact | Mitigation |
|---------|---------|--------|------------|
| Wrong suggestion applied | "Remove unused function" that was actually used via reflection | Production bug | Static + dynamic analysis combination |
| Missed critical issue | Security vulnerability not detected | Security breach | Multi-layered scanning, never claim completeness |
| Overconfident refactor | "Safe" refactor breaks edge case | Regression | Require test coverage before refactoring |

#### Category 2: Developer Complacency

| Failure | Example | Impact | Mitigation |
|---------|---------|--------|------------|
| Blind trust | Developer accepts all suggestions without review | Quality decay | Require confirmation for non-trivial changes |
| Skill atrophy | Developer stops understanding code | Long-term capability loss | Explain suggestions, require understanding |
| Ownership diffusion | "Crico did it, not me" | Accountability loss | Clear attribution, human remains responsible |

#### Category 3: System Failures

| Failure | Example | Impact | Mitigation |
|---------|---------|--------|------------|
| Analysis crash | Crico fails silently on large file | Missed issues | Health monitoring, fallback to basic analysis |
| Stale index | Embeddings not updated after changes | Wrong suggestions | Incremental indexing, staleness detection |
| Model degradation | LLM quality drops over time | Reduced effectiveness | Continuous evaluation, model versioning |

#### Category 4: Security Risks

| Failure | Example | Impact | Mitigation |
|---------|---------|--------|------------|
| Secret exposure | API key in suggestion | Security breach | Secret scanning, never log full code |
| Prompt injection | Malicious code tricks analysis | Wrong actions | Input sanitization, sandboxed execution |
| Data leakage | Code sent to external LLM | IP theft | On-prem option, data classification |

### 9.2 Red Lines (Absolute Boundaries)

**Crico will NEVER:**

1. **Auto-apply changes to production systems**
   - Even with 100% confidence
   - Even if user requests it
   - Production requires human approval

2. **Delete data without recovery option**
   - All deletions are soft-delete first
   - 30-day recovery window minimum
   - Explicit confirmation required

3. **Override security controls**
   - Cannot bypass authentication
   - Cannot disable security features
   - Cannot suppress security warnings

4. **Claim certainty about uncertainty**
   - Must express confidence levels honestly
   - Must surface "I don't know" when true
   - Must distinguish verified vs. inferred

5. **Learn from one user's code to suggest to another**
   - Unless explicitly shared
   - Privacy boundaries are absolute
   - Cross-pollination requires consent

### 9.3 Safety Principles

#### Principle 1: Reversibility First
Every action Crico takes must be reversible.
- Git commits can be reverted
- File changes are tracked
- Database changes use transactions
- No irreversible operations without explicit confirmation

#### Principle 2: Transparency Always
Crico must explain what it's doing and why.
- No hidden analysis
- No unexplained suggestions
- Full audit trail
- Methodology visible on demand

#### Principle 3: Human Authority
Humans have final say, always.
- Crico suggests, humans decide
- Override is always possible
- No enforcement without consent
- Clear escalation path

#### Principle 4: Fail Safe, Not Fail Silent
When Crico encounters errors:
- Surface the error clearly
- Explain what failed
- Suggest remediation
- Never hide failures

#### Principle 5: Minimal Footprint
Crico operates with least privilege.
- Read-only by default
- Write only when instructed
- No network calls without consent
- Minimal data retention

### 9.4 "Say Nothing Rather Than Say This" Cases

**Crico should remain silent rather than:**

1. **Guess at intent when truly ambiguous**
   - Wrong: "I think you meant to add error handling here"
   - Right: [No suggestion] or "This code path has no error handling - intentional?"

2. **Suggest changes based on personal preference**
   - Wrong: "You should use tabs instead of spaces"
   - Right: Only enforce if team has explicit convention

3. **Offer low-confidence security advice**
   - Wrong: "This might be a SQL injection vulnerability"
   - Right: Use SAST tool first, then surface verified issues

4. **Comment on code aesthetics**
   - Wrong: "This function is ugly"
   - Right: Suggest concrete improvements if objective issues exist

5. **Predict business outcomes**
   - Wrong: "Users will love this feature"
   - Right: Focus on technical quality, not product judgment

### 9.5 Trust Calibration

#### Building Trust (New Users)

```
Week 1: Conservative mode
  - Only high-confidence suggestions
  - No auto-apply
  - Verbose explanations
  - Frequent confirmation requests

Week 2-4: Learning mode
  - Track user agreement/disagreement
  - Adjust confidence thresholds
  - Learn personal preferences
  - Expand suggestion types

Month 2+: Calibrated mode
  - Personalized confidence thresholds
  - Auto-apply for patterns user always accepts
  - Minimal friction for trusted patterns
  - Still cautious for new pattern types
```

#### Trust Decay

If Crico makes mistakes:
- Confidence threshold increases for that category
- User notified of accuracy adjustment
- Suggestion type moved back to "review required"
- Recovery path: prove accuracy over time

---

## SECTION 10: THE ROADMAP TO "WORLD'S BEST"

### 10.1 Guiding Principles for Roadmap

1. **Value before features** — Ship what helps users today
2. **Foundation before scale** — Get architecture right early
3. **Feedback before perfection** — Learn from real usage
4. **Safety before speed** — Never compromise on trust

### 10.2 Phase 1: Foundation (Days 0-30)

#### MUST BUILD

| Feature | Why Critical | Success Metric |
|---------|--------------|----------------|
| **Core indexing** | Everything depends on code understanding | Index 100k LOC in <60s |
| **Basic alignment check** | Core value proposition | Detect 90% of type mismatches |
| **IDE integration (VSCode)** | Primary interface | <100ms latency for inline hints |
| **Simple suggestion panel** | User sees value immediately | First suggestion in <5 min of use |
| **Confidence scoring** | Trust foundation | Accuracy > 85% for high-confidence |

#### MUST KILL

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Feature creep | Foundation must be solid |
| Multiple IDE support | Focus on one, perfect it |
| Team features | Solo first, team later |
| Auto-fix | Too risky without trust |

#### MUST DELAY

| Feature | Why Delay |
|---------|-----------|
| Multi-agent orchestration | Need basic agents working first |
| Post-deploy monitoring | Need deploy integration first |
| Enterprise features | Need product-market fit first |

#### UNLOCKS NEXT PHASE

- Proven value for solo developers
- <100ms suggestion latency
- >85% suggestion acceptance rate

### 10.3 Phase 2: Intelligence (Days 31-90)

#### MUST BUILD

| Feature | Why Now | Success Metric |
|---------|---------|----------------|
| **Full alignment engine** | Core differentiation | Detect UI/API/DB drift in real-time |
| **Suggestion hunting mode** | Proactive value | 10+ valuable suggestions per day |
| **Schema drift detection** | Prevents production bugs | Zero "column not found" errors |
| **Test reality scoring** | Honest test quality | Correlate with actual bug rate |
| **Multi-agent foundation** | Enable specialization | 3 agents working in concert |

#### MUST KILL

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Notification spam | Users will disable entirely |
| LLM for everything | Expensive, slow, inaccurate |
| Complex configuration | Friction kills adoption |

#### MUST DELAY

| Feature | Why Delay |
|---------|-----------|
| Auto-fix | Need trust established |
| Team dashboard | Need multi-user infrastructure |
| Custom rule engine | Need to learn common patterns |

#### UNLOCKS NEXT PHASE

- Demonstrated ROI (bugs prevented)
- User retention >80% after 30 days
- Suggestion quality validated

### 10.4 Phase 3: Automation (Days 91-180)

#### MUST BUILD

| Feature | Why Now | Success Metric |
|---------|---------|----------------|
| **Safe auto-fix** | Reduce friction for trusted patterns | 50% of fixes applied automatically |
| **Pre-commit gates** | Prevent issues before they merge | <30s commit-time check |
| **Migration safety** | Critical for production safety | Zero migration-related incidents |
| **Team collaboration** | Scale beyond solo | Team adoption >50% |
| **Learning from feedback** | Continuous improvement | Suggestion accuracy +10% |

#### MUST KILL

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Blocking workflows | Users will bypass |
| Overconfident auto-fix | One bad fix destroys trust |
| Team features without privacy | Enterprise won't adopt |

#### MUST DELAY

| Feature | Why Delay |
|---------|-----------|
| Multi-repo | Need single-repo solid |
| Enterprise SSO | Need team tier first |
| Custom agent creation | Need agent framework proven |

#### UNLOCKS NEXT PHASE

- Team adoption validated
- Auto-fix trust established
- Revenue model proven (team tier)

### 10.5 Phase 4: Scale (Days 181-365)

#### MUST BUILD

| Feature | Why Now | Success Metric |
|---------|---------|----------------|
| **Multi-repo coherence** | Enterprise requirement | Cross-repo drift detection |
| **Enterprise features** | Revenue scaling | SOC2, SSO, audit logs |
| **Custom agent SDK** | Platform extensibility | 10+ community agents |
| **Post-deploy monitoring** | Full lifecycle coverage | Regression detection <5 min |
| **Institutional memory** | Long-term value | Onboarding time -50% |

#### MUST KILL

| Anti-Pattern | Why Dangerous |
|--------------|---------------|
| Feature bloat | Complexity kills |
| Abandoning core | Foundation must stay solid |
| Enterprise-only focus | Lose developer love |

#### MUST DELAY (Beyond Year 1)

| Feature | Why Delay |
|---------|-----------|
| Multi-language parity | Perfect core languages first |
| Non-IDE interfaces | IDE is primary |
| Acquisition features | Organic growth first |

### 10.6 Success Metrics by Phase

```
┌─────────────────────────────────────────────────────────────┐
│              CRICO SUCCESS METRICS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1 (Day 30)                                           │
│  ├─ Active users: 100                                       │
│  ├─ Suggestions accepted: >70%                              │
│  ├─ P0 bugs in Crico: 0                                     │
│  └─ User NPS: >50                                           │
│                                                             │
│  PHASE 2 (Day 90)                                           │
│  ├─ Active users: 1,000                                     │
│  ├─ Bugs prevented (tracked): 500+                          │
│  ├─ Suggestion accuracy: >85%                               │
│  └─ Daily active usage: >60%                                │
│                                                             │
│  PHASE 3 (Day 180)                                          │
│  ├─ Active users: 5,000                                     │
│  ├─ Teams using: 50+                                        │
│  ├─ Auto-fix acceptance: >90%                               │
│  └─ Paying customers: 10+                                   │
│                                                             │
│  PHASE 4 (Day 365)                                          │
│  ├─ Active users: 25,000                                    │
│  ├─ Enterprise customers: 5+                                │
│  ├─ Community agents: 10+                                   │
│  └─ Revenue: $1M ARR                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.7 Risk Mitigation per Phase

| Phase | Primary Risk | Mitigation |
|-------|--------------|------------|
| 1 | Technical foundation weak | Over-invest in core architecture |
| 2 | Suggestions too noisy | Aggressive confidence gating |
| 3 | Team features too complex | Start with simplest team model |
| 4 | Enterprise distraction | Maintain developer focus |

---

## SECTION 11: THE ACTION & VOICE CONTROL PLANE

### 11.1 The Missing Layer: Action Authority

Crico has analysis, suggestions, tools, and guardrails. What it needs is a **unified, auditable, voice-invokable Action Execution Layer**.

This is what transforms Crico from an advisor into a **governed execution intelligence**.

### 11.2 Canonical Action Interface

**Every action in Crico — from any source — flows through this interface:**

```typescript
interface CricoAction {
  id: string;
  source: 'voice' | 'ide' | 'ui' | 'api' | 'agent' | 'scheduled';
  intent: string;
  
  // Authority classification
  authorityLevel: 'read' | 'write' | 'structural' | 'destructive';
  scope: 'code' | 'db' | 'tasks' | 'deploy' | 'config' | 'system';
  
  // Execution plan
  steps: ActionStep[];
  dependencies: string[];  // Other action IDs that must complete first
  
  // Safety metadata
  reversible: boolean;
  rollbackPlan?: RollbackPlan;
  requiresApproval: boolean;
  approvalLevel: 'none' | 'user' | 'admin' | 'system';
  
  // Confidence & trust
  confidence: number;
  riskScore: number;
  
  // Audit
  auditTrail: AuditRecord[];
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
}

interface ActionStep {
  id: string;
  type: 'query' | 'mutation' | 'file_write' | 'api_call' | 'notification';
  target: string;
  payload: unknown;
  validation: ValidationRule[];
  timeout: number;
  retryPolicy: RetryPolicy;
}
```

### 11.3 Voice as First-Class Input

**Core Principle:** Voice is not "special" — it is a high-latency, high-risk input source that requires additional verification.

#### Voice Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 VOICE → ACTION PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CAPTURE                                                 │
│     └─ Audio → Speech-to-Text → Raw transcript              │
│                                                             │
│  2. PARSE                                                   │
│     └─ Transcript → Intent extraction → Structured intent   │
│                                                             │
│  3. VALIDATE                                                │
│     └─ Intent → Authority check → Risk assessment           │
│                                                             │
│  4. CONFIRM                                                 │
│     └─ Speak back: "I will do X. Proceed?"                  │
│                                                             │
│  5. EXECUTE                                                 │
│     └─ Action → Steps → Verification → Complete             │
│                                                             │
│  6. REPORT                                                  │
│     └─ Speak: "Done. Created column X in table Y."          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Voice-Specific Rules

```typescript
interface VoiceCommand {
  transcriptId: string;
  rawTranscript: string;
  confidence: number;           // STT confidence
  parsedIntent: Intent;
  
  // Voice-specific safety
  confirmationRequired: boolean;
  confirmationReceived: boolean;
  confirmationTranscript?: string;
  
  // Escalation for ambiguity
  clarificationNeeded: boolean;
  clarificationPrompt?: string;
}

// Voice commands MUST:
const VOICE_RULES = {
  alwaysConfirmDestructive: true,        // Never auto-execute destructive
  requireHighConfidence: 0.85,            // Min STT confidence
  maxScopeWithoutConfirm: 'write',       // 'structural' always confirms
  speakBackBeforeExecute: true,          // Always echo intent
  allowInterrupt: true,                   // "Stop" halts execution
  logAllTranscripts: true,               // Full audit trail
};
```

### 11.4 Database Write Modes

**Critical for enterprise trust:**

| Mode | Allowed Actions | Voice Default | Approval Required |
|------|-----------------|---------------|-------------------|
| **Observe** | Read-only queries | ✓ Auto | None |
| **Propose** | Generate migration + preview | ✓ Auto | None |
| **Apply (Dev)** | Run migrations locally | Voice confirm | User |
| **Apply (Staging)** | Run migrations in staging | Voice confirm | User |
| **Apply (Prod)** | Run migrations in production | NEVER via voice | Admin + 2FA |

```typescript
interface DBWritePolicy {
  environment: 'development' | 'staging' | 'production';
  allowedModes: ('observe' | 'propose' | 'apply')[];
  voiceAllowed: boolean;
  requiresConfirmation: boolean;
  requires2FA: boolean;
  auditLevel: 'basic' | 'detailed' | 'forensic';
}

const PRODUCTION_POLICY: DBWritePolicy = {
  environment: 'production',
  allowedModes: ['observe', 'propose'],  // Never 'apply' directly
  voiceAllowed: false,                    // Voice cannot touch prod
  requiresConfirmation: true,
  requires2FA: true,
  auditLevel: 'forensic',
};
```

### 11.5 Live Voice Feedback Loop

**ElevenLabs-style conversational UX:**

```
User: "Add a subscription tier column to the users table"

Crico: "I'll add a nullable VARCHAR column called 'subscription_tier' 
        to the users table with values: free, pro, enterprise.
        This affects 3 API endpoints and 2 UI components.
        Risk is LOW. Should I proceed?"

User: "Yes"

Crico: "Creating migration... Done.
        Updating TypeScript types... Done.
        API endpoints updated... Done.
        UI components flagged for review.
        Migration ready for staging. Run 'npm run migrate:staging' to apply."
```

#### Feedback Interface

```typescript
interface VoiceFeedback {
  type: 'confirmation' | 'progress' | 'completion' | 'error' | 'clarification';
  message: string;
  speakable: string;     // Optimized for TTS
  visualData?: unknown;  // For IDE display
  
  // Interactive
  awaitingResponse: boolean;
  expectedResponses?: string[];  // "yes", "no", "cancel", "explain more"
  timeout: number;               // Auto-cancel after N seconds
}
```

### 11.6 Action Authority Gates

```
┌─────────────────────────────────────────────────────────────┐
│                 ACTION AUTHORITY GATES                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GATE 1: SOURCE VERIFICATION                                │
│  ├─ Is source authenticated?                                │
│  ├─ Is source authorized for this scope?                    │
│  └─ Is source rate-limited?                                 │
│                                                             │
│  GATE 2: INTENT VALIDATION                                  │
│  ├─ Is intent parseable?                                    │
│  ├─ Is intent within allowed operations?                    │
│  └─ Is intent confidence above threshold?                   │
│                                                             │
│  GATE 3: RISK ASSESSMENT                                    │
│  ├─ What's the blast radius?                                │
│  ├─ Is this reversible?                                     │
│  └─ What's the historical failure rate for similar actions? │
│                                                             │
│  GATE 4: APPROVAL                                           │
│  ├─ Does this need human approval?                          │
│  ├─ Who can approve?                                        │
│  └─ Is approval timeout acceptable?                         │
│                                                             │
│  GATE 5: EXECUTION SAFETY                                   │
│  ├─ Is rollback plan ready?                                 │
│  ├─ Are all preconditions met?                              │
│  └─ Is system healthy for this operation?                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.7 Task & System Control via Voice

**What voice can control:**

| Domain | Example Commands | Authority Level |
|--------|-----------------|-----------------|
| **Tasks** | "Create a task to refactor checkout" | write |
| **Projects** | "Move this task to the payment project" | write |
| **Schema** | "Add a column for user preferences" | structural |
| **Code** | "Generate a test for this function" | write |
| **Deploy** | "Show me deploy status" | read |
| **Config** | "Enable feature flag for beta users" | write |
| **System** | "Show system health" | read |

**What voice CANNOT control (hardcoded):**

- Delete production data
- Disable security features
- Bypass approval workflows
- Access other users' data
- Modify audit logs

### 11.8 Integration Points

```typescript
// Voice integration with existing agents
interface VoiceAgentBridge {
  // Route voice intent to appropriate agent
  routeToAgent(intent: Intent): Agent;
  
  // Get speakable response from agent
  getSpeakableResponse(agentResponse: AgentOutput): string;
  
  // Handle multi-turn conversation
  continueConversation(context: ConversationContext, newInput: VoiceCommand): VoiceFeedback;
}

// Example routing
function routeVoiceCommand(command: VoiceCommand): CricoAction {
  const intent = command.parsedIntent;
  
  switch (intent.domain) {
    case 'task':
      return PlannerAgent.createAction(intent);
    case 'schema':
      return SchemaAgent.createAction(intent);
    case 'code':
      return CodeAuditorAgent.createAction(intent);
    case 'test':
      return TestArchitectAgent.createAction(intent);
    default:
      return ConductorAgent.routeAction(intent);
  }
}
```

### 11.9 Audit & Compliance

**Every voice command creates a forensic record:**

```typescript
interface VoiceAuditRecord {
  id: string;
  timestamp: Date;
  
  // Voice-specific
  audioHash?: string;          // SHA-256 of audio (if retained)
  transcript: string;
  transcriptConfidence: number;
  
  // Action
  actionId: string;
  actionType: string;
  actionScope: string;
  
  // Outcome
  approved: boolean;
  executed: boolean;
  result: 'success' | 'failure' | 'cancelled' | 'rolled_back';
  
  // Context
  userId: string;
  sessionId: string;
  environment: string;
  ipAddress?: string;
}
```

### 11.10 Safety Invariants

**These rules are NEVER violated, regardless of source:**

```typescript
const SAFETY_INVARIANTS = {
  // Production protection
  noDirectProdMutation: true,           // All prod changes go through staging
  noVoiceProdDeploy: true,              // Voice cannot trigger prod deploy
  
  // Data protection
  noDataDeletionWithoutBackup: true,    // Backup before delete
  noSchemaChangeWithoutMigration: true, // All schema via migrations
  
  // Audit
  noActionWithoutAudit: true,           // Everything logged
  noAuditModification: true,            // Audit is append-only
  
  // Human authority
  noOverrideOfHumanDecision: true,      // Human "no" is final
  alwaysAllowCancel: true,              // Can always stop
  
  // Confidence
  noLowConfidenceExecution: true,       // <60% confidence = blocked
  noAmbiguousDestructiveAction: true,   // Unclear = confirm
};
```

---

## APPENDIX A: TECHNICAL SPECIFICATIONS

### A.1 Indexing Architecture

```typescript
interface CodeIndex {
  // AST-level index
  ast: {
    files: Map<FilePath, AST>;
    symbols: Map<SymbolId, SymbolInfo>;
    callGraph: Graph<SymbolId>;
    typeGraph: Graph<TypeId>;
  };
  
  // Semantic index
  semantic: {
    embeddings: Map<ChunkId, Vector>;
    concepts: Map<ConceptId, Concept>;
    patterns: Pattern[];
  };
  
  // History index
  history: {
    commits: CommitInfo[];
    blameMap: Map<Line, CommitId>;
    evolutionGraph: Graph<SymbolId>;
  };
}
```

### A.2 Agent Interface

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  
  // What triggers this agent
  triggers: Trigger[];
  
  // What this agent can analyze
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
  
  // What this agent can suggest
  suggest(analysis: AnalysisResult): Promise<Suggestion[]>;
  
  // What this agent can verify
  verify(suggestion: Suggestion): Promise<VerificationResult>;
  
  // Confidence scoring
  confidence(claim: Claim): number;
}
```

### A.3 Suggestion Schema

```typescript
interface Suggestion {
  id: string;
  type: SuggestionType;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  confidence: number;
  
  // Location
  file: FilePath;
  range: Range;
  
  // Content
  title: string;
  description: string;
  rationale: string;
  
  // Fix
  fix?: {
    type: 'auto' | 'guided' | 'manual';
    changes: Change[];
    preview: string;
  };
  
  // Metadata
  category: Category;
  tags: string[];
  relatedSuggestions: string[];
  
  // Lifecycle
  createdAt: Date;
  expiresAt?: Date;
  suppressedUntil?: Date;
}
```

---

## APPENDIX B: IMPLEMENTATION CHECKLIST

### B.1 Core Infrastructure

- [ ] AST parsing for TypeScript, Python, Go, Rust
- [ ] Incremental indexing with <1s update time
- [ ] Embedding generation and storage
- [ ] Call graph analysis
- [ ] Type flow analysis
- [ ] Git history integration
- [ ] LSP server implementation

### B.2 Alignment Engine

- [ ] Schema extraction from migrations
- [ ] Schema extraction from ORMs
- [ ] API contract extraction (OpenAPI, GraphQL)
- [ ] UI form schema extraction
- [ ] Cross-layer diff engine
- [ ] Drift severity classification
- [ ] Fix suggestion generation

### B.3 Agent Framework

- [ ] Agent registry and lifecycle
- [ ] Task routing and orchestration
- [ ] Cross-agent communication
- [ ] Confidence aggregation
- [ ] Disagreement resolution
- [ ] Result synthesis

### B.4 IDE Integration

- [ ] VSCode extension
- [ ] Inline suggestion rendering
- [ ] Suggestion panel
- [ ] Confidence indicators
- [ ] Visual overlays
- [ ] Real-time sync

### B.5 Collaboration

- [ ] Multi-user state sync
- [ ] Ownership detection
- [ ] Activity awareness
- [ ] Conflict prediction
- [ ] Team dashboard

---

## DOCUMENT END

**Status:** Implementation-Ready
**Next Action:** Begin Phase 1 execution
**Owner:** Engineering Leadership
**Review Cadence:** Weekly during Phase 1, Bi-weekly thereafter

