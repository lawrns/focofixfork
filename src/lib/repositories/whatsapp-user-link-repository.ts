/**
 * WhatsApp User Link Repository
 * Type-safe database access for WhatsApp phone number linking
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateVerificationCode } from '@/lib/utils/whatsapp-crypto'

export interface WhatsAppUserLink {
  id: string
  user_id: string
  phone: string
  verified: boolean
  verification_code: string | null
  verification_code_expires_at: string | null
  linked_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateWhatsAppUserLinkData {
  user_id: string
  phone: string
}

export interface VerifyCodeData {
  phone: string
  code: string
}

export class WhatsAppUserLinkRepository extends BaseRepository<WhatsAppUserLink> {
  protected table = 'whatsapp_user_links'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Find WhatsApp link by phone number
   * Returns null if not found (phone may not be linked yet)
   */
  async findByPhone(phone: string): Promise<Result<WhatsAppUserLink | null>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to find WhatsApp link by phone',
        details: error,
      })
    }

    return Ok(data)
  }

  /**
   * Find WhatsApp link by user ID
   * Returns null if user hasn't linked WhatsApp
   */
  async findByUserId(userId: string): Promise<Result<WhatsAppUserLink | null>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to find WhatsApp link by user ID',
        details: error,
      })
    }

    return Ok(data)
  }

  /**
   * Create verification code for phone linking
   * Generates 6-digit code valid for 10 minutes
   * Returns the verification code to display to user
   */
  async createVerificationCode(
    userId: string,
    phone: string
  ): Promise<Result<string>> {
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Check if user already has a link (one link per user)
    const existingLinkResult = await this.findByUserId(userId)
    if (isError(existingLinkResult)) {
      return Err(existingLinkResult.error)
    }

    if (existingLinkResult.data) {
      // Update existing link with new verification code
      const { data, error } = await this.supabase
        .from(this.table)
        .update({
          phone,
          verified: false,
          verification_code: code,
          verification_code_expires_at: expiresAt.toISOString(),
          linked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle()

      if (error) {
        return Err({
          code: 'DATABASE_ERROR',
          message: 'Failed to update verification code',
          details: error,
        })
      }

      return Ok(code)
    }

    // Create new link with verification code
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: userId,
        phone,
        verified: false,
        verification_code: code,
        verification_code_expires_at: expiresAt.toISOString(),
      })
      .select()
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create verification code',
        details: error,
      })
    }

    return Ok(code)
  }

  /**
   * Verify code and link phone to user account
   * Returns true if verification successful, false if code invalid/expired
   */
  async verifyCode(phone: string, code: string): Promise<Result<boolean>> {
    // Find link by phone
    const linkResult = await this.findByPhone(phone)
    if (isError(linkResult)) {
      return Err(linkResult.error)
    }

    if (!linkResult.data) {
      return Ok(false) // Phone not found
    }

    const link = linkResult.data

    // Check if already verified
    if (link.verified) {
      return Ok(true) // Already verified
    }

    // Check code match
    if (link.verification_code !== code) {
      return Ok(false) // Code doesn't match
    }

    // Check expiration
    if (
      !link.verification_code_expires_at ||
      new Date(link.verification_code_expires_at) < new Date()
    ) {
      return Ok(false) // Code expired
    }

    // Mark as verified
    const { error } = await this.supabase
      .from(this.table)
      .update({
        verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('phone', phone)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to verify code',
        details: error,
      })
    }

    return Ok(true)
  }

  /**
   * Unlink WhatsApp from user account
   */
  async unlinkByUserId(userId: string): Promise<Result<boolean>> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('user_id', userId)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to unlink WhatsApp',
        details: error,
      })
    }

    return Ok(true)
  }

  /**
   * Check if phone is verified and linked
   */
  async isPhoneVerified(phone: string): Promise<Result<boolean>> {
    const linkResult = await this.findByPhone(phone)
    if (isError(linkResult)) {
      return Err(linkResult.error)
    }

    return Ok(linkResult.data?.verified ?? false)
  }

  /**
   * Get all verified WhatsApp links (admin use)
   */
  async getAllVerified(): Promise<Result<WhatsAppUserLink[]>> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('verified', true)
      .order('linked_at', { ascending: false })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to get verified WhatsApp links',
        details: error,
      })
    }

    return Ok(data || [])
  }
}
