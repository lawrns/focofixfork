/**
 * FocoBot Command Processor
 * 
 * Main engine for processing WhatsApp messages and converting them
to task operations using LLM-powered intent recognition.
 */

import { focoBotAI } from './ai-service';
import { focoBotTaskService } from './task-service';
import { focoBotSecurity } from './security';
import { createClient } from '@/lib/supabase/server';
import { whatsappSession } from '@/lib/services/whatsapp-session';

export interface CommandContext {
  phoneNumber: string;
  userId: string;
  orgId: string;
  message: string;
  messageId: string;
  sessionId?: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  actions?: TaskAction[];
  requiresConfirmation?: boolean;
  confirmationData?: unknown;
}

export interface TaskAction {
  type: 'create' | 'update' | 'complete' | 'delete' | 'query' | 'list';
  taskId?: string;
  data?: Record<string, unknown>;
}

class FocoBotCommandProcessor {
  private static instance: FocoBotCommandProcessor;

  static getInstance(): FocoBotCommandProcessor {
    if (!FocoBotCommandProcessor.instance) {
      FocoBotCommandProcessor.instance = new FocoBotCommandProcessor();
    }
    return FocoBotCommandProcessor.instance;
  }

  /**
   * Main entry point for processing incoming WhatsApp messages
   */
  async processMessage(context: CommandContext): Promise<CommandResult> {
    try {
      // 1. Get or create session
      const session = await whatsappSession.getSession(context.phoneNumber);
      
      // 2. Check if we're waiting for confirmation
      if (session?.pendingAction) {
        return this.handleConfirmation(context, session.pendingAction);
      }

      // 3. Parse the command using AI
      const parsedCommand = await focoBotAI.parseCommand(
        context.message,
        await this.getUserContext(context.userId, context.orgId)
      );

      // 4. Handle different command types
      switch (parsedCommand.intent) {
        case 'create_task':
          return this.handleCreateTask(context, parsedCommand);
        
        case 'list_tasks':
          return this.handleListTasks(context, parsedCommand);
        
        case 'complete_task':
          return this.handleCompleteTask(context, parsedCommand);
        
        case 'update_task':
          return this.handleUpdateTask(context, parsedCommand);
        
        case 'delete_task':
          return this.handleDeleteTask(context, parsedCommand);
        
        case 'query_tasks':
          return this.handleQueryTasks(context, parsedCommand);
        
        case 'help':
          return this.handleHelp();
        
        case 'greeting':
          return this.handleGreeting(context);
        
        default:
          return this.handleUnknownCommand(context);
      }
    } catch (error) {
      console.error('FocoBot command processing error:', error);
      return {
        success: false,
        message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.'
      };
    }
  }

  /**
   * Handle create task intent
   */
  private async handleCreateTask(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const taskData = parsedCommand.data as Record<string, unknown>;

    // Validate required fields
    if (!taskData.title) {
      return {
        success: false,
        message: 'Necesito un título para la tarea. Por favor dime: "Crear tarea: [título]"'
      };
    }

    // Check if we need confirmation for complex tasks
    if (this.requiresConfirmation(taskData)) {
      await whatsappSession.updateSession(context.phoneNumber, {
        pendingAction: {
          type: 'create_task',
          data: taskData
        }
      });

      return {
        success: true,
        message: this.formatConfirmationMessage('crear', taskData),
        requiresConfirmation: true,
        confirmationData: taskData
      };
    }

    // Create the task immediately
    const result = await focoBotTaskService.createTask({
      userId: context.userId,
      orgId: context.orgId,
      title: taskData.title as string,
      description: taskData.description as string,
      priority: (taskData.priority as 'low' | 'medium' | 'high') || 'medium',
      dueDate: taskData.dueDate ? new Date(taskData.dueDate as string) : undefined,
      projectId: taskData.projectId as string,
      tags: taskData.tags as string[]
    });

    if (!result.success) {
      return {
        success: false,
        message: `No pude crear la tarea: ${result.error}`
      };
    }

    return {
      success: true,
      message: `✅ ¡Tarea creada exitosamente!\n\n*${result.task!.title}*\n\nPuedes verla en: ${result.task!.url}`,
      actions: [{ type: 'create', taskId: result.task!.id, data: result.task }]
    };
  }

