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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amc_responses: {
        Row: {
          amc_form_id: string
          amc_started: boolean | null
          amount: string | null
          antivirus_installed: boolean | null
          antivirus_name: string | null
          appointment_at: string | null
          appointment_notes: string | null
          appointment_status: string | null
          assigned_to: string | null
          backup_frequency: string | null
          city: string
          company_name: string | null
          consent_remote_access: boolean | null
          created_at: string | null
          current_performance: string | null
          customer_user_id: string | null
          daily_usage_hours: string | null
          department: string | null
          district: string
          downtime_tolerance: string | null
          email: string
          full_name: string
          issue_category: string | null
          languages_known: string
          last_service_date: string | null
          last_service_provider: string | null
          network_environment: string | null
          notes: string | null
          order_id: string | null
          payment_id: string | null
          payment_status: string | null
          performance_issues: string[] | null
          phone: string
          power_backup: boolean | null
          preferred_contact_method: string | null
          preferred_lang: string
          previous_service_history: string | null
          primary_usage_time: string | null
          problem_description: string | null
          purchase_date: string | null
          purchase_location: string | null
          regular_maintenance: string | null
          remote_software_preference: string
          remote_tool: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_work_description: string | null
          state: string
          status: string | null
          system_age_months: number | null
          system_criticality: string | null
          system_usage_purpose: string
          unsubscribed: boolean | null
          updated_at: string | null
          urgency_level: string | null
          usage_pattern: string | null
          user_role: string
          warranty_expiry_date: string | null
          warranty_status: string | null
        }
        Insert: {
          amc_form_id?: string
          amc_started?: boolean | null
          amount?: string | null
          antivirus_installed?: boolean | null
          antivirus_name?: string | null
          appointment_at?: string | null
          appointment_notes?: string | null
          appointment_status?: string | null
          assigned_to?: string | null
          backup_frequency?: string | null
          city: string
          company_name?: string | null
          consent_remote_access?: boolean | null
          created_at?: string | null
          current_performance?: string | null
          customer_user_id?: string | null
          daily_usage_hours?: string | null
          department?: string | null
          district: string
          downtime_tolerance?: string | null
          email: string
          full_name: string
          issue_category?: string | null
          languages_known: string
          last_service_date?: string | null
          last_service_provider?: string | null
          network_environment?: string | null
          notes?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          performance_issues?: string[] | null
          phone: string
          power_backup?: boolean | null
          preferred_contact_method?: string | null
          preferred_lang: string
          previous_service_history?: string | null
          primary_usage_time?: string | null
          problem_description?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          regular_maintenance?: string | null
          remote_software_preference: string
          remote_tool?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_work_description?: string | null
          state: string
          status?: string | null
          system_age_months?: number | null
          system_criticality?: string | null
          system_usage_purpose: string
          unsubscribed?: boolean | null
          updated_at?: string | null
          urgency_level?: string | null
          usage_pattern?: string | null
          user_role: string
          warranty_expiry_date?: string | null
          warranty_status?: string | null
        }
        Update: {
          amc_form_id?: string
          amc_started?: boolean | null
          amount?: string | null
          antivirus_installed?: boolean | null
          antivirus_name?: string | null
          appointment_at?: string | null
          appointment_notes?: string | null
          appointment_status?: string | null
          assigned_to?: string | null
          backup_frequency?: string | null
          city?: string
          company_name?: string | null
          consent_remote_access?: boolean | null
          created_at?: string | null
          current_performance?: string | null
          customer_user_id?: string | null
          daily_usage_hours?: string | null
          department?: string | null
          district?: string
          downtime_tolerance?: string | null
          email?: string
          full_name?: string
          issue_category?: string | null
          languages_known?: string
          last_service_date?: string | null
          last_service_provider?: string | null
          network_environment?: string | null
          notes?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          performance_issues?: string[] | null
          phone?: string
          power_backup?: boolean | null
          preferred_contact_method?: string | null
          preferred_lang?: string
          previous_service_history?: string | null
          primary_usage_time?: string | null
          problem_description?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          regular_maintenance?: string | null
          remote_software_preference?: string
          remote_tool?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_work_description?: string | null
          state?: string
          status?: string | null
          system_age_months?: number | null
          system_criticality?: string | null
          system_usage_purpose?: string
          unsubscribed?: boolean | null
          updated_at?: string | null
          urgency_level?: string | null
          usage_pattern?: string | null
          user_role?: string
          warranty_expiry_date?: string | null
          warranty_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amc_responses_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amc_systems: {
        Row: {
          amc_form_id: string
          created_at: string | null
          device_name: string | null
          device_type: string
          id: number
          mac_address_enc: string | null
          mac_address_hint: string | null
          mac_iv: string | null
          mac_tag: string | null
          operating_system: string | null
        }
        Insert: {
          amc_form_id: string
          created_at?: string | null
          device_name?: string | null
          device_type: string
          id?: number
          mac_address_enc?: string | null
          mac_address_hint?: string | null
          mac_iv?: string | null
          mac_tag?: string | null
          operating_system?: string | null
        }
        Update: {
          amc_form_id?: string
          created_at?: string | null
          device_name?: string | null
          device_type?: string
          id?: number
          mac_address_enc?: string | null
          mac_address_hint?: string | null
          mac_iv?: string | null
          mac_tag?: string | null
          operating_system?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amc_systems_amc_form_id_fkey"
            columns: ["amc_form_id"]
            isOneToOne: false
            referencedRelation: "amc_responses"
            referencedColumns: ["amc_form_id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          amc_order_id: string
          created_at: string | null
          customer_feedback: string | null
          id: string
          interaction_type: string
          internal_notes: string | null
          issues_resolved: string | null
          staff_id: string
          summary: string
        }
        Insert: {
          amc_order_id: string
          created_at?: string | null
          customer_feedback?: string | null
          id?: string
          interaction_type: string
          internal_notes?: string | null
          issues_resolved?: string | null
          staff_id: string
          summary: string
        }
        Update: {
          amc_order_id?: string
          created_at?: string | null
          customer_feedback?: string | null
          id?: string
          interaction_type?: string
          internal_notes?: string | null
          issues_resolved?: string | null
          staff_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_amc_order_id_fkey"
            columns: ["amc_order_id"]
            isOneToOne: false
            referencedRelation: "amc_responses"
            referencedColumns: ["amc_form_id"]
          },
          {
            foreignKeyName: "customer_interactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amc_order_id: string
          amount: number
          contract_url: string | null
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string
          invoice_url: string | null
          paid_at: string | null
          status: string | null
          updated_at: string | null
          validity_end: string | null
          validity_start: string | null
        }
        Insert: {
          amc_order_id: string
          amount: number
          contract_url?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Update: {
          amc_order_id?: string
          amount?: number
          contract_url?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_amc_order_id_fkey"
            columns: ["amc_order_id"]
            isOneToOne: false
            referencedRelation: "amc_responses"
            referencedColumns: ["amc_form_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          amc_order_id: string | null
          assigned_to: string | null
          created_at: string | null
          customer_user_id: string
          description: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          amc_order_id?: string | null
          assigned_to?: string | null
          created_at?: string | null
          customer_user_id: string
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          amc_order_id?: string | null
          assigned_to?: string | null
          created_at?: string | null
          customer_user_id?: string
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_amc_order_id_fkey"
            columns: ["amc_order_id"]
            isOneToOne: false
            referencedRelation: "amc_responses"
            referencedColumns: ["amc_form_id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          created_at: string | null
          description: string
          id: string
          images: string[] | null
          log_type: string | null
          worksheet_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          images?: string[] | null
          log_type?: string | null
          worksheet_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          images?: string[] | null
          log_type?: string | null
          worksheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_worksheet_id_fkey"
            columns: ["worksheet_id"]
            isOneToOne: false
            referencedRelation: "worksheets"
            referencedColumns: ["id"]
          },
        ]
      }
      worksheets: {
        Row: {
          amc_order_id: string
          created_at: string | null
          id: string
          issues_resolved: string | null
          staff_id: string
          status: string | null
          tasks_performed: string | null
          time_spent_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          amc_order_id: string
          created_at?: string | null
          id?: string
          issues_resolved?: string | null
          staff_id: string
          status?: string | null
          tasks_performed?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          amc_order_id?: string
          created_at?: string | null
          id?: string
          issues_resolved?: string | null
          staff_id?: string
          status?: string | null
          tasks_performed?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worksheets_amc_order_id_fkey"
            columns: ["amc_order_id"]
            isOneToOne: false
            referencedRelation: "amc_responses"
            referencedColumns: ["amc_form_id"]
          },
          {
            foreignKeyName: "worksheets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "technician" | "support" | "bookkeeping"
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
      app_role: ["admin", "technician", "support", "bookkeeping"],
    },
  },
} as const
