import { EmailService } from './email';
import { supabaseAdmin } from '@/lib/supabase-server';

interface DigestItem {
  title: string;
  count: number;
  color: string;
}

interface ContentSelection {
  overdue: boolean;
  due_today: boolean;
  completed: boolean;
  comments: boolean;
}

interface DigestPreferences {
  frequency: 'none' | 'daily' | 'weekly';
  digest_time?: { hour: number; minute: number };
  digest_day?: string;
  content_selection?: ContentSelection;
}

export class EmailDigestScheduler {
  /**
   * Check if a user should receive a digest at the current time
   */
  static shouldSendDigestNow(
    preferences: DigestPreferences,
    currentHour: number,
    currentMinute: number,
    currentDayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  ): boolean {
    if (preferences.frequency === 'none') {
      return false;
    }

    if (!preferences.digest_time) {
      return false;
    }

    // Check if current time matches digest time
    const timeMatches =
      currentHour === preferences.digest_time.hour &&
      currentMinute === preferences.digest_time.minute;

    if (!timeMatches) {
      return false;
    }

    // For weekly digests, also check the day of week
    if (preferences.frequency === 'weekly') {
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const preferredDay = preferences.digest_day
        ? dayMap[preferences.digest_day.toLowerCase()]
        : 1; // Default to Monday

      return currentDayOfWeek === preferredDay;
    }

    return true;
  }

  /**
   * Get activity counts for a user based on their content preferences
   */
  static async getUserActivityCounts(
    userId: string,
    contentSelection: ContentSelection
  ): Promise<Record<string, DigestItem>> {
    if (!supabaseAdmin) {
      return {};
    }
    const supabase = supabaseAdmin;

    const items: Record<string, DigestItem> = {};

    // Get overdue tasks
    if (contentSelection.overdue) {
      const { count: overdueCount } = await supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .lt('due_date', new Date().toISOString())
        .eq('status', 'in_progress');

      if (overdueCount !== null && overdueCount > 0) {
        items.overdue = {
          title: 'Overdue Tasks',
          count: overdueCount,
          color: '#ef4444', // Red
        };
      }
    }

    // Get tasks due today
    if (contentSelection.due_today) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { count: dueTodayCount } = await supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .gte('due_date', startOfDay.toISOString())
        .lt('due_date', endOfDay.toISOString());

      if (dueTodayCount !== null && dueTodayCount > 0) {
        items.due_today = {
          title: 'Tasks Due Today',
          count: dueTodayCount,
          color: '#f59e0b', // Amber
        };
      }
    }

    // Get completed tasks
    if (contentSelection.completed) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { count: completedCount } = await supabase
        .from('work_items')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', userId)
        .eq('status', 'done')
        .gte('updated_at', startOfDay.toISOString())
        .lt('updated_at', endOfDay.toISOString());

      if (completedCount !== null && completedCount > 0) {
        items.completed = {
          title: 'Completed Tasks',
          count: completedCount,
          color: '#10b981', // Green
        };
      }
    }

    // Get new comments (from last 24 hours)
    if (contentSelection.comments) {
      const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', yesterdayStart.toISOString());

      if (commentsCount !== null && commentsCount > 0) {
        items.comments = {
          title: 'New Comments',
          count: commentsCount,
          color: '#3b82f6', // Blue
        };
      }
    }

    return items;
  }

  /**
   * Send digests to users who should receive them
   * This should be called by a cron job periodically (e.g., every minute)
   */
  static async processDailyAndWeeklyDigests(): Promise<void> {
    try {
      if (!supabaseAdmin) {
        console.error('Supabase admin client not available');
        return;
      }
      const supabase = supabaseAdmin;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDayOfWeek = now.getDay();

      // Get all workspace members with digest preferences
      const { data: workspaceMembers, error: fetchError } = await supabase
        .from('workspace_members')
        .select('id, user_id, settings')
        .not('settings->digestPreferences', 'is', null);

      if (fetchError) {
        console.error('Error fetching workspace members for digests:', fetchError);
        return;
      }

      if (!workspaceMembers || workspaceMembers.length === 0) {
        return;
      }

      // Process each user
      for (const member of workspaceMembers) {
        const settings = (member.settings as Record<string, unknown>) || {};
        const digestPreferences = (settings.digestPreferences as DigestPreferences) || null;

        if (!digestPreferences) {
          continue;
        }

        // Check if this user should receive a digest now
        if (
          !this.shouldSendDigestNow(
            digestPreferences,
            currentHour,
            currentMinute,
            currentDayOfWeek
          )
        ) {
          continue;
        }

        try {
          // Get user email
          const { data: authUser, error: authError } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', member.user_id)
            .single();

          if (authError || !authUser) {
            console.warn(`Could not fetch email for user ${member.user_id}`);
            continue;
          }

          // Get activity counts
          const contentSelection = digestPreferences.content_selection || {
            overdue: true,
            due_today: true,
            completed: true,
            comments: true,
          };

          const activityItems = await this.getUserActivityCounts(member.user_id, contentSelection);

          // Only send if there are items to report
          if (Object.keys(activityItems).length === 0) {
            continue;
          }

          // Send the digest email
          const result = await EmailService.sendEmailDigest({
            userName: authUser.email?.split('@')[0] || 'User',
            userEmail: authUser.email,
            frequency: digestPreferences.frequency as 'daily' | 'weekly',
            contentItems: activityItems,
          });

          if (!result.success) {
            console.error(`Failed to send digest to ${authUser.email}:`, result.error);
          } else {
            console.log(`Digest sent successfully to ${authUser.email}`);
          }
        } catch (error) {
          console.error(`Error processing digest for user ${member.user_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in email digest scheduler:', error);
    }
  }
}
