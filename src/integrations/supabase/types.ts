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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          acknowledged_at: string | null
          attachment_url: string | null
          body: string
          company_id: string
          created_at: string
          disable_replies: boolean
          expires_at: string | null
          group_id: string | null
          id: string
          is_broadcast: boolean
          message_type: string
          read_at: string | null
          receiver_id: string | null
          require_acknowledgement: boolean
          scheduled_at: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          attachment_url?: string | null
          body: string
          company_id: string
          created_at?: string
          disable_replies?: boolean
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_broadcast?: boolean
          message_type?: string
          read_at?: string | null
          receiver_id?: string | null
          require_acknowledgement?: boolean
          scheduled_at?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          attachment_url?: string | null
          body?: string
          company_id?: string
          created_at?: string
          disable_replies?: boolean
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_broadcast?: boolean
          message_type?: string
          read_at?: string | null
          receiver_id?: string | null
          require_acknowledgement?: boolean
          scheduled_at?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_id: string
          can_approve_leaves: boolean | null
          can_manage_payroll: boolean | null
          can_manage_settings: boolean | null
          can_reset_passwords: boolean | null
          can_view_chat_history: boolean | null
          company_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          can_approve_leaves?: boolean | null
          can_manage_payroll?: boolean | null
          can_manage_settings?: boolean | null
          can_reset_passwords?: boolean | null
          can_view_chat_history?: boolean | null
          company_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          can_approve_leaves?: boolean | null
          can_manage_payroll?: boolean | null
          can_manage_settings?: boolean | null
          can_reset_passwords?: boolean | null
          can_view_chat_history?: boolean | null
          company_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_chains: {
        Row: {
          approver_user_id: string
          company_id: string
          created_at: string
          id: string
          leave_type: string
          role_label: string
          step_order: number
        }
        Insert: {
          approver_user_id: string
          company_id: string
          created_at?: string
          id?: string
          leave_type?: string
          role_label: string
          step_order: number
        }
        Update: {
          approver_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          leave_type?: string
          role_label?: string
          step_order?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          date: string
          distance_m: number | null
          id: string
          latitude: number | null
          location_verified: boolean
          longitude: number | null
          notes: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          date?: string
          distance_m?: number | null
          id?: string
          latitude?: number | null
          location_verified?: boolean
          longitude?: number | null
          notes?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          date?: string
          distance_m?: number | null
          id?: string
          latitude?: number | null
          location_verified?: boolean
          longitude?: number | null
          notes?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          admin_notes: string | null
          company_id: string
          created_at: string | null
          date: string
          id: string
          original_attendance_id: string | null
          reason: string
          requested_check_in: string | null
          requested_check_out: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          company_id: string
          created_at?: string | null
          date: string
          id?: string
          original_attendance_id?: string | null
          reason: string
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          company_id?: string
          created_at?: string | null
          date?: string
          id?: string
          original_attendance_id?: string | null
          reason?: string
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_original_attendance_id_fkey"
            columns: ["original_attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          company_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          company_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          author_id: string
          body: string
          channel_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          body: string
          channel_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          body?: string
          channel_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          email: string | null
          employee_id_prefix: string | null
          id: string
          login_preference: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          address: string | null
          plan_type: string
          slug: string
          status: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_id_prefix?: string | null
          id?: string
          login_preference?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          address?: string | null
          plan_type?: string
          slug: string
          status?: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_id_prefix?: string | null
          id?: string
          login_preference?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          address?: string | null
          plan_type?: string
          slug?: string
          status?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_features: {
        Row: {
          birthdays_enabled: boolean
          chat_enabled: boolean
          company_id: string
          feature_visibility: Json | null
          helpdesk_enabled: boolean
          ip_whitelist_enabled: boolean
          kudos_enabled: boolean
          mock_gps_detection_enabled: boolean
          multi_level_approvals_enabled: boolean
          updated_at: string
        }
        Insert: {
          birthdays_enabled?: boolean
          chat_enabled?: boolean
          company_id: string
          feature_visibility?: Json | null
          helpdesk_enabled?: boolean
          ip_whitelist_enabled?: boolean
          kudos_enabled?: boolean
          mock_gps_detection_enabled?: boolean
          multi_level_approvals_enabled?: boolean
          updated_at?: string
        }
        Update: {
          birthdays_enabled?: boolean
          chat_enabled?: boolean
          company_id?: string
          feature_visibility?: Json | null
          helpdesk_enabled?: boolean
          ip_whitelist_enabled?: boolean
          kudos_enabled?: boolean
          mock_gps_detection_enabled?: boolean
          multi_level_approvals_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          annual_leave_quota: number
          casual_leave_quota: number
          company_id: string
          company_name: string
          face_recognition_sensitivity: number
          geofence_radius_m: number
          late_threshold_minutes: number
          leave_approval_sla_hours: number
          office_latitude: number
          office_longitude: number
          sick_leave_quota: number
          updated_at: string
          work_end_time: string
          work_start_time: string
        }
        Insert: {
          annual_leave_quota?: number
          casual_leave_quota?: number
          company_id: string
          company_name?: string
          face_recognition_sensitivity?: number
          geofence_radius_m?: number
          late_threshold_minutes?: number
          leave_approval_sla_hours?: number
          office_latitude?: number
          office_longitude?: number
          sick_leave_quota?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Update: {
          annual_leave_quota?: number
          casual_leave_quota?: number
          company_id?: string
          company_name?: string
          face_recognition_sensitivity?: number
          geofence_radius_m?: number
          late_threshold_minutes?: number
          leave_approval_sla_hours?: number
          office_latitude?: number
          office_longitude?: number
          sick_leave_quota?: number
          updated_at?: string
          work_end_time?: string
          work_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          employee_id: string
          file_name: string
          id: string
          notes: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type?: string
          employee_id: string
          file_name: string
          id?: string
          notes?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          employee_id?: string
          file_name?: string
          id?: string
          notes?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      helpdesk_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      helpdesk_comments: {
        Row: {
          author_id: string
          body: string
          company_id: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          company_id: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          company_id?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: []
      }
      helpdesk_tickets: {
        Row: {
          assignee_id: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          due_at: string
          id: string
          priority: string
          resolved_at: string | null
          sla_hours: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_hours?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_hours?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kudos: {
        Row: {
          badge: string | null
          company_id: string
          created_at: string
          from_user: string
          id: string
          message: string
          to_user: string
        }
        Insert: {
          badge?: string | null
          company_id: string
          created_at?: string
          from_user: string
          id?: string
          message: string
          to_user: string
        }
        Update: {
          badge?: string | null
          company_id?: string
          created_at?: string
          from_user?: string
          id?: string
          message?: string
          to_user?: string
        }
        Relationships: []
      }
      leave_approval_steps: {
        Row: {
          approver_user_id: string
          company_id: string
          created_at: string
          decided_at: string | null
          id: string
          leave_request_id: string
          notes: string | null
          role_label: string
          status: string
          step_order: number
        }
        Insert: {
          approver_user_id: string
          company_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_request_id: string
          notes?: string | null
          role_label: string
          status?: string
          step_order: number
        }
        Update: {
          approver_user_id?: string
          company_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_request_id?: string
          notes?: string | null
          role_label?: string
          status?: string
          step_order?: number
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          admin_notes: string | null
          company_id: string
          created_at: string
          days: number
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          company_id: string
          created_at?: string
          days: number
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          company_id?: string
          created_at?: string
          days?: number
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_target_history: {
        Row: {
          bank: string
          changed_at: string
          changed_by: string
          company_id: string
          field: string
          id: string
          loan_target_id: string
          month: string
          new_value: number | null
          old_value: number | null
          user_id: string
        }
        Insert: {
          bank: string
          changed_at?: string
          changed_by: string
          company_id: string
          field: string
          id?: string
          loan_target_id: string
          month: string
          new_value?: number | null
          old_value?: number | null
          user_id: string
        }
        Update: {
          bank?: string
          changed_at?: string
          changed_by?: string
          company_id?: string
          field?: string
          id?: string
          loan_target_id?: string
          month?: string
          new_value?: number | null
          old_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      loan_targets: {
        Row: {
          achieved: number
          bank: string
          company_id: string
          created_at: string
          id: string
          month: string
          notes: string | null
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved?: number
          bank: string
          company_id: string
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved?: number
          bank?: string
          company_id?: string
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_audit: {
        Row: {
          admin_id: string
          company_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          success: boolean
          target_email: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          company_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          success?: boolean
          target_email: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          company_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          success?: boolean
          target_email?: string
          target_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          company_id: string
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          emergency_contact: string | null
          employee_internal_id: string | null
          failed_login_count: number
          force_logout_at: string | null
          force_password_change: boolean
          full_name: string
          id: string
          id_card_url: string | null
          is_active: boolean
          job_title: string | null
          last_login_at: string | null
          last_login_device: string | null
          locked_until: string | null
          phone: string | null
          profile_frozen: boolean
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          emergency_contact?: string | null
          employee_internal_id?: string | null
          failed_login_count?: number
          force_logout_at?: string | null
          force_password_change?: boolean
          full_name: string
          id: string
          id_card_url?: string | null
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          last_login_device?: string | null
          locked_until?: string | null
          phone?: string | null
          profile_frozen?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          emergency_contact?: string | null
          employee_internal_id?: string | null
          failed_login_count?: number
          force_logout_at?: string | null
          force_password_change?: boolean
          full_name?: string
          id?: string
          id_card_url?: string | null
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          last_login_device?: string | null
          locked_until?: string | null
          phone?: string | null
          profile_frozen?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_target: boolean
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress_count: number
          status: Database["public"]["Enums"]["task_status"]
          target_count: number | null
          target_month: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_target?: boolean
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress_count?: number
          status?: Database["public"]["Enums"]["task_status"]
          target_count?: number | null
          target_month?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_target?: boolean
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress_count?: number
          status?: Database["public"]["Enums"]["task_status"]
          target_count?: number | null
          target_month?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_channel_member: {
        Args: { _channel: string; _user: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_company: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected" | "suspended"
      app_role: "admin" | "employee" | "super_admin"
      attendance_status: "present" | "late" | "absent"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "casual" | "sick" | "annual" | "unpaid"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed"
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
      account_status: ["pending", "approved", "rejected", "suspended"],
      app_role: ["admin", "employee", "super_admin"],
      attendance_status: ["present", "late", "absent"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["casual", "sick", "annual", "unpaid"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
