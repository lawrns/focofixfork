## Scope & Objectives
- Align functionality precisely to requirements while reducing technical debt and improving performance, reliability, and maintainability.
- Target oversized services, inconsistent error handling, duplicated UI components, and type-safety gaps.
- Establish robust tests (unit, integration, performance) and CI quality gates.

## Current State (Key Findings)
- Tech stack: Next.js App Router, React 18, TypeScript, Tailwind, Zod, Supabase; CI via GitHub Actions; env validation via `src/env.ts`.
- Central error/validation: `src/server/http/wrapRoute.ts:26–122`, `src/lib/errors/api-error.ts:118–176, 200–511`.
- Performance hotspots: oversized services (`src/lib/services/openai.ts` ~810, `calendar-service.ts` ~716, `analytics.service.ts` ~696, `organizations.ts` ~670, `data-integrity.ts` ~620, `file-uploads.ts` ~560, `notifications.ts` ~501).
- Inefficient batch ops: `src/app/api/import-export/import/route.ts:49–98` loops per item; replace with transactional bulk operations.
- Type safety gaps: widespread `any` in API error paths (e.g., `src/app/api/projects/route.ts:50`), telemetry payloads `src/app/api/telemetry/route.ts:11–12`.
- Duplications/legacy: `.bak` files for organizations service; multiple overlapping UI primitives (e.g., tables and loading components).
- Security: hardcoded Supabase keys in `next.config.js:5–6` and `netlify.toml:16–19`.

## Workstream 1: Code Review & Cleanup
- Identify and remove legacy/unused files:
  - Delete `src/lib/services/organizations.ts.bak` and `.bak2` after diffing with current `organizations.ts`.
  - Remove or gate TODO stubs (e.g., `src/lib/services/notifications.ts:434–451`, `src/app/api/send-welcome/route.ts:74`).
- Consolidate overlapping UI components:
  - Unify table components under `src/components/ui/table.tsx` and deprecate `src/components/data-display/table.tsx` if redundant.
  - Merge loaders (`src/components/loading/*` and `src/lib/ui/loading-states.tsx`) into a single primitive with variants.
- Centralize logging:
  - Replace page-level `console.error/warn` (e.g., `src/app/organizations/page.tsx:94–420`, `src/app/dashboard/page.tsx:148,171,318–321`) with `src/lib/logger.ts`.

## Workstream 2: Optimization Strategies
- Batch and transactional DB operations:
  - Refactor `src/app/api/import-export/import/route.ts:49–98` to validate inputs (Zod) and perform bulk insert/upsert with a single transaction.
- Streamline core algorithms:
  - Introduce caching and adapters in `calendar-service.ts` (split Google/Outlook providers; minimize repeated computations).
  - Break `data-integrity.ts` into validator modules with early-exit checks; instrument timing.
- Reduce bundle impact:
  - Leverage dynamic imports on large dashboards/views; extend `modularizeImports` beyond `lucide-react` when beneficial.

## Workstream 3: Refactoring for Maintainability & Type Safety
- Modularize oversized services:
  - `openai.ts`: split into `client`, `prompting`, `orchestration`, `errors` modules; define typed request/response DTOs; consolidate retries via `ErrorFactory`.
  - `analytics.service.ts` + `analytics.ts`: merge into a single analytics domain with clear boundaries (queries vs aggregation), shared types, and schema-validated inputs/outputs.
  - `file-uploads.ts`: extract storage adapter, implement permission/quota checks for TODOs, add streaming APIs.
  - `notifications.ts`: create channel adapters (email/push/SMS) with queueing and backoff; replace placeholders with real implementations.
- Standardize error handling:
  - Ensure every API route uses `wrapRoute` and returns `ApiError` consistently; remove ad-hoc `any` error paths.
- Strengthen type safety:
  - Replace `any` with explicit DTOs from `src/lib/validation/schemas/**` across API/services.
  - Share response models between pages and route handlers to avoid manual parsing.

## Workstream 4: Testing Protocols
- Unit tests (Vitest):
  - `wrapRoute` success/error mapping (`src/server/http/wrapRoute.ts:26–122`).
  - `api-error` factory/handler (`src/lib/errors/api-error.ts:200–511`).
  - Service modules after refactor (openai, analytics, file-uploads, notifications).
- Integration tests:
  - Import/export bulk transaction path; analytics key workflows; file upload permissions/quota.
- Performance benchmarks:
  - Micro-benchmarks for data-integrity validators and analytics aggregations; targeted scenarios for calendar adapters.
- E2E (Playwright):
  - Expand flows for organizations/projects/tasks; use existing configs.

## Workstream 5: CI & Quality Gates
- Enforce type safety:
  - Add stricter ESLint rules (limit `any` in server code); run `tsc --noEmit` with strict/skipLibCheck tuned.
- Coverage gates:
  - Require minimum coverage thresholds for unit/integration suites; continue upload to Codecov.
- Performance regression checks:
  - Add benchmark job; fail PRs on significant regressions.

## Workstream 6: Security & Config Hardening
- Remove hardcoded Supabase keys (`next.config.js:5–6`, `netlify.toml:16–19`); rely on `src/env.ts` validated env injection.
- Review headers/CSP in `next.config.js:46–96`; ensure CSP aligns with mermaid/OpenAI if used client-side.

## Implementation Approach
- Triage and prioritize by impact (services first, then APIs, then UI consolidation).
- Refactor in small steps with tests at each step; maintain API compatibility.
- Use feature flags for risky changes; add rollback plan per module.

## Acceptance Criteria
- All API routes use standardized `wrapRoute` and `ApiError` responses.
- No `any` in core paths (APIs/services); DTOs and Zod schemas used consistently.
- Bulk operations implemented for import/export; performance improvements measured.
- Duplicated components removed; single source of truth for UI primitives.
- Security keys removed from code; env validation passes.
- Tests: unit + integration + E2E expanded with coverage thresholds; CI gates pass.

## Deliverables
- Refactored modules (openai, analytics, calendar, data-integrity, file-uploads, notifications).
- Consolidated UI primitives and logging via `logger`.
- Updated tests and CI configuration with coverage and performance checks.
- Documentation updates in code (clear types, function docs, and patterns) aligning with the standardized style.