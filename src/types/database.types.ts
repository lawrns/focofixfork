/**
 * Database types generated from Supabase schema
 * This file contains TypeScript types for the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website: string | null
          created_by: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          created_by: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          created_by?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: string
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string | null
          created_by: string
          status: string
          priority: string
          start_date: string | null
          end_date: string | null
          progress: number
          budget: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id?: string | null
          created_by: string
          status?: string
          priority?: string
          start_date?: string | null
          end_date?: string | null
          progress?: number
          budget?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string | null
          created_by?: string
          status?: string
          priority?: string
          start_date?: string | null
          end_date?: string | null
          progress?: number
          budget?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          added_by: string
          added_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          added_by: string
          added_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          added_by?: string
          added_at?: string
        }
      }
      milestones: {
        Row: {
          id: string
          name: string
          description: string | null
          project_id: string
          due_date: string | null
          completed: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          project_id: string
          due_date?: string | null
          completed?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          project_id?: string
          due_date?: string | null
          completed?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          project_id: string | null
          milestone_id: string | null
          assigned_to: string | null
          status: string
          priority: string
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          project_id?: string | null
          milestone_id?: string | null
          assigned_to?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          project_id?: string | null
          milestone_id?: string | null
          assigned_to?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          title: string
          description: string | null
          target_value: number | null
          current_value: number | null
          unit: string | null
          status: string
          type: string
          owner_id: string | null
          organization_id: string | null
          project_id: string | null
          start_date: string | null
          end_date: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          status?: string
          type?: string
          owner_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          status?: string
          type?: string
          owner_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          metadata: Json
          user_id: string
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          metadata?: Json
          user_id: string
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          metadata?: Json
          user_id?: string
          organization_id?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          timezone: string | null
          theme_preference: string | null
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          timezone?: string | null
          theme_preference?: string | null
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          timezone?: string | null
          theme_preference?: string | null
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          task_id: string | null
          description: string | null
          hours: number
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          task_id?: string | null
          description?: string | null
          hours: number
          date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          task_id?: string | null
          description?: string | null
          hours?: number
          date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}