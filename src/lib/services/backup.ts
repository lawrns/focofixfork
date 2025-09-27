import { supabase } from '@/lib/supabase';

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
    organizationId?: string;
  };
}

export class BackupService {
  static async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      // Get user's organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', user.id);

      if (organizations) {
        backupData.organizations = organizations;
        backupData.metadata.organizationId = organizations[0]?.id;
      }

      // Get projects for user's organizations
      if (organizations?.length) {
        const orgIds = organizations.map(org => org.id);
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .in('organization_id', orgIds);

        if (projects) {
          backupData.projects = projects;

          // Get milestones and tasks for these projects
          const projectIds = projects.map(p => p.id);
          const { data: milestones } = await supabase
            .from('milestones')
            .select('*')
            .in('project_id', projectIds);

          if (milestones) {
            backupData.milestones = milestones;
          }

          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds);

          if (tasks) {
            backupData.tasks = tasks;
          }
        }

        // Get organization members
        const { data: members } = await supabase
          .from('organization_members')
          .select('*')
          .in('organization_id', orgIds);

        if (members) {
          backupData.members = members;
        }
      }

      // Optional data based on options
      if (options.includeComments) {
        const { data: comments } = await supabase
          .from('milestone_comments')
          .select('*')
          .in('organization_id', organizations?.map(o => o.id) || []);

        if (comments) {
          backupData.comments = comments;
        }
      }

      if (options.includeTimeTracking) {
        const { data: timeEntries } = await supabase
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate backup data
      if (!backupData.metadata || !backupData.projects) {
        throw new Error('Invalid backup file format');
      }

      // Restore organizations (skip if they already exist)
      for (const org of backupData.organizations || []) {
        const { data: existing } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', org.slug)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('organizations')
            .insert({
              ...org,
              created_by: user.id, // Ensure user owns restored org
            });

          if (error) throw error;
        }
      }

      // Restore projects
      for (const project of backupData.projects) {
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('name', project.name)
          .eq('organization_id', project.organization_id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('projects')
            .insert(project);

          if (error) throw error;
        }
      }

      // Restore milestones and tasks
      for (const milestone of backupData.milestones || []) {
        const { data: existing } = await supabase
          .from('milestones')
          .select('id')
          .eq('title', milestone.title)
          .eq('project_id', milestone.project_id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('milestones')
            .insert(milestone);

          if (error) throw error;
        }
      }

      for (const task of backupData.tasks || []) {
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('title', task.title)
          .eq('milestone_id', task.milestone_id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from('tasks')
            .insert(task);

          if (error) throw error;
        }
      }

      // Restore optional data
      if (backupData.comments) {
        for (const comment of backupData.comments) {
          const { error } = await supabase
            .from('milestone_comments')
            .insert(comment);

          if (error && !error.message.includes('duplicate key')) {
            throw error;
          }
        }
      }

      if (backupData.timeEntries) {
        for (const entry of backupData.timeEntries) {
          const { error } = await supabase
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
