/**
 * CRICO Audit Service
 * Immutable audit trail with integrity verification
 */

import { supabase } from '@/lib/supabase/client';
import type {
  AuditRecord,
  CricoAction,
  VoiceCommand,
  Environment,
} from '../types';

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

export type AuditEventType =
  | 'action_created'
  | 'action_approved'
  | 'action_rejected'
  | 'action_executed'
  | 'action_completed'
  | 'action_failed'
  | 'action_rolled_back'
  | 'voice_captured'
  | 'voice_parsed'
  | 'voice_confirmed'
  | 'voice_rejected'
  | 'agent_invoked'
  | 'agent_completed'
  | 'suggestion_created'
  | 'suggestion_accepted'
  | 'suggestion_dismissed'
  | 'alignment_check'
  | 'drift_detected'
  | 'safety_violation';

// ============================================================================
// AUDIT ENTRY CREATION
// ============================================================================

export interface CreateAuditEntryInput {
  eventType: AuditEventType;
  eventData: Record<string, unknown>;
  actionId?: string;
  voiceCommandId?: string;
  userId?: string;
  sessionId?: string;
  environment: Environment;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate SHA-256 checksum for integrity verification
 */
async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an immutable audit log entry
 */
export async function createAuditEntry(input: CreateAuditEntryInput): Promise<string> {
  const checksum = await generateChecksum(JSON.stringify(input.eventData));
  
  const { data, error } = await (supabase as any)
    .from('crico_audit_log')
    .insert({
      event_type: input.eventType,
      event_data: input.eventData,
      action_id: input.actionId,
      voice_command_id: input.voiceCommandId,
      user_id: input.userId,
      session_id: input.sessionId,
      environment: input.environment,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      checksum,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create audit entry:', error);
    return '';
  }

  return data?.id ?? '';
}

/**
 * Create audit entry for an action
 */
export async function auditAction(
  eventType: AuditEventType,
  action: CricoAction,
  additionalData?: Record<string, unknown>
): Promise<string> {
  return createAuditEntry({
    eventType,
    eventData: {
      actionId: action.id,
      source: action.source,
      intent: action.intent,
      authorityLevel: action.authorityLevel,
      scope: action.scope,
      confidence: action.confidence,
      status: action.status,
      ...additionalData,
    },
    actionId: action.id,
    userId: action.userId,
    sessionId: action.sessionId,
    environment: action.environment,
  });
}

/**
 * Create audit entry for a voice command
 */
export async function auditVoiceCommand(
  eventType: AuditEventType,
  command: VoiceCommand,
  additionalData?: Record<string, unknown>
): Promise<string> {
  return createAuditEntry({
    eventType,
    eventData: {
      commandId: command.id,
      transcript: command.rawTranscript,
      sttConfidence: command.sttConfidence,
      status: command.status,
      confirmationRequired: command.confirmationRequired,
      ...additionalData,
    },
    voiceCommandId: command.id,
    actionId: command.actionId,
    userId: command.userId,
    sessionId: command.sessionId,
    environment: 'development', // Voice commands default to dev
  });
}

// ============================================================================
// AUDIT RETRIEVAL
// ============================================================================

export interface AuditFilter {
  userId?: string;
  actionId?: string;
  voiceCommandId?: string;
  eventType?: AuditEventType[];
  environment?: Environment;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditEntry {
  id: string;
  eventType: AuditEventType;
  eventData: Record<string, unknown>;
  actionId?: string;
  voiceCommandId?: string;
  userId?: string;
  sessionId?: string;
  environment: Environment;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  checksum: string;
  verified?: boolean;
}

/**
 * Get audit entries with filters
 */
export async function getAuditEntries(filter: AuditFilter): Promise<AuditEntry[]> {
  let query = (supabase as any)
    .from('crico_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.actionId) {
    query = query.eq('action_id', filter.actionId);
  }
  if (filter.voiceCommandId) {
    query = query.eq('voice_command_id', filter.voiceCommandId);
  }
  if (filter.eventType && filter.eventType.length > 0) {
    query = query.in('event_type', filter.eventType);
  }
  if (filter.environment) {
    query = query.eq('environment', filter.environment);
  }
  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate.toISOString());
  }
  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate.toISOString());
  }
  if (filter.limit) {
    query = query.limit(filter.limit);
  }
  if (filter.offset) {
    query = query.range(filter.offset, filter.offset + (filter.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get audit entries:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventType: row.event_type,
    eventData: row.event_data,
    actionId: row.action_id,
    voiceCommandId: row.voice_command_id,
    userId: row.user_id,
    sessionId: row.session_id,
    environment: row.environment,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    checksum: row.checksum,
  }));
}

/**
 * Get audit trail for a specific action
 */
export async function getActionAuditTrail(actionId: string): Promise<AuditEntry[]> {
  return getAuditEntries({
    actionId,
    limit: 100,
  });
}

/**
 * Get audit trail for a user session
 */
export async function getSessionAuditTrail(
  userId: string,
  sessionId: string
): Promise<AuditEntry[]> {
  const { data, error } = await (supabase as any)
    .from('crico_audit_log')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to get session audit trail:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventType: row.event_type,
    eventData: row.event_data,
    actionId: row.action_id,
    voiceCommandId: row.voice_command_id,
    userId: row.user_id,
    sessionId: row.session_id,
    environment: row.environment,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    checksum: row.checksum,
  }));
}

