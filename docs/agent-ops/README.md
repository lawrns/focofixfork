# Agent Ops

Human-gated, role-constrained operating model for multi-agent execution.

## Principles

1. Keep orchestration simple.
2. Human triggers execution (`/go`) for approved tasks.
3. Tasks are micro-sized and lane-specific.
4. Agents do not self-organize roles or create internal process.
5. Markdown is the coordination layer; telemetry/audit lives in DB.

## Lanes

1. `product_ui`: UI and frontend flow implementation.
2. `platform_api`: API, runtime, and data layer implementation.
3. `requirements`: docs-only lane for scope clarification and acceptance prep.

## Execution Loop

1. Add micro-task in `tasks/*.md`.
2. Approve task scope and acceptance criteria.
3. Trigger `/api/agent-ops/go`.
4. Execute through command surface payload returned by `/go`.
5. Review output, log decision, close or split follow-up tasks.