  /**
   * Handle list tasks intent
   */
  private async handleListTasks(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const filters = parsedCommand.filters as Record<string, unknown> || {};
    
    const result = await focoBotTaskService.listTasks({
      userId: context.userId,
      orgId: context.orgId,
      status: (filters.status as 'pending' | 'completed' | 'all') || 'pending',
      projectId: filters.projectId as string,
      priority: filters.priority as 'low' | 'medium' | 'high',
      limit: filters.limit as number || 10
    });

    if (!result.success) {
      return {
        success: false,
        message: `Error al obtener tareas: ${result.error}`
      };
    }

    if (result.tasks!.length === 0) {
      return {
        success: true,
        message: '📭 No tienes tareas pendientes. ¡Buen trabajo!'
      };
    }

    const message = this.formatTaskList(result.tasks!, parsedCommand.timeframe as string);

    return {
      success: true,
      message,
      actions: result.tasks!.map(t => ({ type: 'query', taskId: t.id }))
    };
  }

  /**
   * Handle complete task intent
   */
  private async handleCompleteTask(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const taskId = parsedCommand.taskId as string;
    const taskTitle = parsedCommand.taskTitle as string;

    if (!taskId && !taskTitle) {
      return {
        success: false,
        message: '¿Qué tarea quieres completar? Dime el número o título de la tarea.'
      };
    }

    // If we have a title but no ID, search for it
    let targetTaskId = taskId;
    if (!targetTaskId && taskTitle) {
      const searchResult = await focoBotTaskService.searchTasks({
        userId: context.userId,
        orgId: context.orgId,
        query: taskTitle,
        limit: 1
      });

      if (!searchResult.success || searchResult.tasks!.length === 0) {
        return {
          success: false,
          message: `No encontré ninguna tarea con "${taskTitle}". ¿Puedes ser más específico?`
        };
      }

      targetTaskId = searchResult.tasks![0].id;
    }

    // Ask for confirmation
    await whatsappSession.updateSession(context.phoneNumber, {
      pendingAction: {
        type: 'complete_task',
        taskId: targetTaskId
      }
    });

    return {
      success: true,
      message: `¿Confirmas que quieres marcar esta tarea como completada?\n\nResponde *sí* para confirmar o *no* para cancelar.`,
      requiresConfirmation: true
    };
  }

  /**
   * Handle update task intent
   */
  private async handleUpdateTask(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const taskId = parsedCommand.taskId as string;
    const updates = parsedCommand.data as Record<string, unknown>;

    if (!taskId) {
      return {
        success: false,
        message: '¿Qué tarea quieres actualizar? Indica el número o título.'
      };
    }

    const result = await focoBotTaskService.updateTask({
      userId: context.userId,
      orgId: context.orgId,
      taskId,
      updates: {
        title: updates.title as string,
        description: updates.description as string,
        priority: updates.priority as 'low' | 'medium' | 'high',
        dueDate: updates.dueDate ? new Date(updates.dueDate as string) : undefined,
        status: updates.status as string
      }
    });

    if (!result.success) {
      return {
        success: false,
        message: `No pude actualizar la tarea: ${result.error}`
      };
    }

    return {
      success: true,
      message: `✅ Tarea actualizada exitosamente.\n\n*${result.task!.title}*`,
      actions: [{ type: 'update', taskId: result.task!.id, data: result.task }]
    };
  }

  /**
   * Handle delete task intent
   */
  private async handleDeleteTask(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const taskId = parsedCommand.taskId as string;

    if (!taskId) {
      return {
        success: false,
        message: '¿Qué tarea quieres eliminar? Indica el número o título.'
      };
    }

    // Always ask for confirmation before deleting
    await whatsappSession.updateSession(context.phoneNumber, {
      pendingAction: {
        type: 'delete_task',
        taskId
      }
    });

    return {
      success: true,
      message: '⚠️ ¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.\n\nResponde *sí* para confirmar o *no* para cancelar.',
      requiresConfirmation: true
    };
  }

