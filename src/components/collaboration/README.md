# Collaborative Features

This directory contains components and utilities for real-time collaboration features including cursor tracking, presence indicators, and user awareness.

## Components

### CollaborativeCursor
Displays real-time cursor positions and presence indicators for other users viewing the same page.

**Features:**
- Real-time cursor display with user name and avatar
- Colored cursor indicators (color assigned per user)
- Presence list showing online/away/offline users
- Smooth animations for cursor movements
- Throttled updates (100ms) to reduce network traffic

**Props:**
```typescript
interface CollaborativeCursorProps {
  users: CollaborationUser[]              // List of users with presence data
  currentUserId: string                   // Current user's ID (to exclude self)
  pagePath: string                        // Current page path for context
  onBroadcastCursor?: (payload: CursorBroadcastPayload) => void // Cursor broadcast callback
  showPresenceList?: boolean              // Show/hide presence indicator list
  className?: string                      // Additional CSS classes
}
```

**Example:**
```tsx
<CollaborativeCursor
  users={collaboratingUsers}
  currentUserId={session.user.id}
  pagePath="/tasks/123"
  onBroadcastCursor={broadcastCursor}
  showPresenceList={true}
/>
```

### CollaborativeWorkspace
Wrapper component that integrates collaborative cursor tracking with Supabase Realtime.

**Features:**
- Automatic presence tracking
- Cursor position broadcasting
- Connection status indicator
- User filtering (excludes current user)

**Props:**
```typescript
interface CollaborativeWorkspaceProps {
  entityId: string                    // Task/Project ID
  entityType: 'project' | 'task'      // Entity type
  pagePath: string                    // Current page path
  showPresenceList?: boolean          // Show presence list
  className?: string                  // Additional CSS classes
  children?: React.ReactNode          // Content to wrap
}
```

**Example:**
```tsx
<CollaborativeWorkspace
  entityId={taskId}
  entityType="task"
  pagePath="/tasks/123"
  showPresenceList={true}
>
  <TaskDetailContent />
</CollaborativeWorkspace>
```

## Hooks

### useCollaborativeCursor
Custom hook managing collaborative cursor presence via Supabase Realtime.

**Features:**
- Automatic channel subscription
- Presence synchronization
- Cursor position broadcasting
- Connection status tracking
- User color generation

**Returns:**
```typescript
{
  users: CollaborationUser[]                // Active users
  isConnected: boolean                      // Connection status
  broadcastCursor: (payload: CursorBroadcastPayload) => void // Broadcast function
}
```

**Example:**
```tsx
const { users, isConnected, broadcastCursor } = useCollaborativeCursor({
  entityId: 'task-123',
  entityType: 'task',
  pagePath: '/tasks/123',
  currentUserId: userId,
  currentUserName: userName,
  currentUserAvatar: avatarUrl,
})
```

## Data Models

### CollaborationUser
```typescript
interface CollaborationUser {
  user_id: string                    // Unique user ID
  user_name: string                  // Display name
  avatar?: string                    // Avatar URL
  status: PresenceStatus            // 'online' | 'away' | 'offline'
  last_seen: string                  // ISO timestamp
  cursor_position?: CursorPosition   // Current cursor coordinates
  selection?: TextSelection          // Selected text range
  color: string                      // Hex color for UI representation
}

interface CursorPosition {
  line: number                       // Line number (0-indexed)
  column: number                     // Column number (0-indexed)
  offset: number                     // Absolute offset in text
}

interface PresenceStatus {
  'online' | 'away' | 'offline'
}
```

### CursorBroadcastPayload
```typescript
interface CursorBroadcastPayload {
  user_id: string                    // Current user ID
  cursor_x: number                   // X coordinate (pixels)
  cursor_y: number                   // Y coordinate (pixels)
  page_path: string                  // Current page path
  timestamp?: number                 // Event timestamp
}
```

## Integration Guide

### Step 1: Wrap Page with CollaborativeWorkspace

```tsx
// src/app/tasks/[id]/page.tsx
import CollaborativeWorkspace from '@/components/collaboration/collaborative-workspace'

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return (
    <CollaborativeWorkspace
      entityId={params.id}
      entityType="task"
      pagePath={`/tasks/${params.id}`}
      showPresenceList={true}
    >
      <TaskDetailContent id={params.id} />
    </CollaborativeWorkspace>
  )
}
```

### Step 2: Use Hook Directly (Optional)

```tsx
import { useCollaborativeCursor } from '@/lib/hooks/use-collaborative-cursor'
import CollaborativeCursor from '@/components/collaboration/collaborative-cursor'

export default function CustomPage() {
  const { user } = useAuth()
  const { users, isConnected, broadcastCursor } = useCollaborativeCursor({
    entityId: 'my-entity',
    entityType: 'task',
    pagePath: '/my-page',
    currentUserId: user.id,
    currentUserName: user.name,
    currentUserAvatar: user.avatar_url,
  })

  return (
    <CollaborativeCursor
      users={users}
      currentUserId={user.id}
      pagePath="/my-page"
      onBroadcastCursor={broadcastCursor}
      showPresenceList={true}
    />
  )
}
```

## Supabase Realtime Setup

The implementation uses Supabase Realtime for presence tracking. Ensure:

1. Supabase Realtime is enabled in your project
2. Presence channel naming convention: `presence:{entityType}:{entityId}`
3. Broadcast events: `cursor_position`

### Database Schema (Optional for Advanced Features)

```sql
-- Presence tracking table (if using custom presence storage)
CREATE TABLE collaboration_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  entity_type TEXT,
  entity_id TEXT,
  cursor_position JSONB,
  status TEXT DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);
```

## Performance Considerations

1. **Throttling**: Cursor updates are throttled to 100ms to reduce bandwidth
2. **Filtering**: Current user is automatically filtered from presence list
3. **Cleanup**: Resources are cleaned up on component unmount
4. **Connection**: Automatic reconnection on network failure

## Testing

All components include comprehensive test coverage using Vitest:

```bash
npm test -- src/components/collaboration/__tests__/collaborative-cursor.test.tsx
```

Test coverage includes:
- Cursor position broadcasting
- Real-time cursor display updates
- User presence list management
- Cursor disappearance on disconnect
- Color assignment and consistency
- Throttling behavior
- Empty states and edge cases

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch events
