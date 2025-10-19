# Foco API Documentation

The Foco API provides programmatic access to all platform features, enabling custom integrations and automation.

## Authentication

### API Keys
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.foco.mx/v1/projects
```

### OAuth 2.0
```javascript
// OAuth flow example
const authUrl = 'https://api.foco.mx/oauth/authorize?' +
  'client_id=YOUR_CLIENT_ID&' +
  'redirect_uri=YOUR_REDIRECT_URI&' +
  'response_type=code&' +
  'scope=read write'
```

## Base URL
```
https://api.foco.mx/v1
```

## Rate Limiting
- **Standard**: 1000 requests per hour
- **Premium**: 5000 requests per hour
- **Enterprise**: 20000 requests per hour

## Endpoints

### Projects

#### List Projects
```http
GET /projects
```

**Response:**
```json
{
  "data": [
    {
      "id": "proj_123",
      "name": "Website Redesign",
      "description": "Complete website overhaul",
      "status": "active",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z",
      "organization_id": "org_456"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1
  }
}
```

#### Create Project
```http
POST /projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "organization_id": "org_456",
  "template_id": "template_789"
}
```

#### Get Project
```http
GET /projects/{project_id}
```

#### Update Project
```http
PUT /projects/{project_id}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /projects/{project_id}
```

### Tasks

#### List Tasks
```http
GET /projects/{project_id}/tasks
```

**Query Parameters:**
- `status`: Filter by status (active, completed, archived)
- `assignee_id`: Filter by assignee
- `due_date`: Filter by due date
- `labels`: Filter by labels (comma-separated)

#### Create Task
```http
POST /projects/{project_id}/tasks
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task description",
  "assignee_id": "user_123",
  "due_date": "2024-02-01",
  "labels": ["urgent", "frontend"]
}
```

#### Get Task
```http
GET /tasks/{task_id}
```

#### Update Task
```http
PUT /tasks/{task_id}
Content-Type: application/json

{
  "title": "Updated Task Title",
  "status": "completed"
}
```

### Organizations

#### List Organizations
```http
GET /organizations
```

#### Create Organization
```http
POST /organizations
Content-Type: application/json

{
  "name": "Company Name",
  "description": "Organization description"
}
```

#### Get Organization
```http
GET /organizations/{organization_id}
```

### Users

#### Get Current User
```http
GET /users/me
```

#### List Organization Members
```http
GET /organizations/{organization_id}/members
```

#### Invite User
```http
POST /organizations/{organization_id}/invitations
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "member"
}
```

### Labels

#### List Labels
```http
GET /organizations/{organization_id}/labels
```

#### Create Label
```http
POST /organizations/{organization_id}/labels
Content-Type: application/json

{
  "name": "Bug",
  "color": "#ff0000"
}
```

### Comments

#### List Comments
```http
GET /tasks/{task_id}/comments
```

#### Create Comment
```http
POST /tasks/{task_id}/comments
Content-Type: application/json

{
  "content": "Comment text",
  "mentions": ["user_123"]
}
```

### Webhooks

#### List Webhooks
```http
GET /organizations/{organization_id}/webhooks
```

#### Create Webhook
```http
POST /organizations/{organization_id}/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["task.created", "task.updated"],
  "secret": "webhook_secret"
}
```

#### Delete Webhook
```http
DELETE /webhooks/{webhook_id}
```

## Webhook Events

### Task Events
- `task.created`: New task created
- `task.updated`: Task updated
- `task.deleted`: Task deleted
- `task.assigned`: Task assigned to user
- `task.completed`: Task marked as completed

### Project Events
- `project.created`: New project created
- `project.updated`: Project updated
- `project.deleted`: Project deleted

### User Events
- `user.joined`: User joined organization
- `user.left`: User left organization
- `user.role_changed`: User role changed

### Webhook Payload Example
```json
{
  "event": "task.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "id": "task_123",
    "title": "New Task",
    "project_id": "proj_456",
    "assignee_id": "user_789"
  }
}
```

## SDKs

### JavaScript/Node.js
```bash
npm install @foco/api-client
```

```javascript
import { FocoClient } from '@foco/api-client'

const client = new FocoClient({
  apiKey: 'your-api-key'
})

// List projects
const projects = await client.projects.list()

// Create task
const task = await client.tasks.create({
  projectId: 'proj_123',
  title: 'New Task',
  description: 'Task description'
})
```

### Python
```bash
pip install foco-api
```

```python
from foco import FocoClient

client = FocoClient(api_key='your-api-key')

# List projects
projects = client.projects.list()

# Create task
task = client.tasks.create(
    project_id='proj_123',
    title='New Task',
    description='Task description'
)
```

### Ruby
```bash
gem install foco-api
```

```ruby
require 'foco'

client = Foco::Client.new(api_key: 'your-api-key')

# List projects
projects = client.projects.list

# Create task
task = client.tasks.create(
  project_id: 'proj_123',
  title: 'New Task',
  description: 'Task description'
)
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Invalid API key
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

### Retry Logic
```javascript
async function apiCall(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        return response.json()
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        await new Promise(resolve => 
          setTimeout(resolve, parseInt(retryAfter) * 1000)
        )
        continue
      }
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
}
```

## Pagination

### Request Format
```http
GET /projects?page=2&per_page=50
```

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 50,
    "total": 150,
    "total_pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

## Filtering and Sorting

### Filtering
```http
GET /projects?status=active&created_after=2024-01-01
```

### Sorting
```http
GET /projects?sort=created_at&order=desc
```

## Bulk Operations

### Bulk Create Tasks
```http
POST /projects/{project_id}/tasks/bulk
Content-Type: application/json

{
  "tasks": [
    {
      "title": "Task 1",
      "description": "Description 1"
    },
    {
      "title": "Task 2", 
      "description": "Description 2"
    }
  ]
}
```

### Bulk Update Tasks
```http
PUT /tasks/bulk
Content-Type: application/json

{
  "task_ids": ["task_1", "task_2"],
  "updates": {
    "status": "completed"
  }
}
```

## Rate Limiting

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
```javascript
if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset')
  const waitTime = (resetTime * 1000) - Date.now()
  await new Promise(resolve => setTimeout(resolve, waitTime))
  // Retry request
}
```

## Testing

### Sandbox Environment
```
https://api-sandbox.foco.mx/v1
```

### Test Data
- Use sandbox for development
- Test webhooks with ngrok
- Mock responses for unit tests

## Support

### API Support
- **Email**: api-support@foco.mx
- **Documentation**: [docs.foco.mx](https://docs.foco.mx)
- **Status Page**: [status.foco.mx](https://status.foco.mx)

### Community
- **Developer Forum**: [developers.foco.mx](https://developers.foco.mx)
- **GitHub**: [github.com/foco/api](https://github.com/foco/api)
- **Discord**: [discord.gg/foco](https://discord.gg/foco)
