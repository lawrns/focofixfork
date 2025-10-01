# Ollama Integration Deployment Guide

## Overview

This document describes the complete Ollama integration system that enables natural language project management through AI-powered parsing and database operations.

## Architecture

```
User Input (Natural Language)
    ↓
API Routes (/api/ollama/*)
    ↓
OllamaProjectManager (Business Logic)
    ↓
Ollama Service (AI Processing)
    ↓
Fly.io Ollama Instance (LLM Inference)
    ↓
Database (PostgreSQL via Supabase)
```

## Components

### 1. Ollama Deployment on Fly.io

**App Name**: `foco-ollama`
**URL**: https://foco-ollama.fly.dev
**Region**: San Jose, California (sjc)
**Resources**:
- 4 CPUs (shared)
- 8GB RAM
- 50GB persistent volume for models

**Configuration File**: `fly-ollama.toml`

**Deployment Commands**:
```bash
# Deploy Ollama
flyctl deploy --app foco-ollama --config fly-ollama.toml

# Check status
flyctl status --app foco-ollama

# View logs
flyctl logs --app foco-ollama

# SSH into instance
flyctl ssh console --app foco-ollama
```

**Installing Models**:
```bash
# SSH into Ollama instance
flyctl ssh console --app foco-ollama

# Pull models (run inside the instance)
ollama pull llama2
ollama pull codellama
ollama pull mistral

# Check installed models
ollama list
```

**Health Check**:
```bash
curl https://foco-ollama.fly.dev/api/tags
```

### 2. Environment Configuration

Add to `.env.local`:
```bash
# Ollama Configuration
NEXT_PUBLIC_OLLAMA_URL=https://foco-ollama.fly.dev
OLLAMA_ENABLED=true
NEXT_PUBLIC_OLLAMA_DEFAULT_MODEL=llama2
NEXT_PUBLIC_OLLAMA_CODE_MODEL=codellama
NEXT_PUBLIC_OLLAMA_CHAT_MODEL=mistral
```

### 3. API Endpoints

All Ollama endpoints require authentication via `x-user-id` header.

#### Create Project
**POST** `/api/ollama/create-project`

**Request Body**:
```json
{
  "specification": "Create a mobile app for task management with user authentication, real-time sync, and offline support. Timeline: 3 months",
  "organizationId": "uuid"
}
```

**OR (structured format)**:
```json
{
  "specification": {
    "name": "Mobile Task Manager",
    "description": "A mobile app for task management",
    "requirements": [
      "User authentication",
      "Real-time synchronization",
      "Offline support"
    ],
    "timeline": {
      "start_date": "2025-10-01",
      "due_date": "2026-01-01",
      "duration_days": 90
    },
    "team": {
      "size": 3,
      "roles": ["Frontend Developer", "Backend Developer", "Designer"]
    },
    "complexity": "moderate",
    "domain": "Mobile Development"
  },
  "organizationId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "project": { ... },
    "milestones": [ ... ],
    "tasks": [ ... ],
    "summary": {
      "project_name": "Mobile Task Manager",
      "total_milestones": 5,
      "total_tasks": 23
    }
  }
}
```

#### Update Project
**POST** `/api/ollama/update-project`

**Request Body**:
```json
{
  "projectId": "uuid",
  "command": "Change status to active and increase priority to high"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "changes": {
      "status": "active",
      "priority": "high"
    },
    "summary": "Applied 2 change(s) to project"
  }
}
```

#### Create Milestone
**POST** `/api/ollama/create-milestone`

**Request Body**:
```json
{
  "projectId": "uuid",
  "specification": "Complete user authentication system with OAuth support by end of month"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "milestone": { ... },
    "summary": "Created milestone: User Authentication System"
  }
}
```

#### Create Task
**POST** `/api/ollama/create-task`

**Request Body**:
```json
{
  "projectId": "uuid",
  "specification": "Implement JWT token refresh mechanism with 7-day expiry",
  "milestoneId": "uuid" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "task": { ... },
    "summary": "Created task: Implement JWT token refresh mechanism"
  }
}
```

#### Get Project Details
**GET** `/api/ollama/projects/{id}`

**Response**:
```json
{
  "success": true,
  "data": {
    "project": { ... },
    "milestones": [ ... ],
    "tasks": [ ... ],
    "summary": {
      "total_milestones": 5,
      "total_tasks": 23,
      "completed_tasks": 8,
      "progress_percentage": 35
    }
  }
}
```

