import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Type helpers
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string | null
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'guest'
          invited_by: string | null
          invited_at: string
          joined_at: string | null
        }
        Insert: {
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'guest'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
        }
        Update: {
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'guest'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          start_date: string | null
          due_date: string | null
          progress_percentage: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          due_date?: string | null
          progress_percentage?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          due_date?: string | null
          progress_percentage?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          milestone_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id: string | null
          reporter_id: string
          estimated_hours: number | null
          actual_hours: number | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          milestone_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id?: string | null
          reporter_id: string
          estimated_hours?: number | null
          actual_hours?: number | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          milestone_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_id?: string | null
          reporter_id?: string
          estimated_hours?: number | null
          actual_hours?: number | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      milestones: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'planned' | 'active' | 'completed' | 'cancelled'
          due_date: string | null
          completion_date: string | null
          progress_percentage: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'planned' | 'active' | 'completed' | 'cancelled'
          due_date?: string | null
          completion_date?: string | null
          progress_percentage?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'planned' | 'active' | 'completed' | 'cancelled'
          due_date?: string | null
          completion_date?: string | null
          progress_percentage?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          timezone: string
          locale: string
          email_notifications: boolean
          theme_preference: 'light' | 'dark' | 'system'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          timezone?: string
          locale?: string
          email_notifications?: boolean
          theme_preference?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          timezone?: string
          locale?: string
          email_notifications?: boolean
          theme_preference?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
      }
      ai_suggestions: {
        Row: {
          id: string
          user_id: string
          entity_type: 'project' | 'task' | 'milestone'
          entity_id: string
          suggestion_type: 'create' | 'estimate' | 'prioritize' | 'breakdown'
          content: Record<string, any>
          confidence_score: number
          was_accepted: boolean | null
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: 'project' | 'task' | 'milestone'
          entity_id: string
          suggestion_type: 'create' | 'estimate' | 'prioritize' | 'breakdown'
          content: Record<string, any>
          confidence_score: number
          was_accepted?: boolean | null
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: 'project' | 'task' | 'milestone'
          entity_id?: string
          suggestion_type?: 'create' | 'estimate' | 'prioritize' | 'breakdown'
          content?: Record<string, any>
          confidence_score?: number
          was_accepted?: boolean | null
          model_used?: string | null
          created_at?: string
        }
      }
      milestone_comments: {
        Row: {
          id: string
          milestone_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          milestone_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          milestone_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      milestone_labels: {
        Row: {
          id: string
          milestone_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          milestone_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          milestone_id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
      }
      real_time_events: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          user_id: string
          event_type: string
          data: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          user_id: string
          event_type: string
          data?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          user_id?: string
          event_type?: string
          data?: Record<string, any> | null
          created_at?: string
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
  }
}
