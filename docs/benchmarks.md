# Planning Benchmarks

## Setup
- Run unit: `npm run test:unit -- tests/unit/ai-decomposition.spec.ts`
- Run bench: `vitest bench tests/performance/ai-planning.bench.ts`

## Metrics
- Parse throughput measured on 5 milestones × 25 tasks payload.
- Validate and timeline generation optimized for low allocation.

## Goals
- Maintain sub-200ms planning for average briefs.
- Keep UI interactions under 100ms for task edits.