#### Delete Project
**DELETE** `/api/ollama/projects/{id}`

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Project deleted successfully",
    "project_id": "uuid"
  }
}
```

## Authorization

All endpoints enforce role-based access control:

- **Create Project**: Requires owner or admin role in organization
- **Update Project**: Requires project team membership with update permission
- **Create Milestone/Task**: Requires project team membership with manage permission
- **View Project**: Requires project team membership
- **Delete Project**: Requires project ownership or organization owner role

## Database Schema

### Projects Table
- `id` (UUID, primary key)
- `name` (text)
- `description` (text)
- `status` (enum: planning, active, on_hold, completed, cancelled)
- `priority` (enum: low, medium, high, urgent)
- `start_date` (date, nullable)
- `due_date` (date, nullable)
- `organization_id` (UUID, foreign key)
- `created_by` (UUID, foreign key)
- `progress_percentage` (integer, 0-100)

### Milestones Table
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key)
- `name` (text)
- `title` (text)
- `description` (text)
- `deadline` (date)
- `priority` (enum: low, medium, high, critical)
- `status` (enum: green, yellow, red)
- `progress_percentage` (integer, 0-100)
- `created_by` (UUID, foreign key)

### Tasks Table
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key)
- `milestone_id` (UUID, foreign key, nullable)
- `title` (text)
- `description` (text)
- `status` (enum: todo, in_progress, review, done)
- `priority` (enum: low, medium, high, urgent)
- `estimated_hours` (integer, nullable)
- `created_by` (UUID, foreign key)

## AI Parsing Rules

The OllamaProjectManager uses specific prompts to ensure consistent output:

### Project Status Values
- `planning` - Initial planning phase
- `active` - Currently in progress
- `on_hold` - Temporarily paused
- `completed` - Successfully finished
- `cancelled` - Discontinued

### Priority Values (Projects/Tasks)
- `low` - Nice to have
- `medium` - Standard priority
- `high` - Important
- `urgent` - Critical/time-sensitive

### Priority Values (Milestones)
- `low` - Nice to have
- `medium` - Standard priority
- `high` - Important
- `critical` - Mission-critical

### Task Status Values
- `todo` - Not started
- `in_progress` - Currently being worked on
- `review` - Awaiting review
- `done` - Completed

### Milestone Status Values
- `green` - On track
- `yellow` - At risk
- `red` - Behind schedule

## Example Workflow

### 1. Create a Complete Project

```bash
curl -X POST https://your-app.com/api/ollama/create-project \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "specification": "Build an e-commerce platform with product catalog, shopping cart, payment integration, and admin dashboard. We need user authentication, inventory management, and order tracking. Timeline: 4 months, team of 5 developers.",
    "organizationId": "org-uuid"
  }'
```

**Expected Result**:
- 1 project created
- 5-7 milestones (e.g., "User Authentication", "Product Catalog", "Shopping Cart", "Payment Integration", "Admin Dashboard", "Testing & Deployment")
- 25-40 tasks distributed across milestones
- All with logical timelines, priorities, and descriptions

### 2. Update Project Status

```bash
curl -X POST https://your-app.com/api/ollama/update-project \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "projectId": "project-uuid",
    "command": "Mark as active and set due date to December 31st 2025"
  }'
```

### 3. Add a Milestone

```bash
curl -X POST https://your-app.com/api/ollama/create-milestone \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "projectId": "project-uuid",
    "specification": "Implement email notification system with templates for order confirmations, shipping updates, and password resets. High priority, due in 2 weeks."
  }'
```

### 4. Add a Task

```bash
curl -X POST https://your-app.com/api/ollama/create-task \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "projectId": "project-uuid",
    "milestoneId": "milestone-uuid",
    "specification": "Create responsive product card component with image carousel, price display, and add to cart button. Estimate 8 hours."
  }'
```

## Troubleshooting

### Ollama Not Responding

```bash
# Check Ollama status
flyctl status --app foco-ollama

# View recent logs
flyctl logs --app foco-ollama

# Restart the app
flyctl apps restart foco-ollama
```

### Models Not Found

```bash
# SSH into instance
flyctl ssh console --app foco-ollama

# Check available models
ollama list

# Pull missing model
ollama pull llama2
```

### Parsing Errors

If Ollama returns invalid JSON:
1. Check that the model is properly loaded (`ollama list`)
2. Verify the prompt in `ollama-project-manager.ts`
3. Try increasing `num_ctx` in the request options
4. Consider using a more capable model (e.g., mistral instead of llama2)

### Performance Issues

```bash
# Check machine resources
flyctl ssh console --app foco-ollama -C "free -h"
flyctl ssh console --app foco-ollama -C "df -h"

# Scale up if needed
flyctl scale vm dedicated-cpu-4x --memory 16384 --app foco-ollama
```

## Cost Optimization

**Current Configuration Cost** (approximate):
- Shared CPU 4x, 8GB RAM: ~$62/month
- 50GB volume: ~$2.50/month
- **Total**: ~$65/month

**Scaling Options**:
- **Development**: Use `auto_stop_machines = true` to suspend when idle
- **Production**: Keep `auto_stop_machines = false` for instant responses
- **High Traffic**: Scale to dedicated CPU with GPU support

## Security Considerations

1. **API Authentication**: All endpoints require `x-user-id` header
2. **Authorization**: Role-based access control on all operations
3. **Input Validation**: Zod schemas validate all request bodies
4. **CORS**: Configured in Fly.io deployment
5. **Rate Limiting**: Consider adding rate limits for AI endpoints

## Monitoring

### Key Metrics to Track
- API endpoint response times
- Ollama generation times
- Project creation success rate
- Database query performance
- Fly.io machine health

### Recommended Tools
- Fly.io Metrics Dashboard
- Supabase Performance Insights
- Next.js Analytics
- Custom logging in API routes

## Future Enhancements

1. **Streaming Responses**: Enable `stream: true` for real-time feedback
2. **Model Selection**: Allow users to choose model (llama2, codellama, mistral)
3. **Context Awareness**: Use project history to improve AI suggestions
4. **Batch Operations**: Create multiple projects from a single specification
5. **Template Library**: Pre-built project templates for common use cases
6. **Progress Tracking**: AI-powered progress estimation and risk analysis

## Support

For issues or questions:
1. Check this documentation
2. Review Fly.io logs: `flyctl logs --app foco-ollama`
3. Test Ollama directly: `curl https://foco-ollama.fly.dev/api/tags`
4. Verify database connectivity via Supabase dashboard
