/**
 * FocoBot Notification Service
 * 
 * Handles sending proactive notifications to users about pending tasks,
 * daily summaries, and reminders via WhatsApp.
 */

import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/services/whatsapp';
import { focoBotTaskService } from './task-service';

export interface NotificationSchedule {
  userId: string;
  phoneNumber: string;
  timezone: string;
  preferredTime: string; // HH:mm format
  enabled: boolean;
  notificationTypes: ('morning_summary' | 'evening_digest' | 'overdue_alerts' | 'deadline_reminders')[];
}

export interface TaskReminder {
  taskId: string;
  userId: string;
  phoneNumber: string;
  reminderType: 'due_today' | 'due_tomorrow' | 'overdue';
  sentAt?: Date;
}

class FocoBotNotificationService {
  private static instance: FocoBotNotificationService;

  static getInstance(): FocoBotNotificationService {
    if (!FocoBotNotificationService.instance) {
      FocoBotNotificationService.instance = new FocoBotNotificationService();
    }
    return FocoBotNotificationService.instance;
  }

  /**
   * Send morning summary to a user
   */
  async sendMorningSummary(userId: string, phoneNumber: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get tasks due today
      const todayTasks = await focoBotTaskService.listTasks({
        userId,
        orgId: await this.getUserOrgId(userId),
        status: 'pending',
        dueBefore: tomorrow,
        dueAfter: today
      });

      // Get overdue tasks
      const overdueTasks = await focoBotTaskService.listTasks({
        userId,
        orgId: await this.getUserOrgId(userId),
        status: 'pending',
        dueBefore: today
      });

      if (!todayTasks.success && !overdueTasks.success) {
        return false;
      }

      const todayCount = todayTasks.tasks?.length || 0;
      const overdueCount = overdueTasks.tasks?.length || 0;

      // If no tasks, send a motivational message occasionally
      if (todayCount === 0 && overdueCount === 0) {
        const messages = [
          '¡Buenos días! ☀️ No tienes tareas pendientes para hoy. ¡Es un buen momento para planificar nuevos objetivos!',
          '¡Buenos días! 🌅 Estás al día con todas tus tareas. ¡Disfruta tu día!',
          '¡Buenos días! ✨ Sin tareas pendientes. ¿Hay algo nuevo en lo que quieras trabajar hoy?'
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        await sendWhatsAppMessage(phoneNumber, randomMessage);
        return true;
      }

      // Build the summary message
      let message = `*¡Buenos días!* ☀️\n\n`;
      
      if (overdueCount > 0) {
        message += `⚠️ *Tienes ${overdueCount} tarea${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''}*\n`;
      }
      
      if (todayCount > 0) {
        message += `📋 *${todayCount} tarea${todayCount > 1 ? 's' : ''} para hoy*\n\n`;
        
        todayTasks.tasks!.slice(0, 5).forEach((task, index) => {
          const priorityEmoji = this.getPriorityEmoji(task.priority as string);
          message += `${index + 1}. ${priorityEmoji} ${task.title}\n`;
        });

        if (todayTasks.tasks!.length > 5) {
          message += `\n_Y ${todayTasks.tasks!.length - 5} más..._`;
        }
      }

      message += `\n\n_Responde "ver tareas" para ver la lista completa._`;

      await sendWhatsAppMessage(phoneNumber, message);

      // Log notification sent
      await this.logNotificationSent(userId, 'morning_summary', {
        todayCount,
        overdueCount
      });

      return true;
    } catch (error) {
      console.error('Error sending morning summary:', error);
      return false;
    }
  }

