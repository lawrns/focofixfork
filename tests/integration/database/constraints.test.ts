import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  createTestSupabaseClient,
  TestEnvironment,
} from '../../helpers/api-test-helpers';

/**
 * Database Integration Tests: Constraints and Data Integrity
 * Tests foreign keys, unique constraints, not null, check constraints, and cascade operations
 */

describe('Database Constraints - Integration Tests', () => {
  let env: TestEnvironment;
  let supabase: any;

  beforeAll(async () => {
    env = await createTestEnvironment();
    supabase = createTestSupabaseClient();
  });

  afterAll(async () => {
    await env.cleanup();
  });

  describe('Foreign Key Constraints', () => {
    it('should reject task with invalid project_id', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid FK Task',
          project_id: 'non-existent-project-id',
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('foreign key');
    });

    it('should reject task with invalid workspace_id', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid FK Task',
          project_id: env.project.id,
          workspace_id: 'non-existent-workspace-id',
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should reject project with invalid organization_id', async () => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: 'Invalid FK Project',
          workspace_id: env.workspace.id,
          organization_id: 'non-existent-org-id',
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should accept task with valid foreign keys', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Valid FK Task',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('Valid FK Task');
    });
  });

  describe('Unique Constraints', () => {
    it('should reject duplicate organization slug', async () => {
      const { data: firstOrg, error: firstError } = await supabase
        .from('organizations')
        .insert({
          name: 'Unique Test Org 1',
          slug: 'unique-test-slug',
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(firstError).toBeNull();

      // Try to create another org with same slug
      const { data: secondOrg, error: secondError } = await supabase
        .from('organizations')
        .insert({
          name: 'Unique Test Org 2',
          slug: 'unique-test-slug', // Duplicate slug
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(secondError).toBeDefined();
      expect(secondError?.message).toContain('unique');
    });

    it('should allow different organization slugs', async () => {
      const { data: org1, error: error1 } = await supabase
        .from('organizations')
        .insert({
          name: 'Org 1',
          slug: `slug-${Date.now()}-1`,
          created_by: env.user.id,
        })
        .select()
        .single();

      const { data: org2, error: error2 } = await supabase
        .from('organizations')
        .insert({
          name: 'Org 2',
          slug: `slug-${Date.now()}-2`,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(org1.slug).not.toBe(org2.slug);
    });
  });

  describe('Not Null Constraints', () => {
    it('should reject task without title', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          // Missing title (required field)
          description: 'Task without title',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toContain('null');
    });

    it('should reject project without name', async () => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          // Missing name (required field)
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should reject organization without slug', async () => {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: 'Org without slug',
          // Missing slug (required field)
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });
  });

  describe('Check Constraints', () => {
    it('should reject invalid task status', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid Status Task',
          status: 'invalid_status', // Should be one of: todo, in_progress, done, etc.
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should reject invalid task priority', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid Priority Task',
          priority: 'super_ultra_high', // Should be one of: low, medium, high
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should reject negative estimated_hours', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Negative Hours Task',
          estimated_hours: -5,
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['todo', 'in_progress', 'done', 'blocked'];

      for (const status of validStatuses) {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            title: `Task with ${status} status`,
            status,
            project_id: env.project.id,
            workspace_id: env.workspace.id,
            organization_id: env.organization.id,
            created_by: env.user.id,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.status).toBe(status);
      }
    });
  });

  describe('Cascade Delete Operations', () => {
    it('should cascade delete tasks when project is deleted', async () => {
      // Create a project with tasks
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          name: 'Project to Delete',
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(projError).toBeNull();

      // Create tasks in this project
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: 'Task to be cascaded',
          project_id: project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(taskError).toBeNull();

      // Delete the project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      expect(deleteError).toBeNull();

      // Verify tasks were cascaded
      const { data: orphanedTasks, error: checkError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id);

      expect(orphanedTasks?.length || 0).toBe(0);
    });

    it('should cascade delete projects when workspace is deleted', async () => {
      // Create workspace with project
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Workspace to Delete',
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(wsError).toBeNull();

      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          name: 'Project to be cascaded',
          workspace_id: workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(projError).toBeNull();

      // Delete workspace
      const { error: deleteError } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspace.id);

      expect(deleteError).toBeNull();

      // Verify projects were cascaded
      const { data: orphanedProjects, error: checkError } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspace.id);

      expect(orphanedProjects?.length || 0).toBe(0);
    });

    it('should cascade delete all related data when organization is deleted', async () => {
      // Create full hierarchy
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Org to Delete',
          slug: `org-delete-${Date.now()}`,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(orgError).toBeNull();

      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Workspace in Org',
          organization_id: org.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          name: 'Project in Org',
          workspace_id: workspace.id,
          organization_id: org.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: 'Task in Org',
          project_id: project.id,
          workspace_id: workspace.id,
          organization_id: org.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      // Delete organization
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);

      expect(deleteError).toBeNull();

      // Verify all related data was cascaded
      const { data: orphanedWorkspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('organization_id', org.id);

      const { data: orphanedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', org.id);

      const { data: orphanedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', org.id);

      expect(orphanedWorkspaces?.length || 0).toBe(0);
      expect(orphanedProjects?.length || 0).toBe(0);
      expect(orphanedTasks?.length || 0).toBe(0);
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce timestamp format', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid Date Task',
          due_date: 'not-a-valid-date',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should enforce integer types', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid Integer Task',
          estimated_hours: 'not-a-number',
          project_id: env.project.id,
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });

    it('should enforce UUID format', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Invalid UUID Task',
          project_id: 'not-a-valid-uuid',
          workspace_id: env.workspace.id,
          organization_id: env.organization.id,
          created_by: env.user.id,
        })
        .select()
        .single();

      expect(error).toBeDefined();
    });
  });
});
