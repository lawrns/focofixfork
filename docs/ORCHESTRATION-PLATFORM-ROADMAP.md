# Critter Orchestration Platform — Transformation Roadmap

> Authored from a full UI audit of every page: Dashboard, Projects, Agents, Pipeline, Runs, Audit Log, Recurring, Briefing, System Status, Notifications, Settings, and project-level views.

---

## What's Already Strong

- **Autonomy Slider** (Off → Advisor → Bounded → Near Full → Active) — granular trust dial, not binary on/off
- **Dispatch Bar** with role presets (CTO, COO, Auto, Intake) — natural language → structured agent commands
- **"Cofounder" framing** — collaborative autonomy mental model, not just "tool"
- **Night Autonomy** as first-class top-bar concept — ahead of the curve

---

## Phase 1 — Priority Feed & Feedback Loop (Current Sprint)

### 1. Dashboard: Unified Priority Feed
**Problem:** Static counts (Running 3, Failed 3, Stale 3) and two empty queues. For 27 autonomous projects, the dashboard should feel like mission control.

**Solution:**
- Replace empty Proposals/Work queue cards with a **unified priority feed**
- Single reverse-chronological stream merging: proposals needing review, blocked items, failed runs, completed milestones
- Each item gets severity color + single-click action (approve, retry, dismiss, escalate)
- Attention-weighted: most urgent items float to top
- "What needs my attention right now" — not five separate boxes

### 2. Run Execution Traces
**Problem:** Runs page shows flat list with status badges and truncated errors. Zero visibility into what `cofounder_loop` iterations actually did.

**Solution:**
- Expand each run into a **full execution trace** — vertical timeline of every step
- Show: tool called, prompt sent, response received, duration per step, failure point
- **Token cost tracking** per run: total tokens, estimated cost, latency breakdown (model wait vs tool execution vs review)
- **One-click "retry with fix"**: suggest what went wrong (model unavailable → fallback to Claude; HTTP 500 → show response body), offer retry with modified params
- Failed runs get diagnostic intelligence, not just red badges

### 3. Agent Diagnostic Panels
**Problem:** Several agents showing ERROR/UNKNOWN with "Last activity: never." No way to diagnose why.

**Solution:**
- Each agent card: **sparkline** (7-day activity), success rate, avg execution time, current assignment
- ERROR state gets a **diagnostic panel**: API key expired? Model endpoint unreachable? System prompt malformed?
- Executive Advisors: show last recommendation, whether acted on, outcome produced
- Unused advisors flagged as dead weight — engage or remove

### 4. Notification Wiring
**Problem:** Briefing generates intelligence, Notifications page is empty. They're disconnected.

**Solution:**
- Briefing insights → auto-generate notifications
- Critical notifications → dashboard priority feed
- Browser push notifications for: agent failure, deployment blocked, proposal awaiting >1hr, cost threshold exceeded
- Webhook support (Slack/Discord) for critical events

---

## Phase 2 — Observability & Visualization

### 5. Live Fleet Topology (Dashboard)
- Real-time visual: every active agent as a node, lines to projects, pulsing during execution
- Active step name visible, blocked nodes turn red with reason on hover
- Replaces flat status badges with spatial understanding

### 6. Visual DAG Pipeline Builder
- Node-graph editor: Planner → Executor → Reviewer as draggable nodes
- Conditional branches (reviewer rejects → loop back with feedback)
- Parallel execution paths (two models as executors, pick better output)
- Human-in-the-loop checkpoints at any node
- Live streaming output from active node, highlighted in graph
- Bar set by n8n and LangGraph

### 7. Portfolio Cross-Project View
- Portfolio-level burndown, cross-project dependencies, resource allocation
- Which projects get most agent attention, which are stalled
- Same-agent bottleneck detection across projects
- "CEO view" tying platform value to business outcomes

---

## Phase 3 — Operational Depth

### 8. Dispatch Memory & Templates
- Command history (up-arrow cycle)
- Saved templates ("run CRUD sweep on X", "generate status report", "scout GitHub for Y")
- Auto-complete: projects, agents, task types
- Post-dispatch toast with link to created run

### 9. Recurring Tasks Onboarding
- Pre-populate suggestions from agent roster: daily briefing, weekly PR sweeps, nightly health checks, daily cost summaries
- Empty state = onboarding wizard, not just a button

### 10. Audit Log Enhancement
- Severity levels (info/warning/error)
- Multi-faceted filter panel: by agent, project, event type, date range
- Full-text search
- CSV/JSON export for compliance

### 11. Project Fleet & Insights
- Fleet tab: assigned agents, current work, recent commits/PRs, deployment pipeline
- Agent delegation toggle: explain what it does, what happens when enabled
- Insights: only show health scores with real data; "not enough data" state with onboarding CTA

### 12. Model Registry & Cost Controls
- Central model management: available models, API keys, fallback chains, rate limits, cost per token
- Per-project and per-agent spending limits
- Automatic pause when thresholds hit
- Global model health monitoring

---

## The Meta-Level Improvement

The single biggest transformation: **closing the feedback loop**.

Every agent run → measurable result (PR merged, task completed, insight generated, cost incurred) → feeds back into dashboard, project health, portfolio view, agent performance metrics.

**Dispatch → Execution → Outcome → Recommendation**

That closed loop separates a monitoring dashboard from a true autonomous orchestration platform.
