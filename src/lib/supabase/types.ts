export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          points: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_applied: boolean | null
          metadata: Json | null
          milestone_id: string | null
          suggestion_type: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_applied?: boolean | null
          metadata?: Json | null
          milestone_id?: string | null
          suggestion_type: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_applied?: boolean | null
          metadata?: Json | null
          milestone_id?: string | null
          suggestion_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      automated_workflow_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          created_by: string
          executions_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          priority: number
          project_id: string | null
          rule_description: string | null
          rule_name: string
          success_rate: number | null
          trigger_frequency: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by: string
          executions_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          priority?: number
          project_id?: string | null
          rule_description?: string | null
          rule_name: string
          success_rate?: number | null
          trigger_frequency?: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by?: string
          executions_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          priority?: number
          project_id?: string | null
          rule_description?: string | null
          rule_name?: string
          success_rate?: number | null
          trigger_frequency?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_workflow_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "automated_workflow_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "automated_workflow_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          milestone_id: string | null
          parent_id: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      component_performance_logs: {
        Row: {
          additional_metrics: Json | null
          component_name: string
          id: string
          logged_at: string | null
          memory_usage: number | null
          page_url: string | null
          render_time: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          additional_metrics?: Json | null
          component_name: string
          id?: string
          logged_at?: string | null
          memory_usage?: number | null
          page_url?: string | null
          render_time?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          additional_metrics?: Json | null
          component_name?: string
          id?: string
          logged_at?: string | null
          memory_usage?: number | null
          page_url?: string | null
          render_time?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "component_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "component_performance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crico_list_history: {
        Row: {
          action_details: Json | null
          action_type: string
          changed_at: string | null
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          changed_at?: string | null
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          changed_at?: string | null
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crico_list_history_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "crico_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      crico_lists: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          position: number
          project_id: string
          updated_at: string | null
          wip_limit: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          position?: number
          project_id: string
          updated_at?: string | null
          wip_limit?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          position?: number
          project_id?: string
          updated_at?: string | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crico_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crico_milestone_user_links: {
        Row: {
          created_at: string | null
          crico_user_id: string
          id: string
          milestone_user_id: string
        }
        Insert: {
          created_at?: string | null
          crico_user_id: string
          id?: string
          milestone_user_id: string
        }
        Update: {
          created_at?: string | null
          crico_user_id?: string
          id?: string
          milestone_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crico_milestone_user_links_milestone_user_id_fkey"
            columns: ["milestone_user_id"]
            isOneToOne: true
            referencedRelation: "milestone_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crico_user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invite_token: string | null
          invited_by: string | null
          role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          role?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "crico_user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crico_user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      crico_user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          location_data: Json | null
          session_token: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      crico_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          organization_role: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          organization_role?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          organization_role?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crico_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          stripe_customer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          stripe_customer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          stripe_customer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          id: string
          milestone_id: string | null
          mime_type: string | null
          name: string
          original_name: string
          project_id: string | null
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          mime_type?: string | null
          name: string
          original_name: string
          project_id?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          mime_type?: string | null
          name?: string
          original_name?: string
          project_id?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_checklists: {
        Row: {
          assigned_to: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          milestone_id: string
          position: number
          text: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id: string
          position?: number
          text: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          milestone_id?: string
          position?: number
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_checklists_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_checklists_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          milestone_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          milestone_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          milestone_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_comments_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestone_history: {
        Row: {
          action_type: string | null
          changed_at: string | null
          field_name: string
          id: string
          milestone_id: string
          new_value: string
          old_value: string | null
          user_id: string
        }
        Insert: {
          action_type?: string | null
          changed_at?: string | null
          field_name: string
          id?: string
          milestone_id: string
          new_value: string
          old_value?: string | null
          user_id: string
        }
        Update: {
          action_type?: string | null
          changed_at?: string | null
          field_name?: string
          id?: string
          milestone_id?: string
          new_value?: string
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_history_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestone_labels: {
        Row: {
          category: string | null
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          milestone_id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          milestone_id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          milestone_id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_labels_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_time_tracking: {
        Row: {
          actual_hours: number | null
          created_at: string | null
          estimated_hours: number | null
          id: string
          milestone_id: string
          notes: string | null
          time_logged_at: string | null
          time_logged_by: string | null
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id: string
          notes?: string | null
          time_logged_at?: string | null
          time_logged_by?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string
          notes?: string | null
          time_logged_at?: string | null
          time_logged_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_time_tracking_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_time_tracking_time_logged_by_fkey"
            columns: ["time_logged_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_time_tracking_time_logged_by_fkey"
            columns: ["time_logged_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestone_users: {
        Row: {
          assigned_milestone_id: string | null
          assigned_project_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_milestone_id?: string | null
          assigned_project_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_milestone_id?: string | null
          assigned_project_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_users_assigned_milestone_id_fkey"
            columns: ["assigned_milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_users_assigned_project_id_fkey"
            columns: ["assigned_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestone_watchers: {
        Row: {
          created_at: string | null
          id: string
          milestone_id: string
          notification_preferences: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          milestone_id: string
          notification_preferences?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          milestone_id?: string
          notification_preferences?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_watchers_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestone_watchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      milestones: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          deadline: string
          description: string | null
          due_date: string | null
          id: string
          list_id: string | null
          name: string
          notes: string | null
          priority: string | null
          progress_percentage: number | null
          project_id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          name: string
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string | null
          name?: string
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "milestones_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "crico_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          module_id: string
          score: number | null
          time_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          module_id: string
          score?: number | null
          time_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          module_id?: string
          score?: number | null
          time_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "module_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invite_token: string
          invited_by: string
          organization_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invite_token: string
          invited_by: string
          organization_id: string
          role?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          organization_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          last_activity: string | null
          level: number | null
          preferences: Json | null
          streak_days: number | null
          total_experience: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_activity?: string | null
          level?: number | null
          preferences?: Json | null
          streak_days?: number | null
          total_experience?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_activity?: string | null
          level?: number | null
          preferences?: Json | null
          streak_days?: number | null
          total_experience?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_intelligence_metrics: {
        Row: {
          analysis_date: string | null
          collaboration_score: number
          completion_confidence: number | null
          created_at: string | null
          data_points_analyzed: number
          estimated_completion_date: string | null
          id: string
          on_time_delivery_rate: number | null
          project_id: string | null
          quality_score: number
          quality_trend: string
          recommended_actions: Json
          rework_rate: number | null
          risk_trend: string
          team_satisfaction: number | null
          updated_at: string | null
          velocity_score: number
          velocity_trend: string
        }
        Insert: {
          analysis_date?: string | null
          collaboration_score: number
          completion_confidence?: number | null
          created_at?: string | null
          data_points_analyzed?: number
          estimated_completion_date?: string | null
          id?: string
          on_time_delivery_rate?: number | null
          project_id?: string | null
          quality_score: number
          quality_trend: string
          recommended_actions?: Json
          rework_rate?: number | null
          risk_trend: string
          team_satisfaction?: number | null
          updated_at?: string | null
          velocity_score: number
          velocity_trend: string
        }
        Update: {
          analysis_date?: string | null
          collaboration_score?: number
          completion_confidence?: number | null
          created_at?: string | null
          data_points_analyzed?: number
          estimated_completion_date?: string | null
          id?: string
          on_time_delivery_rate?: number | null
          project_id?: string | null
          quality_score?: number
          quality_trend?: string
          recommended_actions?: Json
          rework_rate?: number | null
          risk_trend?: string
          team_satisfaction?: number | null
          updated_at?: string | null
          velocity_score?: number
          velocity_trend?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_intelligence_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_metadata: {
        Row: {
          actual_completion_date: string | null
          budget_allocated: number | null
          budget_spent: number | null
          category: string | null
          created_at: string | null
          currency: string | null
          custom_fields: Json | null
          department: string | null
          documentation_url: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string | null
          project_manager_id: string | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          target_completion_date: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          budget_allocated?: number | null
          budget_spent?: number | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          department?: string | null
          documentation_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_completion_date?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          budget_allocated?: number | null
          budget_spent?: number | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          department?: string | null
          documentation_url?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_completion_date?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_metadata_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_metadata_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_risk_predictions: {
        Row: {
          actual_outcome: string | null
          actual_outcome_date: string | null
          confidence_level: number
          created_at: string | null
          id: string
          milestone_id: string | null
          mitigation_suggestions: Json
          prediction_date: string | null
          prediction_horizon_days: number
          project_id: string | null
          risk_factors: Json
          risk_level: string
          risk_probability: number
          risk_score: number
          updated_at: string | null
        }
        Insert: {
          actual_outcome?: string | null
          actual_outcome_date?: string | null
          confidence_level: number
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          mitigation_suggestions?: Json
          prediction_date?: string | null
          prediction_horizon_days?: number
          project_id?: string | null
          risk_factors?: Json
          risk_level: string
          risk_probability: number
          risk_score: number
          updated_at?: string | null
        }
        Update: {
          actual_outcome?: string | null
          actual_outcome_date?: string | null
          confidence_level?: number
          created_at?: string | null
          id?: string
          milestone_id?: string | null
          mitigation_suggestions?: Json
          prediction_date?: string | null
          prediction_horizon_days?: number
          project_id?: string | null
          risk_factors?: Json
          risk_level?: string
          risk_probability?: number
          risk_score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risk_predictions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risk_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_system: boolean | null
          project_id: string
          setting_category: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          project_id: string
          setting_category?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          project_id?: string
          setting_category?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          permissions: string[] | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: string[] | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_team_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_team_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_team_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          priority: string | null
          progress_percentage: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      real_time_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          expires_at: string | null
          id: string
          milestone_id: string | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          expires_at?: string | null
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          expires_at?: string | null
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "real_time_events_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_time_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      real_time_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          milestone_id: string | null
          project_id: string | null
          subscription_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          milestone_id?: string | null
          project_id?: string | null
          subscription_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          milestone_id?: string | null
          project_id?: string | null
          subscription_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_time_subscriptions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_time_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      session_activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "crico_user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          changes: Json | null
          created_at: string | null
          event_type: string
          id: string
          new_status: Database["public"]["Enums"]["subscription_status"] | null
          old_status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_event_id: string | null
          stripe_event_type: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          changes?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          changes?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_event_id?: string | null
          stripe_event_type?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          features: Json | null
          id: string
          interval: Database["public"]["Enums"]["billing_interval"]
          interval_count: number
          is_active: boolean | null
          name: string
          stripe_price_id: string
          stripe_product_id: string
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_period_days: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval: Database["public"]["Enums"]["billing_interval"]
          interval_count?: number
          is_active?: boolean | null
          name: string
          stripe_price_id: string
          stripe_product_id: string
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: Database["public"]["Enums"]["billing_interval"]
          interval_count?: number
          is_active?: boolean | null
          name?: string
          stripe_price_id?: string
          stripe_product_id?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
          trial_period_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          milestone_id: string | null
          priority: string | null
          project_id: string
          reporter_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          priority?: string | null
          project_id?: string | null
          reporter_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          priority?: string | null
          project_id?: string | null
          reporter_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_sentiment_analysis: {
        Row: {
          analysis_date: string | null
          analysis_period_hours: number
          communication_volume: number
          created_at: string | null
          deadline_pressure: number | null
          id: string
          negative_interactions: number
          neutral_interactions: number
          positive_interactions: number
          project_id: string | null
          sentiment_confidence: number
          sentiment_score: number
          sentiment_trend: string
          team_conflicts: number | null
          updated_at: string | null
          user_id: string
          workload_stress: number | null
        }
        Insert: {
          analysis_date?: string | null
          analysis_period_hours?: number
          communication_volume?: number
          created_at?: string | null
          deadline_pressure?: number | null
          id?: string
          negative_interactions?: number
          neutral_interactions?: number
          positive_interactions?: number
          project_id?: string | null
          sentiment_confidence: number
          sentiment_score: number
          sentiment_trend: string
          team_conflicts?: number | null
          updated_at?: string | null
          user_id: string
          workload_stress?: number | null
        }
        Update: {
          analysis_date?: string | null
          analysis_period_hours?: number
          communication_volume?: number
          created_at?: string | null
          deadline_pressure?: number | null
          id?: string
          negative_interactions?: number
          neutral_interactions?: number
          positive_interactions?: number
          project_id?: string | null
          sentiment_confidence?: number
          sentiment_score?: number
          sentiment_trend?: string
          team_conflicts?: number | null
          updated_at?: string | null
          user_id?: string
          workload_stress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_sentiment_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_sentiment_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_sentiment_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          hours: number
          id: string
          milestone_id: string | null
          project_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          hours: number
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          hours?: number
          id?: string
          milestone_id?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_tracking: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          duration_ms: number | null
          id: string
          ip_address: unknown | null
          milestone_id: string | null
          project_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown | null
          milestone_id?: string | null
          project_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown | null
          milestone_id?: string | null
          project_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_tracking_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_activity_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          login_successful: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_successful?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          login_successful?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          milestone_deadlines: boolean | null
          project_updates: boolean | null
          system_updates: boolean | null
          team_mentions: boolean | null
          updated_at: string | null
          user_id: string | null
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          milestone_deadlines?: boolean | null
          project_updates?: boolean | null
          system_updates?: boolean | null
          team_mentions?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          milestone_deadlines?: boolean | null
          project_updates?: boolean | null
          system_updates?: boolean | null
          team_mentions?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_name: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_name: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          preferences: Json | null
          settings: Json | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          preferences?: Json | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          preferences?: Json | null
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_active: boolean | null
          module_id: string
          progress_percentage: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string | null
          experience_points: number | null
          id: string
          last_practiced: string | null
          skill_level: number | null
          skill_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience_points?: number | null
          id?: string
          last_practiced?: string | null
          skill_level?: number | null
          skill_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience_points?: number | null
          id?: string
          last_practiced?: string | null
          skill_level?: number | null
          skill_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          amount: number
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id: string
          interval: Database["public"]["Enums"]["billing_interval"]
          metadata: Json | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id?: string
          interval: Database["public"]["Enums"]["billing_interval"]
          metadata?: Json | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string
          current_period_start?: string
          customer_id?: string
          id?: string
          interval?: Database["public"]["Enums"]["billing_interval"]
          metadata?: Json | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_tier"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_details"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      session_analytics: {
        Row: {
          active_sessions: number | null
          avg_session_hours: number | null
          date: string | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      subscription_analytics: {
        Row: {
          active_subscriptions: number | null
          avg_revenue_per_user: number | null
          plan_name: string | null
          tier: Database["public"]["Enums"]["plan_tier"] | null
          total_revenue: number | null
        }
        Relationships: []
      }
      user_current_tier: {
        Row: {
          current_period_end: string | null
          current_tier: Database["public"]["Enums"]["plan_tier"] | null
          has_active_subscription: boolean | null
          is_in_trial: boolean | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          tier_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_subscription_details: {
        Row: {
          amount: number | null
          cancel_at_period_end: boolean | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_name: string | null
          email: string | null
          plan_name: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          tier: Database["public"]["Enums"]["plan_tier"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_checklist_item: {
        Args: {
          assigned_to_param?: string
          due_date_param?: string
          item_text: string
          milestone_id_param: string
        }
        Returns: string
      }
      analyze_team_sentiment: {
        Args: { analysis_period_hours?: number; project_id_param: string }
        Returns: {
          communication_volume: number
          deadline_pressure: number
          negative_interactions: number
          neutral_interactions: number
          positive_interactions: number
          sentiment_confidence: number
          sentiment_score: number
          sentiment_trend: string
          team_conflicts: number
          user_id: string
          workload_stress: number
        }[]
      }
      broadcast_real_time_event: {
        Args: {
          event_data_param?: Json
          event_type_param: string
          milestone_id_param?: string
          project_id_param?: string
        }
        Returns: string
      }
      bulk_delete_milestones: {
        Args: { milestone_ids: string[]; user_id_param?: string }
        Returns: Json
      }
      bulk_move_milestones: {
        Args: {
          milestone_ids: string[]
          target_list_id: string
          user_id_param?: string
        }
        Returns: Json
      }
      calculate_project_risk_prediction: {
        Args: { prediction_horizon_days?: number; project_id_param: string }
        Returns: {
          confidence_level: number
          milestone_id: string
          mitigation_suggestions: Json
          risk_factors: Json
          risk_level: string
          risk_probability: number
          risk_score: number
        }[]
      }
      check_schema_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_type: string
          issue: string
          object_name: string
          recommendation: string
          severity: string
        }[]
      }
      check_suspicious_activity: {
        Args: { p_email: string }
        Returns: Json
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_performance_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_old_real_time_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_comment: {
        Args: {
          author_id_param: string
          content_param: string
          milestone_id_param?: string
          parent_id_param?: string
          project_id_param?: string
        }
        Returns: Json
      }
      create_crico_list: {
        Args: {
          p_color?: string
          p_description?: string
          p_name: string
          p_project_id: string
          p_wip_limit?: number
        }
        Returns: Json
      }
      create_crico_milestone: {
        Args: {
          assignee_param?: string
          description_param?: string
          due_date_param?: string
          list_id_param?: string
          priority_param?: string
          project_id_param: string
          title_param: string
        }
        Returns: Json
      }
      create_crico_project: {
        Args: {
          color_param?: string
          description_param?: string
          name_param: string
          organization_id_param?: string
          template_param?: string
        }
        Returns: Json
      }
      create_crico_project_from_template: {
        Args: { project_id_param: string; template_param: string }
        Returns: undefined
      }
      create_milestone_label: {
        Args: {
          category_param?: string
          label_color?: string
          label_name: string
          milestone_id_param: string
        }
        Returns: string
      }
      create_time_entry: {
        Args: {
          date_param: string
          description_param: string
          hours_param: number
          milestone_id_param: string
          project_id_param: string
          user_id_param: string
        }
        Returns: Json
      }
      create_user_session: {
        Args:
          | {
              p_device_info?: Json
              p_expires_at: string
              p_ip_address?: unknown
              p_location_data?: Json
              p_session_token: string
              p_user_agent?: string
              p_user_id: string
            }
          | {
              p_expires_at: string
              p_ip_address: string
              p_session_token: string
              p_user_agent: string
              p_user_id: string
            }
        Returns: string
      }
      delete_crico_list: {
        Args: { p_list_id: string }
        Returns: Json
      }
      delete_crico_milestone: {
        Args: { milestone_id_param: string }
        Returns: Json
      }
      delete_crico_project: {
        Args: { project_id_param: string }
        Returns: Json
      }
      delete_milestone_safely: {
        Args: { cascade_delete: boolean; milestone_id_param: string }
        Returns: Json
      }
      detect_orphaned_records: {
        Args: Record<PropertyKey, never>
        Returns: {
          foreign_key_column: string
          orphaned_count: number
          referenced_table: string
          table_name: string
        }[]
      }
      diagnose_rls_issues: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      duplicate_crico_project: {
        Args: { new_name_param: string; project_id_param: string }
        Returns: Json
      }
      generate_invite_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_org_slug: {
        Args: { org_name: string }
        Returns: string
      }
      generate_project_intelligence_metrics: {
        Args: { project_id_param: string }
        Returns: Json
      }
      get_activity_feed: {
        Args: { limit_param?: number; user_id_param?: string }
        Returns: Json
      }
      get_crico_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_crico_dashboard_data_secure: {
        Args: { user_id_param?: string }
        Returns: Json
      }
      get_crico_lists: {
        Args: { p_project_id: string }
        Returns: {
          card_count: number
          color: string
          created_at: string
          created_by_name: string
          description: string
          id: string
          list_position: number
          name: string
          wip_limit: number
        }[]
      }
      get_crico_project_milestones: {
        Args: { project_id_param?: string }
        Returns: {
          assigned_to: string
          assignee: string
          assignee_id: string
          created_at: string
          deadline: string
          description: string
          due_date: string
          id: string
          list_id: string
          name: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_crico_project_settings: {
        Args: { project_id_param: string }
        Returns: Json
      }
      get_crico_project_templates: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_crico_user_secure: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_database_performance_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          metric_name: string
          metric_value: string
        }[]
      }
      get_index_usage: {
        Args: Record<PropertyKey, never>
        Returns: {
          idx_scan: number
          idx_tup_fetch: number
          idx_tup_read: number
          indexname: string
          last_used: string
          schemaname: string
          tablename: string
        }[]
      }
      get_milestone_comments: {
        Args: { limit_param?: number; milestone_id_param: string }
        Returns: Json
      }
      get_or_create_crico_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_performance_metrics: {
        Args: {
          component_name_param?: string
          end_date?: string
          start_date?: string
        }
        Returns: Json
      }
      get_plan_id_by_tier: {
        Args: { plan_tier_name: Database["public"]["Enums"]["plan_tier"] }
        Returns: string
      }
      get_project_stats: {
        Args: { project_id_param: string }
        Returns: Json
      }
      get_project_team_members: {
        Args: { project_id_param: string }
        Returns: Json
      }
      get_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          cmd: string
          permissive: string
          policyname: string
          qual: string
          roles: string[]
          schemaname: string
          tablename: string
          with_check: string
        }[]
      }
      get_schema_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          column_count: number
          row_count: number
          size_bytes: number
          table_name: string
          table_type: string
        }[]
      }
      get_search_suggestions: {
        Args: { query_prefix: string }
        Returns: Json
      }
      get_table_sizes: {
        Args: Record<PropertyKey, never>
        Returns: {
          size_bytes: number
          size_pretty: string
          table_name: string
        }[]
      }
      get_time_entries: {
        Args: {
          limit_param?: number
          milestone_id_param?: string
          project_id_param?: string
          user_id_param?: string
        }
        Returns: Json
      }
      get_user_active_subscription: {
        Args: { user_uuid: string }
        Returns: {
          current_period_end: string
          is_trial: boolean
          plan_name: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_id: string
          tier: Database["public"]["Enums"]["plan_tier"]
        }[]
      }
      get_user_activity_summary: {
        Args: { end_date?: string; start_date?: string; user_id_param?: string }
        Returns: Json
      }
      get_user_notifications: {
        Args: { limit_param?: number; user_id_param: string }
        Returns: Json
      }
      get_user_organizations: {
        Args: { user_uuid: string }
        Returns: {
          member_count: number
          organization_id: string
          organization_name: string
          organization_slug: string
          user_role: string
        }[]
      }
      get_user_permissions_with_projects: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_user_role_level: {
        Args: { p_role: string }
        Returns: number
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_org_role: {
        Args: { org_id: string; required_role: string; user_uuid: string }
        Returns: boolean
      }
      has_user_permission: {
        Args: { p_permission_name: string; p_user_id: string }
        Returns: boolean
      }
      invalidate_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: undefined
      }
      is_org_member: {
        Args: { org_id: string; user_uuid: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          action_param: string
          details_param?: Json
          resource_id_param: string
          resource_type_param: string
          user_id_param: string
        }
        Returns: Json
      }
      log_component_performance: {
        Args: {
          additional_metrics_param?: Json
          component_name_param: string
          memory_usage_param?: number
          render_time_param?: number
          session_id_param?: string
        }
        Returns: string
      }
      log_login_attempt: {
        Args:
          | {
              p_email: string
              p_failure_reason?: string
              p_ip_address?: unknown
              p_success: boolean
              p_user_agent?: string
            }
          | {
              p_failure_reason?: string
              p_ip_address: string
              p_successful: boolean
              p_user_agent: string
              p_user_id: string
            }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_action_details?: Json
          p_action_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      manage_crico_project_team: {
        Args: {
          action_param: string
          project_id_param: string
          user_data_param: Json
        }
        Returns: Json
      }
      map_db_status_to_frontend: {
        Args: { db_status: string }
        Returns: string
      }
      map_frontend_priority_to_db: {
        Args: { frontend_priority: string }
        Returns: string
      }
      map_frontend_status_to_db: {
        Args: { frontend_status: string }
        Returns: string
      }
      mark_notification_read: {
        Args: { notification_id_param: string }
        Returns: Json
      }
      remove_milestone_label: {
        Args: { label_id_param: string }
        Returns: boolean
      }
      reorder_crico_lists: {
        Args: {
          p_list_id: string
          p_new_position: number
          p_project_id: string
        }
        Returns: boolean
      }
      search_milestones_advanced: {
        Args: { search_params: Json }
        Returns: Json
      }
      send_email_verification: {
        Args: { p_user_id: string }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      subscribe_to_milestone: {
        Args: { milestone_id_param: string }
        Returns: undefined
      }
      toggle_checklist_item: {
        Args: { completed_param?: boolean; item_id_param: string }
        Returns: boolean
      }
      track_user_activity: {
        Args: {
          activity_data_param?: Json
          activity_type_param: string
          duration_ms_param?: number
          milestone_id_param?: string
          project_id_param?: string
          session_id_param?: string
        }
        Returns: string
      }
      unsubscribe_from_milestone: {
        Args: { milestone_id_param: string }
        Returns: undefined
      }
      update_crico_list: {
        Args: {
          p_color?: string
          p_description?: string
          p_list_id: string
          p_name?: string
          p_wip_limit?: number
        }
        Returns: Json
      }
      update_crico_milestone: {
        Args:
          | { milestone_id_param: string; update_data: Json }
          | { milestone_id_param: string; updates_param: Json }
        Returns: Json
      }
      update_crico_project: {
        Args: { project_id_param: string; update_data: Json }
        Returns: Json
      }
      update_crico_project_metadata: {
        Args: { metadata_param: Json; project_id_param: string }
        Returns: Json
      }
      update_crico_project_settings: {
        Args: { project_id_param: string; settings_param: Json }
        Returns: Json
      }
      update_session_activity: {
        Args: {
          p_action_details?: Json
          p_action_type?: string
          p_ip_address?: unknown
          p_session_id: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      user_has_feature_access: {
        Args: {
          required_tier: Database["public"]["Enums"]["plan_tier"]
          user_uuid: string
        }
        Returns: boolean
      }
      verify_email_token: {
        Args: { p_token: string }
        Returns: Json
      }
    }
    Enums: {
      billing_interval: "month" | "year"
      plan_tier: "free" | "pro" | "elite"
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_interval: ["month", "year"],
      plan_tier: ["free", "pro", "elite"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
    },
  },
} as const
