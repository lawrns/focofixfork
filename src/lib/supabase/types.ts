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
          default_status: string | null
          settings: Json | null
          is_pinned: boolean | null
          archived_at: string | null
          created_at: string
          updated_at: string
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
          default_status?: string | null
          settings?: Json | null
          is_pinned?: boolean | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
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
          default_status?: string | null
          settings?: Json | null
          is_pinned?: boolean | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_items: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          type: string | null
          status: string
          priority: string
          assignee_id: string | null
          due_date: string | null
          blocked_reason: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          type?: string | null
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          blocked_reason?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          type?: string | null
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          blocked_reason?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      foco_project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
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
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string | null
          priority: string | null
          assignee_id: string | null
          created_by: string
          reporter_id: string | null
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          milestone_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: string | null
          priority?: string | null
          assignee_id?: string | null
          created_by?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          milestone_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: string | null
          priority?: string | null
          assignee_id?: string | null
          created_by?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          milestone_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website: string | null
          created_by: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          created_by?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          created_by?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          is_active: boolean | null
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          is_active?: boolean | null
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          is_active?: boolean | null
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string | null
          status: string | null
          priority: string | null
          color: string | null
          due_date: string | null
          start_date: string | null
          progress_percentage: number | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id?: string | null
          status?: string | null
          priority?: string | null
          color?: string | null
          due_date?: string | null
          start_date?: string | null
          progress_percentage?: number | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string | null
          status?: string | null
          priority?: string | null
          color?: string | null
          due_date?: string | null
          start_date?: string | null
          progress_percentage?: number | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          title: string
          message: string | null
          type: string | null
          data: Json | null
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          message?: string | null
          type?: string | null
          data?: Json | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          message?: string | null
          type?: string | null
          data?: Json | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          name: string
          original_name: string
          url: string
          mime_type: string | null
          size_bytes: number | null
          project_id: string | null
          milestone_id: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          original_name: string
          url: string
          mime_type?: string | null
          size_bytes?: number | null
          project_id?: string | null
          milestone_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          original_name?: string
          url?: string
          mime_type?: string | null
          size_bytes?: number | null
          project_id?: string | null
          milestone_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          content: string
          author_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          content: string
          author_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          content?: string
          author_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          action: string
          resource_type: string
          resource_id: string | null
          user_id: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          action: string
          resource_type: string
          resource_id?: string | null
          user_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          user_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          id: string
          project_id: string
          name: string
          title: string
          status: string
          deadline: string
          description: string | null
          due_date: string | null
          notes: string | null
          priority: string | null
          progress_percentage: number | null
          list_id: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          title?: string
          status?: string
          deadline: string
          description?: string | null
          due_date?: string | null
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          list_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          title?: string
          status?: string
          deadline?: string
          description?: string | null
          due_date?: string | null
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          list_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
