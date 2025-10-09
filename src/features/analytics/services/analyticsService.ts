import { supabase } from '@/lib/supabase-client'

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

export interface AnalyticsOverview {
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

export class AnalyticsService {
  // ===============================
  // PROJECT ANALYTICS
  // ===============================

  static async getProjectAnalytics(organizationId?: string): Promise<ProjectAnalytics> {
    try {
      let query = supabase.from('projects').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: projects } = await query;

      if (!projects || projects.length === 0) {
        return {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          overdueProjects: 0,
          projectCompletionRate: 0,
          averageProjectDuration: 0
        };
      }

      const now = new Date();
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning');
      const completedProjects = projects.filter(p => p.status === 'completed');
      const overdueProjects = projects.filter(p => {
        if (!p.due_date) return false;
        const dueDate = new Date(p.due_date);
        return dueDate < now && p.status !== 'completed';
      });

      const projectCompletionRate = projects.length > 0 ? (completedProjects.length / projects.length) * 100 : 0;

      // Calculate average duration for completed projects
      const completedWithDates = completedProjects.filter(p => p.start_date && p.due_date);
      const averageProjectDuration = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, p) => {
            const start = new Date(p.start_date!);
            const end = new Date(p.due_date!);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
          }, 0) / completedWithDates.length
        : 0;

