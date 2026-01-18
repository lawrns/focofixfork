import { NextRequest, NextResponse } from 'next/server';
import { AuditService, AuditAction, EntityType, RiskLevel } from '@/lib/services/audit-log';
import { supabase } from '@/lib/supabase-client';

const untypedSupabase = supabase as any

// Audit middleware for API routes
export function withAuditLogging(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse> | NextResponse,
  options: {
    action: AuditAction;
    entityType: EntityType;
    getEntityId?: (request: NextRequest, result?: any) => string;
    getMetadata?: (request: NextRequest, result?: any) => Record<string, any>;
    riskLevel?: RiskLevel;
  }
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId = 'anonymous';
    let userEmail: string | undefined;
    let result: any = null;
    let error: any = null;

    try {
      // Get user information from Supabase session
      // Note: This audit middleware is being phased out in favor of the wrapRoute pattern
      // which includes built-in correlation ID tracking and structured logging
      try {
        const { data: { user } } = await untypedSupabase.auth.getUser();
        if (user) {
          userId = user.id;
          userEmail = user.email;
        }
      } catch (e) {
        // Ignore auth errors, user remains anonymous for audit purposes
      }

      // Call the original handler
      result = await handler(request, context);

      // Log successful action
      const entityId = options.getEntityId ? options.getEntityId(request, result) : 'system';
      const metadata = options.getMetadata ? options.getMetadata(request, result) : {};

      await AuditService.logEvent({
        user_id: userId,
        user_email: userEmail,
        action: options.action,
        entity_type: options.entityType,
        entity_id: entityId,
        risk_level: options.riskLevel || 'low',
        status: 'success',
        metadata: {
          ...metadata,
          method: request.method,
          url: request.url,
          duration: Date.now() - startTime,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      });

      return result;
    } catch (err) {
      error = err;

      // Log failed action
      const entityId = options.getEntityId ? options.getEntityId(request, result) : 'system';
      const metadata = options.getMetadata ? options.getMetadata(request, result) : {};

      await AuditService.logEvent({
        user_id: userId,
        user_email: userEmail,
        action: options.action,
        entity_type: options.entityType,
        entity_id: entityId,
        risk_level: options.riskLevel || 'medium',
        status: 'failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          ...metadata,
          method: request.method,
          url: request.url,
          duration: Date.now() - startTime,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      });

      throw error; // Re-throw the error for proper handling
    }
  };
}

