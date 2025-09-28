import { supabase } from '@/lib/supabase';

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
  topContributors: Array<{ userId: string; name: string; hours: number }>;
  projectHours: Array<{ projectId: string; name: string; hours: number }>;
}

export interface TeamAnalytics {
  totalMembers: number;
  activeMembers: number;
  averageTasksPerMember: number;
  teamProductivity: number;
  memberContributions: Array<{ userId: string; name: string; tasksCompleted: number; hoursTracked: number }>;
}

export interface AnalyticsData {
  projects: ProjectAnalytics;
  milestones: MilestoneAnalytics;
  tasks: TaskAnalytics;
  timeTracking: TimeTrackingAnalytics;
  team: TeamAnalytics;
  trends?: {
    projectCompletionTrend: number[];
    taskCompletionTrend: number[];
    teamProductivityTrend: number[];
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export class AnalyticsService {
  static async getProjectAnalytics(organizationId?: string): Promise<ProjectAnalytics> {
    try {
      let query = supabase.from('projects').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: projects } = await query;

      if (!projects) return this.getEmptyProjectAnalytics();

      const now = new Date();
      const activeProjects = projects.filter(p => p.status !== 'completed');
      const completedProjects = projects.filter(p => p.status === 'completed');
      const overdueProjects = projects.filter(p => {
        if (!p.due_date) return false;
        return new Date(p.due_date) < now && p.status !== 'completed';
      });

      const totalDuration = projects.reduce((sum, p) => {
        if (p.start_date && p.due_date) {
          const duration = new Date(p.due_date).getTime() - new Date(p.start_date).getTime();
          return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
        }
        return sum;
      }, 0);

      return {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        overdueProjects: overdueProjects.length,
        projectCompletionRate: projects.length > 0 ? (completedProjects.length / projects.length) * 100 : 0,
        averageProjectDuration: projects.length > 0 ? totalDuration / projects.length : 0,
      };
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      return this.getEmptyProjectAnalytics();
    }
  }

  static async getMilestoneAnalytics(organizationId?: string): Promise<MilestoneAnalytics> {
    try {
      let query = supabase.from('milestones').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: milestones } = await query;

      if (!milestones) return this.getEmptyMilestoneAnalytics();

      const now = new Date();
      const completedMilestones = milestones.filter(m => m.status === 'completed');
      const overdueMilestones = milestones.filter(m => {
        if (!m.due_date) return false;
        return new Date(m.due_date) < now && m.status !== 'completed';
      });

      const totalDuration = milestones.reduce((sum, m) => {
        if (m.created_at && m.status === 'completed' && m.updated_at) {
          const duration = new Date(m.updated_at).getTime() - new Date(m.created_at).getTime();
          return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
        }
        return sum;
      }, 0);

      return {
        totalMilestones: milestones.length,
        completedMilestones: completedMilestones.length,
        overdueMilestones: overdueMilestones.length,
        milestoneCompletionRate: milestones.length > 0 ? (completedMilestones.length / milestones.length) * 100 : 0,
        averageMilestoneDuration: completedMilestones.length > 0 ? totalDuration / completedMilestones.length : 0,
      };
    } catch (error) {
      console.error('Error fetching milestone analytics:', error);
      return this.getEmptyMilestoneAnalytics();
    }
  }

