# Auto-Delegation Pipeline

This document describes the auto-delegation system that automatically assigns pending work items to available agents.

## Architecture

### 1. Delegation Tick API (`/api/delegation/process`)

**POST** endpoint that:
- Queries work_items with `delegation_status='pending'` + enabled project policies
- Matches to available agent from `assigned_agent_pool` (e.g., `['clawdbot', 'bosun']`)
- Reads handbook files from `~/clawdbot/skills/{project.slug}/`
- Injects handbook into dispatch payload
- Dispatches to correct backend
- Updates status: `pending → delegated → running → completed/failed`

### 2. Temporal DelegationWorkflow (`/lib/temporal/workflows/delegation-workflow.ts`)

- Heartbeat loop every 30s
- Calls `/api/delegation/process`
- Handles retries and failures
- Can be run via:
  - Next.js cron job (recommended): `/api/cron/delegation`
  - External cron calling the API
  - Manual workflow manager

### 3. Status Callback (`/api/delegation/callback`)

**POST** endpoint where backends report completion:
```json
{
  "workItemId": "uuid",
  "runId": "uuid",
  "status": "completed" | "failed",
  "outputs": [],
  "error": "string",
  "summary": "string"
}
```

Updates work_item status and triggers ledger event.

### 4. Handbook System (`/lib/handbook/`)

- Reads markdown/yaml from `~/clawdbot/skills/{project.slug}/`
- Injects into agent context
- Includes business rules, constraints, examples

## Configuration

### Environment Variables

```bash
# Clawdbot API
CLAWDBOT_API_URL=http://127.0.0.1:18794
OPENCLAW_SERVICE_TOKEN=your_token

# Bosun API
BOSUN_API_URL=http://127.0.0.1:3001
BOSUN_SERVICE_TOKEN=your_token

# Delegation
DELEGATION_SERVICE_TOKEN=your_token
CRON_SECRET=your_cron_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Skills path
CLAWDBOT_SKILLS_PATH=/home/laurence/clawdbot/skills
```

### Project Settings

Projects must have:
1. `delegation_settings.enabled = true`
2. `assigned_agent_pool` array with at least one agent (e.g., `['clawdbot']`)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/delegation/process` | POST | Process pending work items |
| `/api/delegation/callback` | POST | Receive completion callbacks |
| `/api/cron/delegation` | GET/POST | Cron trigger for delegation tick |

## Status Flow

```
pending → delegated → running → completed
                     ↘
                      failed
```

## Usage

### Manual Trigger

```bash
curl -X POST http://localhost:3000/api/delegation/process
```

### Cron Setup

**Vercel** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/delegation",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**External Cron** (every 30 seconds):
```bash
*/1 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/delegation
```

## Files Created

```
src/
├── app/api/
│   ├── delegation/
│   │   ├── process/route.ts      # Delegation tick API
│   │   └── callback/route.ts     # Status callback API
│   └── cron/delegation/route.ts  # Cron endpoint
├── lib/
│   ├── handbook/
│   │   ├── handbook-loader.ts    # Load project handbooks
│   │   └── index.ts              # Re-exports
│   ├── delegation/
│   │   ├── delegation-engine.ts  # Core delegation logic
│   │   └── index.ts              # Re-exports
│   └── temporal/workflows/
│       ├── delegation-workflow.ts # Workflow implementation
│       └── index.ts               # Re-exports
```

## Agent Backends

### Clawdbot
- URL: `http://127.0.0.1:18794`
- Endpoint: `/api/dispatch`
- Supports: OpenClaw agent dispatch

### Bosun
- URL: `http://127.0.0.1:3001`
- Endpoint: `/api/dispatch`
- Supports: Task execution

## Adding New Agents

1. Add agent to `AgentType` in `delegation-engine.ts`
2. Add backend config to `AGENT_BACKENDS`
3. Add environment variables
4. Update project `assigned_agent_pool` to include new agent

## Testing

```bash
# Test process endpoint
curl -X POST http://localhost:3000/api/delegation/process

# Test callback endpoint
curl -X POST http://localhost:3000/api/delegation/callback \
  -H "Content-Type: application/json" \
  -d '{
    "workItemId": "uuid",
    "runId": "uuid",
    "status": "completed",
    "summary": "Task completed successfully"
  }'
```
