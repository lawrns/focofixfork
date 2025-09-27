import { supabase } from '@/lib/supabase';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_email?: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  organization_id?: string;
  project_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  risk_level: RiskLevel;
  status: 'success' | 'failure' | 'warning';
  error_message?: string;
}

export type AuditAction =
  // Authentication & Authorization
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'password_change'
  | 'password_reset'
  | 'role_change'
  | 'permission_grant'
  | 'permission_revoke'

  // Organization Management
  | 'organization_create'
  | 'organization_update'
  | 'organization_delete'
  | 'organization_member_add'
  | 'organization_member_remove'
  | 'organization_member_role_change'

  // Project Management
  | 'project_create'
  | 'project_update'
  | 'project_delete'
  | 'project_status_change'
  | 'project_member_add'
  | 'project_member_remove'

  // Task & Milestone Management
  | 'milestone_create'
  | 'milestone_update'
  | 'milestone_delete'
  | 'task_create'
  | 'task_update'
  | 'task_delete'
  | 'task_assign'
  | 'task_status_change'

  // Time Tracking
  | 'time_entry_create'
  | 'time_entry_update'
  | 'time_entry_delete'
  | 'time_entry_approve'
  | 'time_entry_reject'

  // Content & Collaboration
  | 'comment_create'
  | 'comment_update'
  | 'comment_delete'
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'goal_create'
  | 'goal_update'
  | 'goal_delete'

  // System & Security
  | 'backup_create'
  | 'backup_restore'
  | 'data_export'
  | 'data_import'
  | 'settings_change'
  | 'api_key_create'
  | 'api_key_delete'
  | 'suspicious_activity'
  | 'security_violation'

  // Administrative
  | 'user_suspension'
  | 'user_activation'
  | 'bulk_operation'
  | 'system_maintenance';

export type EntityType =
  | 'user'
  | 'organization'
  | 'project'
  | 'milestone'
  | 'task'
  | 'time_entry'
  | 'comment'
  | 'file'
  | 'goal'
  | 'invitation'
  | 'settings'
  | 'system';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogQuery {
  user_id?: string;
  organization_id?: string;
  project_id?: string;
  action?: AuditAction;
  entity_type?: EntityType;
  risk_level?: RiskLevel;
  status?: 'success' | 'failure' | 'warning';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  totalEntries: number;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    actionsByType: Record<AuditAction, number>;
    entitiesByType: Record<EntityType, number>;
    riskDistribution: Record<RiskLevel, number>;
    statusDistribution: Record<'success' | 'failure' | 'warning', number>;
    topUsers: Array<{ user_id: string; email: string; count: number }>;
    recentActivity: AuditLogEntry[];
  };
  securityInsights: {
    failedLogins: number;
    suspiciousActivities: number;
    permissionChanges: number;
    dataExports: number;
    highRiskActions: number;
  };
  compliance: {
    gdprCompliance: boolean;
    dataRetention: boolean;
    auditTrailCompleteness: number;
  };
}

export class AuditService {
  // Log an audit event
  static async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      // In a production system, this would be stored in a dedicated audit database
      // For now, we'll store it in localStorage for demonstration
      const existingLogs = this.getStoredLogs();
      existingLogs.unshift(auditEntry);

      // Keep only last 1000 entries in localStorage (in production, use proper database)
      if (existingLogs.length > 1000) {
        existingLogs.splice(1000);
      }

      localStorage.setItem('foco_audit_logs', JSON.stringify(existingLogs));