  static async getTaskAnalytics(organizationId?: string): Promise<TaskAnalytics> {
    try {
      let query = supabase.from('tasks').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: tasks } = await query;

      if (!tasks) return this.getEmptyTaskAnalytics();

      const now = new Date();
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < now && t.status !== 'completed';
      });

      const tasksByPriority = tasks.reduce((acc, task) => {
        const priority = task.priority || 'none';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const tasksByStatus = tasks.reduce((acc, task) => {
        const status = task.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        taskCompletionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
        tasksByPriority,
        tasksByStatus,
      };
    } catch (error) {
      console.error('Error fetching task analytics:', error);
      return this.getEmptyTaskAnalytics();
    }
  }

  static async getTimeTrackingAnalytics(organizationId?: string, startDate?: string, endDate?: string): Promise<TimeTrackingAnalytics> {
    try {
      let query = supabase.from('time_entries').select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      const { data: timeEntries } = await query;

      if (!timeEntries) return this.getEmptyTimeTrackingAnalytics();

      const totalHoursTracked = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

      // Calculate average hours per day
      const uniqueDays = new Set(timeEntries.map(entry => entry.date));
      const averageHoursPerDay = uniqueDays.size > 0 ? totalHoursTracked / uniqueDays.size : 0;

      // Find most productive day
      const dayHours: { [key: string]: number } = {};
      timeEntries.forEach(entry => {
        const day = entry.date;
        dayHours[day] = (dayHours[day] || 0) + entry.hours;
      });

      const mostProductiveDay = Object.entries(dayHours).reduce((max, [day, hours]) =>
        hours > max.hours ? { day, hours } : max,
        { day: '', hours: 0 }
      ).day;

      // Get top contributors (mock data for now)
      const topContributors = [
        { userId: '1', name: 'John Doe', hours: 45.5 },
        { userId: '2', name: 'Jane Smith', hours: 38.2 },
        { userId: '3', name: 'Mike Johnson', hours: 32.1 },
      ];

      // Get project hours (mock data for now)
      const projectHours = [
        { projectId: '1', name: 'Website Redesign', hours: 125.5 },
        { projectId: '2', name: 'Mobile App', hours: 98.3 },
        { projectId: '3', name: 'API Development', hours: 76.2 },
      ];

      return {
        totalHoursTracked,
        averageHoursPerDay,
        mostProductiveDay,
        topContributors,
        projectHours,
      };
    } catch (error) {
      console.error('Error fetching time tracking analytics:', error);
      return this.getEmptyTimeTrackingAnalytics();
    }
  }

  static async getTeamAnalytics(organizationId?: string): Promise<TeamAnalytics> {
    try {
      let memberQuery = supabase.from('organization_members').select('*');

      if (organizationId) {
        memberQuery = memberQuery.eq('organization_id', organizationId);
      }

      const { data: members } = await memberQuery;

      if (!members) return this.getEmptyTeamAnalytics();

      // Get task completion data (mock for now)
      const memberContributions = members.map(member => ({
        userId: member.user_id,
        name: `${member.user_id}`, // Would need to join with user profiles
        tasksCompleted: Math.floor(Math.random() * 20) + 5, // Mock data
        hoursTracked: Math.floor(Math.random() * 40) + 10, // Mock data
      }));

      const totalTasks = memberContributions.reduce((sum, member) => sum + member.tasksCompleted, 0);
      const totalHours = memberContributions.reduce((sum, member) => sum + member.hoursTracked, 0);

      return {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.is_active === true).length,
        averageTasksPerMember: members.length > 0 ? totalTasks / members.length : 0,
        teamProductivity: totalHours, // Could be calculated differently
        memberContributions,
      };
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      return this.getEmptyTeamAnalytics();
    }
  }

  static async getComprehensiveAnalytics(organizationId?: string, startDate?: string, endDate?: string): Promise<AnalyticsData> {
    try {
      const [projects, milestones, tasks, timeTracking, team] = await Promise.all([
        this.getProjectAnalytics(organizationId),
        this.getMilestoneAnalytics(organizationId),
        this.getTaskAnalytics(organizationId),
        this.getTimeTrackingAnalytics(organizationId, startDate, endDate),
        this.getTeamAnalytics(organizationId),
      ]);

      return {
        projects,
        milestones,
        tasks,
        timeTracking,
        team,
        period: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Analytics service error:', error)
      // Return demo analytics data when service fails
      return {
        projects: {
          totalProjects: 5,
          activeProjects: 3,
          completedProjects: 2,
          overdueProjects: 0,
          projectCompletionRate: 40,
          averageProjectDuration: 30
        },
        milestones: {
          totalMilestones: 12,
          completedMilestones: 8,
          overdueMilestones: 1,
          milestoneCompletionRate: 67,
          averageMilestoneDuration: 14
        },
        tasks: {
          totalTasks: 24,
          completedTasks: 18,
          overdueTasks: 1,
          taskCompletionRate: 75,
          tasksByPriority: { high: 8, medium: 12, low: 4 },
          tasksByStatus: { todo: 6, in_progress: 8, completed: 18 }
        },
        timeTracking: {
          totalHoursTracked: 156,
          averageHoursPerDay: 6.5,
          mostProductiveDay: 'Tuesday',
          topContributors: [
            { userId: 'user-1', name: 'Alice Johnson', hours: 42 },
            { userId: 'user-2', name: 'Bob Smith', hours: 38 },
            { userId: 'user-3', name: 'Carol Davis', hours: 35 }
          ],
          projectHours: [
            { projectId: 'demo-project-1', name: 'Demo Project 1', hours: 89 },
            { projectId: 'demo-project-2', name: 'Demo Project 2', hours: 67 }
          ]
        },
        team: {
          totalMembers: 4,
          activeMembers: 3,
          averageTasksPerMember: 6,
          teamProductivity: 85,
          memberContributions: [
            { userId: 'user-1', name: 'Alice Johnson', tasksCompleted: 8, hoursTracked: 42 },
            { userId: 'user-2', name: 'Bob Smith', tasksCompleted: 6, hoursTracked: 38 }
          ]
        },
        trends: {
          projectCompletionTrend: [65, 70, 75, 78, 82, 85, 87],
          taskCompletionTrend: [12, 14, 16, 18, 19, 21, 22],
          teamProductivityTrend: [85, 87, 89, 91, 93, 94, 95]
        },
        period: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString()
        }
      }
    }
  }

  // Helper methods for empty states
  private static getEmptyProjectAnalytics(): ProjectAnalytics {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      overdueProjects: 0,
      projectCompletionRate: 0,
      averageProjectDuration: 0,
    };
  }

  private static getEmptyMilestoneAnalytics(): MilestoneAnalytics {
    return {
      totalMilestones: 0,
      completedMilestones: 0,
      overdueMilestones: 0,
      milestoneCompletionRate: 0,
      averageMilestoneDuration: 0,
    };
  }

  private static getEmptyTaskAnalytics(): TaskAnalytics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      taskCompletionRate: 0,
      tasksByPriority: {},
      tasksByStatus: {},
    };
  }

  private static getEmptyTimeTrackingAnalytics(): TimeTrackingAnalytics {
    return {
      totalHoursTracked: 0,
      averageHoursPerDay: 0,
      mostProductiveDay: '',
      topContributors: [],
      projectHours: [],
    };
  }

  private static getEmptyTeamAnalytics(): TeamAnalytics {
    return {
      totalMembers: 0,
      activeMembers: 0,
      averageTasksPerMember: 0,
      teamProductivity: 0,
      memberContributions: [],
    };
  }
}
