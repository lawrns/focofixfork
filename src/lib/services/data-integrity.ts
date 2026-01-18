import { supabase } from '@/lib/supabase-client';
import {
  validateData,
  organizationSchema,
  projectSchema,
  milestoneSchema,
  taskSchema,
  goalSchema,
  timeEntrySchema,
  commentSchema,
  fileAttachmentSchema,
  userProfileSchema,
  sanitizeString,
  sanitizeHtml
} from '@/lib/validation/schemas';

const untypedSupabase = supabase as any

export interface IntegrityCheckResult {
  entity: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  orphanedRecords: number;
  missingReferences: number;
  issues: Array<{
    id: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
}

export interface DataIntegrityReport {
  timestamp: string;
  duration: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalIssues: number;
  criticalIssues: number;
  results: IntegrityCheckResult[];
  recommendations: string[];
}

export class DataIntegrityService {
  // Main integrity check function
  static async performIntegrityCheck(organizationId?: string): Promise<DataIntegrityReport> {
    const startTime = Date.now();

    const results: IntegrityCheckResult[] = await Promise.all([
      this.checkOrganizations(organizationId),
      this.checkProjects(organizationId),
      this.checkMilestones(organizationId),
      this.checkTasks(organizationId),
      this.checkGoals(organizationId),
      this.checkTimeEntries(organizationId),
      this.checkComments(organizationId),
      this.checkFileAttachments(organizationId),
      this.checkUserProfiles(organizationId),
      this.checkReferentialIntegrity(organizationId),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const criticalIssues = results.reduce((sum, result) =>
      sum + result.issues.filter(issue => issue.severity === 'critical').length, 0
    );

    return {
      timestamp: new Date().toISOString(),
      duration,
      overallHealth: 'fair',
      totalIssues,
      criticalIssues,
      results,
      recommendations: this.generateRecommendations(results, criticalIssues),
    };
  }

  // Individual entity checks
  private static async checkOrganizations(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'organizations',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = untypedSupabase.from('workspaces').select('*');
      if (organizationId) {
        query = query.eq('id', organizationId);
      }

      const { data: organizations, error } = await query;
      if (error) throw error;

      result.totalRecords = organizations?.length || 0;

      if (!organizations) return result;

      for (const org of organizations) {
        // Validate schema
        const validation = validateData(organizationSchema, org);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: org.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Organization "${org.name}" has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check for required fields
        if (!org.name || org.name.trim().length === 0) {
          result.issues.push({
            id: org.id,
            issue: 'Missing required field',
            severity: 'high',
            description: 'Organization name is missing or empty',
          });
        }

        // Check slug format
        if (org.slug && !/^[a-z0-9-]+$/.test(org.slug)) {
          result.issues.push({
            id: org.id,
            issue: 'Invalid slug format',
            severity: 'medium',
            description: `Workspace slug "${org.slug}" contains invalid characters`,
          });
        }

        // Check for creator existence
        if (org.owner_id) {
          const { data: user } = await untypedSupabase
            .from('user_profiles')
            .select('id')
            .eq('id', org.owner_id)
            .single();

          if (!user) {
            result.missingReferences++;
            result.issues.push({
              id: org.id,
              issue: 'Missing creator reference',
              severity: 'high',
              description: `Workspace owner ${org.owner_id} does not exist`,
            });
          }
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking organizations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkProjects(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'projects',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = untypedSupabase.from('foco_projects').select('*');
      if (organizationId) {
        query = query.eq('workspace_id', organizationId);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      result.totalRecords = projects?.length || 0;

      if (!projects) return result;

      for (const project of projects) {
        // Validate schema
        const validation = validateData(projectSchema, project);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: project.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Project "${project.name}" has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check organization reference
        if (project.workspace_id) {
          const { data: org } = await untypedSupabase
            .from('workspaces')
            .select('id')
            .eq('id', project.workspace_id)
            .single();

          if (!org) {
            result.missingReferences++;
            result.issues.push({
              id: project.id,
              issue: 'Missing organization reference',
              severity: 'critical',
              description: `Project belongs to non-existent organization ${project.workspace_id}`,
            });
          }
        } else {
          result.issues.push({
            id: project.id,
            issue: 'Missing organization ID',
            severity: 'critical',
            description: `Project "${project.name}" has no workspace_id`,
          });
        }

        // Check creator reference
        if (project.owner_id) {
          const { data: user } = await untypedSupabase
            .from('user_profiles')
            .select('id')
            .eq('id', project.owner_id)
            .single();

          if (!user) {
            result.missingReferences++;
            result.issues.push({
              id: project.id,
              issue: 'Missing creator reference',
              severity: 'high',
              description: `Project owner ${project.owner_id} does not exist`,
            });
          }
        }

        // Check date consistency
        if (project.start_date && project.due_date) {
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.due_date);

          if (endDate < startDate) {
            result.issues.push({
              id: project.id,
              issue: 'Invalid date range',
              severity: 'medium',
              description: 'Project end date is before start date',
            });
          }
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkMilestones(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'milestones',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = untypedSupabase.from('milestones').select('*, foco_projects!inner(workspace_id)');
      if (organizationId) {
        query = query.eq('foco_projects.workspace_id', organizationId);
      }

      const { data: milestones, error } = await query;
      if (error) throw error;

      result.totalRecords = milestones?.length || 0;

      if (!milestones) return result;

      for (const milestone of milestones) {
        // Validate schema
        const validation = validateData(milestoneSchema, milestone);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: milestone.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Milestone "${milestone.title}" has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check project reference
        const { data: project } = await untypedSupabase
          .from('foco_projects')
          .select('id')
          .eq('id', milestone.project_id)
          .single();

        if (!project) {
          result.missingReferences++;
          result.issues.push({
            id: milestone.id,
            issue: 'Missing project reference',
            severity: 'critical',
            description: `Milestone belongs to non-existent project ${milestone.project_id}`,
          });
        }

        // Note: Milestones don't have organization_id in the current schema
        // Organization reference would need to be checked via project relationship
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking milestones: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkTasks(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - tasks table exists but schema validation is complex
    return {
      entity: 'tasks',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'not-implemented',
        issue: 'Check not implemented',
        severity: 'low',
        description: 'Task integrity check is disabled due to schema complexity',
      }],
    };
  }

  private static async checkGoals(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - goals table does not exist in current schema
    return {
      entity: 'goals',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'table-not-found',
        issue: 'Table does not exist',
        severity: 'low',
        description: 'Goals table is not implemented in the current database schema',
      }],
    };
  }

  private static async checkTimeEntries(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - time_entries table does not exist in current schema
    return {
      entity: 'time_entries',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'table-not-found',
        issue: 'Table does not exist',
        severity: 'low',
        description: 'Time entries table is not implemented in the current database schema',
      }],
    };
  }

  private static async checkComments(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - comments table exists but schema validation is complex
    return {
      entity: 'comments',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'not-implemented',
        issue: 'Check not implemented',
        severity: 'low',
        description: 'Comments integrity check is disabled due to schema complexity',
      }],
    };
  }

  private static async checkFileAttachments(organizationId?: string): Promise<IntegrityCheckResult> {
    // Check files table (renamed from file_attachments)
    return {
      entity: 'files',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'implementation-pending',
        issue: 'Implementation pending',
        severity: 'low',
        description: 'File integrity checks are not yet implemented for the files table',
      }],
    };
  }



