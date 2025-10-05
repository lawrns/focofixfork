// Analytics Feature Types

export interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  projectCompletionRate: number;
  averageProjectDuration: number;
}

export interface MilestoneAnalytics {
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  milestoneCompletionRate: number;
  averageMilestoneDuration: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  taskCompletionRate: number;
  tasksByPriority: { [key: string]: number };
  tasksByStatus: { [key: string]: number };
}

export interface TimeTrackingAnalytics {
  totalHoursTracked: number;
  averageHoursPerDay: number;
  mostProductiveDay: string;
  topContributors: Array<{
    userId: string;
    name: string;
    hours: number;
  }>;
  hoursByProject: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
}

export interface TeamAnalytics {
  totalMembers: number;
  activeMembers: number;
  averageTasksPerMember: number;
  memberProductivity: Array<{
    userId: string;
    name: string;
    tasksCompleted: number;
    hoursTracked: number;
  }>;
}

export interface AnalyticsData {
  projects: ProjectAnalytics;
  milestones: MilestoneAnalytics;
  tasks: TaskAnalytics;
  timeTracking: TimeTrackingAnalytics;
  team: TeamAnalytics;
  generatedAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AnalyticsFilters {
  organizationId?: string;
  projectId?: string;
  userId?: string;
  dateRange?: DateRange;
}
