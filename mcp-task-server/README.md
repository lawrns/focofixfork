# Foco MCP Task Server

An MCP (Model Context Protocol) server for task assignment in Foco. **Admin-only access** - allows you to assign tasks to team members during vibe coding sessions without leaving your IDE.

## Features

- **list_workspaces** - List workspaces where you're an admin/owner
- **list_projects** - List projects in a workspace
- **list_members** - List team members with roles and emails
- **create_task** - Create and optionally assign a new task
- **assign_task** - Assign existing task to team member
- **list_tasks** - List tasks with filters
- **get_user_tasks** - View tasks assigned to a specific user

## Installation

```bash
cd mcp-task-server
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)
- `ADMIN_USER_ID` or `ADMIN_EMAIL` - The admin user's credentials

## IDE Integration

### Windsurf / Cursor

Add to your MCP settings (e.g., `~/.config/windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "foco-tasks": {
      "command": "node",
      "args": ["/path/to/focofixfork/mcp-task-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "ADMIN_EMAIL": "your-admin@email.com"
      }
    }
  }
}
```

## Usage Examples

During your coding session, you can say things like:

- "List my workspaces"
- "Show me all projects in the Fyves Team workspace"
- "Who are the team members in this workspace?"
- "Create a task 'Fix login bug' in the Campfire project and assign it to daniel@fyves.com"
- "Assign task abc123 to isaac@fyves.com"
- "What tasks are assigned to laurence@fyves.com?"
- "Show me all in-progress tasks"

## Security

- **Admin-only**: Only users with `admin` or `owner` role in a workspace can use these tools
- **Service Role Key**: Uses Supabase service role key to bypass RLS (handle with care)
- **Workspace Scoped**: Operations are scoped to workspaces where you're an admin

## Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build
```