  /**
   * Handle query tasks intent (natural language queries)
   */
  private async handleQueryTasks(
    context: CommandContext,
    parsedCommand: Record<string, unknown>
  ): Promise<CommandResult> {
    const query = parsedCommand.query as string;

    // Use AI to interpret the query and fetch relevant tasks
    const result = await focoBotTaskService.queryTasks({
      userId: context.userId,
      orgId: context.orgId,
      query,
      limit: 10
    });

    if (!result.success) {
      return {
        success: false,
        message: `Error al buscar tareas: ${result.error}`
      };
    }

    if (result.tasks!.length === 0) {
      return {
        success: true,
        message: `No encontré tareas relacionadas con "${query}".`
      };
    }

    const message = this.formatTaskQueryResponse(result.tasks!, query);

    return {
      success: true,
      message,
      actions: result.tasks!.map(t => ({ type: 'query', taskId: t.id }))
    };
  }

  /**
   * Handle confirmation responses
   */
  private async handleConfirmation(
    context: CommandContext,
    pendingAction: Record<string, unknown>
  ): Promise<CommandResult> {
    const message = context.message.toLowerCase().trim();
    
    // Clear the pending action
    await whatsappSession.clearSession(context.phoneNumber);

    if (message === 'sí' || message === 'si' || message === 'yes') {
      // Execute the pending action
      switch (pendingAction.type) {
        case 'create_task':
          const createResult = await focoBotTaskService.createTask({
            userId: context.userId,
            orgId: context.orgId,
            title: pendingAction.data?.title as string,
            description: pendingAction.data?.description as string,
            priority: pendingAction.data?.priority as 'low' | 'medium' | 'high',
            dueDate: pendingAction.data?.dueDate ? new Date(pendingAction.data.dueDate as string) : undefined,
            projectId: pendingAction.data?.projectId as string,
            tags: pendingAction.data?.tags as string[]
          });
          
          if (createResult.success) {
            return {
              success: true,
              message: `✅ ¡Tarea creada!\n\n*${createResult.task!.title}*`
            };
          }
          break;

        case 'complete_task':
          const completeResult = await focoBotTaskService.completeTask({
            userId: context.userId,
            orgId: context.orgId,
            taskId: pendingAction.taskId as string
          });
          
          if (completeResult.success) {
            return {
              success: true,
              message: `✅ ¡Tarea completada! 🎉\n\n*${completeResult.task!.title}*`
            };
          }
          break;

        case 'delete_task':
          const deleteResult = await focoBotTaskService.deleteTask({
            userId: context.userId,
            orgId: context.orgId,
            taskId: pendingAction.taskId as string
          });
          
          if (deleteResult.success) {
            return {
              success: true,
              message: '🗑️ Tarea eliminada correctamente.'
            };
          }
          break;
      }
    } else {
      return {
        success: true,
        message: 'Acción cancelada. ¿En qué más puedo ayudarte?'
      };
    }

    return {
      success: false,
      message: 'Hubo un error procesando tu confirmación. Por favor intenta de nuevo.'
    };
  }

  /**
   * Handle help command
   */
  private handleHelp(): CommandResult {
    return {
      success: true,
      message: `*🤖 FocoBot - Comandos disponibles:*

*Crear tareas:*
• "Crear tarea: Revisar propuesta"
• "Agregar tarea urgente para mañana"
• "Nueva tarea en proyecto Marketing"

*Ver tareas:*
• "Ver mis tareas"
• "Qué tareas tengo pendientes"
• "Mostrar tareas de hoy"

*Completar:*
• "Completar tarea 3"
• "Marcar como hecha la tarea de revisar"

*Actualizar:*
• "Cambiar prioridad de tarea 2 a alta"
• "Mover fecha de tarea 1 a viernes"

*Buscar:*
• "Buscar tareas de marketing"
• "Tareas urgentes"

*Ayuda:*
• "Ayuda" - Ver este mensaje

¿En qué puedo ayudarte? 😊`
    };
  }

  /**
   * Handle greeting
   */
  private async handleGreeting(context: CommandContext): Promise<CommandResult> {
    const supabase = await createClient();
    
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', context.userId)
      .single();

    const name = user?.first_name || 'amigo';

    return {
      success: true,
      message: `¡Hola ${name}! 👋\n\nSoy *FocoBot*, tu asistente de tareas por WhatsApp.\n\nPuedo ayudarte a:\n✅ Crear y gestionar tareas\n📋 Ver tus pendientes\n✔️ Marcar tareas como completadas\n🔍 Buscar tareas específicas\n\nEscribe *"ayuda"* para ver todos los comandos disponibles.\n\n¿Qué necesitas hacer hoy?`
    };
  }