  /**
   * Send evening digest
   */
  async sendEveningDigest(userId: string, phoneNumber: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orgId = await this.getUserOrgId(userId);

      // Get completed tasks today
      const supabase = await createClient();
      const { data: completedToday } = await supabase
        .from('work_items')
        .select('id, title')
        .eq('assignee_id', userId)
        .eq('status', 'completed')
        .gte('updated_at', today.toISOString())
        .lt('updated_at', tomorrow.toISOString());

      // Get remaining tasks
      const remainingTasks = await focoBotTaskService.listTasks({
        userId,
        orgId,
        status: 'pending',
        limit: 20
      });

      const completedCount = completedToday?.length || 0;
      const remainingCount = remainingTasks.tasks?.length || 0;

      let message = `*¡Buenas noches!* 🌙\n\n`;
      
      if (completedCount > 0) {
        message += `🎉 *Completaste ${completedCount} tarea${completedCount > 1 ? 's' : ''} hoy*\n\n`;
        completedToday!.slice(0, 3).forEach((task, index) => {
          message += `✅ ${task.title}\n`;
        });
        if (completedToday!.length > 3) {
          message += `_...y ${completedToday!.length - 3} más_\n`;
        }
        message += '\n';
      }

      if (remainingCount > 0) {
        message += `📋 *Te quedan ${remainingCount} tarea${remainingCount > 1 ? 's' : ''} pendiente${remainingCount > 1 ? 's' : ''}*\n\n`;
        message += `¡Descansa bien! Mañana será un gran día. 💪`;
      } else {
        message += `✨ *¡Todas las tareas completadas!*\n\n`;
        message += `Excelente trabajo hoy. ¡Mereces un buen descanso! 🌟`;
      }

      await sendWhatsAppMessage(phoneNumber, message);

      await this.logNotificationSent(userId, 'evening_digest', {
        completedCount,
        remainingCount
      });

      return true;
    } catch (error) {
      console.error('Error sending evening digest:', error);
      return false;
    }
  }

  /**
   * Send overdue task reminders
   */
  async sendOverdueReminders(): Promise<number> {
    try {
      const supabase = await createClient();
      
      // Get all overdue tasks grouped by user
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: overdueTasks } = await supabase
        .from('work_items')
        .select(`
          id,
          title,
          due_date,
          assignee_id,
          assignee:users!work_items_assignee_id_fkey(id, phone)
        `)
        .lt('due_date', today.toISOString())
        .eq('status', 'pending')
        .not('assignee_id', 'is', null);

      if (!overdueTasks || overdueTasks.length === 0) {
        return 0;
      }

      // Group by user
      const tasksByUser = new Map<string, typeof overdueTasks>();
      overdueTasks.forEach(task => {
        const userId = task.assignee_id;
        if (!tasksByUser.has(userId)) {
          tasksByUser.set(userId, []);
        }
        tasksByUser.get(userId)!.push(task);
      });

      let sentCount = 0;

      // Send reminders
      for (const [userId, tasks] of tasksByUser) {
        const phoneNumber = (tasks[0].assignee as Record<string, unknown>)?.phone as string;
        if (!phoneNumber) continue;

        // Check if already sent today
        const alreadySent = await this.wasNotificationSentToday(userId, 'overdue_alert');
        if (alreadySent) continue;

        const taskCount = tasks.length;
        let message = `⏰ *Recordatorio de tareas vencidas*\n\n`;
        message += `Tienes *${taskCount} tarea${taskCount > 1 ? 's' : ''}* que ${taskCount > 1 ? 'requieren' : 'requiere'} tu atención:\n\n`;

        tasks.slice(0, 5).forEach((task, index) => {
          const daysOverdue = Math.floor((today.getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24));
          message += `${index + 1}. 🔴 ${task.title}\n`;
          message += `   _Vencida hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}_\n`;
        });

        if (tasks.length > 5) {
          message += `\n_Y ${tasks.length - 5} más..._`;
        }

        message += `\n\n_Responde "ver tareas" para ver todas._`;

        await sendWhatsAppMessage(phoneNumber, message);
        await this.logNotificationSent(userId, 'overdue_alert', { taskCount });
        
        sentCount++;
      }

      return sentCount;
    } catch (error) {
      console.error('Error sending overdue reminders:', error);
      return 0;
    }
  }

  /**
   * Send deadline reminders for tasks due tomorrow
   */
  async sendDeadlineReminders(): Promise<number> {
    try {
      const supabase = await createClient();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const { data: dueTomorrow } = await supabase
        .from('work_items')
        .select(`
          id,
          title,
          priority,
          assignee_id,
          assignee:users!work_items_assignee_id_fkey(id, phone)
        `)
        .gte('due_date', tomorrow.toISOString())
        .lt('due_date', dayAfterTomorrow.toISOString())
        .eq('status', 'pending')
        .not('assignee_id', 'is', null);

      if (!dueTomorrow || dueTomorrow.length === 0) {
        return 0;
      }

      // Group by user
      const tasksByUser = new Map<string, typeof dueTomorrow>();
      dueTomorrow.forEach(task => {
        const userId = task.assignee_id;
        if (!tasksByUser.has(userId)) {
          tasksByUser.set(userId, []);
        }
        tasksByUser.get(userId)!.push(task);
      });

      let sentCount = 0;

      for (const [userId, tasks] of tasksByUser) {
        const phoneNumber = (tasks[0].assignee as Record<string, unknown>)?.phone as string;
        if (!phoneNumber) continue;

        const highPriorityTasks = tasks.filter(t => t.priority === 'high');
        
        if (highPriorityTasks.length > 0) {
          let message = `🚨 *Recordatorio: Tareas importantes para mañana*\n\n`;
          
          highPriorityTasks.forEach((task, index) => {
            message += `${index + 1}. 🔴 *${task.title}*\n`;
          });

          if (tasks.length > highPriorityTasks.length) {
            message += `\n_Y ${tasks.length - highPriorityTasks.length} tareas más para mañana._`;
          }

          message += `\n\n_Responde "ver tareas" para ver todas._`;

          await sendWhatsAppMessage(phoneNumber, message);
          await this.logNotificationSent(userId, 'deadline_reminder', { 
            taskCount: tasks.length,
            highPriorityCount: highPriorityTasks.length
          });
          
          sentCount++;
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Error sending deadline reminders:', error);
      return 0;
    }
  }

  /**
   * Get users who should receive morning summaries now
   */
  async getUsersForMorningSummary(): Promise<Array<{ userId: string; phoneNumber: string }>> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      const { data: schedules } = await supabase
        .from('focobot_user_preferences')
        .select('user_id, phone_number, morning_summary_time')
        .eq('morning_summary_enabled', true)
        .eq('morning_summary_time', currentTime);

      return (schedules || []).map(s => ({
        userId: s.user_id,
        phoneNumber: s.phone_number
      }));
    } catch (error) {
      console.error('Error getting users for morning summary:', error);
      return [];
    }
  }

  /**
   * Get users who should receive evening digests now
   */
  async getUsersForEveningDigest(): Promise<Array<{ userId: string; phoneNumber: string }>> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      const { data: schedules } = await supabase
        .from('focobot_user_preferences')
        .select('user_id, phone_number, evening_digest_time')
        .eq('evening_digest_enabled', true)
        .eq('evening_digest_time', currentTime);

      return (schedules || []).map(s => ({
        userId: s.user_id,
        phoneNumber: s.phone_number
      }));
    } catch (error) {
      console.error('Error getting users for evening digest:', error);
      return [];
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string, 
    phoneNumber: string,
    preferences: Partial<NotificationSchedule>
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('focobot_user_preferences')
        .upsert({
          user_id: userId,
          phone_number: phoneNumber,
          morning_summary_enabled: preferences.enabled ?? true,
          morning_summary_time: preferences.preferredTime || '08:00',
          evening_digest_enabled: preferences.enabled ?? true,
          evening_digest_time: '20:00',
          overdue_alerts_enabled: true,
          deadline_reminders_enabled: true,
          timezone: preferences.timezone || 'America/Mexico_City',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  /**
   * Get user's org ID
   */
  private async getUserOrgId(userId: string): Promise<string> {
    const supabase = await createClient();
    
    const { data: user } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .single();

    return user?.org_id || '';
  }

  /**
   * Log notification sent
   */
  private async logNotificationSent(
    userId: string, 
    type: string, 
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = await createClient();
      
      await supabase
        .from('focobot_notifications_sent')
        .insert({
          user_id: userId,
          notification_type: type,
          sent_at: new Date().toISOString(),
          metadata
        });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Check if notification was already sent today
   */
  private async wasNotificationSentToday(userId: string, type: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('focobot_notifications_sent')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .gte('sent_at', today.toISOString())
        .limit(1);

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking notification history:', error);
      return false;
    }
  }

  /**
   * Get priority emoji
   */
  private getPriorityEmoji(priority?: string): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  }
}

export const focoBotNotificationService = FocoBotNotificationService.getInstance();