// Pre-configured audit middleware for common operations
export const auditMiddleware = {
  // Authentication
  login: (handler: any) => withAuditLogging(handler, {
    action: 'user_login',
    entityType: 'user',
    getEntityId: (req) => 'system',
    riskLevel: 'low',
  }),

  logout: (handler: any) => withAuditLogging(handler, {
    action: 'user_logout',
    entityType: 'user',
    getEntityId: (req) => 'system',
    riskLevel: 'low',
  }),

  register: (handler: any) => withAuditLogging(handler, {
    action: 'user_register',
    entityType: 'user',
    getEntityId: (req, result) => result?.user?.id || 'system',
    riskLevel: 'low',
  }),

  // Workspace operations
  createWorkspace: (handler: any) => withAuditLogging(handler, {
    action: 'workspace_create',
    entityType: 'workspace',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({ name: req.body?.name }),
    riskLevel: 'medium',
  }),

  updateWorkspace: (handler: any) => withAuditLogging(handler, {
    action: 'workspace_update',
    entityType: 'workspace',
    // getEntityId: (req) => req.params?.id || 'system',
    // getMetadata: (req) => ({ changes: Object.keys(req.body || {}) }),
    riskLevel: 'medium',
  }),

  deleteWorkspace: (handler: any) => withAuditLogging(handler, {
    action: 'workspace_delete',
    entityType: 'workspace',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'high',
  }),

  // Project operations
  createProject: (handler: any) => withAuditLogging(handler, {
    action: 'project_create',
    entityType: 'project',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({ name: req.body?.name, organizationId: req.body?.organization_id }),
    riskLevel: 'medium',
  }),

  updateProject: (handler: any) => withAuditLogging(handler, {
    action: 'project_update',
    entityType: 'project',
    // getEntityId: (req) => req.params?.id || 'system',
    // getMetadata: (req) => ({ changes: Object.keys(req.body || {}) }),
    riskLevel: 'medium',
  }),

  deleteProject: (handler: any) => withAuditLogging(handler, {
    action: 'project_delete',
    entityType: 'project',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'high',
  }),

  // Task operations
  createTask: (handler: any) => withAuditLogging(handler, {
    action: 'task_create',
    entityType: 'task',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({
    //   title: req.body?.title,
    //   projectId: req.body?.project_id,
    //   priority: req.body?.priority
    // }),
    riskLevel: 'low',
  }),

  updateTask: (handler: any) => withAuditLogging(handler, {
    action: 'task_update',
    entityType: 'task',
    // getEntityId: (req) => req.params?.id || 'system',
    // getMetadata: (req) => ({ changes: Object.keys(req.body || {}) }),
    riskLevel: 'low',
  }),

  deleteTask: (handler: any) => withAuditLogging(handler, {
    action: 'task_delete',
    entityType: 'task',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'medium',
  }),

  // Time tracking operations
  createTimeEntry: (handler: any) => withAuditLogging(handler, {
    action: 'time_entry_create',
    entityType: 'time_entry',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({
    //   duration: req.body?.duration_hours,
    //   projectId: req.body?.project_id
    // }),
    riskLevel: 'low',
  }),

  // File operations
  uploadFile: (handler: any) => withAuditLogging(handler, {
    action: 'file_upload',
    entityType: 'file',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({ size: req.body?.size, type: req.body?.type }),
    riskLevel: 'low',
  }),

  downloadFile: (handler: any) => withAuditLogging(handler, {
    action: 'file_download',
    entityType: 'file',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'low',
  }),

  deleteFile: (handler: any) => withAuditLogging(handler, {
    action: 'file_delete',
    entityType: 'file',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'medium',
  }),

  // Goal operations
  createGoal: (handler: any) => withAuditLogging(handler, {
    action: 'goal_create',
    entityType: 'goal',
    getEntityId: (req, result) => result?.id || 'system',
    // getMetadata: (req) => ({
    //   title: req.body?.title,
    //   type: req.body?.type,
    //   priority: req.body?.priority
    // }),
    riskLevel: 'low',
  }),

  updateGoal: (handler: any) => withAuditLogging(handler, {
    action: 'goal_update',
    entityType: 'goal',
    // getEntityId: (req) => req.params?.id || 'system',
    // getMetadata: (req) => ({ changes: Object.keys(req.body || {}) }),
    riskLevel: 'low',
  }),

  deleteGoal: (handler: any) => withAuditLogging(handler, {
    action: 'goal_delete',
    entityType: 'goal',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'medium',
  }),

  // Data operations
  exportData: (handler: any) => withAuditLogging(handler, {
    action: 'data_export',
    entityType: 'system',
    getEntityId: () => 'system',
    getMetadata: (req) => {
      const url = new URL(req.url);
      return {
        format: url.searchParams.get('format') || 'json',
        type: url.searchParams.get('type') || 'full'
      };
    },
    riskLevel: 'medium',
  }),

  importData: (handler: any) => withAuditLogging(handler, {
    action: 'data_import',
    entityType: 'system',
    getEntityId: () => 'system',
    // getMetadata: (req) => ({
    //   format: req.body?.format || 'json',
    //   recordCount: req.body?.data?.length || 0
    // }),
    riskLevel: 'high',
  }),

  // Backup operations
  createBackup: (handler: any) => withAuditLogging(handler, {
    action: 'backup_create',
    entityType: 'system',
    getEntityId: () => 'system',
    getMetadata: (req) => {
      const url = new URL(req.url);
      return {
        includeFiles: url.searchParams.get('includeFiles') === 'true',
        includeComments: url.searchParams.get('includeComments') === 'true'
      };
    },
    riskLevel: 'medium',
  }),

  restoreBackup: (handler: any) => withAuditLogging(handler, {
    action: 'backup_restore',
    entityType: 'system',
    getEntityId: () => 'system',
    // getMetadata: (req) => ({
    //   restoredItems: req.result?.restored || {}
    // }),
    riskLevel: 'high',
  }),

  // Security operations
  changePassword: (handler: any) => withAuditLogging(handler, {
    action: 'password_change',
    entityType: 'user',
    // getEntityId: (req) => req.params?.id || 'current_user',
    riskLevel: 'medium',
  }),

  resetPassword: (handler: any) => withAuditLogging(handler, {
    action: 'password_reset',
    entityType: 'user',
    // getEntityId: (req) => req.params?.id || 'system',
    riskLevel: 'medium',
  }),

  // Administrative operations
  changeRole: (handler: any) => withAuditLogging(handler, {
    action: 'role_change',
    entityType: 'user',
    getEntityId: (req) => {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const userIdIndex = pathParts.indexOf('users');
      return userIdIndex !== -1 && pathParts[userIdIndex + 1] ? pathParts[userIdIndex + 1] : 'system';
    },
    // getMetadata: (req) => ({
    //   oldRole: req.body?.oldRole,
    //   newRole: req.body?.newRole,
    //   organizationId: req.body?.organizationId
    // }),
    riskLevel: 'high',
  }),

  bulkOperation: (handler: any) => withAuditLogging(handler, {
    action: 'bulk_operation',
    entityType: 'system',
    getEntityId: () => 'system',
    // getMetadata: (req) => ({
    //   operation: req.body?.operation,
    //   count: req.body?.ids?.length || 0,
    //   entityType: req.body?.entityType
    // }),
    riskLevel: 'high',
  }),
};

// Client-side audit logging utilities
export const clientAudit = {
  // Log user actions from the client
  logUserAction: async (action: AuditAction, entityType: EntityType, entityId: string, metadata?: Record<string, any>) => {
    try {
      await AuditService.logUserAction('current_user', action, entityType, entityId, metadata);
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  },

  // Log data changes from the client
  logDataChange: async (
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ) => {
    try {
      await AuditService.logDataChange('current_user', action, entityType, entityId, oldValues, newValues, metadata);
    } catch (error) {
      console.error('Failed to log data change:', error);
    }
  },

  // Log security events from the client
  logSecurityEvent: async (action: AuditAction, riskLevel: RiskLevel, details: Record<string, any>) => {
    try {
      await AuditService.logSecurityEvent('current_user', action, riskLevel, details);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  },
};

// React hook for audit logging in components
export function useAuditLogger() {
  return {
    logAction: clientAudit.logUserAction,
    logDataChange: clientAudit.logDataChange,
    logSecurityEvent: clientAudit.logSecurityEvent,
  };
}
