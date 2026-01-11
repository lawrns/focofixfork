/**
 * Foco Copywriting Library
 * Centralized strings for consistency across the app
 */

// Empty States
export const emptyStates = {
  projects: {
    title: 'Start your first project',
    description: 'Projects organize tasks, docs, and team conversations in one place.',
    primaryCta: 'Create project',
    secondaryCta: 'Import from CSV',
  },
  inbox: {
    title: "You're all caught up",
    description: 'Mentions, assignments, and approvals will show up here.',
    primaryCta: 'Go to My Work',
  },
  inboxFiltered: {
    title: 'No notifications match your filter',
    description: 'Try adjusting your filters or check another tab.',
    primaryCta: 'Clear filters',
  },
  tasks: {
    title: 'No tasks yet',
    description: 'Tasks help you track work that needs to get done.',
    primaryCta: 'Create task',
  },
  tasksNow: {
    title: 'Your focus list is clear',
    description: 'Add tasks you want to tackle today.',
    primaryCta: 'Add task',
  },
  tasksNext: {
    title: 'Nothing queued up',
    description: 'Move tasks here when you\'re ready to work on them soon.',
    primaryCta: 'Add task',
  },
  tasksLater: {
    title: 'Backlog is empty',
    description: 'Tasks that aren\'t urgent go here.',
    primaryCta: 'Add task',
  },
  tasksWaiting: {
    title: 'Nothing blocked',
    description: 'Tasks waiting on others or external dependencies appear here.',
    primaryCta: 'Add task',
  },
  milestones: {
    title: 'No milestones yet',
    description: 'Milestones mark important dates and deliverables.',
    primaryCta: 'Create milestone',
  },
  people: {
    title: 'No team members yet',
    description: 'Invite your team to collaborate on projects.',
    primaryCta: 'Invite member',
  },
  peopleSearch: {
    title: 'No one matches your search',
    description: 'Try a different name or check the spelling.',
    primaryCta: 'Clear search',
  },
  search: {
    title: 'No results found',
    description: 'Try a different search term or check your filters.',
    primaryCta: 'Clear search',
  },
  reports: {
    title: 'No reports yet',
    description: 'Reports help you track progress and share updates.',
    primaryCta: 'Generate report',
  },
  comments: {
    title: 'No comments yet',
    description: 'Start the conversation.',
    primaryCta: 'Add comment',
  },
  activity: {
    title: 'No activity yet',
    description: 'Activity will appear here as work progresses.',
  },
} as const;

// Toast Messages
export const toasts = {
  // Success
  projectCreated: 'Project created',
  projectUpdated: 'Project updated',
  projectDeleted: 'Project deleted',
  projectArchived: 'Project archived',
  taskCreated: 'Task created',
  taskUpdated: 'Task updated',
  taskDeleted: 'Task deleted',
  taskCompleted: 'Task marked done',
  changesSaved: 'Changes saved',
  memberInvited: 'Invitation sent',
  memberRemoved: 'Member removed',
  copied: 'Copied to clipboard',
  
  // With Undo
  withUndo: (message: string) => `${message}. Undo`,
  
  // Errors
  genericError: 'Something went wrong. Try again.',
  networkError: "Couldn't connect. Check your internet and try again.",
  notFound: "This doesn't exist or you don't have access.",
  permissionDenied: "You don't have permission for this action.",
  validationError: 'Please check your input and try again.',
  rateLimited: 'Too many requests. Wait a moment and try again.',
  
  // Info
  syncing: 'Syncing changes...',
  loading: 'Loading...',
} as const;

// Error Messages
export const errors = {
  network: {
    title: 'Connection error',
    description: "Couldn't connect to the server. Check your internet and try again.",
    action: 'Try again',
  },
  notFound: {
    title: 'Not found',
    description: "This page doesn't exist or you don't have access.",
    action: 'Go back',
  },
  permission: {
    title: 'Access denied',
    description: "You don't have permission to view this. Contact the owner for access.",
    action: 'Go back',
  },
  server: {
    title: 'Something went wrong',
    description: 'We hit an unexpected error. Try again in a moment.',
    action: 'Try again',
  },
  validation: {
    required: (field: string) => `${field} is required`,
    invalid: (field: string) => `Please enter a valid ${field.toLowerCase()}`,
    tooLong: (field: string, max: number) => `${field} must be ${max} characters or less`,
    tooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
  },
} as const;

