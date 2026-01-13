import { supabase } from '@/lib/supabase-client'
import Papa from 'papaparse'

const untypedSupabase = supabase as any

export interface ImportResult {
  success: boolean
  totalRows: number
  importedRows: number
  errors: string[]
  warnings: string[]
}

export interface ImportOptions {
  skipDuplicates?: boolean
  updateExisting?: boolean
  validateOnly?: boolean
}

export class ImportService {
  /**
   * Import projects from CSV
   */
  static async importProjects(csvData: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: [],
      warnings: []
    }

    try {
      // Parse CSV
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().replace(/ /g, '_')
      })

      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors.map(e => `CSV parsing error: ${e.message}`))
        return result
      }

      result.totalRows = parseResult.data.length

      // Validate and transform data
      const validProjects: any[] = []
      const seenNames = new Set<string>()

      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i] as any
        const rowNumber = i + 2 // +2 because of 0-index and header row

        try {
          // Validate required fields
          if (!row.name?.trim()) {
            result.errors.push(`Row ${rowNumber}: Name is required`)
            continue
          }

          // Check for duplicates within import
          if (seenNames.has(row.name.trim())) {
            result.warnings.push(`Row ${rowNumber}: Duplicate project name "${row.name}" within import file`)
            if (options.skipDuplicates) continue
          }
          seenNames.add(row.name.trim())

          // Validate status
          const validStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled']
          if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
            result.warnings.push(`Row ${rowNumber}: Invalid status "${row.status}", using default`)
          }

          // Validate priority
          const validPriorities = ['low', 'medium', 'high', 'urgent']
          if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
            result.warnings.push(`Row ${rowNumber}: Invalid priority "${row.priority}", using default`)
          }

          // Transform data
          const projectData = {
            name: row.name.trim(),
            description: row.description?.trim() || null,
            status: validStatuses.includes(row.status?.toLowerCase()) ? row.status.toLowerCase() : 'planning',
            priority: validPriorities.includes(row.priority?.toLowerCase()) ? row.priority.toLowerCase() : 'medium',
            progress_percentage: this.parseNumber(row.progress_percentage) || 0,
            start_date: this.parseDate(row.start_date),
            due_date: this.parseDate(row.due_date),
            organization_id: row.organization_id?.trim() || null
          }

          validProjects.push(projectData)

        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (validProjects.length === 0) {
        result.errors.push('No valid projects to import')
        return result
      }

      if (options.validateOnly) {
        result.success = true
        result.importedRows = validProjects.length
        return result
      }

      // Import to database
      let importedCount = 0

      for (const project of validProjects) {
        try {
          // Check if project already exists (by name and organization)
          let query = supabase
            .from('projects')
            .select('id')
            .eq('name', project.name)

          if (project.organization_id) {
            query = query.eq('organization_id', project.organization_id)
          }

          // @ts-ignore - Avoiding deep type instantiation issue
          const response = await query.single()

          if (response.data) {
            if (options.updateExisting) {
              // Update existing project
              const { error } = await untypedSupabase
                .from('projects')
                .update(project)
                .eq('id', response.data.id)

              if (error) {
                result.errors.push(`Failed to update project "${project.name}": ${error.message}`)
                continue
              }
            } else if (options.skipDuplicates) {
              result.warnings.push(`Skipped existing project "${project.name}"`)
              continue
            } else {
              result.errors.push(`Project "${project.name}" already exists`)
              continue
            }
          } else {
            // Create new project
            const { error } = await untypedSupabase
              .from('projects')
              .insert(project)

            if (error) {
              result.errors.push(`Failed to create project "${project.name}": ${error.message}`)
              continue
            }
          }

          importedCount++
        } catch (error) {
          result.errors.push(`Error importing project "${project.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors.length === 0
      result.importedRows = importedCount

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Import milestones from CSV
   */
  static async importMilestones(csvData: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: [],
      warnings: []
    }

    try {
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().replace(/ /g, '_')
      })

      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors.map(e => `CSV parsing error: ${e.message}`))
        return result
      }

      result.totalRows = parseResult.data.length

      const validMilestones: any[] = []

      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i] as any
        const rowNumber = i + 2

        try {
          if (!row.name?.trim()) {
            result.errors.push(`Row ${rowNumber}: Name is required`)
            continue
          }

          if (!row.project_id?.trim() && !row.project_name?.trim()) {
            result.errors.push(`Row ${rowNumber}: Project ID or Project Name is required`)
            continue
          }

          // Resolve project ID from name if needed
          let projectId = row.project_id?.trim()
          if (!projectId && row.project_name?.trim()) {
            // @ts-ignore - Avoiding deep type instantiation issue
            const response = await untypedSupabase
              .from('projects')
              .select('id')
              .eq('name', row.project_name.trim())
              .single()

            if (response.data) {
              projectId = response.data.id
            } else {
              result.errors.push(`Row ${rowNumber}: Project "${row.project_name}" not found`)
              continue
            }
          }

          const milestoneData = {
            name: row.name.trim(),
            description: row.description?.trim() || null,
            status: ['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(row.status?.toLowerCase())
              ? row.status.toLowerCase() : 'planning',
            priority: ['low', 'medium', 'high', 'urgent'].includes(row.priority?.toLowerCase())
              ? row.priority.toLowerCase() : 'medium',
            progress_percentage: this.parseNumber(row.progress_percentage) || 0,
            start_date: this.parseDate(row.start_date),
            due_date: this.parseDate(row.due_date),
            project_id: projectId
          }

          validMilestones.push(milestoneData)

        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (options.validateOnly) {
        result.success = true
        result.importedRows = validMilestones.length
        return result
      }

      // Import milestones
      let importedCount = 0
      for (const milestone of validMilestones) {
        try {
          const { error } = await untypedSupabase
            .from('milestones')
            .insert(milestone)

          if (error) {
            result.errors.push(`Failed to create milestone "${milestone.name}": ${error.message}`)
            continue
          }

          importedCount++
        } catch (error) {
          result.errors.push(`Error importing milestone "${milestone.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors.length === 0
      result.importedRows = importedCount

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Import tasks from CSV
   */
  static async importTasks(csvData: string, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      importedRows: 0,
      errors: [],
      warnings: []
    }

    try {
      const parseResult = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().replace(/ /g, '_')
      })

      if (parseResult.errors.length > 0) {
        result.errors.push(...parseResult.errors.map(e => `CSV parsing error: ${e.message}`))
        return result
      }

      result.totalRows = parseResult.data.length

      const validTasks: any[] = []

      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i] as any
        const rowNumber = i + 2

        try {
          if (!row.name?.trim()) {
            result.errors.push(`Row ${rowNumber}: Name is required`)
            continue
          }

          if (!row.milestone_id?.trim() && !row.milestone_name?.trim()) {
            result.errors.push(`Row ${rowNumber}: Milestone ID or Milestone Name is required`)
            continue
          }

          // Resolve milestone ID from name if needed
          let milestoneId = row.milestone_id?.trim()
          if (!milestoneId && row.milestone_name?.trim()) {
            // @ts-ignore - Avoiding deep type instantiation issue
            const response = await untypedSupabase
              .from('milestones')
              .select('id')
              .eq('name', row.milestone_name.trim())
              .single()

            if (response.data) {
              milestoneId = response.data.id
            } else {
              result.errors.push(`Row ${rowNumber}: Milestone "${row.milestone_name}" not found`)
              continue
            }
          }

          // Resolve assignee ID from name if needed
          let assigneeId = row.assignee_id?.trim()
          if (!assigneeId && row.assignee_name?.trim()) {
            // @ts-ignore - Avoiding deep type instantiation issue
            const response = await untypedSupabase
              .from('user_profiles')
              .select('id')
              .eq('display_name', row.assignee_name.trim())
              .single()

            if (response.data) {
              assigneeId = response.data.id
            } else {
              result.warnings.push(`Row ${rowNumber}: Assignee "${row.assignee_name}" not found, leaving unassigned`)
            }
          }

          const taskData = {
            name: row.name.trim(),
            description: row.description?.trim() || null,
            status: ['todo', 'in_progress', 'review', 'completed', 'cancelled'].includes(row.status?.toLowerCase())
              ? row.status.toLowerCase() : 'todo',
            priority: ['low', 'medium', 'high', 'urgent'].includes(row.priority?.toLowerCase())
              ? row.priority.toLowerCase() : 'medium',
            start_date: this.parseDate(row.start_date),
            due_date: this.parseDate(row.due_date),
            milestone_id: milestoneId,
            assigned_to: assigneeId || null
          }

          validTasks.push(taskData)

        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (options.validateOnly) {
        result.success = true
        result.importedRows = validTasks.length
        return result
      }

      // Import tasks
      let importedCount = 0
      for (const task of validTasks) {
        try {
          const { error } = await untypedSupabase
            .from('tasks')
            .insert(task)

          if (error) {
            result.errors.push(`Failed to create task "${task.name}": ${error.message}`)
            continue
          }

          importedCount++
        } catch (error) {
          result.errors.push(`Error importing task "${task.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors.length === 0
      result.importedRows = importedCount

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Parse number with validation
   */
  private static parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null
    const num = parseFloat(value)
    return isNaN(num) ? null : Math.max(0, Math.min(100, num))
  }

  /**
   * Parse date with validation
   */
  private static parseDate(value: any): string | null {
    if (!value) return null

    const date = new Date(value)
    if (isNaN(date.getTime())) return null

    return date.toISOString()
  }
}