  /**
   * Handle unknown commands
   */
  private handleUnknownCommand(context: CommandContext): CommandResult {
    return {
      success: true,
      message: `No entendí muy bien 🤔\n\nIntenta con:\n• "Ver mis tareas"\n• "Crear tarea: [título]"\n• "Completar tarea [número]"\n\nO escribe *"ayuda"* para ver todos los comandos.`
    };
  }

  /**
   * Get user context for AI processing
   */
  private async getUserContext(userId: string, orgId: string): Promise<Record<string, unknown>> {
    const supabase = await createClient();
    
    // Get recent projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .limit(5);

    // Get recent tasks for context
    const { data: recentTasks } = await supabase
      .from('work_items')
      .select('id, title, status, priority')
      .eq('org_id', orgId)
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's teams
    const { data: teams } = await supabase
      .from('team_members')
      .select('team_id, teams(name)')
      .eq('user_id', userId);

    return {
      projects: projects || [],
      recentTasks: recentTasks || [],
      teams: teams || [],
      currentDate: new Date().toISOString()
    };
  }

  /**
   * Check if a task requires confirmation
   */
  private requiresConfirmation(taskData: Record<string, unknown>): boolean {
    // Require confirmation for tasks with due dates in the past
    if (taskData.dueDate) {
      const dueDate = new Date(taskData.dueDate as string);
      if (dueDate < new Date()) {
        return true;
      }
    }
    
    // Require confirmation for high priority tasks with short deadlines
    if (taskData.priority === 'high' && taskData.dueDate) {
      const dueDate = new Date(taskData.dueDate as string);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dueDate <= tomorrow) {
        return true;
      }
    }

    return false;
  }

  /**
   * Format confirmation message
   */
  private formatConfirmationMessage(action: string, data: Record<string, unknown>): string {
    let message = `¿Confirmas que quieres ${action} esta tarea?\n\n`;
    message += `*${data.title}*`;
    
    if (data.priority) {
      message += `\nPrioridad: ${data.priority}`;
    }
    if (data.dueDate) {
      message += `\nFecha límite: ${new Date(data.dueDate as string).toLocaleDateString('es-MX')}`;
    }
    
    message += `\n\nResponde *sí* para confirmar o *no* para cancelar.`;
    
    return message;
  }

  /**
   * Format task list for WhatsApp
   */
  private formatTaskList(tasks: Array<Record<string, unknown>>, timeframe?: string): string {
    const timeframeText = timeframe ? ` (${timeframe})` : '';
    let message = `*📋 Tus tareas${timeframeText}:*\n\n`;
    
    tasks.forEach((task, index) => {
      const priorityEmoji = this.getPriorityEmoji(task.priority as string);
      const statusEmoji = task.status === 'completed' ? '✅' : '⏳';
      
      message += `${index + 1}. ${statusEmoji} ${priorityEmoji} *${task.title}*`;
      
      if (task.due_date) {
        const dueDate = new Date(task.due_date as string);
        const today = new Date();
        const isOverdue = dueDate < today && task.status !== 'completed';
        
        if (isOverdue) {
          message += ` 🔴 Vencida`;
        } else {
          message += ` 📅 ${dueDate.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}`;
        }
      }
      
      message += '\n';
    });

    message += `\n_Escribe "completar tarea [número]" para marcarla como hecha._`;
    
    return message;
  }

  /**
   * Format task query response
   */
  private formatTaskQueryResponse(tasks: Array<Record<string, unknown>>, query: string): string {
    let message = `*🔍 Resultados para "${query}":*\n\n`;
    
    tasks.slice(0, 5).forEach((task, index) => {
      const priorityEmoji = this.getPriorityEmoji(task.priority as string);
      message += `${index + 1}. ${priorityEmoji} *${task.title}*`;
      
      if (task.project_name) {
        message += ` (_${task.project_name}_)`;
      }
      
      message += '\n';
    });

    if (tasks.length > 5) {
      message += `\n_Y ${tasks.length - 5} más..._`;
    }

    return message;
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

export const focoBotCommandProcessor = FocoBotCommandProcessor.getInstance();
