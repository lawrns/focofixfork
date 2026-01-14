export const CACHE_TTL = {
  USER_PROFILE: 60 * 60,
  USER_PROFILES: 60 * 5,
  WORKSPACE: 60 * 15,
  WORKSPACES: 60 * 5,
  WORKSPACE_MEMBERS: 60 * 1,
  PROJECT: 60 * 5,
  PROJECTS: 60 * 1,
  TASKS: 60 * 1,
  TASK_DETAIL: 60 * 2,
  ACTIVITY: 60 * 1,
  NOTIFICATIONS: 60 * 0.5,
  SEARCH: 60 * 2,
  SETTINGS: 60 * 30,
} as const

export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}`,
  USER_PROFILES: (userIds: string[]) => `users:${userIds.sort().join(',')}`,
  WORKSPACE: (workspaceId: string) => `workspace:${workspaceId}`,
  WORKSPACES: (userId: string) => `workspaces:user:${userId}`,
  WORKSPACE_MEMBERS: (workspaceId: string) => `workspace:${workspaceId}:members`,
  PROJECT: (projectId: string) => `project:${projectId}`,
  PROJECTS: (workspaceId: string) => `workspace:${workspaceId}:projects`,
  TASKS: (params: string) => `tasks:${params}`,
  TASK_DETAIL: (taskId: string) => `task:${taskId}`,
  ACTIVITY: (params: string) => `activity:${params}`,
  SEARCH: (query: string) => `search:${query}`,
} as const

export const CACHE_INVALIDATION_PATTERNS = {
  WORKSPACE: (workspaceId: string) => [
    `workspace:${workspaceId}`,
    `workspace:${workspaceId}:*`,
  ],
  PROJECT: (workspaceId: string, projectId: string) => [
    `project:${projectId}`,
    `workspace:${workspaceId}:projects`,
    `tasks:*project_id=${projectId}*`,
  ],
  TASK: (workspaceId: string, projectId?: string) => [
    `tasks:*`,
    `workspace:${workspaceId}:*`,
    ...(projectId ? [`project:${projectId}:*`] : []),
  ],
  USER: (userId: string) => [
    `user:${userId}`,
    `users:*${userId}*`,
  ],
  MEMBER: (workspaceId: string) => [
    `workspace:${workspaceId}:members`,
  ],
} as const
