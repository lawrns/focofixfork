/**
 * FocoBot Security Service
 * Handles device fingerprinting, session management, rate limiting, and audit logging
 * Ensures only the authorized user can access their tasks through WhatsApp
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Environment configuration
const SESSION_TIMEOUT_HOURS = parseInt(process.env.FOCOBOT_SESSION_TIMEOUT_HOURS || '24');
const MAX_SESSION_DAYS = parseInt(process.env.FOCOBOT_MAX_SESSION_DAYS || '7');
const ENCRYPTION_KEY = process.env.FOCOBOT_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Rate limit configuration
interface RateLimitConfig {
  unlinkedPhone: { perMinute: number; perHour: number; perDay: number };
  verifiedUser: { perMinute: number; perHour: number; perDay: number };
}

const RATE_LIMITS: RateLimitConfig = {
  unlinkedPhone: { perMinute: 3, perHour: 10, perDay: 20 },
  verifiedUser: { perMinute: 10, perHour: 100, perDay: 500 },
};

// Types
export interface DeviceFingerprint {
  phone: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface BotSession {
  id: string;
  userId: string;
  phone: string;
  deviceFingerprintId: string;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  userId?: string;
  session?: BotSession;
  errorCode?: string;
}

export interface FingerprintData {
  hash: string;
  salt: string;
}

/**
 * Generate device fingerprint from message metadata
 */
