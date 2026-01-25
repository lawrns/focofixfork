/**
 * Cursos Repository
 * Type-safe database access for cursos tables
 */

import { BaseRepository, Result, Ok, Err, isError, isSuccess } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Course = Database['public']['Tables']['cursos_courses']['Row']
type CourseInsert = Database['public']['Tables']['cursos_courses']['Insert']
type CourseUpdate = Database['public']['Tables']['cursos_courses']['Update']

type Section = Database['public']['Tables']['cursos_sections']['Row']
type SectionInsert = Database['public']['Tables']['cursos_sections']['Insert']

type Progress = Database['public']['Tables']['cursos_progress']['Row']
type ProgressInsert = Database['public']['Tables']['cursos_progress']['Insert']
type ProgressUpdate = Database['public']['Tables']['cursos_progress']['Update']

export interface CourseWithSections extends Course {
  sections: Section[]
}

export interface CourseWithProgress extends CourseWithSections {
  progress?: Progress
  completedSections: number
  totalSections: number
  progressPercentage: number
}

export class CursosRepository extends BaseRepository<Course> {
  protected table = 'cursos_courses'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Get all published courses for a workspace
   */
  async findPublishedByWorkspace(workspaceId: string): Promise<Result<CourseWithProgress[]>> {
    const { data: courses, error } = await this.supabase
      .from(this.table)
      .select(`
        *,
        sections:cursos_sections(sort_order)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_published', true)
      .order('sort_order')

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch courses',
        details: error,
      })
    }

    return Ok(courses as CourseWithProgress[])
  }

  /**
   * Get a single course by ID with sections
   */
  async findById(courseId: string): Promise<Result<CourseWithSections>> {
    const { data: course, error } = await this.supabase
      .from(this.table)
      .select(`
        *,
        sections:cursos_sections(sort_order)
      `)
      .eq('id', courseId)
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch course',
        details: error,
      })
    }

    return Ok(course as CourseWithSections)
  }

  /**
   * Get a course by slug
   */
  async findBySlug(workspaceId: string, slug: string): Promise<Result<CourseWithSections>> {
    const { data: course, error } = await this.supabase
      .from(this.table)
      .select(`
        *,
        sections:cursos_sections(sort_order)
      `)
      .eq('workspace_id', workspaceId)
      .eq('slug', slug)
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch course',
        details: error,
      })
    }

    return Ok(course as CourseWithSections)
  }

  /**
   * Get user's progress for a course
   */
  async getUserProgress(userId: string, courseId: string): Promise<Result<Progress | null>> {
    const { data: progress, error } = await this.supabase
      .from('cursos_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch progress',
        details: error,
      })
    }

    return Ok(progress)
  }

  /**
   * Create or update user progress
   */
  async upsertProgress(
    userId: string,
    courseId: string,
    data: {
      completed_section_ids: string[]
      last_position: number
    }
  ): Promise<Result<Progress>> {
    const { data: progress, error } = await this.supabase
      .from('cursos_progress')
      .upsert({
        user_id: userId,
        course_id: courseId,
        ...data,
      })
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to save progress',
        details: error,
      })
    }

    return Ok(progress as Progress)
  }

  /**
   * Mark a section as completed
   */
  async markSectionComplete(
    userId: string,
    courseId: string,
    sectionId: string
  ): Promise<Result<Progress>> {
    // First get current progress
    const currentResult = await this.getUserProgress(userId, courseId)

    if (!currentResult.ok) {
      return Err(currentResult.error)
    }

    const current = currentResult.data
    const completedIds = current?.completed_section_ids || []

    // Add the new section ID if not already present
    if (!completedIds.includes(sectionId)) {
      completedIds.push(sectionId)
    }

    return this.upsertProgress(userId, courseId, {
      completed_section_ids: completedIds,
      last_position: current?.last_position || 0,
    })
  }

  /**
   * Get all certified members for a workspace
   */
  async getCertifiedMembers(workspaceId: string): Promise<Result<any[]>> {
    // First get all course IDs for this workspace
    const { data: courses, error: coursesError } = await this.supabase
      .from('cursos_courses')
      .select('id')
      .eq('workspace_id', workspaceId)

    if (coursesError) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch courses',
        details: coursesError,
      })
    }

    const courseIds = courses?.map(c => c.id) || []

    // If no courses, return empty array
    if (courseIds.length === 0) {
      return Ok([])
    }

    // Get certifications for those courses
    const { data, error } = await this.supabase
      .from('cursos_certifications')
      .select(`
        *,
        user:auth.users(id, email, raw_user_meta_data),
        course:cursos_courses(id, title, certification_level)
      `)
      .in('course_id', courseIds)

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch certified members',
        details: error,
      })
    }

    return Ok(data || [])
  }

  /**
   * Check if user is certified for a course
   */
  async getUserCertification(userId: string, courseId: string): Promise<Result<any>> {
    const { data: certification, error } = await this.supabase
      .from('cursos_certifications')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch certification',
        details: error,
      })
    }

    return Ok(certification)
  }

  /**
   * Create certification for user
   */
  async createCertification(
    userId: string,
    courseId: string,
    level: string = 'Nivel 1'
  ): Promise<Result<any>> {
    const { data: certification, error } = await this.supabase
      .from('cursos_certifications')
      .insert({
        user_id: userId,
        course_id: courseId,
        certification_level: level,
      })
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create certification',
        details: error,
      })
    }

    return Ok(certification)
  }
}
