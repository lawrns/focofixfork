/**
 * FocoBot Task Service
 * Handles task CRUD operations for WhatsApp users
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  projectId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
}

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  projectId?: string;
  assignedTo?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  search?: string;
}

export interface TaskSummary {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
  completedToday: number;
}

class FocoBotTaskService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  /**
   * Get user's default workspace and project
   */
  async getUserContext(userId: string): Promise<{ workspaceId?: string; projectId?: string; organizationId?: string }> {
    // Get user's organization membership
    const { data: membership } = await this.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const organizationId = membership?.organization_id;

    if (!organizationId) {
      return {};
    }

    // Get first active project
    const { data: project } = await this.supabase
      .from('projects')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return {
      organizationId,
      projectId: project?.id,
    };
  }

  /**
   * List tasks for user
   */
  async listTasks(userId: string, filters?: TaskFilters, limit = 10): Promise<{ tasks: Task[]; total: number }> {
    const { organizationId } = await this.getUserContext(userId);
    
    if (!organizationId) {
      return { tasks: [], total: 0 };
    }

    let query = this.supabase
      .from('tasks')
      .select('*, projects!inner(name)', { count: 'exact' })
      .eq('projects.organization_id', organizationId);

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    if (filters?.dueBefore) {
      query = query.lte('due_date', filters.dueBefore.toISOString());
    }

    if (filters?.dueAfter) {
      query = query.gte('due_date', filters.dueAfter.toISOString());
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Default: exclude cancelled, show newest first
    query = query
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list tasks:', error);
      throw new Error('Failed to retrieve tasks');
    }

    const tasks: Task[] = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      projectId: t.project_id,
      projectName: t.projects?.name,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return { tasks, total: count || 0 };
  }

  /**
   * Get pending tasks for user
   */
  async getPendingTasks(userId: string, limit = 20): Promise<Task[]> {
    return this.listTasks(userId, {
      status: ['todo', 'in_progress'],
    }, limit).then(r => r.tasks);
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { tasks } = await this.listTasks(userId, {
      status: ['todo', 'in_progress'],
      dueBefore: today,
    }, 50);

    return tasks;
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { tasks } = await this.listTasks(userId, {
      status: ['todo', 'in_progress'],
      dueAfter: today,
      dueBefore: tomorrow,
    }, 50);

    return tasks;
  }

  /**
   * Get a single task by ID
   */
  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const { organizationId } = await this.getUserContext(userId);
    
    if (!organizationId) return null;

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*, projects!inner(name)')
      .eq('id', taskId)
      .eq('projects.organization_id', organizationId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      projectId: data.project_id,
      projectName: data.projects?.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Create a new task
   */
  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const { organizationId, projectId } = await this.getUserContext(userId);
    
    if (!organizationId) {
      throw new Error('No organization found for user');
    }

    const targetProjectId = input.projectId || projectId;
    
    if (!targetProjectId) {
      throw new Error('No project found. Please create a project in the app first.');
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description,
        project_id: targetProjectId,
        assigned_to: userId,
        priority: input.priority || 'medium',
        due_date: input.dueDate?.toISOString(),
        status: 'todo',
        created_by: userId,
      })
      .select('*, projects(name)')
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      throw new Error('Failed to create task');
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      projectId: data.project_id,
      projectName: data.projects?.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Update a task
   */
  async updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const { organizationId } = await this.getUserContext(userId);
    
    if (!organizationId) {
      throw new Error('No organization found for user');
    }

    // Verify task exists and user has access
    const existing = await this.getTask(userId, taskId);
    if (!existing) {
      throw new Error('Task not found');
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.dueDate !== undefined) updates.due_date = input.dueDate?.toISOString();

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*, projects(name)')
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      throw new Error('Failed to update task');
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      projectId: data.project_id,
      projectName: data.projects?.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Complete a task
   */
  async completeTask(userId: string, taskId: string): Promise<Task> {
    return this.updateTask(userId, taskId, { status: 'done' });
  }

  /**
   * Delete (cancel) a task
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.updateTask(userId, taskId, { status: 'cancelled' });
  }

  /**
   * Find task by title (fuzzy match)
   */
  async findTaskByTitle(userId: string, titleQuery: string): Promise<Task | null> {
    const { organizationId } = await this.getUserContext(userId);
    
    if (!organizationId) return null;

    // Try exact match first
    const { data: exact } = await this.supabase
      .from('tasks')
      .select('*, projects!inner(name)')
      .ilike('title', titleQuery)
      .eq('projects.organization_id', organizationId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (exact) {
      return {
        id: exact.id,
        title: exact.title,
        description: exact.description,
        status: exact.status,
        priority: exact.priority,
        dueDate: exact.due_date,
        projectId: exact.project_id,
        projectName: exact.projects?.name,
        createdAt: exact.created_at,
        updatedAt: exact.updated_at,
      };
    }

    // Try fuzzy match
    const { data: fuzzy } = await this.supabase
      .from('tasks')
      .select('*, projects!inner(name)')
      .ilike('title', `%${titleQuery}%`)
      .eq('projects.organization_id', organizationId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fuzzy) {
      return {
        id: fuzzy.id,
        title: fuzzy.title,
        description: fuzzy.description,
        status: fuzzy.status,
        priority: fuzzy.priority,
        dueDate: fuzzy.due_date,
        projectId: fuzzy.project_id,
        projectName: fuzzy.projects?.name,
        createdAt: fuzzy.created_at,
        updatedAt: fuzzy.updated_at,
      };
    }

    return null;
  }

  /**
   * Get task summary for user
   */
  async getTaskSummary(userId: string): Promise<TaskSummary> {
    const { organizationId } = await this.getUserContext(userId);
    
    if (!organizationId) {
      return {
        total: 0,
        byStatus: {},
        byPriority: {},
        overdue: 0,
        dueToday: 0,
        completedToday: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all non-cancelled tasks
    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('status, priority, due_date, updated_at')
      .neq('status', 'cancelled')
      .in('project_id', (
        this.supabase
          .from('projects')
          .select('id')
          .eq('organization_id', organizationId)
      ));

    if (error || !tasks) {
      return {
        total: 0,
        byStatus: {},
        byPriority: {},
        overdue: 0,
        dueToday: 0,
        completedToday: 0,
      };
    }

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let overdue = 0;
    let dueToday = 0;
    let completedToday = 0;

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (dueDate < today && task.status !== 'done') {
          overdue++;
        }
        if (dueDate >= today && dueDate < tomorrow && task.status !== 'done') {
          dueToday++;
        }
      }

      if (task.status === 'done' && task.updated_at) {
        const updated = new Date(task.updated_at);
        if (updated >= today) {
          completedToday++;
        }
      }
    }

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      dueToday,
      completedToday,
    };
  }

  /**
   * Get recent tasks (for context)
   */
  async getRecentTasks(userId: string, limit = 5): Promise<Array<{ id: string; title: string; status: string }>> {
    const { tasks } = await this.listTasks(userId, {}, limit);
    return tasks.map(t => ({ id: t.id, title: t.title, status: t.status }));
  }
}

// Singleton instance
let taskServiceInstance: FocoBotTaskService | null = null;

export function getFocoBotTaskService(): FocoBotTaskService {
  if (!taskServiceInstance) {
    taskServiceInstance = new FocoBotTaskService();
  }
  return taskServiceInstance;
}

export default FocoBotTaskService;
