import { supabase } from '@/lib/supabase';
import { PerformanceService } from '@/lib/services/performance';

export class APIClient {
  static async trackRequest<T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    const startTime = Date.now();

    try {
      const result = await requestFn();
      const responseTime = Date.now() - startTime;

      // Track successful request
      PerformanceService.trackAPIPerformance(
        endpoint,
        method,
        responseTime,
        result.error ? 500 : 200
      );

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Track failed request
      PerformanceService.trackAPIPerformance(
        endpoint,
        method,
        responseTime,
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  // Projects API with tracking
  static async getProjects(organizationId?: string) {
    return this.trackRequest('projects', 'GET', async () => {
      let query = supabase.from('projects').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      return query;
    });
  }

  static async createProject(project: any) {
    return this.trackRequest('projects', 'POST', async () =>
      supabase.from('projects').insert(project).select().single()
    );
  }

  static async updateProject(id: string, updates: any) {
    return this.trackRequest('projects', 'PATCH', async () =>
      supabase.from('projects').update(updates).eq('id', id).select().single()
    );
  }

  static async deleteProject(id: string) {
    return this.trackRequest('projects', 'DELETE', async () =>
      supabase.from('projects').delete().eq('id', id)
    );
  }

  // Milestones API with tracking
  static async getMilestones(projectId?: string) {
    return this.trackRequest('milestones', 'GET', async () => {
      let query = supabase.from('milestones').select('*');
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      return query;
    });
  }

  static async createMilestone(milestone: any) {
    return this.trackRequest('milestones', 'POST', async () =>
      supabase.from('milestones').insert(milestone).select().single()
    );
  }

  static async updateMilestone(id: string, updates: any) {
    return this.trackRequest('milestones', 'PATCH', async () =>
      supabase.from('milestones').update(updates).eq('id', id).select().single()
    );
  }

  static async deleteMilestone(id: string) {
    return this.trackRequest('milestones', 'DELETE', async () =>
      supabase.from('milestones').delete().eq('id', id)
    );
  }

  // Tasks API with tracking
  static async getTasks(milestoneId?: string, projectId?: string) {
    return this.trackRequest('tasks', 'GET', async () => {
      let query = supabase.from('tasks').select('*');
      if (milestoneId) {
        query = query.eq('milestone_id', milestoneId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      return query;
    });
  }

  static async createTask(task: any) {
    return this.trackRequest('tasks', 'POST', async () =>
      supabase.from('tasks').insert(task).select().single()
    );
  }

  static async updateTask(id: string, updates: any) {
    return this.trackRequest('tasks', 'PATCH', async () =>
      supabase.from('tasks').update(updates).eq('id', id).select().single()
    );
  }

  static async deleteTask(id: string) {
    return this.trackRequest('tasks', 'DELETE', async () =>
      supabase.from('tasks').delete().eq('id', id)
    );
  }

  // Organizations API with tracking
  static async getOrganizations() {
    return this.trackRequest('organizations', 'GET', async () =>
      supabase.from('organizations').select('*')
    );
  }

  static async createOrganization(organization: any) {
    return this.trackRequest('organizations', 'POST', async () =>
      supabase.from('organizations').insert(organization).select().single()
    );
  }

  // Time tracking API with tracking
  static async getTimeEntries(userId?: string) {
    return this.trackRequest('time-entries', 'GET', async () => {
      let query = supabase.from('time_entries').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      return query;
    });
  }

  static async createTimeEntry(entry: any) {
    return this.trackRequest('time-entries', 'POST', async () =>
      supabase.from('time_entries').insert(entry).select().single()
    );
  }

  static async updateTimeEntry(id: string, updates: any) {
    return this.trackRequest('time-entries', 'PATCH', async () =>
      supabase.from('time_entries').update(updates).eq('id', id).select().single()
    );
  }

  // Generic tracked request for any API call
  static async trackedRequest<T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await requestFn();
      const responseTime = Date.now() - startTime;

      PerformanceService.trackAPIPerformance(endpoint, method, responseTime, 200);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      PerformanceService.trackAPIPerformance(
        endpoint,
        method,
        responseTime,
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }
}