// ============================================================================
// INTEGRITY VERIFICATION
// ============================================================================

/**
 * Verify the integrity of an audit entry
 */
export async function verifyAuditEntry(entry: AuditEntry): Promise<boolean> {
  const expectedChecksum = await generateChecksum(JSON.stringify(entry.eventData));
  return expectedChecksum === entry.checksum;
}

/**
 * Verify integrity of multiple audit entries
 */
export async function verifyAuditEntries(entries: AuditEntry[]): Promise<{
  total: number;
  verified: number;
  failed: number;
  failedIds: string[];
}> {
  let verified = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (const entry of entries) {
    const isValid = await verifyAuditEntry(entry);
    if (isValid) {
      verified++;
    } else {
      failed++;
      failedIds.push(entry.id);
    }
  }

  return {
    total: entries.length,
    verified,
    failed,
    failedIds,
  };
}

/**
 * Run full integrity check on audit log
 */
export async function runIntegrityCheck(
  userId?: string,
  limit: number = 1000
): Promise<{
  status: 'passed' | 'failed';
  total: number;
  verified: number;
  failed: number;
  failedIds: string[];
  duration: number;
}> {
  const startTime = Date.now();
  
  const entries = await getAuditEntries({
    userId,
    limit,
  });

  const result = await verifyAuditEntries(entries);

  return {
    status: result.failed === 0 ? 'passed' : 'failed',
    ...result,
    duration: Date.now() - startTime,
  };
}

// ============================================================================
// AUDIT STATISTICS
// ============================================================================

export interface AuditStats {
  totalEntries: number;
  byEventType: Record<AuditEventType, number>;
  byEnvironment: Record<Environment, number>;
  recentActivity: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  safetyViolations: number;
}

/**
 * Get audit statistics for a user
 */
export async function getAuditStats(userId: string): Promise<AuditStats> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await (supabase as any)
    .from('crico_audit_log')
    .select('event_type, environment, created_at')
    .eq('user_id', userId);

  if (error || !data) {
    return {
      totalEntries: 0,
      byEventType: {} as Record<AuditEventType, number>,
      byEnvironment: { development: 0, staging: 0, production: 0 },
      recentActivity: { last24h: 0, last7d: 0, last30d: 0 },
      safetyViolations: 0,
    };
  }

  const stats: AuditStats = {
    totalEntries: data.length,
    byEventType: {} as Record<AuditEventType, number>,
    byEnvironment: { development: 0, staging: 0, production: 0 },
    recentActivity: { last24h: 0, last7d: 0, last30d: 0 },
    safetyViolations: 0,
  };

  for (const entry of data) {
    // Count by event type
    const eventType = entry.event_type as AuditEventType;
    stats.byEventType[eventType] = (stats.byEventType[eventType] ?? 0) + 1;

    // Count by environment
    const env = entry.environment as Environment;
    stats.byEnvironment[env]++;

    // Count recent activity
    const createdAt = new Date(entry.created_at);
    if (createdAt >= last24h) stats.recentActivity.last24h++;
    if (createdAt >= last7d) stats.recentActivity.last7d++;
    if (createdAt >= last30d) stats.recentActivity.last30d++;

    // Count safety violations
    if (eventType === 'safety_violation') {
      stats.safetyViolations++;
    }
  }

  return stats;
}

// ============================================================================
// SAFETY VIOLATION LOGGING
// ============================================================================

export interface SafetyViolation {
  invariantKey: string;
  description: string;
  attemptedAction: Record<string, unknown>;
  blockedAt: Date;
  userId?: string;
}

/**
 * Log a safety violation
 */
export async function logSafetyViolation(violation: SafetyViolation): Promise<string> {
  return createAuditEntry({
    eventType: 'safety_violation',
    eventData: {
      invariantKey: violation.invariantKey,
      description: violation.description,
      attemptedAction: violation.attemptedAction,
      blockedAt: violation.blockedAt.toISOString(),
    },
    userId: violation.userId,
    environment: 'production', // Safety violations are always logged at production level
  });
}

/**
 * Get recent safety violations
 */
export async function getRecentSafetyViolations(
  limit: number = 50
): Promise<AuditEntry[]> {
  return getAuditEntries({
    eventType: ['safety_violation'],
    limit,
  });
}

// ============================================================================
// EXPORT FOR COMPLIANCE
// ============================================================================

export interface AuditExport {
  userId: string;
  exportedAt: Date;
  dateRange: { start: Date; end: Date };
  entries: AuditEntry[];
  integrityCheck: {
    status: 'passed' | 'failed';
    verified: number;
    failed: number;
  };
}

/**
 * Export audit log for compliance/reporting
 */
export async function exportAuditLog(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditExport> {
  const entries = await getAuditEntries({
    userId,
    startDate,
    endDate,
    limit: 10000, // Max entries for export
  });

  const integrityResult = await verifyAuditEntries(entries);

  return {
    userId,
    exportedAt: new Date(),
    dateRange: { start: startDate, end: endDate },
    entries,
    integrityCheck: {
      status: integrityResult.failed === 0 ? 'passed' : 'failed',
      verified: integrityResult.verified,
      failed: integrityResult.failed,
    },
  };
}
