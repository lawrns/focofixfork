import { supabase } from '@/lib/supabase-client';

const untypedSupabase = supabase as any;

// Database row types for backup queries
interface WorkspaceRow {
  id: string;
  [key: string]: any;
}

interface ProjectRow {
  id: string;
  [key: string]: any;
}

interface CommentRow {
  id: string;
  [key: string]: any;
}

export interface BackupOptions {
  includeFiles?: boolean;
  includeComments?: boolean;
  includeTimeTracking?: boolean;
  format?: 'json' | 'csv';
}

export interface BackupData {
  projects: any[];
  milestones: any[];
  tasks: any[];
  organizations: any[];
  members: any[];
  comments?: any[];
  timeEntries?: any[];
  files?: any[];
  metadata: {
    createdAt: string;
    version: string;
    userId: string;
    workspaceId?: string;
  };
}

export class BackupService {
  static async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    try {
      const { data: { user } } = await untypedSupabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const backupData: BackupData = {
        projects: [],
        milestones: [],
        tasks: [],
        organizations: [],
        members: [],
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
          userId: user.id,
        }
      };

      // Get user's workspaces
      const { data: organizations } = await untypedSupabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id);

      if (organizations) {
        backupData.organizations = organizations;
        backupData.metadata.workspaceId = organizations[0]?.id;
      }

      // Get projects for user's organizations
      if (organizations?.length) {
        const orgIds = (organizations as WorkspaceRow[]).map((org: WorkspaceRow) => org.id);
        const { data: projects } = await untypedSupabase
          .from('foco_projects')
          .select('*')
          .in('workspace_id', orgIds);

        if (projects) {
          backupData.projects = projects;

          // Get milestones and tasks for these projects
          const projectIds = (projects as ProjectRow[]).map((p: ProjectRow) => p.id);
          const { data: milestones } = await untypedSupabase
            .from('foco_milestones')
            .select('*')
            .in('project_id', projectIds);

          if (milestones) {
            backupData.milestones = milestones;
          }

          const { data: tasks } = await untypedSupabase
            .from('work_items')
            .select('*')
            .in('project_id', projectIds);

          if (tasks) {
            backupData.tasks = tasks;
          }
        }

        // Get workspace members
        const { data: members } = await untypedSupabase
          .from('workspace_members')
          .select('*')
          .in('workspace_id', orgIds);

        if (members) {
          backupData.members = members;
        }
      }

      // Optional data based on options
      if (options.includeComments) {
        const orgIds = (organizations as WorkspaceRow[] | undefined)?.map((o: WorkspaceRow) => o.id) || [];
        const { data: comments } = await untypedSupabase
          .from('foco_comments')
          .select('*')
          .in('workspace_id', orgIds);

        if (comments) {
          backupData.comments = comments;
        }
      }

      if (options.includeTimeTracking) {
        const { data: timeEntries } = await untypedSupabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id);

        if (timeEntries) {
          backupData.timeEntries = timeEntries;
        }
      }

      return backupData;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  static async downloadBackup(options: BackupOptions = {}): Promise<void> {
    try {
      const backupData = await this.createBackup(options);

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `foco-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw new Error('Failed to download backup');
    }
  }

  static async restoreBackup(backupData: BackupData): Promise<void> {
    try {
      const { data: { user } } = await untypedSupabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate backup data
      if (!backupData.metadata || !backupData.projects) {
        throw new Error('Invalid backup file format');
      }

      // Restore organizations (skip if they already exist)
      for (const org of backupData.organizations || []) {
        const { data: existing } = await untypedSupabase
          .from('workspaces')
          .select('id')
          .eq('slug', org.slug)
          .single();

        if (!existing) {
          const { error } = await untypedSupabase
            .from('workspaces')
            .insert({
              ...org,
              owner_id: user.id, // Ensure user owns restored workspace
            });

          if (error) throw error;
        }
      }

      // Restore projects
      for (const project of backupData.projects) {
        const { data: existing } = await untypedSupabase
          .from('foco_projects')
          .select('id')
          .eq('name', project.name)
          .eq('workspace_id', project.workspace_id)
          .single();

        if (!existing) {
          const { error } = await untypedSupabase
            .from('foco_projects')
            .insert(project);

          if (error) throw error;
        }
      }

      // Restore milestones and tasks
      for (const milestone of backupData.milestones || []) {
        const { data: existing } = await untypedSupabase
          .from('foco_milestones')
          .select('id')
          .eq('title', milestone.title)
          .eq('project_id', milestone.project_id)
          .single();

        if (!existing) {
          const { error } = await untypedSupabase
            .from('foco_milestones')
            .insert(milestone);

          if (error) throw error;
        }
      }

      for (const task of backupData.tasks || []) {
        const { data: existing } = await untypedSupabase
          .from('work_items')
          .select('id')
          .eq('title', task.title)
          .eq('milestone_id', task.milestone_id)
          .single();

        if (!existing) {
          const { error } = await untypedSupabase
            .from('work_items')
            .insert(task);

          if (error) throw error;
        }
      }

      // Restore optional data
      if (backupData.comments) {
        for (const comment of backupData.comments) {
          const { error } = await untypedSupabase
            .from('foco_comments')
            .insert(comment);

          if (error && !error.message.includes('duplicate key')) {
            throw error;
          }
        }
      }

      if (backupData.timeEntries) {
        for (const entry of backupData.timeEntries) {
          const { error } = await untypedSupabase
            .from('time_entries')
            .insert({
              ...entry,
              user_id: user.id, // Ensure user owns restored entries
            });

          if (error && !error.message.includes('duplicate key')) {
            throw error;
          }
        }
      }

    } catch (error) {
      console.error('Error restoring backup:', error);
      throw new Error('Failed to restore backup');
    }
  }

  static async uploadBackup(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target?.result as string);
          resolve(backupData);
        } catch (error) {
          reject(new Error('Invalid backup file format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
