# API Task Routes - Curl Test Examples

## Overview
This document provides curl commands to test all 12 task API endpoints. All examples show testing without authentication (expecting 401 responses).

**Base URL**: `http://localhost:3000`

---

## 1. GET /api/tasks - List Tasks

### Command
```bash
curl -X GET "http://localhost:3000/api/tasks"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X GET "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Query Parameters (when authenticated)
```bash
curl -X GET "http://localhost:3000/api/tasks?project_id=UUID&status=todo&limit=50&offset=0"
```

---

## 2. POST /api/tasks - Create Task

### Command (without auth)
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Task","project_id":"project-uuid"}'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "New Task",
    "project_id": "project-uuid",
    "description": "Task description",
    "status": "backlog",
    "priority": "medium",
    "assignee_id": "user-uuid",
    "due_date": "2026-02-14T00:00:00Z"
  }'
```

### Success Response (201)
```json
{
  "ok": true,
  "data": {
    "id": "task-uuid",
    "title": "New Task",
    "project_id": "project-uuid",
    "status": "backlog",
    "priority": "medium",
    "created_at": "2026-01-14T15:47:50.988Z"
  },
  "error": null
}
```

---

## 3. GET /api/tasks/[id] - Get Single Task

### Command (without auth)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. PATCH /api/tasks/[id] - Update Task

### Command (without auth)
```bash
curl -X PATCH "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","status":"in_progress"}'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X PATCH "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Updated Title",
    "status": "in_progress",
    "priority": "high",
    "assignee_id": "new-user-uuid"
  }'
```

---

## 5. DELETE /api/tasks/[id] - Delete Task

### Command (without auth)
```bash
curl -X DELETE "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X DELETE "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. POST /api/tasks/batch - Batch Operations

### Command (without auth)
```bash
curl -X POST "http://localhost:3000/api/tasks/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["550e8400-e29b-41d4-a716-446655440000"],
    "operation": "complete"
  }'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### Batch Operations Available
- `complete` - Mark tasks as done
- `move` - Move tasks to different project (requires `value`)
- `priority` - Set priority (requires `value`: low/medium/high/urgent/none)
- `assign` - Assign user (requires `value`: user-id or null)
- `tag` - Add tags (requires `value`: array of tag-ids)
- `delete` - Delete tasks

### With Authentication (example)
```bash
curl -X POST "http://localhost:3000/api/tasks/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "taskIds": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    "operation": "priority",
    "value": "high"
  }'
```

---

## 7. GET /api/tasks/[id]/subtasks - Get Subtasks

### Command (without auth)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. POST /api/tasks/[id]/subtasks - Create Subtask

### Command (without auth)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Subtask Title"}'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Subtask Title"}'
```

---

## 9. GET /api/tasks/[id]/tags - Get Task Tags

### Command (without auth)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 10. POST /api/tasks/[id]/tags - Add Tags to Task

### Command (without auth)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags" \
  -H "Content-Type: application/json" \
  -d '{"tag_ids":["550e8400-e29b-41d4-a716-446655440001"]}'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tag_ids":["550e8400-e29b-41d4-a716-446655440001","550e8400-e29b-41d4-a716-446655440002"]}'
```

---

## 11. GET /api/tasks/[id]/time-entries - Get Time Entries

### Command (without auth)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries"
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X GET "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 12. POST /api/tasks/[id]/time-entries - Create Time Entry

### Command (without auth)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2026-01-14T09:00:00Z",
    "endTime": "2026-01-14T10:00:00Z",
    "durationSeconds": 3600,
    "notes": "Worked on implementation"
  }'
```

### Response (without auth)
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "timestamp": "2026-01-14T15:47:50.988Z"
  }
}
```

### Status Code: 401

### With Authentication (example)
```bash
curl -X POST "http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startTime": "2026-01-14T09:00:00Z",
    "endTime": "2026-01-14T10:00:00Z",
    "durationSeconds": 3600,
    "notes": "Worked on implementation"
  }'
```

---

## Common Response Envelope Format

All responses follow this format:

### Success Response
```json
{
  "ok": true,
  "data": { /* response data */ },
  "error": null,
  "meta": { /* optional */ }
}
```

### Error Response
```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "timestamp": "ISO-8601 timestamp",
    "details": { /* optional */ }
  },
  "meta": null
}
```

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| AUTH_REQUIRED | 401 | Authentication token missing or invalid |
| TOKEN_EXPIRED | 401 | Authentication token has expired |
| TOKEN_INVALID | 401 | Authentication token is invalid |
| FORBIDDEN | 403 | Access denied to resource |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_FAILED | 400 | Input validation failed |
| INVALID_UUID | 400 | UUID format is invalid |
| MISSING_REQUIRED_FIELD | 400 | Required field is missing |
| INVALID_ENUM_VALUE | 400 | Invalid enum value provided |
| DUPLICATE_ENTRY | 409 | Duplicate resource exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Internal server error |
| DATABASE_ERROR | 500 | Database operation failed |

---

## Tips and Best Practices

### 1. Pretty-print JSON responses
```bash
curl -X GET "http://localhost:3000/api/tasks" | jq .
```

### 2. Save response to file
```bash
curl -X GET "http://localhost:3000/api/tasks" > response.json
```

### 3. Include response headers in output
```bash
curl -i -X GET "http://localhost:3000/api/tasks"
```

### 4. Verbose mode for debugging
```bash
curl -v -X GET "http://localhost:3000/api/tasks"
```

### 5. Set custom headers
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"New Task","project_id":"project-uuid"}'
```

### 6. Time the request
```bash
curl -w "Total time: %{time_total}s\n" -X GET "http://localhost:3000/api/tasks"
```

### 7. Follow redirects
```bash
curl -L -X GET "http://localhost:3000/api/tasks"
```

---

## Shell Script for Testing All Endpoints

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3

  echo "Testing $method $endpoint"
  if [ -n "$data" ]; then
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" | jq .
  else
    curl -s -X $method "$BASE_URL$endpoint" | jq .
  fi
  echo ""
}

# Test all endpoints without auth
test_endpoint "GET" "/api/tasks"
test_endpoint "POST" "/api/tasks" '{"title":"Test","project_id":"uuid"}'
test_endpoint "GET" "/api/tasks/550e8400-e29b-41d4-a716-446655440000"
test_endpoint "PATCH" "/api/tasks/550e8400-e29b-41d4-a716-446655440000" '{"title":"Updated"}'
test_endpoint "DELETE" "/api/tasks/550e8400-e29b-41d4-a716-446655440000"
test_endpoint "POST" "/api/tasks/batch" '{"taskIds":["uuid"],"operation":"complete"}'
test_endpoint "GET" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks"
test_endpoint "POST" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/subtasks" '{"title":"Subtask"}'
test_endpoint "GET" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags"
test_endpoint "POST" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/tags" '{"tag_ids":["uuid"]}'
test_endpoint "GET" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries"
test_endpoint "POST" "/api/tasks/550e8400-e29b-41d4-a716-446655440000/time-entries" '{"startTime":"2026-01-14T09:00:00Z","endTime":"2026-01-14T10:00:00Z","durationSeconds":3600}'
```

---

## Notes

- All UUID values in examples are placeholders. Use real UUIDs when testing.
- Replace `YOUR_TOKEN` with actual Supabase authentication token.
- Without authentication, all endpoints return 401 Unauthorized.
- The response envelope format is consistent across all endpoints.
- All timestamps are in ISO 8601 format with UTC timezone.
