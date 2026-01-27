/**
 * FocoBot Module
 * 
 * Central export point for all FocoBot services.
 * 
 * FocoBot is an AI-powered WhatsApp assistant for Foco that allows users
 * to manage tasks through natural language conversations.
 * 
 * @example
 * ```typescript
 * import { focoBotCommandProcessor, focoBotNotificationService } from '@/lib/focobot';
 * 
 * // Process an incoming WhatsApp message
 * const result = await focoBotCommandProcessor.processMessage({
 *   phoneNumber: '+1234567890',
 *   userId: 'user-123',
 *   orgId: 'org-456',
 *   message: 'Crear tarea: Revisar propuesta',
 *   messageId: 'msg-789'
 * });
 * 
 * // Send morning summary
 * await focoBotNotificationService.sendMorningSummary(userId, phoneNumber);
 * ```
 */

// Core services
export { focoBotCommandProcessor, type CommandContext, type CommandResult } from './command-processor';
export { focoBotTaskService, type TaskListFilters } from './task-service';
export { focoBotNotificationService, type NotificationSchedule } from './notification-service';
export { focoBotSecurity, type DeviceFingerprint } from './security';
export { focoBotAI, type ParsedCommand } from './ai-service';

// Re-export types for convenience
export type { TaskAction } from './command-processor';
export type { TaskOperationResult, TaskData } from './task-service';
