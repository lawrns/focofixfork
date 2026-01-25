export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_action_previews: {
        Row: {
          id: string
          execution_id: string
          task_id: string
          workspace_id: string
          user_id: string
          action_type: string
          preview_data: Json
          metadata: Json
          created_at: string
          expires_at: string
          applied_at: string | null
        }
        Insert: {
          id?: string
          execution_id: string
          task_id: string
          workspace_id: string
          user_id: string
          action_type: string
          preview_data: Json
          metadata?: Json
          created_at?: string
          expires_at?: string
          applied_at?: string | null
        }
        Update: {
          id?: string
          execution_id?: string
          task_id?: string
          workspace_id?: string
          user_id?: string
          action_type?: string
          preview_data?: Json
          metadata?: Json
          created_at?: string
          expires_at?: string
          applied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_previews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_previews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_audit_log: {
        Row: {
          id: string
          correlation_id: string | null
          workspace_id: string
          user_id: string | null
          tool_name: string
          tool_args: Json | null
          model: string
          prompt_hash: string | null
          ai_policy_version: number | null
          result_success: boolean
          result_data: Json | null
          error_message: string | null
          latency_ms: number | null
          token_count: number | null
          cost_estimate: number | null
          created_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          correlation_id?: string | null
          workspace_id: string
          user_id?: string | null
          tool_name: string
          tool_args?: Json | null
          model: string
          prompt_hash?: string | null
          ai_policy_version?: number | null
          result_success: boolean
          result_data?: Json | null
          error_message?: string | null
          latency_ms?: number | null
          token_count?: number | null
          cost_estimate?: number | null
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          correlation_id?: string | null
          workspace_id?: string
          user_id?: string | null
          tool_name?: string
          tool_args?: Json | null
          model?: string
          prompt_hash?: string | null
          ai_policy_version?: number | null
          result_success?: boolean
          result_data?: Json | null
          error_message?: string | null
          latency_ms?: number | null
          token_count?: number | null
          cost_estimate?: number | null
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_policy_history: {
        Row: {
          id: string
          workspace_id: string
          version: number
          policy: Json
          changed_by: string | null
          changed_at: string
          change_reason: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          version: number
          policy: Json
          changed_by?: string | null
          changed_at?: string
          change_reason?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          version?: number
          policy?: Json
          changed_by?: string | null
          changed_at?: string
          change_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_policy_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_suggestions: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          suggestion_type: string
          content: string
          milestone_id: string | null
          is_applied: boolean | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          suggestion_type: string
          content: string
          milestone_id?: string | null
          is_applied?: boolean | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          suggestion_type?: string
          content?: string
          milestone_id?: string | null
          is_applied?: boolean | null
          metadata?: Json | null
          created_at?: string | null
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
            foreignKeyName: "ai_suggestions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          action: string
          entity_type: string
          entity_ids: string[]
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          action: string
          entity_type: string
          entity_ids?: string[]
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          action?: string
          entity_type?: string
          entity_ids?: string[]
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_logs: {
        Row: {
          id: string
          automation_id: string
          work_item_id: string | null
          status: string
          trigger_data: Json | null
          action_result: Json | null
          error_message: string | null
          executed_at: string | null
        }
        Insert: {
          id?: string
          automation_id: string
          work_item_id?: string | null
          status: string
          trigger_data?: Json | null
          action_result?: Json | null
          error_message?: string | null
          executed_at?: string | null
        }
        Update: {
          id?: string
          automation_id?: string
          work_item_id?: string | null
          status?: string
          trigger_data?: Json | null
          action_result?: Json | null
          error_message?: string | null
          executed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          }
        ]
      }
      automations: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          name: string
          description: string | null
          is_active: boolean | null
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          trigger_config: Json | null
          conditions: Json | null
          action_type: Database["public"]["Enums"]["automation_action"]
          action_config: Json | null
          run_count: number | null
          last_run_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          name: string
          description?: string | null
          is_active?: boolean | null
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
          conditions?: Json | null
          action_type: Database["public"]["Enums"]["automation_action"]
          action_config?: Json | null
          run_count?: number | null
          last_run_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          name?: string
          description?: string | null
          is_active?: boolean | null
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          trigger_config?: Json | null
          conditions?: Json | null
          action_type?: Database["public"]["Enums"]["automation_action"]
          action_config?: Json | null
          run_count?: number | null
          last_run_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      conflicts: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          field_name: string
          server_value: Json | null
          client_value: Json | null
          resolved_value: Json | null
          resolution_strategy: string | null
          resolved_by: string | null
          resolved_at: string | null
          user_ids: string[]
          occurred_at: string
          created_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          field_name: string
          server_value?: Json | null
          client_value?: Json | null
          resolved_value?: Json | null
          resolution_strategy?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          user_ids: string[]
          occurred_at?: string
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          field_name?: string
          server_value?: Json | null
          client_value?: Json | null
          resolved_value?: Json | null
          resolution_strategy?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          user_ids?: string[]
          occurred_at?: string
          created_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      cursos_certifications: {
        Row: {
          id: string
          user_id: string
          course_id: string
          certification_level: string
          certified_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          certification_level?: string
          certified_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          certification_level?: string
          certified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cursos_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cursos_checkpoint_attempts: {
        Row: {
          id: string
          user_id: string
          section_id: string
          answer: Json | null
          is_correct: boolean
          attempts: number
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          section_id: string
          answer?: Json | null
          is_correct?: boolean
          attempts?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          section_id?: string
          answer?: Json | null
          is_correct?: boolean
          attempts?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_checkpoint_attempts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "cursos_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_checkpoint_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cursos_courses: {
        Row: {
          id: string
          workspace_id: string
          slug: string
          title: string
          description: string | null
          duration_minutes: number
          is_published: boolean
          sort_order: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          slug: string
          title: string
          description?: string | null
          duration_minutes?: number
          is_published?: boolean
          sort_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          slug?: string
          title?: string
          description?: string | null
          duration_minutes?: number
          is_published?: boolean
          sort_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_courses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      cursos_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          completed_section_ids: string[]
          last_position: number
          is_completed: boolean
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          completed_section_ids?: string[]
          last_position?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          completed_section_ids?: string[]
          last_position?: number
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cursos_courses"
            referencedColumns: ["id"]
          }
        ]
      }
      cursos_sections: {
        Row: {
          id: string
          course_id: string
          title: string
          content_type: string
          content_url: string | null
          content: string | null
          sort_order: number
          duration_minutes: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          content_type: string
          content_url?: string | null
          content?: string | null
          sort_order?: number
          duration_minutes?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          content_type?: string
          content_url?: string | null
          content?: string | null
          sort_order?: number
          duration_minutes?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cursos_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cursos_courses"
            referencedColumns: ["id"]
          }
        ]
      }
      docs: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          parent_id: string | null
          title: string
          content: string | null
          content_type: string | null
          template: string | null
          created_by: string | null
          last_edited_by: string | null
          is_locked: boolean | null
          locked_by: string | null
          locked_at: string | null
          embedding: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          parent_id?: string | null
          title: string
          content?: string | null
          content_type?: string | null
          template?: string | null
          created_by?: string | null
          last_edited_by?: string | null
          is_locked?: boolean | null
          locked_by?: string | null
          locked_at?: string | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          parent_id?: string | null
          title?: string
          content?: string | null
          content_type?: string | null
          template?: string | null
          created_by?: string | null
          last_edited_by?: string | null
          is_locked?: boolean | null
          locked_by?: string | null
          locked_at?: string | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      foco_comments: {
        Row: {
          id: string
          work_item_id: string
          user_id: string
          content: string
          mentions: string[] | null
          attachments: Json | null
          is_ai_generated: boolean | null
          ai_sources: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          work_item_id: string
          user_id: string
          content: string
          mentions?: string[] | null
          attachments?: Json | null
          is_ai_generated?: boolean | null
          ai_sources?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          work_item_id?: string
          user_id?: string
          content?: string
          mentions?: string[] | null
          attachments?: Json | null
          is_ai_generated?: boolean | null
          ai_sources?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foco_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          }
        ]
      }
      foco_project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: Database["public"]["Enums"]["member_role"] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: Database["public"]["Enums"]["member_role"] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["member_role"] | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foco_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      foco_projects: {
        Row: {
          id: string
          workspace_id: string
          name: string
          slug: string
          description: string | null
          brief: string | null
          color: string | null
          icon: string | null
          status: string | null
          owner_id: string | null
          default_status: Database["public"]["Enums"]["work_item_status"] | null
          settings: Json | null
          is_pinned: boolean | null
          archived_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          slug: string
          description?: string | null
          brief?: string | null
          color?: string | null
          icon?: string | null
          status?: string | null
          owner_id?: string | null
          default_status?: Database["public"]["Enums"]["work_item_status"] | null
          settings?: Json | null
          is_pinned?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          slug?: string
          description?: string | null
          brief?: string | null
          color?: string | null
          icon?: string | null
          status?: string | null
          owner_id?: string | null
          default_status?: Database["public"]["Enums"]["work_item_status"] | null
          settings?: Json | null
          is_pinned?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foco_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      goal_milestones: {
        Row: {
          id: string
          goal_id: string
          title: string
          description: string | null
          status: string
          weight: number | null
          progress_percentage: number | null
          due_date: string | null
          completed_at: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          title: string
          description?: string | null
          status?: string
          weight?: number | null
          progress_percentage?: number | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          title?: string
          description?: string | null
          status?: string
          weight?: number | null
          progress_percentage?: number | null
          due_date?: string | null
          completed_at?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          }
        ]
      }
      goal_project_links: {
        Row: {
          id: string
          goal_id: string
          project_id: string
          contribution_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          project_id: string
          contribution_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          project_id?: string
          contribution_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_project_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      goals: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          title: string
          description: string | null
          type: string | null
          status: string | null
          priority: string | null
          target_value: number | null
          current_value: number | null
          unit: string | null
          progress_percentage: number | null
          owner_id: string
          start_date: string | null
          end_date: string | null
          completed_at: string | null
          tags: string[] | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          title: string
          description?: string | null
          type?: string | null
          status?: string | null
          priority?: string | null
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          progress_percentage?: number | null
          owner_id: string
          start_date?: string | null
          end_date?: string | null
          completed_at?: string | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          type?: string | null
          status?: string | null
          priority?: string | null
          target_value?: number | null
          current_value?: number | null
          unit?: string | null
          progress_percentage?: number | null
          owner_id?: string
          start_date?: string | null
          end_date?: string | null
          completed_at?: string | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      inbox_items: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          body: string | null
          work_item_id: string | null
          project_id: string | null
          doc_id: string | null
          comment_id: string | null
          actor_id: string | null
          is_read: boolean | null
          is_resolved: boolean | null
          snoozed_until: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          body?: string | null
          work_item_id?: string | null
          project_id?: string | null
          doc_id?: string | null
          comment_id?: string | null
          actor_id?: string | null
          is_read?: boolean | null
          is_resolved?: boolean | null
          snoozed_until?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          body?: string | null
          work_item_id?: string | null
          project_id?: string | null
          doc_id?: string | null
          comment_id?: string | null
          actor_id?: string | null
          is_read?: boolean | null
          is_resolved?: boolean | null
          snoozed_until?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "foco_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      labels: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          name: string
          color: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          name: string
          color?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          name?: string
          color?: string | null
          description?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      milestones: {
        Row: {
          id: string
          workspace_id: string | null
          project_id: string | null
          title: string
          description: string | null
          status: string | null
          priority: string | null
          due_date: string | null
          start_date: string | null
          completed_at: string | null
          created_by: string | null
          assigned_to: string | null
          position: number | null
          parent_id: string | null
          tags: string[] | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          project_id?: string | null
          title: string
          description?: string | null
          status?: string | null
          priority?: string | null
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          assigned_to?: string | null
          position?: number | null
          parent_id?: string | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          project_id?: string | null
          title?: string
          description?: string | null
          status?: string | null
          priority?: string | null
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          assigned_to?: string | null
          position?: number | null
          parent_id?: string | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      proposal_discussions: {
        Row: {
          id: string
          proposal_id: string
          item_id: string | null
          user_id: string
          content: string
          is_resolution: boolean
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          item_id?: string | null
          user_id: string
          content: string
          is_resolution?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          item_id?: string | null
          user_id?: string
          content?: string
          is_resolution?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_discussions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "proposal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_discussions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          }
        ]
      }
      proposal_impact_summary: {
        Row: {
          id: string
          proposal_id: string
          total_tasks_added: number
          total_tasks_modified: number
          total_tasks_removed: number
          total_hours_added: number
          total_hours_removed: number
          workload_shifts: Json | null
          deadline_impacts: Json | null
          resource_conflicts: Json | null
          risk_score: number
          calculated_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          total_tasks_added?: number
          total_tasks_modified?: number
          total_tasks_removed?: number
          total_hours_added?: number
          total_hours_removed?: number
          workload_shifts?: Json | null
          deadline_impacts?: Json | null
          resource_conflicts?: Json | null
          risk_score?: number
          calculated_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          total_tasks_added?: number
          total_tasks_modified?: number
          total_tasks_removed?: number
          total_hours_added?: number
          total_hours_removed?: number
          workload_shifts?: Json | null
          deadline_impacts?: Json | null
          resource_conflicts?: Json | null
          risk_score?: number
          calculated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_impact_summary_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          }
        ]
      }
      proposal_items: {
        Row: {
          id: string
          proposal_id: string
          action: string
          entity_type: string
          entity_id: string | null
          original_state: Json | null
          proposed_state: Json | null
          ai_estimate: Json | null
          ai_assignment: Json | null
          approval_status: string
          reviewer_notes: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          original_state?: Json | null
          proposed_state?: Json | null
          ai_estimate?: Json | null
          ai_assignment?: Json | null
          approval_status?: string
          reviewer_notes?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          original_state?: Json | null
          proposed_state?: Json | null
          ai_estimate?: Json | null
          ai_assignment?: Json | null
          approval_status?: string
          reviewer_notes?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          }
        ]
      }
      proposals: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          title: string
          description: string | null
          status: string
          created_by: string
          approver_id: string | null
          source_type: string
          source_content: Json | null
          base_snapshot_at: string | null
          ai_analysis: Json | null
          approval_config: Json | null
          submitted_at: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          created_by: string
          approver_id?: string | null
          source_type: string
          source_content?: Json | null
          base_snapshot_at?: string | null
          ai_analysis?: Json | null
          approval_config?: Json | null
          submitted_at?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          created_by?: string
          approver_id?: string | null
          source_type?: string
          source_content?: Json | null
          base_snapshot_at?: string | null
          ai_analysis?: Json | null
          approval_config?: Json | null
          submitted_at?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          report_type: string
          title: string
          config: Json | null
          data: Json | null
          generated_by: string | null
          is_ai_generated: boolean | null
          period_start: string | null
          period_end: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          report_type: string
          title: string
          config?: Json | null
          data?: Json | null
          generated_by?: string | null
          is_ai_generated?: boolean | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          report_type?: string
          title?: string
          config?: Json | null
          data?: Json | null
          generated_by?: string | null
          is_ai_generated?: boolean | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_views: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          user_id: string | null
          name: string
          view_type: string | null
          filters: Json | null
          sort_by: string | null
          sort_order: string | null
          columns: Json | null
          group_by: string | null
          is_default: boolean | null
          is_shared: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          user_id?: string | null
          name: string
          view_type?: string | null
          filters?: Json | null
          sort_by?: string | null
          sort_order?: string | null
          columns?: Json | null
          group_by?: string | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          user_id?: string | null
          name?: string
          view_type?: string | null
          filters?: Json | null
          sort_by?: string | null
          sort_order?: string | null
          columns?: Json | null
          group_by?: string | null
          is_default?: boolean | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      time_entries: {
        Row: {
          id: string
          work_item_id: string
          user_id: string
          description: string | null
          hours: number
          date: string
          is_billable: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          work_item_id: string
          user_id: string
          description?: string | null
          hours: number
          date: string
          is_billable?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          work_item_id?: string
          user_id?: string
          description?: string | null
          hours?: number
          date?: string
          is_billable?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          }
        ]
      }
      user_notification_settings: {
        Row: {
          id: string
          user_id: string
          enable_push: boolean
          notify_task_assignments: boolean
          notify_mentions: boolean
          notify_project_updates: boolean
          notify_deadlines: boolean
          notify_team_members: boolean
          notify_comments: boolean
          notify_status_changes: boolean
          enable_email: boolean
          email_digest_frequency: string
          enable_sound: boolean
          show_badges: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          enable_push?: boolean
          notify_task_assignments?: boolean
          notify_mentions?: boolean
          notify_project_updates?: boolean
          notify_deadlines?: boolean
          notify_team_members?: boolean
          notify_comments?: boolean
          notify_status_changes?: boolean
          enable_email?: boolean
          email_digest_frequency?: string
          enable_sound?: boolean
          show_badges?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          enable_push?: boolean
          notify_task_assignments?: boolean
          notify_mentions?: boolean
          notify_project_updates?: boolean
          notify_deadlines?: boolean
          notify_team_members?: boolean
          notify_comments?: boolean
          notify_status_changes?: boolean
          enable_email?: boolean
          email_digest_frequency?: string
          enable_sound?: boolean
          show_badges?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          status: string | null
          current_page: string | null
          current_entity_type: string | null
          current_entity_id: string | null
          last_seen_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          status?: string | null
          current_page?: string | null
          current_entity_type?: string | null
          current_entity_id?: string | null
          last_seen_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          status?: string | null
          current_page?: string | null
          current_entity_type?: string | null
          current_entity_id?: string | null
          last_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          timezone: string | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_item_dependencies: {
        Row: {
          id: string
          work_item_id: string
          depends_on_id: string
          dependency_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          work_item_id: string
          depends_on_id: string
          dependency_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          work_item_id?: string
          depends_on_id?: string
          dependency_type?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_item_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_dependencies_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          }
        ]
      }
      work_item_labels: {
        Row: {
          work_item_id: string
          label_id: string
          created_at: string | null
        }
        Insert: {
          work_item_id: string
          label_id: string
          created_at?: string | null
        }
        Update: {
          work_item_id?: string
          label_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_item_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_labels_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          }
        ]
      }
      work_items: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["work_item_type"] | null
          title: string
          description: string | null
          status: Database["public"]["Enums"]["work_item_status"] | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          assignee_id: string | null
          reporter_id: string | null
          due_date: string | null
          start_date: string | null
          completed_at: string | null
          estimate_hours: number | null
          actual_hours: number | null
          section: string | null
          blocked_reason: string | null
          blocked_by_id: string | null
          closure_note: string | null
          ai_context_sources: Json | null
          embedding: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          position: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["work_item_type"] | null
          title: string
          description?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          estimate_hours?: number | null
          actual_hours?: number | null
          section?: string | null
          blocked_reason?: string | null
          blocked_by_id?: string | null
          closure_note?: string | null
          ai_context_sources?: Json | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          position?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["work_item_type"] | null
          title?: string
          description?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          estimate_hours?: number | null
          actual_hours?: number | null
          section?: string | null
          blocked_reason?: string | null
          blocked_by_id?: string | null
          closure_note?: string | null
          ai_context_sources?: Json | null
          embedding?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_blocked_by_id_fkey"
            columns: ["blocked_by_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspace_invitations: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: string
          invited_by: string
          status: string
          token: string
          message: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role: string
          invited_by: string
          status?: string
          token?: string
          message?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: string
          invited_by?: string
          status?: string
          token?: string
          message?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: Database["public"]["Enums"]["member_role"] | null
          capacity_hours_per_week: number | null
          focus_hours_per_day: number | null
          timezone: string | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: Database["public"]["Enums"]["member_role"] | null
          capacity_hours_per_week?: number | null
          focus_hours_per_day?: number | null
          timezone?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["member_role"] | null
          capacity_hours_per_week?: number | null
          focus_hours_per_day?: number | null
          timezone?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspace_settings: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          avatar_url: string | null
          default_project_id: string | null
          default_task_status: string | null
          default_task_priority: string | null
          auto_archive_completed_tasks: boolean | null
          auto_archive_days: number | null
          enable_notifications: boolean | null
          notify_on_task_assignment: boolean | null
          notify_on_task_completion: boolean | null
          notify_on_mentions: boolean | null
          notify_on_comments: boolean | null
          notify_on_deadline_reminders: boolean | null
          deadline_reminder_hours: number | null
          allow_guest_access: boolean | null
          require_approval_for_guest_access: boolean | null
          allow_member_invite: boolean | null
          require_approval_for_member_invite: boolean | null
          enable_time_tracking: boolean | null
          require_time_tracking_notes: boolean | null
          allow_manual_time_entry: boolean | null
          default_view: string | null
          items_per_page: number | null
          show_completed_tasks: boolean | null
          show_archived_projects: boolean | null
          two_factor_required: boolean | null
          session_timeout_minutes: number | null
          ip_whitelist: string[] | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          avatar_url?: string | null
          default_project_id?: string | null
          default_task_status?: string | null
          default_task_priority?: string | null
          auto_archive_completed_tasks?: boolean | null
          auto_archive_days?: number | null
          enable_notifications?: boolean | null
          notify_on_task_assignment?: boolean | null
          notify_on_task_completion?: boolean | null
          notify_on_mentions?: boolean | null
          notify_on_comments?: boolean | null
          notify_on_deadline_reminders?: boolean | null
          deadline_reminder_hours?: number | null
          allow_guest_access?: boolean | null
          require_approval_for_guest_access?: boolean | null
          allow_member_invite?: boolean | null
          require_approval_for_member_invite?: boolean | null
          enable_time_tracking?: boolean | null
          require_time_tracking_notes?: boolean | null
          allow_manual_time_entry?: boolean | null
          default_view?: string | null
          items_per_page?: number | null
          show_completed_tasks?: boolean | null
          show_archived_projects?: boolean | null
          two_factor_required?: boolean | null
          session_timeout_minutes?: number | null
          ip_whitelist?: string[] | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          default_project_id?: string | null
          default_task_status?: string | null
          default_task_priority?: string | null
          auto_archive_completed_tasks?: boolean | null
          auto_archive_days?: number | null
          enable_notifications?: boolean | null
          notify_on_task_assignment?: boolean | null
          notify_on_task_completion?: boolean | null
          notify_on_mentions?: boolean | null
          notify_on_comments?: boolean | null
          notify_on_deadline_reminders?: boolean | null
          deadline_reminder_hours?: number | null
          allow_guest_access?: boolean | null
          require_approval_for_guest_access?: boolean | null
          allow_member_invite?: boolean | null
          require_approval_for_member_invite?: boolean | null
          enable_time_tracking?: boolean | null
          require_time_tracking_notes?: boolean | null
          allow_manual_time_entry?: boolean | null
          default_view?: string | null
          items_per_page?: number | null
          show_completed_tasks?: boolean | null
          show_archived_projects?: boolean | null
          two_factor_required?: boolean | null
          session_timeout_minutes?: number | null
          ip_whitelist?: string[] | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "foco_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          settings: Json | null
          ai_policy: Json | null
          created_at: string | null
          updated_at: string | null
          ai_policy_version: number
          ai_policy_updated_by: string | null
          ai_policy_updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          settings?: Json | null
          ai_policy?: Json | null
          created_at?: string | null
          updated_at?: string | null
          ai_policy_version?: number
          ai_policy_updated_by?: string | null
          ai_policy_updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          settings?: Json | null
          ai_policy?: Json | null
          created_at?: string | null
          updated_at?: string | null
          ai_policy_version?: number
          ai_policy_updated_by?: string | null
          ai_policy_updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      automation_action:
        | "assign"
        | "set_priority"
        | "set_due_date"
        | "create_follow_up"
        | "notify"
        | "move_status"
        | "request_approval"
        | "generate_report"
        | "add_label"
      automation_trigger:
        | "work_item_created"
        | "status_changed"
        | "due_date_approaching"
        | "blocked"
        | "comment_contains"
        | "schedule"
        | "assigned"
        | "priority_changed"
      invitation_status: "pending" | "accepted" | "cancelled" | "expired"
      member_role: "owner" | "admin" | "member" | "guest"
      notification_type:
        | "mention"
        | "assigned"
        | "status_change"
        | "comment"
        | "approval"
        | "ai_flag"
        | "due_soon"
        | "blocked"
      priority_level: "urgent" | "high" | "medium" | "low" | "none"
      work_item_status:
        | "backlog"
        | "next"
        | "in_progress"
        | "review"
        | "blocked"
        | "done"
      work_item_type: "task" | "bug" | "feature" | "milestone"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
