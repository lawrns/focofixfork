import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportOptions {
  format: 'csv' | 'pdf'
  includeHeaders?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  status?: string[]
  organizationId?: string
}

export interface ProjectExportData {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  progress_percentage: number
  due_date?: string
  created_at: string
  organization_name?: string
}

export interface MilestoneExportData {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  progress_percentage: number
  due_date?: string
  project_name?: string
  created_at: string
}

export interface TaskExportData {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  due_date?: string
  milestone_name?: string
  project_name?: string
  assignee_name?: string
  created_at: string
}

export class ExportService {
  /**
   * Export projects data
   */
  static async exportProjects(options: ExportOptions): Promise<Blob> {
    const data = await this.fetchProjectsData(options)

    if (options.format === 'csv') {
      return this.generateCSV(data, this.getProjectHeaders())
    } else {
      return this.generatePDF(data, 'Projects Report', this.getProjectHeaders())
    }
  }

  /**
   * Export milestones data
   */
  static async exportMilestones(options: ExportOptions): Promise<Blob> {
    const data = await this.fetchMilestonesData(options)

    if (options.format === 'csv') {
      return this.generateCSV(data, this.getMilestoneHeaders())
    } else {
      return this.generatePDF(data, 'Milestones Report', this.getMilestoneHeaders())
    }
  }

  /**
   * Export tasks data
   */
  static async exportTasks(options: ExportOptions): Promise<Blob> {
    const data = await this.fetchTasksData(options)

    if (options.format === 'csv') {
      return this.generateCSV(data, this.getTaskHeaders())
    } else {
      return this.generatePDF(data, 'Tasks Report', this.getTaskHeaders())
    }
  }

  /**
   * Export comprehensive project report (projects + milestones + tasks)
   */
  static async exportProjectReport(projectId: string, options: ExportOptions): Promise<Blob> {
    const [projectsData, milestonesData, tasksData] = await Promise.all([
      this.fetchProjectsData({ ...options, organizationId: projectId }),
      this.fetchMilestonesData({ ...options, organizationId: projectId }),
      this.fetchTasksData({ ...options, organizationId: projectId })
    ])

    return this.generateComprehensivePDF(
      projectsData,
      milestonesData,
      tasksData,
      'Project Report'
    )
  }