      // Check for security alerts
      await this.checkSecurityAlerts(auditEntry);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // In production, this should trigger an alert or fallback logging
    }
  }

  // Query audit logs
  static async queryLogs(query: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    try {
      let logs = this.getStoredLogs();

      // Apply filters
      if (query.user_id) {
        logs = logs.filter(log => log.user_id === query.user_id);
      }

      if (query.organization_id) {
        logs = logs.filter(log => log.organization_id === query.organization_id);
      }

      if (query.project_id) {
        logs = logs.filter(log => log.project_id === query.project_id);
      }

      if (query.action) {
        logs = logs.filter(log => log.action === query.action);
      }

      if (query.entity_type) {
        logs = logs.filter(log => log.entity_type === query.entity_type);
      }

      if (query.risk_level) {
        logs = logs.filter(log => log.risk_level === query.risk_level);
      }

      if (query.status) {
        logs = logs.filter(log => log.status === query.status);
      }

      if (query.start_date) {
        const startDate = new Date(query.start_date);
        logs = logs.filter(log => new Date(log.timestamp) >= startDate);
      }

      if (query.end_date) {
        const endDate = new Date(query.end_date);
        logs = logs.filter(log => new Date(log.timestamp) <= endDate);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      logs = logs.slice(offset, offset + limit);

      return logs;
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  // Generate audit report
  static async generateReport(query: AuditLogQuery = {}): Promise<AuditReport> {
    try {
      const allLogs = await this.queryLogs({ ...query, limit: 10000 }); // Get more data for reporting

      const startDate = query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = query.end_date || new Date().toISOString();

      // Calculate summary statistics
      const actionsByType: Record<AuditAction, number> = {} as Record<AuditAction, number>;
      const entitiesByType: Record<EntityType, number> = {} as Record<EntityType, number>;
      const riskDistribution: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      const statusDistribution: Record<'success' | 'failure' | 'warning', number> = { success: 0, failure: 0, warning: 0 };

      const userActivity: Record<string, { email?: string; count: number }> = {};

      allLogs.forEach(log => {
        // Actions by type
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

        // Entities by type
        entitiesByType[log.entity_type] = (entitiesByType[log.entity_type] || 0) + 1;

        // Risk distribution
        riskDistribution[log.risk_level]++;

        // Status distribution
        statusDistribution[log.status]++;

        // User activity
        if (!userActivity[log.user_id]) {
          userActivity[log.user_id] = { email: log.user_email, count: 0 };
        }
        userActivity[log.user_id].count++;
      });

      const topUsers = Object.entries(userActivity)
        .map(([user_id, data]) => ({ user_id, email: data.email || '', count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Security insights
      const failedLogins = allLogs.filter(log => log.action === 'user_login' && log.status === 'failure').length;
      const suspiciousActivities = allLogs.filter(log => log.action === 'suspicious_activity').length;
      const permissionChanges = allLogs.filter(log =>
        ['role_change', 'permission_grant', 'permission_revoke'].includes(log.action)
      ).length;
      const dataExports = allLogs.filter(log => log.action === 'data_export').length;
      const highRiskActions = allLogs.filter(log => log.risk_level === 'high' || log.risk_level === 'critical').length;

      // Compliance checks (simplified)
      const gdprCompliance = true; // Would check actual compliance rules
      const dataRetention = allLogs.length > 0; // Basic check
      const auditTrailCompleteness = (allLogs.filter(log => log.status === 'success').length / Math.max(allLogs.length, 1)) * 100;

      return {
        totalEntries: allLogs.length,
        dateRange: { start: startDate, end: endDate },
        summary: {
          actionsByType,
          entitiesByType,
          riskDistribution,
          statusDistribution,
          topUsers,
          recentActivity: allLogs.slice(0, 20),
        },
        securityInsights: {
          failedLogins,
          suspiciousActivities,
          permissionChanges,
          dataExports,
          highRiskActions,
        },
        compliance: {
          gdprCompliance,
          dataRetention,
          auditTrailCompleteness,
        },
      };
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      throw error;
    }
  }

  // Export audit logs
  static async exportLogs(query: AuditLogQuery = {}): Promise<void> {
    try {
      const logs = await this.queryLogs({ ...query, limit: 10000 });

      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `foco-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  // Get stored logs (in production, this would query a database)
  private static getStoredLogs(): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem('foco_audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored logs:', error);
      return [];
    }
  }

  // Check for security alerts
  private static async checkSecurityAlerts(entry: AuditLogEntry): Promise<void> {
    // Check for suspicious patterns
    if (entry.action === 'user_login' && entry.status === 'failure') {
      // Count recent failed login attempts
      const recentLogs = this.getStoredLogs();
      const recentFailedLogins = recentLogs.filter(log =>
        log.user_id === entry.user_id &&
        log.action === 'user_login' &&
        log.status === 'failure' &&
        new Date(log.timestamp) > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      );

      if (recentFailedLogins.length >= 5) {
        // Log suspicious activity
        await this.logEvent({
          user_id: entry.user_id,
          user_email: entry.user_email,
          action: 'suspicious_activity',
          entity_type: 'user',
          entity_id: entry.user_id,
          risk_level: 'high',
          status: 'warning',
          metadata: {
            reason: 'multiple_failed_logins',
            count: recentFailedLogins.length,
            timeWindow: '15_minutes',
          },
        });
      }
    }

    // Check for unusual permission changes
    if (['role_change', 'permission_grant', 'permission_revoke'].includes(entry.action)) {
      await this.logEvent({
        user_id: entry.user_id,
        user_email: entry.user_email,
        action: 'suspicious_activity',
        entity_type: 'system',
        entity_id: 'security_monitoring',
        risk_level: 'medium',
        status: 'warning',
        metadata: {
          reason: 'permission_change_detected',
          original_action: entry.action,
          target_entity: entry.entity_type,
          target_id: entry.entity_id,
        },
      });
    }

    // Check for data export activities (GDPR compliance)
    if (entry.action === 'data_export') {
      await this.logEvent({
        user_id: entry.user_id,
        user_email: entry.user_email,
        action: 'suspicious_activity',
        entity_type: 'system',
        entity_id: 'gdpr_monitoring',
        risk_level: 'low',
        status: 'success',
        metadata: {
          reason: 'data_export_logged',
          export_type: entry.metadata?.format || 'unknown',
          record_count: entry.metadata?.recordCount || 0,
        },
      });
    }
  }

  // Utility functions for common audit scenarios
  static async logUserAction(
    userId: string,
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await this.logEvent({
        user_id: userId,
        user_email: user?.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        organization_id: metadata?.organization_id,
        project_id: metadata?.project_id,
        risk_level: this.getRiskLevel(action),
        status: 'success',
        metadata,
      });
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }

  static async logDataChange(
    userId: string,
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await this.logEvent({
        user_id: userId,
        user_email: user?.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        organization_id: metadata?.organization_id,
        project_id: metadata?.project_id,
        old_values: oldValues,
        new_values: newValues,
        risk_level: this.getRiskLevel(action),
        status: 'success',
        metadata,
      });
    } catch (error) {
      console.error('Failed to log data change:', error);
    }
  }

  static async logSecurityEvent(
    userId: string,
    action: AuditAction,
    riskLevel: RiskLevel,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await this.logEvent({
        user_id: userId,
        user_email: user?.email,
        action,
        entity_type: 'system',
        entity_id: 'security',
        risk_level: riskLevel,
        status: 'warning',
        metadata: details,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Determine risk level based on action
  private static getRiskLevel(action: AuditAction): RiskLevel {
    const highRiskActions: AuditAction[] = [
      'user_suspension',
      'user_activation',
      'organization_delete',
      'project_delete',
      'bulk_operation',
      'data_import',
      'settings_change',
      'api_key_delete',
      'security_violation',
    ];

    const mediumRiskActions: AuditAction[] = [
      'role_change',
      'permission_grant',
      'permission_revoke',
      'password_change',
      'organization_member_remove',
      'backup_restore',
      'data_export',
      'suspicious_activity',
    ];

    if (highRiskActions.includes(action)) return 'high';
    if (mediumRiskActions.includes(action)) return 'medium';
    return 'low';
  }

  // Clear audit logs (for testing/admin purposes)
  static clearLogs(): void {
    localStorage.removeItem('foco_audit_logs');
  }
}
