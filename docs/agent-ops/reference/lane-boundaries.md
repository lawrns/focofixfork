# Lane Boundaries

## product_ui
- write: `src/app/**` (non-api), `src/components/**`, `public/**`
- no write: `src/app/api/**`, `supabase/**`, `schemas/**`

## platform_api
- write: `src/app/api/**`, `src/lib/**`, `supabase/**`, `schemas/**`
- no write: broad UI styling/layout changes unless explicitly task-scoped

## requirements
- write: `docs/agent-ops/**` only
- no write: all code paths

## Enforcement
Lane policy is enforced in runtime execution surfaces and custom agent profile validation.