      return {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        overdueProjects: overdueProjects.length,
        projectCompletionRate: Math.round(projectCompletionRate * 100) / 100,
        averageProjectDuration: Math.round(averageProjectDuration * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        overdueProjects: 0,
        projectCompletionRate: 0,
        averageProjectDuration: 0
      };
    }
  }

  // ===============================
  // MILESTONE ANALYTICS
  // ===============================

  static async getMilestoneAnalytics(organizationId?: string): Promise<MilestoneAnalytics> {
    try {
      let query = supabase.from('milestones').select('*');

      if (organizationId) {
        // Join with projects to filter by organization
        query = supabase
          .from('milestones')
          .select('*, projects!inner(organization_id)')
          .eq('projects.organization_id', organizationId);
      }

      const { data: milestones } = await query;

      if (!milestones || milestones.length === 0) {
        return {
          totalMilestones: 0,
          completedMilestones: 0,
          overdueMilestones: 0,
          milestoneCompletionRate: 0,
          averageMilestoneDuration: 0
        };
      }

      const now = new Date();
      const completedMilestones = milestones.filter(m => m.status === 'green');
      const overdueMilestones = milestones.filter(m => {
        if (!m.deadline) return false;
        const deadline = new Date(m.deadline);
        return deadline < now && m.status !== 'green';
      });

      const milestoneCompletionRate = milestones.length > 0 ? (completedMilestones.length / milestones.length) * 100 : 0;

      // Calculate average duration (this is simplified - would need start dates)
      const averageMilestoneDuration = 14; // Placeholder: 2 weeks average

      return {
        totalMilestones: milestones.length,
        completedMilestones: completedMilestones.length,
        overdueMilestones: overdueMilestones.length,
        milestoneCompletionRate: Math.round(milestoneCompletionRate * 100) / 100,
        averageMilestoneDuration
      };
    } catch (error) {
      console.error('Error fetching milestone analytics:', error);
      return {
        totalMilestones: 0,
        completedMilestones: 0,
        overdueMilestones: 0,
        milestoneCompletionRate: 0,
        averageMilestoneDuration: 0
      };
    }
  }

  // ===============================
  // TASK ANALYTICS
  // ===============================

  static async getTaskAnalytics(organizationId?: string): Promise<TaskAnalytics> {
    try {
      let query = supabase.from('tasks').select('*');

      if (organizationId) {
        // Join with projects to filter by organization
        query = supabase
          .from('tasks')
          .select('*, projects!inner(organization_id)')
          .eq('projects.organization_id', organizationId);
      }

      const { data: tasks } = await query;

      if (!tasks || tasks.length === 0) {
        return {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          taskCompletionRate: 0,
          tasksByPriority: {},
          tasksByStatus: {}
        };
      }

      const now = new Date();
      const completedTasks = tasks.filter(t => t.status === 'done');
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < now && t.status !== 'done';
      });

      const taskCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

      const tasksByPriority = tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tasksByStatus = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
        tasksByPriority,
        tasksByStatus
      };
    } catch (error) {
      console.error('Error fetching task analytics:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        taskCompletionRate: 0,
        tasksByPriority: {},
        tasksByStatus: {}
      };
    }
  }

  // ===============================
  // TIME TRACKING ANALYTICS
  // ===============================

  static async getTimeTrackingAnalytics(organizationId?: string, startDate?: string, endDate?: string): Promise<TimeTrackingAnalytics> {
    try {
      let query = supabase.from('time_entries').select('*') as any;

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: timeEntries } = await query;

      if (!timeEntries || timeEntries.length === 0) {
        return {
          totalHoursTracked: 0,
          averageHoursPerDay: 0,
          mostProductiveDay: '',
          topContributors: [],
          hoursByProject: []
        };
      }

      // Calculate total hours from hours column
      const totalHoursTracked = timeEntries.reduce((sum, entry) => {
        if (entry.hours) {
          return sum + entry.hours;
        }
        return sum;
      }, 0);

      // Calculate average hours per day
      const uniqueDays = new Set(timeEntries.map(entry => {
        const date = new Date(entry.date);
        return date.toISOString().split('T')[0]; // Extract date part
      }));
      const averageHoursPerDay = uniqueDays.size > 0 ? totalHoursTracked / uniqueDays.size : 0;

      // Find most productive day
      const dayHours: { [key: string]: number } = {};
      timeEntries.forEach(entry => {
        const day = new Date(entry.date).toISOString().split('T')[0];
        const hours = entry.hours || 0;
        dayHours[day] = (dayHours[day] || 0) + hours;
      });

      const mostProductiveDay = Object.entries(dayHours).reduce((max, [day, hours]) =>
        hours > max.hours ? { day, hours } : max,
        { day: '', hours: 0 }
      ).day;

      // Get top contributors - aggregate hours by user
      const userHours: { [userId: string]: number } = {};
      timeEntries.forEach(entry => {
        if (entry.user_id && entry.hours) {
          userHours[entry.user_id] = (userHours[entry.user_id] || 0) + entry.hours;
        }
      });

      // Fetch user names for top contributors
      const topUserIds = Object.entries(userHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId);

      const topContributors: Array<{ userId: string; name: string; hours: number }> = [];
      if (topUserIds.length > 0) {
        // Simplified - in real implementation would fetch user names
        topContributors.push(...topUserIds.map((userId, index) => ({
          userId,
          name: `User ${index + 1}`,
          hours: userHours[userId]
        })));
      }

      // Hours by project (simplified)
      const hoursByProject: Array<{ projectId: string; projectName: string; hours: number }> = [];

      return {
        totalHoursTracked: Math.round(totalHoursTracked * 100) / 100,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
        mostProductiveDay,
        topContributors,
        hoursByProject
      };
    } catch (error) {
      console.error('Error fetching time tracking analytics:', error);
      return {
        totalHoursTracked: 0,
        averageHoursPerDay: 0,
        mostProductiveDay: '',
        topContributors: [],
        hoursByProject: []
      };
    }
  }

  // ===============================
  // TEAM ANALYTICS
  // ===============================

  static async getTeamAnalytics(organizationId?: string): Promise<TeamAnalytics> {
    try {
      let memberQuery = supabase.from('organization_members').select('*');

      if (organizationId) {
        memberQuery = memberQuery.eq('organization_id', organizationId);
      }

      const { data: members } = await memberQuery;

      if (!members || members.length === 0) {
        return {
          totalMembers: 0,
          activeMembers: 0,
          averageTasksPerMember: 0,
          memberProductivity: []
        };
      }

      const activeMembers = members.filter(m => m.is_active);

      // Get tasks per member (simplified)
      const memberProductivity: Array<{
        userId: string;
        name: string;
        tasksCompleted: number;
        hoursTracked: number;
      }> = [];

      for (const member of activeMembers.slice(0, 5)) { // Limit to top 5 for performance
        // Get user details
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', member.user_id)
          .single();

        if (!user) continue;

        // Get tasks completed by this user
        const { count: tasksCompleted } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'done');

        // Get time tracked by this user
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('hours')
          .eq('user_id', user.id);

        const hoursTracked = timeEntries?.reduce((sum, entry) => {
          return sum + (entry.hours || 0);
        }, 0) || 0;

        memberProductivity.push({
          userId: user.id,
          name: user.full_name || user.email || 'Unknown User',
          tasksCompleted: tasksCompleted || 0,
          hoursTracked: Math.round(hoursTracked * 100) / 100
        });
      }

      const totalTasks = memberProductivity.reduce((sum, member) => sum + member.tasksCompleted, 0);
      const averageTasksPerMember = activeMembers.length > 0 ? totalTasks / activeMembers.length : 0;

      return {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        averageTasksPerMember: Math.round(averageTasksPerMember * 100) / 100,
        memberProductivity
      };
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        averageTasksPerMember: 0,
        memberProductivity: []
      };
    }
  }

  // ===============================
  // COMPREHENSIVE ANALYTICS
  // ===============================

  static async getComprehensiveAnalytics(organizationId?: string, startDate?: string, endDate?: string): Promise<AnalyticsOverview> {
    try {
      const [projectAnalytics, milestoneAnalytics, taskAnalytics, timeTrackingAnalytics, teamAnalytics] = await Promise.all([
        this.getProjectAnalytics(organizationId),
        this.getMilestoneAnalytics(organizationId),
        this.getTaskAnalytics(organizationId),
        this.getTimeTrackingAnalytics(organizationId, startDate, endDate),
        this.getTeamAnalytics(organizationId)
      ]);

      return {
        projects: projectAnalytics,
        milestones: milestoneAnalytics,
        tasks: taskAnalytics,
        timeTracking: timeTrackingAnalytics,
        team: teamAnalytics,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating comprehensive analytics:', error);
      // Return empty analytics on error
      return {
        projects: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          overdueProjects: 0,
          projectCompletionRate: 0,
          averageProjectDuration: 0
        },
        milestones: {
          totalMilestones: 0,
          completedMilestones: 0,
          overdueMilestones: 0,
          milestoneCompletionRate: 0,
          averageMilestoneDuration: 0
        },
        tasks: {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          taskCompletionRate: 0,
          tasksByPriority: {},
          tasksByStatus: {}
        },
        timeTracking: {
          totalHoursTracked: 0,
          averageHoursPerDay: 0,
          mostProductiveDay: '',
          topContributors: [],
          hoursByProject: []
        },
        team: {
          totalMembers: 0,
          activeMembers: 0,
          averageTasksPerMember: 0,
          memberProductivity: []
        },
        generatedAt: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService;
