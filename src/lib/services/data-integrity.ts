import { supabase } from '@/lib/supabase';
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
  invitationSchema,
  userProfileSchema,
  sanitizeString,
  sanitizeHtml
} from '@/lib/validation/schemas';

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
    const results: IntegrityCheckResult[] = [];

    // Run all integrity checks
    const checks = await Promise.all([
      this.checkOrganizations(organizationId),
      this.checkProjects(organizationId),
      this.checkMilestones(organizationId),
      this.checkTasks(organizationId),
      this.checkGoals(organizationId),
      this.checkTimeEntries(organizationId),
      this.checkComments(organizationId),
      this.checkFileAttachments(organizationId),
      this.checkInvitations(organizationId),
      this.checkUserProfiles(organizationId),
      this.checkReferentialIntegrity(organizationId),
    ]);

    results.push(...checks);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate overall health
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const criticalIssues = results.reduce((sum, result) =>
      sum + result.issues.filter(issue => issue.severity === 'critical').length, 0
    );

    let overallHealth: DataIntegrityReport['overallHealth'];
    if (criticalIssues > 0) {
      overallHealth = 'critical';
    } else if (totalIssues > 50) {
      overallHealth = 'poor';
    } else if (totalIssues > 20) {
      overallHealth = 'fair';
    } else if (totalIssues > 5) {
      overallHealth = 'good';
    } else {
      overallHealth = 'excellent';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, criticalIssues);

    return {
      timestamp: new Date().toISOString(),
      duration,
      overallHealth,
      totalIssues,
      criticalIssues,
      results,
      recommendations,
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
      let query = supabase.from('organizations').select('*');
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
            description: `Organization slug "${org.slug}" contains invalid characters`,
          });
        }

        // Check for creator existence
        if (org.created_by) {
          const { data: user } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', org.created_by)
            .single();

          if (!user) {
            result.missingReferences++;
            result.issues.push({
              id: org.id,
              issue: 'Missing creator reference',
              severity: 'high',
              description: `Organization creator ${org.created_by} does not exist`,
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
      let query = supabase.from('projects').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
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
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', project.organization_id)
          .single();

        if (!org) {
          result.missingReferences++;
          result.issues.push({
            id: project.id,
            issue: 'Missing organization reference',
            severity: 'critical',
            description: `Project belongs to non-existent organization ${project.organization_id}`,
          });
        }

        // Check creator reference
        if (project.created_by) {
          const { data: user } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', project.created_by)
            .single();

          if (!user) {
            result.missingReferences++;
            result.issues.push({
              id: project.id,
              issue: 'Missing creator reference',
              severity: 'high',
              description: `Project creator ${project.created_by} does not exist`,
            });
          }
        }

        // Check date consistency
        if (project.start_date && project.end_date) {
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);

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
      let query = supabase.from('milestones').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
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
        const { data: project } = await supabase
          .from('projects')
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

        // Check organization reference
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', milestone.organization_id)
          .single();

        if (!org) {
          result.missingReferences++;
          result.issues.push({
            id: milestone.id,
            issue: 'Missing organization reference',
            severity: 'critical',
            description: `Milestone belongs to non-existent organization ${milestone.organization_id}`,
          });
        }
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
    const result: IntegrityCheckResult = {
      entity: 'tasks',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = supabase.from('tasks').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      result.totalRecords = tasks?.length || 0;

      if (!tasks) return result;

      for (const task of tasks) {
        // Validate schema
        const validation = validateData(taskSchema, task);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: task.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Task "${task.title}" has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check project reference
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', task.project_id)
          .single();

        if (!project) {
          result.missingReferences++;
          result.issues.push({
            id: task.id,
            issue: 'Missing project reference',
            severity: 'critical',
            description: `Task belongs to non-existent project ${task.project_id}`,
          });
        }

        // Check milestone reference (if provided)
        if (task.milestone_id) {
          const { data: milestone } = await supabase
            .from('milestones')
            .select('id')
            .eq('id', task.milestone_id)
            .single();

          if (!milestone) {
            result.missingReferences++;
            result.issues.push({
              id: task.id,
              issue: 'Missing milestone reference',
              severity: 'high',
              description: `Task references non-existent milestone ${task.milestone_id}`,
            });
          }
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkGoals(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'goals',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = supabase.from('goals').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: goals, error } = await query;
      if (error) throw error;

      result.totalRecords = goals?.length || 0;

      if (!goals) return result;

      for (const goal of goals) {
        // Validate schema
        const validation = validateData(goalSchema, goal);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: goal.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Goal "${goal.title}" has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check owner reference
        if (goal.owner_id) {
          const { data: user } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', goal.owner_id)
            .single();

          if (!user) {
            result.missingReferences++;
            result.issues.push({
              id: goal.id,
              issue: 'Missing owner reference',
              severity: 'high',
              description: `Goal owner ${goal.owner_id} does not exist`,
            });
          }
        }

        // Check progress consistency
        if (goal.target_value && goal.current_value > goal.target_value) {
          result.issues.push({
            id: goal.id,
            issue: 'Inconsistent progress',
            severity: 'medium',
            description: 'Current value exceeds target value',
          });
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking goals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkTimeEntries(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'time_entries',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = supabase.from('time_entries').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: timeEntries, error } = await query;
      if (error) throw error;

      result.totalRecords = timeEntries?.length || 0;

      if (!timeEntries) return result;

      for (const entry of timeEntries) {
        // Validate schema
        const validation = validateData(timeEntrySchema, entry);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: entry.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Time entry has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check user reference
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', entry.user_id)
          .single();

        if (!user) {
          result.missingReferences++;
          result.issues.push({
            id: entry.id,
            issue: 'Missing user reference',
            severity: 'high',
            description: `Time entry belongs to non-existent user ${entry.user_id}`,
          });
        }

        // Check time consistency
        if (entry.end_time) {
          const startTime = new Date(entry.start_time);
          const endTime = new Date(entry.end_time);

          if (endTime <= startTime) {
            result.issues.push({
              id: entry.id,
              issue: 'Invalid time range',
              severity: 'medium',
              description: 'End time is not after start time',
            });
          }

          // Check if calculated duration matches
          const calculatedDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          if (Math.abs(calculatedDuration - entry.duration_hours) > 0.01) {
            result.issues.push({
              id: entry.id,
              issue: 'Duration mismatch',
              severity: 'low',
              description: 'Stored duration does not match calculated duration from start/end times',
            });
          }
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking time entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkComments(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'comments',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = supabase.from('milestone_comments').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: comments, error } = await query;
      if (error) throw error;

      result.totalRecords = comments?.length || 0;

      if (!comments) return result;

      for (const comment of comments) {
        // Validate schema
        const validation = validateData(commentSchema, comment);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: comment.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Comment has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check author reference
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', comment.author_id)
          .single();

        if (!user) {
          result.missingReferences++;
          result.issues.push({
            id: comment.id,
            issue: 'Missing author reference',
            severity: 'high',
            description: `Comment author ${comment.author_id} does not exist`,
          });
        }

        // Check milestone reference
        if (comment.milestone_id) {
          const { data: milestone } = await supabase
            .from('milestones')
            .select('id')
            .eq('id', comment.milestone_id)
            .single();

          if (!milestone) {
            result.orphanedRecords++;
            result.issues.push({
              id: comment.id,
              issue: 'Orphaned comment',
              severity: 'medium',
              description: `Comment references non-existent milestone ${comment.milestone_id}`,
            });
          }
        }

        // Sanitize content
        const sanitizedContent = sanitizeHtml(comment.content);
        if (sanitizedContent !== comment.content) {
          result.issues.push({
            id: comment.id,
            issue: 'Potentially unsafe content',
            severity: 'low',
            description: 'Comment content contains potentially unsafe HTML',
          });
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkFileAttachments(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'file_attachments',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      // Note: This assumes a file_attachments table exists
      // If it doesn't exist yet, we'll skip this check
      const { data: attachments, error } = await supabase
        .from('file_attachments')
        .select('*')
        .limit(1);

      if (error && error.message.includes('relation "file_attachments" does not exist')) {
        return result; // Table doesn't exist yet, skip check
      }

      if (error) throw error;

      result.totalRecords = attachments?.length || 0;
      // Additional validation would go here if table exists

    } catch (error) {
      // Silently skip if table doesn't exist
      if (!(error instanceof Error) || !error.message?.includes('relation')) {
        result.issues.push({
          id: 'system-error',
          issue: 'Check failed',
          severity: 'critical',
          description: `Error checking file attachments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  private static async checkInvitations(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'invitations',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      let query = supabase.from('invitations').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: invitations, error } = await query;
      if (error) throw error;

      result.totalRecords = invitations?.length || 0;

      if (!invitations) return result;

      for (const invitation of invitations) {
        // Validate schema
        const validation = validateData(invitationSchema, invitation);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: invitation.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `Invitation has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check email format
        if (!invitation.email.includes('@')) {
          result.issues.push({
            id: invitation.id,
            issue: 'Invalid email format',
            severity: 'high',
            description: `Invitation email "${invitation.email}" is invalid`,
          });
        }

        // Check expiration
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < new Date() && invitation.status === 'pending') {
          result.issues.push({
            id: invitation.id,
            issue: 'Expired invitation',
            severity: 'low',
            description: 'Invitation has expired but is still pending',
          });
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  private static async checkUserProfiles(organizationId?: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      entity: 'user_profiles',
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      orphanedRecords: 0,
      missingReferences: 0,
      issues: [],
    };

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      result.totalRecords = profiles?.length || 0;

      if (!profiles) return result;

      for (const profile of profiles) {
        // Validate schema
        const validation = validateData(userProfileSchema, profile);
        if (!validation.success) {
          result.invalidRecords++;
          result.issues.push({
            id: profile.id,
            issue: 'Schema validation failed',
            severity: 'medium',
            description: `User profile has invalid data structure`,
          });
        } else {
          result.validRecords++;
        }

        // Check required fields
        if (!profile.full_name || profile.full_name.trim().length === 0) {
          result.issues.push({
            id: profile.id,
            issue: 'Missing required field',
            severity: 'medium',
            description: 'User profile is missing full name',
          });
        }
      }
    } catch (error) {
      result.issues.push({
        id: 'system-error',
        issue: 'Check failed',
        severity: 'critical',
        description: `Error checking user profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
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
      const { data: orphanedMembers } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id')
        .not('user_id', 'in', `(${supabase.from('profiles').select('id')})`);

      if (orphanedMembers && orphanedMembers.length > 0) {
        result.orphanedRecords += orphanedMembers.length;
        result.issues.push({
          id: 'orphaned-members',
          issue: 'Orphaned organization members',
          severity: 'high',
          description: `${orphanedMembers.length} organization members reference non-existent users`,
        });
      }

      // Check for projects without organizations
      const { data: orphanedProjects } = await supabase
        .from('projects')
        .select('id, name, organization_id')
        .not('organization_id', 'in', `(${supabase.from('organizations').select('id')})`);

      if (orphanedProjects && orphanedProjects.length > 0) {
        result.orphanedRecords += orphanedProjects.length;
        result.issues.push({
          id: 'orphaned-projects',
          issue: 'Orphaned projects',
          severity: 'critical',
          description: `${orphanedProjects.length} projects belong to non-existent organizations`,
        });
      }

      // Check for milestones without projects
      const { data: orphanedMilestones } = await supabase
        .from('milestones')
        .select('id, title, project_id')
        .not('project_id', 'in', `(${supabase.from('projects').select('id')})`);

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
      const { data: orphanedTasks } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .not('project_id', 'in', `(${supabase.from('projects').select('id')})`);

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
      // Fix expired invitations
      for (const checkResult of report.results) {
        if (checkResult.entity === 'invitations') {
          for (const issue of checkResult.issues) {
            if (issue.issue === 'Expired invitation') {
              try {
                await supabase
                  .from('invitations')
                  .update({ status: 'expired' })
                  .eq('id', issue.id);

                result.fixed++;
                result.details.push(`Marked invitation ${issue.id} as expired`);
              } catch (error) {
                result.failed++;
                result.details.push(`Failed to fix invitation ${issue.id}: ${error}`);
              }
            }
          }
        }
      }
    } catch (error) {
      result.details.push(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}