  private static async checkInvitations(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - invitations table does not exist in current schema
    return {
      entity: 'invitations',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'table-not-found',
        issue: 'Table does not exist',
        severity: 'low',
        description: 'Invitations table is not implemented in the current database schema',
      }],
    };
  }

  private static async checkUserProfiles(organizationId?: string): Promise<IntegrityCheckResult> {
    // Stub implementation - user profiles check is complex and not critical
    return {
      entity: 'user_profiles',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [{
        id: 'not-implemented',
        issue: 'Check not implemented',
        severity: 'low',
        description: 'User profiles integrity check is disabled due to complexity',
      }],
    };
  }

  private static async checkReferentialIntegrity(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'referential_integrity',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      // Check for orphaned organization members
      const { data: orphanedMembers } = await untypedSupabase
        .from('workspace_members')
        .select('id, user_id, workspace_id')
        .not('user_id', 'in', `(${untypedSupabase.from('user_profiles').select('id')})`);

      if (orphanedMembers && orphanedMembers.length > 0) {
        result.orphanedRecords += orphanedMembers.length;
        result.issues.push({
          id: 'orphaned-members',
          issue: 'Orphaned workspace members',
          severity: 'high',
          description: `${orphanedMembers.length} workspace members reference non-existent users`,
        });
      }

      // Check for projects without organizations
      const { data: orphanedProjects } = await untypedSupabase
        .from('foco_projects')
        .select('id, name, workspace_id')
        .not('workspace_id', 'in', `(${untypedSupabase.from('workspaces').select('id')})`);

      if (orphanedProjects && orphanedProjects.length > 0) {
        result.orphanedRecords += orphanedProjects.length;
        result.issues.push({
          id: 'orphaned-projects',
          issue: 'Orphaned projects',
          severity: 'critical',
          description: `${orphanedProjects.length} projects belong to non-existent workspaces`,
        });
      }

      // Check for milestones without projects
      const { data: orphanedMilestones } = await untypedSupabase
        .from('milestones')
        .select('id, title, project_id')
        .not('project_id', 'in', `(${untypedSupabase.from('foco_projects').select('id')})`);

      if (orphanedMilestones && orphanedMilestones.length > 0) {
        result.orphanedRecords += orphanedMilestones.length;
        result.issues.push({
          id: 'orphaned-milestones',
          issue: 'Orphaned milestones',
          severity: 'critical',
          description: `${orphanedMilestones.length} milestones belong to non-existent projects`,
        });
      }

      // Check for tasks without projects
      const { data: orphanedTasks } = await untypedSupabase
        .from('work_items')
        .select('id, title, project_id')
        .not('project_id', 'in', `(${untypedSupabase.from('foco_projects').select('id')})`);

      if (orphanedTasks && orphanedTasks.length > 0) {
        result.orphanedRecords += orphanedTasks.length;
        result.issues.push({
          id: 'orphaned-tasks',
          issue: 'Orphaned tasks',
          severity: 'critical',
          description: `${orphanedTasks.length} tasks belong to non-existent projects`,
        });
      }

    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking referential integrity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static generateRecommendations(results: IntegrityCheckResult[], criticalIssues: number): string[] {
    const recommendations: string[] = [];

    if (criticalIssues > 0) {
      recommendations.push('CRITICAL: Address critical issues immediately as they may cause application instability.');
    }

    const orphanedRecords = results.reduce((sum, r) => sum + r.orphanedRecords, 0);
    if (orphanedRecords > 0) {
      recommendations.push(`Clean up ${orphanedRecords} orphaned records to maintain data consistency.`);
    }

    const invalidRecords = results.reduce((sum, r) => sum + r.invalidRecords, 0);
    if (invalidRecords > 0) {
      recommendations.push(`Fix ${invalidRecords} records with invalid data structures.`);
    }

    const missingReferences = results.reduce((sum, r) => sum + r.missingReferences, 0);
    if (missingReferences > 0) {
      recommendations.push(`Resolve ${missingReferences} missing references between related records.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Data integrity is excellent! Continue regular monitoring.');
    }

    recommendations.push('Schedule regular integrity checks to catch issues early.');
    recommendations.push('Consider implementing database constraints to prevent future integrity issues.');

    return recommendations;
  }

  // Auto-fix common issues
  static async autoFixIntegrityIssues(report: DataIntegrityReport): Promise<{
    fixed: number;
    failed: number;
    details: string[];
  }> {
    const result = { fixed: 0, failed: 0, details: [] as string[] };

    // Note: In a production system, auto-fixing would be very conservative
    // and most fixes would require manual review. This is a basic implementation.

    try {
      // Auto-fix functionality is limited due to incomplete schema
      // Most fixes would require manual review in a production system
    } catch (error) {
      result.details.push(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}