export function generateDeviceFingerprint(phone: string, userAgent?: string, ipAddress?: string): FingerprintData {
  const salt = crypto.randomBytes(16).toString('hex');
  const data = `${phone}:${userAgent || ''}:${ipAddress || ''}:${salt}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  return { hash, salt };
}

/**
 * Encrypt device info for storage
 */
export function encryptDeviceInfo(info: Record<string, any>): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    iv
  );
  
  let encrypted = cipher.update(JSON.stringify(info), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted,
    tag: authTag.toString('base64'),
  });
}

/**
 * Decrypt device info
 */
export function decryptDeviceInfo(encryptedData: string): Record<string, any> {
  try {
    const { iv, data, tag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt device info:', error);
    return {};
  }
}

class FocoBotSecurityService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  /**
   * Check if a message has already been processed (replay prevention)
   */
  async isMessageProcessed(messageSid: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('whatsapp_processed_messages')
      .select('id')
      .eq('message_sid', messageSid)
      .single();
    
    return !!data;
  }

  /**
   * Mark message as processed
   */
  async markMessageProcessed(messageSid: string, phone: string, timestamp: Date): Promise<void> {
    // Get user_id from whatsapp_user_links
    const { data: link } = await this.supabase
      .from('whatsapp_user_links')
      .select('user_id')
      .eq('phone', phone)
      .eq('verified', true)
      .single();
    
    await this.supabase
      .from('whatsapp_processed_messages')
      .insert({
        message_sid: messageSid,
        phone,
        user_id: link?.user_id,
        message_timestamp: timestamp.toISOString(),
      });
  }

  /**
   * Check rate limits for a phone number
   */
  async checkRateLimits(phone: string, isVerified: boolean): Promise<{ allowed: boolean; reason?: string }> {
    const limits = isVerified ? RATE_LIMITS.verifiedUser : RATE_LIMITS.unlinkedPhone;
    
    // Check violations
    const { data: violations } = await this.supabase
      .rpc('check_rate_limit_status', { p_phone: phone, p_user_id: null });
    
    if (violations && violations[0]?.is_violator) {
      return { allowed: false, reason: 'Rate limit exceeded. Please try again later.' };
    }
    
    return { allowed: true };
  }

  /**
   * Get verified user link for phone number
   */
  async getVerifiedUserLink(phone: string): Promise<{ userId: string; phone: string } | null> {
    const { data: link } = await this.supabase
      .from('whatsapp_user_links')
      .select('user_id, phone')
      .eq('phone', phone)
      .eq('verified', true)
      .single();
    
    if (!link) return null;
    
    return { userId: link.user_id, phone: link.phone };
  }

  /**
   * Check if user account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .rpc('is_account_locked', { p_user_id: userId });
    
    return data || false;
  }

  /**
   * Get or create device fingerprint
   */
  async getOrCreateDeviceFingerprint(
    userId: string,
    phone: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ id: string; isTrusted: boolean; isBlocked: boolean }> {
    const fingerprint = generateDeviceFingerprint(phone, userAgent, ipAddress);
    
    // Check for existing fingerprint
    const { data: existing } = await this.supabase
      .from('whatsapp_device_fingerprints')
      .select('id, is_trusted, is_blocked')
      .eq('user_id', userId)
      .eq('fingerprint_hash', fingerprint.hash)
      .single();
    
    if (existing) {
      // Update last seen
      await this.supabase
        .from('whatsapp_device_fingerprints')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id);
      
      return { id: existing.id, isTrusted: existing.is_trusted, isBlocked: existing.is_blocked };
    }
    
    // Create new fingerprint
    const deviceInfo = encryptDeviceInfo({ userAgent, ipAddress });
    
    const { data: created, error } = await this.supabase
      .from('whatsapp_device_fingerprints')
      .insert({
        user_id: userId,
        phone,
        fingerprint_hash: fingerprint.hash,
        fingerprint_salt: fingerprint.salt,
        device_info_encrypted: deviceInfo,
        is_trusted: true, // Auto-trust first device
      })
      .select('id, is_trusted, is_blocked')
      .single();
    
    if (error) {
      console.error('Failed to create device fingerprint:', error);
      throw new Error('Failed to register device');
    }
    
    return { id: created.id, isTrusted: created.is_trusted, isBlocked: created.is_blocked };
  }

  /**
   * Create or validate session
   */
  async validateOrCreateSession(
    userId: string,
    phone: string,
    deviceFingerprintId: string
  ): Promise<BotSession> {
    // Check for active session
    const { data: existing } = await this.supabase
      .rpc('get_active_bot_session', { p_user_id: userId, p_phone: phone });
    
    if (existing && existing[0]) {
      // Update last activity
      await this.supabase
        .from('whatsapp_bot_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', existing[0].session_id);
      
      return {
        id: existing[0].session_id,
        userId,
        phone,
        deviceFingerprintId: existing[0].device_fingerprint_id,
        expiresAt: new Date(existing[0].expires_at),
        lastActivityAt: new Date(),
      };
    }
    
    // Create new session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_TIMEOUT_HOURS);
    
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    
    const { data: created, error } = await this.supabase
      .from('whatsapp_bot_sessions')
      .insert({
        user_id: userId,
        phone,
        device_fingerprint_id: deviceFingerprintId,
        session_token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
    
    return {
      id: created.id,
      userId,
      phone,
      deviceFingerprintId,
      expiresAt,
      lastActivityAt: new Date(),
    };
  }

  /**
   * Main security check - runs all validation layers
   */
  async securityCheck(params: {
    messageSid: string;
    phone: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SecurityCheckResult> {
    const startTime = Date.now();
    
    try {
      // Layer 1: Replay prevention
      const isProcessed = await this.isMessageProcessed(params.messageSid);
      if (isProcessed) {
        return { allowed: false, reason: 'Message already processed', errorCode: 'REPLAY_DETECTED' };
      }
      
      // Mark as processed immediately to prevent race conditions
      await this.markMessageProcessed(params.messageSid, params.phone, new Date());
      
      // Layer 2: Get verified user link
      const userLink = await this.getVerifiedUserLink(params.phone);
      if (!userLink) {
        return { allowed: false, reason: 'Phone not linked to any user. Please link your WhatsApp in the app first.', errorCode: 'PHONE_NOT_LINKED' };
      }
      
      // Layer 3: Check account lockout
      const isLocked = await this.isAccountLocked(userLink.userId);
      if (isLocked) {
        return { allowed: false, reason: 'Account is temporarily locked. Please contact support.', errorCode: 'ACCOUNT_LOCKED' };
      }
      
      // Layer 4: Rate limiting
      const rateCheck = await this.checkRateLimits(params.phone, true);
      if (!rateCheck.allowed) {
        return { allowed: false, reason: rateCheck.reason, errorCode: 'RATE_LIMITED' };
      }
      
      // Layer 5: Device fingerprinting
      const fingerprint = await this.getOrCreateDeviceFingerprint(
        userLink.userId,
        params.phone,
        params.userAgent,
        params.ipAddress
      );
      
      if (fingerprint.isBlocked) {
        return { allowed: false, reason: 'Device has been blocked. Please contact support.', errorCode: 'DEVICE_BLOCKED' };
      }
      
      // Layer 6: Session management
      const session = await this.validateOrCreateSession(
        userLink.userId,
        params.phone,
        fingerprint.id
      );
      
      // Log successful security check
      await this.logSecurityEvent({
        userId: userLink.userId,
        phone: params.phone,
        actionType: 'session_validated',
        success: true,
        processingTimeMs: Date.now() - startTime,
      });
      
      return {
        allowed: true,
        userId: userLink.userId,
        session,
      };
      
    } catch (error) {
      console.error('Security check failed:', error);
      return { allowed: false, reason: 'Security check failed', errorCode: 'SECURITY_ERROR' };
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(params: {
    userId?: string;
    phone?: string;
    actionType: string;
    actionDetails?: Record<string, any>;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    messageSid?: string;
    processingTimeMs?: number;
  }): Promise<void> {
    try {
      await this.supabase.rpc('log_whatsapp_security_event', {
        p_user_id: params.userId,
        p_phone: params.phone,
        p_action_type: params.actionType,
        p_action_details: params.actionDetails || {},
        p_success: params.success,
        p_error_code: params.errorCode,
        p_error_message: params.errorMessage,
        p_message_sid: params.messageSid,
        p_processing_time_ms: params.processingTimeMs,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Record FocoBot command execution
   */
  async recordCommand(params: {
    userId: string;
    phone: string;
    command: string;
    commandInput: string;
    commandParams?: Record<string, any>;
    success: boolean;
    resultSummary?: string;
    errorMessage?: string;
    llmModel?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
    taskId?: string;
    projectId?: string;
  }): Promise<void> {
    try {
      await this.supabase.rpc('record_focobot_command', {
        p_user_id: params.userId,
        p_phone: params.phone,
        p_command: params.command,
        p_command_input: params.commandInput,
        p_command_params: params.commandParams || {},
        p_success: params.success,
        p_result_summary: params.resultSummary,
        p_error_message: params.errorMessage,
        p_llm_model: params.llmModel,
        p_tokens_used: params.tokensUsed,
        p_processing_time_ms: params.processingTimeMs,
        p_task_id: params.taskId,
        p_project_id: params.projectId,
      });
    } catch (error) {
      console.error('Failed to record command:', error);
    }
  }
}

// Singleton instance
let securityServiceInstance: FocoBotSecurityService | null = null;

export function getFocoBotSecurityService(): FocoBotSecurityService {
  if (!securityServiceInstance) {
    securityServiceInstance = new FocoBotSecurityService();
  }
  return securityServiceInstance;
}

export default FocoBotSecurityService;
