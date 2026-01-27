/**
 * WhatsApp Message Router
 * Routes incoming WhatsApp messages to appropriate handlers
 * Handles command parsing, conversation flow, and proposal creation
 */

import { getWhatsAppService } from './whatsapp'
import { getWhatsAppSessionService } from './whatsapp-session'
import { WhatsAppUserLinkRepository } from '@/lib/repositories/whatsapp-user-link-repository'
import { AIProposalParserService } from './ai-proposal-parser'
import { createClient } from '@supabase/supabase-js'
import type { WhatsAppSession } from './whatsapp-session'
import { focoBotCommandProcessor } from '@/lib/focobot/command-processor'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface InboundMessage {
  from: string // Phone number
  messageId: string
  text: string
  timestamp: string
}

export interface MessageContext {
  user_id: string
  session: WhatsAppSession | null
  link_verified: boolean
}

/**
 * Main router for incoming WhatsApp messages
 */
export class WhatsAppRouter {
  private whatsAppService = getWhatsAppService()
  private sessionService = getWhatsAppSessionService()
  private supabase = createClient(supabaseUrl, supabaseServiceKey)
  private linkRepo = new WhatsAppUserLinkRepository(this.supabase)

  /**
   * Route incoming message to appropriate handler
   */
  async routeMessage(message: InboundMessage): Promise<void> {
    try {
      // 1. Mark message as read
      await this.whatsAppService.markMessageAsRead(message.messageId)

      // 2. Get user context
      const context = await this.getMessageContext(message.from)

      if (!context) {
        // Phone not linked - check if verification code
        await this.handleUnlinkedPhone(message)
        return
      }

      if (!context.link_verified) {
        await this.whatsAppService.sendMessage({
          to: message.from,
          text: '⚠️ Your phone number is not verified. Please complete verification first.',
        })
        return
      }

      // 3. Parse command or route to handler
      const text = message.text.trim()

      if (text.startsWith('/')) {
        await this.handleCommand(message, context)
      } else if (text.toUpperCase().startsWith('VERIFY ')) {
        await this.handleVerification(message)
      } else {
        await this.handleMessage(message, context)
      }
    } catch (error) {
      console.error('Error routing WhatsApp message:', error)
      await this.sendErrorMessage(message.from)
    }
  }

  /**
   * Get message context (user, session, verification status)
   */
  private async getMessageContext(phone: string): Promise<MessageContext | null> {
    const linkResult = await this.linkRepo.findByPhone(phone)

    if (!linkResult.ok || !linkResult.data) {
      return null
    }

    const link = linkResult.data
    const session = await this.sessionService.getSession(phone)

    return {
      user_id: link.user_id,
      session,
      link_verified: link.verified,
    }
  }