  /**
   * Fetch projects data for export
   */
  private static async fetchProjectsData(options: ExportOptions): Promise<ProjectExportData[]> {
    let query = supabase
      .from('projects')
      .select(`
        *,
        organizations (
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId)
    }

    if (options.status?.length) {
      query = query.in('status', options.status)
    }

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching projects for export:', error)
      throw new Error('Failed to fetch projects data')
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      status: item.status || 'planning',
      priority: item.priority || 'medium',
      progress_percentage: item.progress_percentage || 0,
      due_date: item.due_date || undefined,
      created_at: item.created_at || '',
      organization_name: item.organizations?.name
    }))
  }

  /**
   * Fetch milestones data for export
   */
  private static async fetchMilestonesData(options: ExportOptions): Promise<MilestoneExportData[]> {
    let query = supabase
      .from('milestones')
      .select(`
        *,
        projects (
          name
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options.organizationId) {
      query = query.eq('project_id', options.organizationId)
    }

    if (options.status?.length) {
      query = query.in('status', options.status)
    }

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching milestones for export:', error)
      throw new Error('Failed to fetch milestones data')
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      status: item.status || 'planning',
      priority: item.priority || 'medium',
      progress_percentage: item.progress_percentage || 0,
      due_date: item.due_date || undefined,
      project_name: item.projects?.name,
      created_at: item.created_at || ''
    }))
  }

  /**
   * Fetch tasks data for export
   */
  private static async fetchTasksData(options: ExportOptions): Promise<TaskExportData[]> {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        milestones (
          name,
          projects (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options.organizationId) {
      query = query.eq('milestone.project_id', options.organizationId)
    }

    if (options.status?.length) {
      query = query.in('status', options.status)
    }

    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks for export:', error)
      throw new Error('Failed to fetch tasks data')
    }

    return data.map(item => ({
      id: item.id,
      name: item.title,
      description: item.description || undefined,
      status: item.status || 'todo',
      priority: item.priority || 'medium',
      due_date: item.due_date || undefined,
      milestone_name: item.milestones?.name,
      project_name: item.milestones?.projects?.name,
      assignee_name: item.assignee_id || 'Unassigned',
      created_at: item.created_at || ''
    }))
  }

  /**
   * Generate CSV file
   */
  private static generateCSV(data: any[], headers: string[]): Blob {
    const csvData = data.map(item =>
      headers.map(header => {
        const keys = header.toLowerCase().replace(/ /g, '_')
        return item[keys] || ''
      })
    )

    const csv = Papa.unparse([headers, ...csvData])
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  }

  /**
   * Generate PDF file
   */
  private static generatePDF(data: any[], title: string, headers: string[]): Blob {
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(20)
    doc.text(title, 14, 22)

    // Add timestamp
    doc.setFontSize(10)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 32)

    // Prepare table data
    const tableData = data.map(item =>
      headers.map(header => {
        const keys = header.toLowerCase().replace(/ /g, '_')
        const value = item[keys]

        // Format dates
        if (keys.includes('date') && value) {
          return new Date(value).toLocaleDateString()
        }

        // Format percentages
        if (keys.includes('progress') && typeof value === 'number') {
          return `${value}%`
        }

        return value || ''
      })
    )

    // Add table
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    return doc.output('blob')
  }

  /**
   * Generate comprehensive PDF report
   */
  private static generateComprehensivePDF(
    projectsData: ProjectExportData[],
    milestonesData: MilestoneExportData[],
    tasksData: TaskExportData[],
    title: string
  ): Blob {
    const doc = new jsPDF()

    // Title page
    doc.setFontSize(24)
    doc.text(title, 14, 30)
    doc.setFontSize(12)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 50)
    doc.text(`Projects: ${projectsData.length} | Milestones: ${milestonesData.length} | Tasks: ${tasksData.length}`, 14, 60)

    let yPosition = 80

    // Projects section
    if (projectsData.length > 0) {
      doc.setFontSize(16)
      doc.text('Projects', 14, yPosition)
      yPosition += 10

      const projectTableData = projectsData.map(item => [
        item.name,
        item.status,
        item.priority,
        `${item.progress_percentage}%`,
        item.due_date ? new Date(item.due_date).toLocaleDateString() : ''
      ])

      doc.autoTable({
        head: [['Name', 'Status', 'Priority', 'Progress', 'Due Date']],
        body: projectTableData,
        startY: yPosition,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 20
    }

    // Add new page for milestones if needed
    if (yPosition > 250 && milestonesData.length > 0) {
      doc.addPage()
      yPosition = 20
    }

    // Milestones section
    if (milestonesData.length > 0) {
      doc.setFontSize(16)
      doc.text('Milestones', 14, yPosition)
      yPosition += 10

      const milestoneTableData = milestonesData.map(item => [
        item.name,
        item.project_name || '',
        item.status,
        `${item.progress_percentage}%`,
        item.due_date ? new Date(item.due_date).toLocaleDateString() : ''
      ])

      doc.autoTable({
        head: [['Name', 'Project', 'Status', 'Progress', 'Due Date']],
        body: milestoneTableData,
        startY: yPosition,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [155, 89, 182], textColor: 255 },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 20
    }

    // Add new page for tasks if needed
    if (yPosition > 250 && tasksData.length > 0) {
      doc.addPage()
      yPosition = 20
    }

    // Tasks section
    if (tasksData.length > 0) {
      doc.setFontSize(16)
      doc.text('Tasks', 14, yPosition)
      yPosition += 10

      const taskTableData = tasksData.map(item => [
        item.name,
        item.milestone_name || '',
        item.assignee_name || '',
        item.status,
        item.priority,
        item.due_date ? new Date(item.due_date).toLocaleDateString() : ''
      ])

      doc.autoTable({
        head: [['Name', 'Milestone', 'Assignee', 'Status', 'Priority', 'Due Date']],
        body: taskTableData,
        startY: yPosition,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      })
    }

    return doc.output('blob')
  }

  /**
   * Download file with appropriate filename
   */
  static downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Get project headers for export
   */
  private static getProjectHeaders(): string[] {
    return ['Name', 'Description', 'Status', 'Priority', 'Progress', 'Due Date', 'Organization', 'Created At']
  }

  /**
   * Get milestone headers for export
   */
  private static getMilestoneHeaders(): string[] {
    return ['Name', 'Description', 'Status', 'Priority', 'Progress', 'Due Date', 'Project', 'Created At']
  }

  /**
   * Get task headers for export
   */
  private static getTaskHeaders(): string[] {
    return ['Name', 'Description', 'Status', 'Priority', 'Due Date', 'Milestone', 'Project', 'Assignee', 'Created At']
  }
}