// Button Labels
export const buttons = {
  // Generic
  create: 'Create',
  save: 'Save changes',
  cancel: 'Cancel',
  done: 'Done',
  close: 'Close',
  delete: 'Delete',
  edit: 'Edit',
  duplicate: 'Duplicate',
  archive: 'Archive',
  restore: 'Restore',
  
  // Specific
  createProject: 'Create project',
  createTask: 'Create task',
  createMilestone: 'Create milestone',
  inviteMember: 'Invite member',
  generateReport: 'Generate report',
  markDone: 'Mark done',
  addComment: 'Add comment',
  
  // Loading states
  creating: 'Creating...',
  saving: 'Saving...',
  deleting: 'Deleting...',
  loading: 'Loading...',
} as const;

// Dialog Titles
export const dialogs = {
  createProject: {
    title: 'Create project',
    description: 'Add a new project to organize your work.',
  },
  editProject: {
    title: 'Edit project',
    description: 'Update project details.',
  },
  deleteProject: {
    title: 'Delete project?',
    description: (name: string) => 
      `This will permanently delete "${name}" and all its tasks. This can't be undone.`,
  },
  createTask: {
    title: 'Create task',
    description: 'Add a new task to your project.',
  },
  deleteTask: {
    title: 'Delete task?',
    description: "This will permanently delete this task. This can't be undone.",
  },
  inviteMember: {
    title: 'Invite team member',
    description: "They'll receive an email with a link to join.",
  },
  unsavedChanges: {
    title: 'Unsaved changes',
    description: 'You have unsaved changes that will be lost.',
    discard: 'Discard changes',
    keep: 'Keep editing',
  },
} as const;

// Form Labels
export const labels = {
  name: 'Name',
  title: 'Title',
  description: 'Description',
  email: 'Email',
  password: 'Password',
  dueDate: 'Due date',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  project: 'Project',
  organization: 'Organization',
} as const;

// Form Placeholders
export const placeholders = {
  projectName: 'Website redesign',
  taskTitle: 'Design the homepage',
  description: "What's this about?",
  email: 'you@company.com',
  search: 'Search...',
  searchProjects: 'Search projects...',
  searchTasks: 'Search tasks...',
  searchPeople: 'Search people...',
} as const;

// Helper Text
export const helperText = {
  description: 'Optional. A few sentences to help your team understand.',
  dueDate: 'When should this be complete?',
  priority: 'How urgent is this?',
  assignee: 'Who will work on this?',
} as const;

// Navigation
export const nav = {
  home: 'Home',
  inbox: 'Inbox',
  myWork: 'My Work',
  projects: 'Projects',
  timeline: 'Timeline',
  docs: 'Docs',
  people: 'People',
  reports: 'Reports',
  settings: 'Settings',
} as const;

// Status Labels
export const statusLabels = {
  backlog: 'Backlog',
  todo: 'To do',
  inProgress: 'In progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
} as const;

// Priority Labels
export const priorityLabels = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
} as const;

// AI-related
export const ai = {
  suggestion: 'AI suggestion',
  generating: 'Generating...',
  apply: 'Apply',
  dismiss: 'Dismiss',
  editFirst: 'Edit first',
  showSources: 'Show sources',
  confidence: (percent: number) => `${percent}% confident`,
  basedOn: (count: number) => `Based on ${count} items`,
  actions: {
    suggestAssignee: 'Suggest assignee',
    breakIntoSubtasks: 'Break into subtasks',
    estimateTime: 'Estimate time',
    generateUpdate: 'Generate status update',
    summarize: 'Summarize',
  },
} as const;

// Onboarding
export const onboarding = {
  welcome: {
    title: 'Welcome to Foco',
    description: "Let's set up your workspace in about 2 minutes.",
    cta: 'Get started',
  },
  createProject: {
    title: 'Create your first project',
    description: 'Give your project a name. You can always change it later.',
  },
  addTasks: {
    title: 'Add some tasks',
    description: 'Break your project into actionable items.',
  },
  inviteTeam: {
    title: 'Invite your team',
    description: 'Collaboration works better together.',
    skip: 'Skip for now',
  },
  complete: {
    title: "You're all set!",
    description: 'Your workspace is ready. Here\'s what you can do next:',
    cta: 'Go to dashboard',
  },
} as const;
