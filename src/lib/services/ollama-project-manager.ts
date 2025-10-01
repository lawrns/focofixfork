/**
 * Ollama Project Management Service
 *
 * This service acts as the primary control interface for the entire project management system.
 * It enables Ollama to parse natural language specifications and create/manage complete projects
 * with milestones and tasks through full CRUD operations on the database.
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { ollamaService } from './ollama'

export interface ProjectSpecification {
  name: string
  description: string
  requirements?: string[]
  timeline?: {
    start_date?: string
    due_date?: string
    duration_days?: number
  }
  team?: {
    size?: number
    roles?: string[]
  }
  complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise'
  domain?: string
}

export interface ParsedProject {
  project: {
    name: string
    description: string
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    start_date?: string
    due_date?: string
  }
  milestones: Array<{
    name: string
    title: string
    description: string
    deadline: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'green' | 'yellow' | 'red'
    order: number
  }>
  tasks: Array<{
    milestone_index: number
    title: string
    description: string
    status: 'todo' | 'in_progress' | 'review' | 'done'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    estimated_hours?: number
    order: number
  }>
}

export class OllamaProjectManager {
  /**
   * Parse natural language project specification into structured data
   */
  static async parseProjectSpecification(spec: string | ProjectSpecification, userId: string): Promise<ParsedProject> {
    const specText = typeof spec === 'string' ? spec : this.formatSpecification(spec)

    const prompt = `You are a project management AI. Parse this project specification and generate a complete project structure with milestones and tasks.

Project Specification:
${specText}

Return a JSON object with this EXACT structure (use only these exact field names and values):
{
  "project": {
    "name": "Project Name (max 100 chars)",
    "description": "Detailed project description",
    "status": "planning",
    "priority": "medium",
    "start_date": "YYYY-MM-DD (or null)",
    "due_date": "YYYY-MM-DD (or null)"
  },
  "milestones": [
    {
      "name": "milestone-1",
      "title": "Milestone Title",
      "description": "Detailed description",
      "deadline": "YYYY-MM-DD",
      "priority": "high",
      "status": "green",
      "order": 1
    }
  ],
  "tasks": [
    {
      "milestone_index": 0,
      "title": "Task Title",
      "description": "Task details",
      "status": "todo",
      "priority": "medium",
      "estimated_hours": 8,
      "order": 1
    }
  ]
}

RULES:
1. status for project MUST be one of: "planning", "active", "on_hold", "completed", "cancelled"
2. priority for project/tasks MUST be: "low", "medium", "high", "urgent"
3. priority for milestones MUST be: "low", "medium", "high", "critical"
4. task status MUST be: "todo", "in_progress", "review", "done"
5. milestone status MUST be: "green", "yellow", "red"
6. All dates MUST be YYYY-MM-DD format or null
7. milestone_index refers to index in milestones array (0-based)
8. Break project into 3-7 logical milestones
9. Create 3-8 tasks per milestone
10. Order tasks and milestones logically

Return ONLY valid JSON, no explanations.`

    try {
      const response = await ollamaService.generate({
        model: ollamaService.config.defaultModel,
        prompt,
        options: {
          temperature: 0.3, // Low temperature for consistent structure
          num_predict: 2048,
          num_ctx: 4096
        }
      })

      // Extract JSON from response
      let jsonText = response.response.trim()

      // Try to find JSON in markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1]
      }

      const parsed = JSON.parse(jsonText)

      // Validate and clean the structure
      return this.validateParsedProject(parsed)

    } catch (error) {
      console.error('Failed to parse project specification:', error)
      throw new Error(`Project parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create complete project with milestones and tasks in database
   */
  static async createProject(
    parsedProject: ParsedProject,
    userId: string,
    organizationId: string
  ): Promise<{
    project: any
    milestones: any[]
    tasks: any[]
  }> {
    try {
      // 1. Create Project
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .insert({
          name: parsedProject.project.name,
          description: parsedProject.project.description,
          status: parsedProject.project.status,
          priority: parsedProject.project.priority,
          start_date: parsedProject.project.start_date,
          due_date: parsedProject.project.due_date,
          organization_id: organizationId,
          created_by: userId,
          progress_percentage: 0
        })
        .select()
        .single()

      if (projectError) {
        throw new Error(`Failed to create project: ${projectError.message}`)
      }

      // 2. Create Milestones
      const milestonesData = parsedProject.milestones.map((m, index) => ({
        project_id: project.id,
        name: m.name,
        title: m.title,
        description: m.description,
        deadline: m.deadline,
        priority: m.priority,
        status: m.status,
        progress_percentage: 0,
        created_by: userId
      }))

      const { data: milestones, error: milestonesError } = await supabaseAdmin
        .from('milestones')
        .insert(milestonesData)
        .select()

      if (milestonesError) {
        console.error('Failed to create milestones:', milestonesError)
        throw new Error(`Failed to create milestones: ${milestonesError.message}`)
      }

      // 3. Create Tasks
      const tasksData = parsedProject.tasks.map(t => ({
        project_id: project.id,
        milestone_id: milestones[t.milestone_index]?.id || null,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        estimated_hours: t.estimated_hours,
        created_by: userId
      }))

      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksData)
        .select()

      if (tasksError) {
        console.error('Failed to create tasks:', tasksError)
        throw new Error(`Failed to create tasks: ${tasksError.message}`)
      }

      return {
        project,
        milestones: milestones || [],
        tasks: tasks || []
      }

    } catch (error) {
      console.error('Failed to create project in database:', error)
      throw error
    }
  }

  /**
   * Update project based on natural language command
   */
  static async updateProject(
    projectId: string,
    command: string,
    userId: string
  ): Promise<{ success: boolean; changes: any }> {
    // Get current project state
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) {
      throw new Error('Project not found')
    }

    const prompt = `Parse this update command for a project and return the changes to make.

Current Project State:
${JSON.stringify(project, null, 2)}

Update Command: "${command}"

Return JSON with fields to update:
{
  "field": "value"  // Only include fields that should change
}

Possible fields: name, description, status, priority, due_date, progress_percentage
Status values: "planning", "active", "on_hold", "completed", "cancelled"
Priority values: "low", "medium", "high", "urgent"

Return ONLY valid JSON.`

    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.2, num_predict: 512 }
    })

    const updates = JSON.parse(response.response.trim())

    // Apply updates
    const { data: updated, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`)
    }

    return { success: true, changes: updates }
  }

  /**
   * Create milestone for project
   */
  static async createMilestone(
    projectId: string,
    specification: string,
    userId: string
  ): Promise<any> {
    const prompt = `Create a milestone specification from this description.

Description: "${specification}"

Return JSON:
{
  "name": "milestone-name",
  "title": "Milestone Title",
  "description": "Detailed description",
  "deadline": "YYYY-MM-DD",
  "priority": "high|medium|low|critical",
  "status": "green|yellow|red"
}

Return ONLY valid JSON.`

    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.3, num_predict: 512 }
    })

    const milestoneData = JSON.parse(response.response.trim())

    const { data: milestone, error } = await supabaseAdmin
      .from('milestones')
      .insert({
        project_id: projectId,
        name: milestoneData.name,
        title: milestoneData.title,
        description: milestoneData.description,
        deadline: milestoneData.deadline,
        priority: milestoneData.priority,
        status: milestoneData.status,
        progress_percentage: 0,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create milestone: ${error.message}`)
    }

    return milestone
  }

  /**
   * Create task for milestone/project
   */
  static async createTask(
    projectId: string,
    specification: string,
    milestoneId?: string,
    userId?: string
  ): Promise<any> {
    const prompt = `Create a task specification from this description.

Description: "${specification}"

Return JSON:
{
  "title": "Task Title",
  "description": "Detailed description",
  "status": "todo|in_progress|review|done",
  "priority": "low|medium|high|urgent",
  "estimated_hours": 8
}

Return ONLY valid JSON.`

    const response = await ollamaService.generate({
      model: ollamaService.config.defaultModel,
      prompt,
      options: { temperature: 0.3, num_predict: 512 }
    })

    const taskData = JSON.parse(response.response.trim())

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        project_id: projectId,
        milestone_id: milestoneId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        estimated_hours: taskData.estimated_hours,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`)
    }

    return task
  }

  /**
   * Delete project and all related data
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean }> {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`)
    }

    return { success: true }
  }

  /**
   * Get project with all milestones and tasks
   */
  static async getProject(projectId: string): Promise<{
    project: any
    milestones: any[]
    tasks: any[]
  }> {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    const { data: milestones } = await supabaseAdmin
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('deadline', { ascending: true })

    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    return {
      project: project || null,
      milestones: milestones || [],
      tasks: tasks || []
    }
  }

  /**
   * Private helper methods
   */
  private static formatSpecification(spec: ProjectSpecification): string {
    let text = `Project: ${spec.name}\n\n`
    text += `Description: ${spec.description}\n\n`

    if (spec.requirements) {
      text += `Requirements:\n${spec.requirements.map(r => `- ${r}`).join('\n')}\n\n`
    }

    if (spec.timeline) {
      text += `Timeline:\n`
      if (spec.timeline.start_date) text += `- Start: ${spec.timeline.start_date}\n`
      if (spec.timeline.due_date) text += `- Due: ${spec.timeline.due_date}\n`
      if (spec.timeline.duration_days) text += `- Duration: ${spec.timeline.duration_days} days\n`
      text += '\n'
    }

    if (spec.team) {
      text += `Team:\n`
      if (spec.team.size) text += `- Size: ${spec.team.size} people\n`
      if (spec.team.roles) text += `- Roles: ${spec.team.roles.join(', ')}\n`
      text += '\n'
    }

    if (spec.complexity) {
      text += `Complexity: ${spec.complexity}\n\n`
    }

    if (spec.domain) {
      text += `Domain: ${spec.domain}\n\n`
    }

    return text
  }

  private static validateParsedProject(parsed: any): ParsedProject {
    // Validate project
    if (!parsed.project || !parsed.project.name) {
      throw new Error('Invalid project structure: missing project name')
    }

    // Ensure required fields have valid values
    const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled']
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    const validMilestonePriorities = ['low', 'medium', 'high', 'critical']
    const validMilestoneStatuses = ['green', 'yellow', 'red']
    const validTaskStatuses = ['todo', 'in_progress', 'review', 'done']

    parsed.project.status = validStatuses.includes(parsed.project.status) ? parsed.project.status : 'planning'
    parsed.project.priority = validPriorities.includes(parsed.project.priority) ? parsed.project.priority : 'medium'

    // Validate milestones
    if (!Array.isArray(parsed.milestones)) {
      parsed.milestones = []
    }

    parsed.milestones = parsed.milestones.map((m: any, i: number) => ({
      name: m.name || `milestone-${i + 1}`,
      title: m.title || m.name || `Milestone ${i + 1}`,
      description: m.description || '',
      deadline: m.deadline || this.getDefaultDeadline(i * 14),
      priority: validMilestonePriorities.includes(m.priority) ? m.priority : 'medium',
      status: validMilestoneStatuses.includes(m.status) ? m.status : 'green',
      order: m.order || i + 1
    }))

    // Validate tasks
    if (!Array.isArray(parsed.tasks)) {
      parsed.tasks = []
    }

    parsed.tasks = parsed.tasks.map((t: any, i: number) => ({
      milestone_index: Math.max(0, Math.min(parsed.milestones.length - 1, t.milestone_index || 0)),
      title: t.title || `Task ${i + 1}`,
      description: t.description || '',
      status: validTaskStatuses.includes(t.status) ? t.status : 'todo',
      priority: validPriorities.includes(t.priority) ? t.priority : 'medium',
      estimated_hours: t.estimated_hours || 8,
      order: t.order || i + 1
    }))

    return parsed as ParsedProject
  }

  private static getDefaultDeadline(daysFromNow: number): string {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    return date.toISOString().split('T')[0]
  }
}
