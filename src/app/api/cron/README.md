# /api/cron vs /api/crons - Naming Distinction

## Overview

This directory contains **individual cron job handlers** - the actual implementation code that runs when a scheduled task executes.

## /api/cron/ (Singular)

**Purpose**: Contains the actual cron job handler implementations.

**When to use**: Add new subdirectories here when you need to create new scheduled tasks that run specific business logic.

**Examples**:
- `delegation/` - Handles delegation cron jobs
- `project-health/` - Monitors and reports project health
- `send-digests/` - Sends email digest notifications

**Key characteristic**: These routes are typically called by the external scheduler (e.g., ClawdBot) or Inngest, not directly by the UI.

## /api/crons/ (Plural)

**Purpose**: REST API endpoints for managing cron jobs (CRUD operations).

**When to use**: The UI calls these endpoints to list, create, update, or delete scheduled cron jobs.

**Key characteristic**: These endpoints interact with ClawdBot (the cron management service) to manage the cron schedule configuration.

## Why Both Exist

1. **Separation of Concerns**: 
   - `/api/cron/*` = What the job does (the handler)
   - `/api/crons/*` = How to manage the schedule (the management API)

2. **Different Callers**:
   - Cron handlers are called by the scheduler at execution time
   - Cron management API is called by the UI for administrative functions

3. **ClawdBot Integration**:
   - The `/api/crons/` routes proxy to ClawdBot for actual cron persistence
   - The `/api/cron/` routes contain the actual business logic that executes

## Adding a New Cron Job

1. Create handler in `/api/cron/your-job/route.ts`
2. Register it via `/api/crons/` endpoints (or directly in ClawdBot)
3. The scheduler will call your handler at the configured interval
