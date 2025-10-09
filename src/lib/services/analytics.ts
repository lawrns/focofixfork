import { supabase } from '@/lib/supabase-client';

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
      let milestones: any[] | null = null;

      if (organizationId) {
        const result = await (supabase as any).from('milestones').select('*').eq('organization_id', organizationId);
        milestones = result.data;
      } else {
        const result = await (supabase as any).from('milestones').select('*');
        milestones = result.data;
      }

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
      let tasks: any[] | null = null;

      if (organizationId) {
        const result = await (supabase as any).from('tasks').select('*').eq('organization_id', organizationId);
        tasks = result.data;
      } else {
        const result = await (supabase as any).from('tasks').select('*');
        tasks = result.data;
      }

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

      if (!timeEntries) return this.getEmptyTimeTrackingAnalytics();

      // Calculate total hours from duration_minutes (convert to hours)
      const totalHoursTracked = timeEntries.reduce((sum, entry) => {
        if (entry.duration_minutes) {
          return sum + (entry.duration_minutes / 60);
        }
        // If no duration_minutes, calculate from start_time and end_time if available
        if (entry.start_time && entry.end_time) {
          const durationMs = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
          return sum + (durationMs / (1000 * 60 * 60)); // Convert ms to hours
        }
        return sum;
      }, 0);

      // Calculate average hours per day
      const uniqueDays = new Set(timeEntries.map(entry => {
        const date = new Date(entry.start_time);
        return date.toISOString().split('T')[0]; // Extract date part
      }));
      const averageHoursPerDay = uniqueDays.size > 0 ? totalHoursTracked / uniqueDays.size : 0;

      // Find most productive day
      const dayHours: { [key: string]: number } = {};
      timeEntries.forEach(entry => {
        const day = new Date(entry.start_time).toISOString().split('T')[0];
        const hours = entry.duration_minutes ? entry.duration_minutes / 60 :
          (entry.start_time && entry.end_time ?
            (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60) : 0);
        dayHours[day] = (dayHours[day] || 0) + hours;
      });

      const mostProductiveDay = Object.entries(dayHours).reduce((max, [day, hours]) =>
        hours > max.hours ? { day, hours } : max,
        { day: '', hours: 0 }
      ).day;

      // Get top contributors - aggregate hours by user
      const userHours: { [userId: string]: number } = {};
      timeEntries.forEach(entry => {
        if (entry.user_id) {
          const hours = entry.duration_minutes ? entry.duration_minutes / 60 :
            (entry.start_time && entry.end_time ?
              (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60) : 0);
          userHours[entry.user_id] = (userHours[entry.user_id] || 0) + hours;
        }
      });

      // Fetch user names for top contributors
      const topUserIds = Object.entries(userHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId);

      const topContributors: Array<{ userId: string; name: string; hours: number }> = [];
      if (topUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', topUserIds);

        if (users) {
          topContributors.push(...users.map(user => ({
            userId: user.id,
            name: user.full_name || user.email || 'Unknown User',
            hours: Math.round(userHours[user.id] * 10) / 10
          })));
        }
      }

      // Get project hours - aggregate hours by project
      const projectHoursMap: { [projectId: string]: number } = {};
      timeEntries.forEach(entry => {
        if (entry.project_id) {
          projectHoursMap[entry.project_id] = (projectHoursMap[entry.project_id] || 0) + entry.hours;
        }
      });

      const topProjectIds = Object.entries(projectHoursMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([projectId]) => projectId);

      const projectHours: Array<{ projectId: string; name: string; hours: number }> = [];
      if (topProjectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', topProjectIds);

        if (projects) {
          projectHours.push(...projects.map(project => ({
            projectId: project.id,
            name: project.name,
            hours: Math.round(projectHoursMap[project.id] * 10) / 10
          })));
        }
      }

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

      // Get real user data for member contributions
      const memberContributions: Array<{ userId: string; name: string; tasksCompleted: number; hoursTracked: number }> = [];

      for (const member of members) {
        // Get user details
        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', member.user_id)
          .single();

        if (!user) continue;

        // Get tasks completed by this user
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('assignee_id', user.id)
          .eq('status', 'completed');

        // Get hours tracked by this user
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('hours')
          .eq('user_id', user.id);

        const hoursTracked = timeEntries?.reduce((sum, entry) => sum + entry.hours, 0) || 0;

        memberContributions.push({
          userId: user.id,
          name: user.full_name || user.email || 'Unknown User',
          tasksCompleted: tasks?.length || 0,
          hoursTracked: Math.round(hoursTracked * 10) / 10
        });
      }

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
