# Dialog Components

This directory contains reusable dialog components for project management operations.

## Components

### ProjectEditDialog

A comprehensive dialog for editing project details including name, description, status, and priority.

**Props:**
- `project: Project` - The project object to edit
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback for open state changes
- `onSave: (projectId: string, data: UpdateProject) => Promise<void>` - Save callback

**Features:**
- Form validation using Zod schemas
- Real-time validation feedback
- Confirmation for unsaved changes
- Toast notifications for success/error
- Keyboard navigation support

**Usage:**
```tsx
import ProjectEditDialog from '@/components/dialogs/project-edit-dialog'

function MyComponent() {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSave = async (projectId: string, data: UpdateProject) => {
    // API call to update project
  }

  return (
    <ProjectEditDialog
      project={editingProject!}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onSave={handleSave}
    />
  )
}
```

### ProjectDeleteDialog

A confirmation dialog for deleting projects with safety measures.

**Props:**
- `project: Project | null` - The project to delete
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback for open state changes
- `onDelete: (projectId: string) => Promise<void>` - Delete callback

**Features:**
- Type project name to confirm deletion
- Warning messages about data loss
- Cannot delete yourself from project
- Toast notifications

### TeamManagementDialog

Dialog for managing project team members and roles.

**Props:**
- `projectId: string` - Project ID
- `projectName: string` - Project name for display
- `currentUserId: string` - Current user ID
- `teamMembers: TeamMember[]` - Current team members
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback for open state changes
- `onAddMember: (projectId: string, data: AddTeamMember) => Promise<void>` - Add member callback
- `onRemoveMember: (projectId: string, userId: string) => Promise<void>` - Remove member callback
- `onUpdateRole: (projectId: string, userId: string, role: TeamMemberRole) => Promise<void>` - Update role callback

**Features:**
- Add new team members with role assignment
- Update existing member roles
- Remove members (with restrictions)
- Role-based permissions (admin, member, guest)
- Real-time team member list

### BulkOperationsDialog

Dialog for performing bulk operations on multiple projects.

**Props:**
- `selectedProjects: Project[]` - Selected projects for operation
- `operation: 'archive' | 'delete' | null` - Operation type
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback for open state changes
- `onExecute: (operation: 'archive' | 'delete', projectIds: string[]) => Promise<BulkResult>` - Execute callback

**Features:**
- Progress tracking during operations
- Partial failure handling
- Detailed results display
- Operation-specific warnings

### ProjectSettingsDialog

Tabbed dialog for configuring project settings.

**Props:**
- `project: Project` - The project to configure
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Callback for open state changes
- `onSave: (projectId: string, settings: ProjectSettings) => Promise<void>` - Save callback

**Features:**
- Tabbed interface (General, Notifications, Permissions, Advanced)
- Settings persistence
- Real-time validation
- Role-based access to settings

## API Integration

All dialogs integrate with the following API endpoints:

### Projects API
- `PUT /api/projects/[id]` - Update project details
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/bulk` - Bulk operations

### Team API
- `POST /api/projects/[id]/team` - Add team member
- `GET /api/projects/[id]/team` - Get team members
- `DELETE /api/projects/[id]/team/[userId]` - Remove team member
- `PUT /api/projects/[id]/team/[userId]` - Update member role

## Validation

All dialogs use Zod schemas for validation:
- `ProjectSchema` - Full project validation
- `CreateProjectSchema` - Project creation validation
- `UpdateProjectSchema` - Project update validation
- `AddTeamMemberSchema` - Team member addition validation
- `UpdateTeamMemberSchema` - Role update validation
- `BulkTeamOperationSchema` - Bulk team operations validation

## Accessibility

All dialogs are designed with accessibility in mind:
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support
- WCAG 2.1 AA compliance

## Error Handling

Dialogs include comprehensive error handling:
- Form validation errors
- API error handling
- Network error recovery
- User-friendly error messages
- Toast notifications for feedback

## Performance

Dialogs are optimized for performance:
- Lazy loading of heavy components
- Efficient re-rendering
- Memory leak prevention
- Bundle size optimization

## Testing

Dialogs include comprehensive test coverage:
- Unit tests for validation schemas
- Integration tests for user interactions
- Accessibility tests for WCAG compliance
- Performance tests for load times
- E2E tests for complete workflows

