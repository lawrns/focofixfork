/**
 * Type definitions for API response structures
 *
 * This file contains TypeScript interfaces for all API responses to ensure
 * type safety throughout the application and eliminate `any` types.
 */

/**
 * Milestone response from API endpoints
 */
export interface MilestoneResponse {
  id: string
  name: string
  status: 'completed' | 'in-progress' | 'review' | 'pending'
  description?: string
  priority?: string
  assigned_to?: string
  due_date?: string
  created_at?: string
  updated_at?: string
}

/**
 * Workspace member response structure
 * Handles multiple API response variations with optional fields
 */
export interface WorkspaceMemberResponse {
  user_id?: string
  id?: string
  user?: {
    full_name?: string
    email?: string
    avatar_url?: string
  }
  full_name?: string
  email?: string
  role?: 'owner' | 'admin' | 'member' | 'guest'
}

/**
 * Workspace project response structure
 */
export interface WorkspaceProjectResponse {
  id: string
  name?: string
  title?: string
  color?: string
  description?: string
  created_at?: string
  updated_at?: string
}

/**
 * Notification response from /api/notifications endpoint
 */
export interface NotificationResponse {
  id: string
  type: string
  title: string
  body?: string
  actor?: {
    full_name?: string
    avatar_url?: string
  }
  project?: {
    name: string
    color: string
  }
  work_item?: {
    title: string
  }
  is_read: boolean
  created_at: string
}

/**
 * Real-time presence payload from Supabase
 */
export interface PresencePayload {
  user_id?: string
  id?: string
  user_metadata?: {
    name?: string
    email?: string
    avatar_url?: string
  }
}

/**
 * API response wrapper for successful responses
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

/**
 * API response wrapper for error responses
 */
export interface ApiErrorResponse {
  success: false
  error: string
  status?: number
}

/**
 * Generic API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
