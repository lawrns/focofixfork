/**
 * Quiet hours utility — checks if a user's quiet hours are currently active.
 */

import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Check whether the current time falls within a user's configured quiet hours.
 * Returns false if the user has no quiet hours configured or if the table doesn't exist.
 */
export async function isQuietHoursActive(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_notification_settings')
      .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data || !data.quiet_hours_enabled) {
      return false
    }

    const tz = data.quiet_hours_timezone ?? 'America/Mexico_City'
    const now = new Date()

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
    const currentMinutes = hour * 60 + minute

    // Parse start/end times
    const [startH, startM] = (data.quiet_hours_start ?? '22:00').split(':').map(Number)
    const [endH, endM] = (data.quiet_hours_end ?? '07:00').split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    // Handle overnight windows (e.g. 22:00 → 07:00)
    if (startMinutes <= endMinutes) {
      // Same-day window (e.g. 09:00 → 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Overnight window (e.g. 22:00 → 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
  } catch {
    return false
  }
}