  /**
   * Handle unlinked phone (check for verification code)
   */
  private async handleUnlinkedPhone(message: InboundMessage): Promise<void> {
    const text = message.text.trim().toUpperCase()

    if (text.startsWith('VERIFY ')) {
      await this.handleVerification(message)
    } else {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '⚠️ Phone not linked. Please link your WhatsApp in Foco settings first.',
      })
    }
  }

  /**
   * Handle verification code submission
   */
  private async handleVerification(message: InboundMessage): Promise<void> {
    const text = message.text.trim()
    const match = text.match(/VERIFY\s+(\d{6})/i)

    if (!match) {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '⚠️ Invalid format. Send: VERIFY 123456',
      })
      return
    }

    const code = match[1]
    const verifyResult = await this.linkRepo.verifyCode(message.from, code)

    if (!verifyResult.ok) {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '❌ Verification failed. Please try again or generate a new code.',
      })
      return
    }

    if (verifyResult.data) {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '✅ WhatsApp linked to your Foco account! You can now send proposals and receive notifications.',
      })
    } else {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '❌ Invalid or expired verification code. Please generate a new code in Foco settings.',
      })
    }
  }

  /**
   * Handle command messages (/project, /help, etc.)
   */
  private async handleCommand(message: InboundMessage, context: MessageContext): Promise<void> {
    const text = message.text.trim()
    const parts = text.split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (command) {
      case '/help':
        await this.handleHelpCommand(message.from)
        break

      case '/status':
        await this.handleStatusCommand(message.from, context)
        break

      case '/project':
        await this.handleProjectCommand(message.from, context, args)
        break

      case '/workspace':
        await this.handleWorkspaceCommand(message.from, context, args)
        break

      case '/list':
        await this.handleListCommand(message.from, context, args)
        break

      case '/clear':
        await this.handleClearCommand(message.from, context)
        break

      // FocoBot Commands
      case '/tasks':
      case '/tareas':
        await this.handleFocoBotTaskCommand(message, context)
        break

      case '/bot':
        await this.handleFocoBotHelp(message.from)
        break

      case '/done':
      case '/completar':
        await this.handleFocoBotCompleteCommand(message, context, args)
        break

      default:
        await this.whatsAppService.sendMessage({
          to: message.from,
          text: `❓ Unknown command: ${command}\n\nSend /help for available commands.`,
        })
    }
  }

  /**
   * Handle regular message (proposal creation or FocoBot)
   */
  private async handleMessage(message: InboundMessage, context: MessageContext): Promise<void> {
    // Check if message should be handled by FocoBot
    if (this.shouldRouteToFocoBot(message.text)) {
      await this.routeToFocoBot(message, context)
      return
    }

    // Check if we have project context
    if (!context.session?.project_id) {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '📋 Which project is this for?\n\nSend: /project [project name]\n\nOr send /list projects to see your projects.',
      })

      // Update conversation state
      await this.sessionService.setConversationState(
        message.from,
        context.user_id,
        'awaiting_project'
      )
      return
    }

    // Parse proposal with AI
    await this.createProposalFromMessage(message, context)
  }

  /**
   * Check if message should be routed to FocoBot
   */
  private shouldRouteToFocoBot(text: string): boolean {
    const lowerText = text.toLowerCase()
    
    // Task-related keywords in Spanish and English
    const taskKeywords = [
      'tarea', 'tareas', 'task', 'tasks',
      'crear', 'crea', 'create', 'add', 'agregar', 'nueva',
      'completar', 'completa', 'complete', 'done', 'terminar',
      'ver', 'show', 'list', 'lista', 'mis tareas',
      'pendiente', 'pending', 'hacer', 'todo',
      'focobot', 'bot'
    ]
    
    return taskKeywords.some(keyword => lowerText.includes(keyword))
  }

  /**
   * Route message to FocoBot
   */
  private async routeToFocoBot(message: InboundMessage, context: MessageContext): Promise<void> {
    try {
      // Get user's org ID
      const { data: user } = await this.supabase
        .from('users')
        .select('org_id')
        .eq('id', context.user_id)
        .single()

      const orgId = user?.org_id
      if (!orgId) {
        await this.whatsAppService.sendMessage({
          to: message.from,
          text: '❌ No se encontró tu organización. Por favor contacta a soporte.',
        })
        return
      }

      // Process through FocoBot
      const result = await focoBotCommandProcessor.processMessage({
        phoneNumber: message.from,
        userId: context.user_id,
        orgId: orgId,
        message: message.text,
        messageId: message.messageId,
      })

      // Send response
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: result.message,
      })
    } catch (error) {
      console.error('Error routing to FocoBot:', error)
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
      })
    }
  }

  /**
   * Create proposal from message text using AI parser
   */
  private async createProposalFromMessage(
    message: InboundMessage,
    context: MessageContext
  ): Promise<void> {
    try {
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '🤖 Processing your proposal...',
      })

      // Parse with AI
      const projectContext = {
        id: context.session?.project_id || 'unknown',
        name: 'WhatsApp Proposal',
        urgency: 'medium' as const
      }
      const parsed = await AIProposalParserService.parseProposalInput(message.text, projectContext)

      // Create proposal in database
      const { data: proposal, error } = await this.supabase
        .from('foco_proposals')
        .insert({
          workspace_id: context.session?.workspace_id,
          project_id: context.session?.project_id,
          owner_id: context.user_id,
          title: parsed.summary,
          description: message.text,
          status: 'draft',
          source_type: 'whatsapp',
          metadata: {
            parsed_items: parsed.items,
            total_hours: parsed.totalEstimatedHours,
            confidence: parsed.confidence,
            whatsapp_message_id: message.messageId,
          },
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create proposal items
      if (parsed.items.length > 0) {
        const items = parsed.items.map((item) => ({
          proposal_id: proposal.id,
          type: item.type,
          title: item.title,
          description: item.description,
          status: item.status || 'pending',
          priority: item.priority || 'medium',
          estimated_hours: item.estimatedHours,
          due_date: item.dueDate,
          assignee_id: item.assigneeId,
          metadata: item.metadata || {},
        }))

        await this.supabase.from('foco_proposal_items').insert(items)
      }

      // Send success message
      const itemCount = parsed.items.length
      const hours = parsed.totalEstimatedHours || 0

      await this.whatsAppService.sendMessage({
        to: message.from,
        text: `✅ Proposal created!\n\n📝 ${itemCount} item${itemCount !== 1 ? 's' : ''}\n⏱️ ${hours} hours estimated\n\nView: ${process.env.NEXT_PUBLIC_BASE_URL}/proposals/${proposal.id}`,
      })
    } catch (error) {
      console.error('Failed to create proposal from WhatsApp:', error)
      await this.whatsAppService.sendMessage({
        to: message.from,
        text: '❌ Failed to create proposal. Please try again or create it manually in Foco.',
      })
    }
  }

  /**
   * Command handlers
   */

  private async handleHelpCommand(phone: string): Promise<void> {
    const helpText = `📱 *Foco WhatsApp Commands*

*Proposals:*
/project [name] - Switch to project
/workspace [name] - Switch to workspace
/status - Show current context
/clear - Clear project context

*Tasks (FocoBot):*
/tareas - List your tasks
/completar [número] - Complete a task
/bot - FocoBot help

*Creating Proposals:*
Just send a message describing what you need!
Example: "Need to add login page and user dashboard by Friday"

*Task Management:*
Send natural language like:
• "Crear tarea: Revisar propuesta"
• "Ver mis tareas pendientes"

Send /help to see this message again.`

    await this.whatsAppService.sendMessage({
      to: phone,
      text: helpText,
    })
  }

  private async handleStatusCommand(phone: string, context: MessageContext): Promise<void> {
    const session = context.session

    if (!session || (!session.workspace_id && !session.project_id)) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '📍 No active context\n\nUse /workspace or /project to set context.',
      })
      return
    }

    let statusText = '📍 *Current Context*\n\n'

    if (session.workspace_id) {
      const { data: workspace } = await this.supabase
        .from('foco_workspaces')
        .select('name')
        .eq('id', session.workspace_id)
        .single()

      statusText += `Workspace: ${workspace?.name || 'Unknown'}\n`
    }

    if (session.project_id) {
      const { data: project } = await this.supabase
        .from('foco_projects')
        .select('name')
        .eq('id', session.project_id)
        .single()

      statusText += `Project: ${project?.name || 'Unknown'}\n`
    }

    const ttl = await this.sessionService.getSessionTTL(phone)
    if (ttl) {
      const minutes = Math.floor(ttl / 60)
      statusText += `\nSession expires in ${minutes} minutes`
    }

    await this.whatsAppService.sendMessage({
      to: phone,
      text: statusText,
    })
  }

  private async handleProjectCommand(
    phone: string,
    context: MessageContext,
    projectName: string
  ): Promise<void> {
    if (!projectName) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '⚠️ Please specify a project name.\n\nExample: /project Website Redesign',
      })
      return
    }

    // Search for project by name (fuzzy match)
    const { data: projects, error } = await this.supabase
      .from('foco_projects')
      .select('id, name, workspace_id')
      .ilike('name', `%${projectName}%`)
      .limit(5)

    if (error || !projects || projects.length === 0) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: `❌ Project not found: "${projectName}"\n\nSend /list projects to see available projects.`,
      })
      return
    }

    if (projects.length > 1) {
      const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
      await this.whatsAppService.sendMessage({
        to: phone,
        text: `Multiple projects found:\n\n${projectList}\n\nPlease be more specific.`,
      })
      return
    }

    const project = projects[0]

    // Update session
    await this.sessionService.setProject(
      phone,
      context.user_id,
      project.id,
      project.workspace_id
    )

    await this.whatsAppService.sendMessage({
      to: phone,
      text: `✅ Switched to project: *${project.name}*\n\nYou can now send proposals for this project!`,
    })
  }

  private async handleWorkspaceCommand(
    phone: string,
    context: MessageContext,
    workspaceName: string
  ): Promise<void> {
    if (!workspaceName) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '⚠️ Please specify a workspace name.\n\nExample: /workspace My Workspace',
      })
      return
    }

    const { data: workspaces } = await this.supabase
      .from('foco_workspaces')
      .select('id, name')
      .ilike('name', `%${workspaceName}%`)
      .limit(5)

    if (!workspaces || workspaces.length === 0) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: `❌ Workspace not found: "${workspaceName}"`,
      })
      return
    }

    if (workspaces.length > 1) {
      const list = workspaces.map((w, i) => `${i + 1}. ${w.name}`).join('\n')
      await this.whatsAppService.sendMessage({
        to: phone,
        text: `Multiple workspaces found:\n\n${list}\n\nPlease be more specific.`,
      })
      return
    }

    await this.sessionService.setWorkspace(phone, context.user_id, workspaces[0].id)

    await this.whatsAppService.sendMessage({
      to: phone,
      text: `✅ Switched to workspace: *${workspaces[0].name}*`,
    })
  }

  private async handleListCommand(
    phone: string,
    context: MessageContext,
    args: string
  ): Promise<void> {
    const listType = args.toLowerCase()

    if (listType === 'projects') {
      await this.listProjects(phone, context)
    } else if (listType === 'tasks') {
      await this.listTasks(phone, context)
    } else {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '⚠️ Usage:\n\n/list projects\n/list tasks',
      })
    }
  }

  private async listProjects(phone: string, context: MessageContext): Promise<void> {
    const { data: projects } = await this.supabase
      .from('foco_projects')
      .select('id, name, workspace_id')
      .eq('workspace_id', context.session?.workspace_id || '')
      .order('updated_at', { ascending: false })
      .limit(10)

    if (!projects || projects.length === 0) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '📂 No projects found.\n\nCreate one in Foco first!',
      })
      return
    }

    const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

    await this.whatsAppService.sendMessage({
      to: phone,
      text: `📂 *Your Projects*\n\n${projectList}\n\nSwitch: /project [name]`,
    })
  }

  private async listTasks(phone: string, context: MessageContext): Promise<void> {
    if (!context.session?.project_id) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '⚠️ No project selected.\n\nUse /project [name] first.',
      })
      return
    }

    const { data: tasks } = await this.supabase
      .from('foco_work_items')
      .select('id, title, status, priority')
      .eq('project_id', context.session.project_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!tasks || tasks.length === 0) {
      await this.whatsAppService.sendMessage({
        to: phone,
        text: '✅ No tasks in this project yet.',
      })
      return
    }

    const taskList = tasks
      .map((t, i) => {
        const emoji = t.status === 'completed' ? '✅' : '⏳'
        return `${i + 1}. ${emoji} ${t.title}`
      })
      .join('\n')

    await this.whatsAppService.sendMessage({
      to: phone,
      text: `📋 *Tasks*\n\n${taskList}`,
    })
  }

  private async handleClearCommand(phone: string, context: MessageContext): Promise<void> {
    await this.sessionService.clearProject(phone, context.user_id)

    await this.whatsAppService.sendMessage({
      to: phone,
      text: '🧹 Project context cleared.\n\nUse /project to select a new project.',
    })
  }

  /**
   * Send generic error message
   */
  private async sendErrorMessage(phone: string): Promise<void> {
    await this.whatsAppService.sendMessage({
      to: phone,
      text: '❌ Something went wrong. Please try again.',
    })
  }

  /**
   * FocoBot Command Handlers
   */

  private async handleFocoBotTaskCommand(
    message: InboundMessage,
    context: MessageContext
  ): Promise<void> {
    await this.routeToFocoBot(message, context)
  }

  private async handleFocoBotCompleteCommand(
    message: InboundMessage,
    context: MessageContext,
    args: string
  ): Promise<void> {
    const completeMessage = {
      ...message,
      text: `completar ${args}`,
    }
    await this.routeToFocoBot(completeMessage, context)
  }

  private async handleFocoBotHelp(phone: string): Promise<void> {
    const helpText = `🤖 *FocoBot - Tu asistente de tareas*

*Comandos rápidos:*
/tareas - Ver tus tareas pendientes
/completar [número] - Marcar tarea como completada
/bot - Ver ayuda de FocoBot

*Ejemplos de mensajes naturales:*
• "Crear tarea: Revisar propuesta"
• "Ver mis tareas"
• "Completar tarea 3"
• "Qué tareas tengo para hoy"

FocoBot entiende español e inglés. ¡Pregunta lo que necesites!`

    await this.whatsAppService.sendMessage({
      to: phone,
      text: helpText,
    })
  }
}

// Singleton instance
let routerInstance: WhatsAppRouter | null = null

/**
 * Get WhatsApp router instance (singleton)
 */
export function getWhatsAppRouter(): WhatsAppRouter {
  if (!routerInstance) {
    routerInstance = new WhatsAppRouter()
  }
  return routerInstance
}

export default WhatsAppRouter
