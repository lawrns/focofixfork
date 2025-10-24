import { supabase } from '@/lib/supabase/client'
import { AutomationRule, AutomationExecution, AutomationTemplate, AutomationTrigger, AutomationCondition, AutomationAction } from '@/lib/models/automation'

export class AutomationService {
  // Rule Management
  static async createRule(rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'execution_count'>): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automation_rules' as any)
      .insert({
        ...rule,
        execution_count: 0
      })
      .select()
      .single()

    if (error) throw error
    return data as any as unknown as AutomationRule
  }

  static async getRules(projectId?: string, userId?: string): Promise<AutomationRule[]> {
    let query = supabase.from('automation_rules' as any).select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (userId) {
      query = query.eq('created_by', userId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as unknown as AutomationRule[]
  }

  static async getRule(ruleId: string): Promise<AutomationRule | null> {
    const { data, error } = await supabase
      .from('automation_rules' as any)
      .select('*')
      .eq('id', ruleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as any
  }

  static async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automation_rules' as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  static async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('automation_rules' as any)
      .delete()
      .eq('id', ruleId)

    if (error) throw error
  }

  static async toggleRule(ruleId: string, isActive: boolean): Promise<AutomationRule> {
    return this.updateRule(ruleId, { is_active: isActive })
  }

  // Rule Execution
  static async executeRule(ruleId: string, triggerData: any): Promise<AutomationExecution> {
    const rule = await this.getRule(ruleId)
    if (!rule || !rule.is_active) {
      throw new Error('Rule not found or inactive')
    }

    const execution: Omit<AutomationExecution, 'id'> = {
      rule_id: ruleId,
      status: 'pending',
      started_at: new Date().toISOString(),
      trigger_data: triggerData,
      affected_entities: {},
      actions_executed: 0,
      actions_succeeded: 0,
      actions_failed: 0,
      execution_time_ms: 0
    }

    // Create execution record
    const { data: executionRecord, error: createError } = await supabase
      .from('automation_executions' as any)
      .insert(execution)
      .select()
      .single()

    if (createError) throw createError

    const execRecord = executionRecord as any

    try {
      // Update execution status to running
      await supabase
        .from('automation_executions' as any)
        .update({ status: 'running' })
        .eq('id', execRecord.id)

      const startTime = Date.now()

      // Check conditions
      const conditionsMet = await this.checkConditions(rule.conditions, triggerData)
      if (!conditionsMet) {
        await supabase
          .from('automation_executions' as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            execution_time_ms: Date.now() - startTime
          })
          .eq('id', execRecord.id)

        return { ...execRecord, status: 'completed', completed_at: new Date().toISOString(), execution_time_ms: Date.now() - startTime }
      }

      // Execute actions
      const results = await this.executeActions(rule.actions, triggerData)

      // Update execution record with results
      await supabase
        .from('automation_executions' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          execution_time_ms: Date.now() - startTime,
          actions_executed: results.total,
          actions_succeeded: results.successful,
          actions_failed: results.failed,
          affected_entities: results.affectedEntities
        })
        .eq('id', execRecord.id)

      // Update rule execution count
      await supabase
        .from('automation_rules' as any)
        .update({
          execution_count: rule.execution_count + 1,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', ruleId)

      return {
        ...execRecord,
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        actions_executed: results.total,
        actions_succeeded: results.successful,
        actions_failed: results.failed,
        affected_entities: results.affectedEntities
      }

    } catch (error: any) {
      // Update execution record with error
      await supabase
        .from('automation_executions' as any)
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          error_details: error
        })
        .eq('id', execRecord.id)

      throw error
    }
  }

  // Condition Checking
  private static async checkConditions(conditions: AutomationCondition[], triggerData: any): Promise<boolean> {
    if (conditions.length === 0) return true

    const results = await Promise.all(
      conditions.map(condition => this.checkCondition(condition, triggerData))
    )

    // Simple AND logic for now - can be enhanced for complex logic
    return results.every(result => result)
  }

  private static async checkCondition(condition: AutomationCondition, triggerData: any): Promise<boolean> {
    switch (condition.type) {
      case 'field_equals':
        return this.checkFieldEquals(condition, triggerData)
      case 'field_contains':
        return this.checkFieldContains(condition, triggerData)
      case 'field_greater_than':
        return this.checkFieldGreaterThan(condition, triggerData)
      case 'field_less_than':
        return this.checkFieldLessThan(condition, triggerData)
      case 'field_exists':
        return this.checkFieldExists(condition, triggerData)
      case 'field_missing':
        return this.checkFieldMissing(condition, triggerData)
      case 'user_role':
        return this.checkUserRole(condition, triggerData)
      case 'time_range':
        return this.checkTimeRange(condition, triggerData)
      default:
        return false
    }
  }

  private static checkFieldEquals(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field || condition.value === undefined) return false
    return triggerData[condition.field] === condition.value
  }

  private static checkFieldContains(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field || condition.value === undefined) return false
    const fieldValue = triggerData[condition.field]
    return typeof fieldValue === 'string' && fieldValue.includes(condition.value)
  }

  private static checkFieldGreaterThan(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field || condition.value === undefined) return false
    const fieldValue = triggerData[condition.field]
    return typeof fieldValue === 'number' && fieldValue > condition.value
  }

  private static checkFieldLessThan(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field || condition.value === undefined) return false
    const fieldValue = triggerData[condition.field]
    return typeof fieldValue === 'number' && fieldValue < condition.value
  }

  private static checkFieldExists(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field) return false
    return triggerData[condition.field] !== undefined && triggerData[condition.field] !== null
  }

  private static checkFieldMissing(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.field) return false
    return triggerData[condition.field] === undefined || triggerData[condition.field] === null
  }

  private static async checkUserRole(condition: AutomationCondition, triggerData: any): Promise<boolean> {
    // Implementation would check user roles from database
    return true // Placeholder
  }

  private static checkTimeRange(condition: AutomationCondition, triggerData: any): boolean {
    if (!condition.time_field || !condition.time_range) return false
    const fieldValue = triggerData[condition.time_field]
    if (!fieldValue) return false

    const date = new Date(fieldValue)
    const now = new Date()

    if (condition.time_range.start) {
      const startDate = new Date(condition.time_range.start)
      if (date < startDate) return false
    }

    if (condition.time_range.end) {
      const endDate = new Date(condition.time_range.end)
      if (date > endDate) return false
    }

    return true
  }

  // Action Execution
  private static async executeActions(actions: AutomationAction[], triggerData: any): Promise<{
    total: number
    successful: number
    failed: number
    affectedEntities: any
  }> {
    let total = 0
    let successful = 0
    let failed = 0
    const affectedEntities: any = {}

    for (const action of actions) {
      total++
      try {
        await this.executeAction(action, triggerData)
        successful++
      } catch (error) {
        failed++
        console.error(`Failed to execute action ${action.id}:`, error)
      }
    }

    return { total, successful, failed, affectedEntities }
  }

  private static async executeAction(action: AutomationAction, triggerData: any): Promise<void> {
    switch (action.type) {
      case 'update_task':
        await this.executeUpdateTask(action, triggerData)
        break
      case 'create_task':
        await this.executeCreateTask(action, triggerData)
        break
      case 'assign_user':
        await this.executeAssignUser(action, triggerData)
        break
      case 'set_due_date':
        await this.executeSetDueDate(action, triggerData)
        break
      case 'add_label':
        await this.executeAddLabel(action, triggerData)
        break
      case 'remove_label':
        await this.executeRemoveLabel(action, triggerData)
        break
      case 'send_notification':
        await this.executeSendNotification(action, triggerData)
        break
      case 'send_email':
        await this.executeSendEmail(action, triggerData)
        break
      case 'move_to_column':
        await this.executeMoveToColumn(action, triggerData)
        break
      case 'archive_task':
        await this.executeArchiveTask(action, triggerData)
        break
      case 'webhook_call':
        await this.executeWebhookCall(action, triggerData)
        break
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  private static async executeUpdateTask(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.task_updates || !triggerData.task_id) return

    const { error } = await supabase
      .from('tasks')
      .update(action.task_updates)
      .eq('id', triggerData.task_id)

    if (error) throw error
  }

  private static async executeCreateTask(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.task_updates) return

    const { error } = await supabase
      .from('tasks')
      .insert({
        ...action.task_updates,
        project_id: triggerData.project_id,
        created_by: triggerData.user_id
      } as any)

    if (error) throw error
  }

  private static async executeAssignUser(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.assignee_id || !triggerData.task_id) return

    const { error } = await supabase
      .from('tasks')
      .update({ assignee_id: action.assignee_id })
      .eq('id', triggerData.task_id)

    if (error) throw error
  }

  private static async executeSetDueDate(action: AutomationAction, triggerData: any): Promise<void> {
    if (!triggerData.task_id) return

    let dueDate: string | null = null

    if (action.due_date_absolute) {
      dueDate = action.due_date_absolute
    } else if (action.due_date_offset !== undefined) {
      const date = new Date()
      date.setDate(date.getDate() + action.due_date_offset)
      dueDate = date.toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('tasks')
      .update({ due_date: dueDate })
      .eq('id', triggerData.task_id)

    if (error) throw error
  }

  private static async executeAddLabel(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.label_name || !triggerData.task_id) return

    // Implementation would add label to task
    console.log(`Adding label ${action.label_name} to task ${triggerData.task_id}`)
  }

  private static async executeRemoveLabel(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.label_name || !triggerData.task_id) return

    // Implementation would remove label from task
    console.log(`Removing label ${action.label_name} from task ${triggerData.task_id}`)
  }

  private static async executeSendNotification(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.notification_title || !action.notification_message) return

    // Implementation would send notification
    console.log(`Sending notification: ${action.notification_title}`)
  }

  private static async executeSendEmail(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.email_subject || !action.email_body) return

    // Implementation would send email
    console.log(`Sending email: ${action.email_subject}`)
  }

  private static async executeMoveToColumn(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.target_column || !triggerData.task_id) return

    const { error } = await supabase
      .from('tasks')
      .update({ status: action.target_column })
      .eq('id', triggerData.task_id)

    if (error) throw error
  }

  private static async executeArchiveTask(action: AutomationAction, triggerData: any): Promise<void> {
    if (!triggerData.task_id) return

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'archived' })
      .eq('id', triggerData.task_id)

    if (error) throw error
  }

  private static async executeWebhookCall(action: AutomationAction, triggerData: any): Promise<void> {
    if (!action.webhook_url) return

    const response = await fetch(action.webhook_url, {
      method: action.webhook_method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...action.webhook_headers
      },
      body: action.webhook_body || JSON.stringify(triggerData)
    })

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`)
    }
  }

  // Template Management
  static async getTemplates(category?: string): Promise<AutomationTemplate[]> {
    // For now, return predefined templates
    // In a real implementation, these would be stored in the database
    let templates = AUTOMATION_TEMPLATES

    if (category) {
      templates = templates.filter(template => template.category === category)
    }

    return templates
  }

  static async getTemplate(templateId: string): Promise<AutomationTemplate | null> {
    const templates = AUTOMATION_TEMPLATES
    return templates.find(template => template.id === templateId) || null
  }

  static async createRuleFromTemplate(templateId: string, projectId: string, userId: string, customizations?: Partial<AutomationRule>): Promise<AutomationRule> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    const rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'execution_count'> = {
      name: template.name,
      description: template.description,
      project_id: projectId,
      created_by: userId,
      is_active: true,
      trigger: template.trigger,
      conditions: template.conditions,
      actions: template.actions,
      tags: template.tags,
      priority: 'medium',
      ...customizations
    }

    return this.createRule(rule)
  }

  // Analytics
  static async getRuleAnalytics(ruleId: string): Promise<any> {
    const { data, error } = await supabase
      .from('automation_executions' as any)
      .select('*')
      .eq('rule_id', ruleId)
      .order('started_at', { ascending: false })

    if (error) throw error

    const executions = (data || []) as any[]
    const total = executions.length
    const successful = executions.filter((e: any) => e.status === 'completed').length
    const failed = executions.filter((e: any) => e.status === 'failed').length

    return {
      total_executions: total,
      successful_executions: successful,
      failed_executions: failed,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
      average_execution_time: executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / total || 0
    }
  }

  // Scheduled Execution
  static async getScheduledRules(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules' as any)
      .select('*')
      .eq('is_active', true)
      .eq('trigger.type', 'schedule')

    if (error) throw error
    return (data || []) as unknown as AutomationRule[]
  }

  static async executeScheduledRules(): Promise<void> {
    const rules = await this.getScheduledRules()
    const now = new Date()

    for (const rule of rules) {
      try {
        // Check if rule should be executed based on schedule
        const shouldExecute = this.shouldExecuteScheduledRule(rule, now)
        if (shouldExecute) {
          await this.executeRule(rule.id, {
            trigger_type: 'schedule',
            executed_at: now.toISOString()
          })
        }
      } catch (error) {
        console.error(`Failed to execute scheduled rule ${rule.id}:`, error)
      }
    }
  }

  private static shouldExecuteScheduledRule(rule: AutomationRule, now: Date): boolean {
    const trigger = rule.trigger as AutomationTrigger
    if (trigger.type !== 'schedule' || !trigger.schedule_config) return false

    const config = trigger.schedule_config

    if (config.time) {
      const [hours, minutes] = config.time.split(':').map(Number)
      const ruleTime = new Date()
      ruleTime.setHours(hours, minutes, 0, 0)

      // Check if current time matches rule time (within 1 minute tolerance)
      const timeDiff = Math.abs(now.getTime() - ruleTime.getTime())
      if (timeDiff > 60000) return false // More than 1 minute difference
    }

    if (config.days) {
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (!config.days.includes(currentDay)) return false
    }

    return true
  }
}

// Import predefined templates
import { AUTOMATION_TEMPLATES } from '@/lib/models/automation'

