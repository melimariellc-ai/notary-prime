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
      appointment_drafts: {
        Row: {
          address: string | null
          ai_error: string | null
          ai_summary: string | null
          appointment_id: string | null
          contact_id: string | null
          created_at: string
          email: string | null
          found_fields: string[]
          from_email: string
          from_name: string | null
          id: string
          inbound_email_id: string | null
          meeting_type: string | null
          name: string | null
          notes: string | null
          phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          raw_body: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_error?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          found_fields?: string[]
          from_email: string
          from_name?: string | null
          id?: string
          inbound_email_id?: string | null
          meeting_type?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          raw_body?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_error?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          found_fields?: string[]
          from_email?: string
          from_name?: string | null
          id?: string
          inbound_email_id?: string | null
          meeting_type?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          raw_body?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_drafts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_drafts_inbound_email_id_fkey"
            columns: ["inbound_email_id"]
            isOneToOne: false
            referencedRelation: "inbound_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          address: string | null
          assigned_notary_id: string | null
          created_at: string
          email: string
          fee_amount: number | null
          id: string
          meeting_type: string
          name: string
          notes: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          referred_by: string | null
          service: string
          sms_dismissed_at: string | null
          sms_dismissed_by: string | null
          sms_error: string | null
          sms_sent_at: string | null
          sms_status: string
          submitted_at: string
        }
        Insert: {
          address?: string | null
          assigned_notary_id?: string | null
          created_at?: string
          email: string
          fee_amount?: number | null
          id?: string
          meeting_type: string
          name: string
          notes?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          referred_by?: string | null
          service: string
          sms_dismissed_at?: string | null
          sms_dismissed_by?: string | null
          sms_error?: string | null
          sms_sent_at?: string | null
          sms_status?: string
          submitted_at?: string
        }
        Update: {
          address?: string | null
          assigned_notary_id?: string | null
          created_at?: string
          email?: string
          fee_amount?: number | null
          id?: string
          meeting_type?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          referred_by?: string | null
          service?: string
          sms_dismissed_at?: string | null
          sms_dismissed_by?: string | null
          sms_error?: string | null
          sms_sent_at?: string | null
          sms_status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          address: string | null
          assigned_notary_id: string | null
          created_at: string
          email: string
          id: string
          meeting_type: string
          name: string
          notes: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service: string
        }
        Insert: {
          address?: string | null
          assigned_notary_id?: string | null
          created_at?: string
          email: string
          id?: string
          meeting_type: string
          name: string
          notes?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          service: string
        }
        Update: {
          address?: string | null
          assigned_notary_id?: string | null
          created_at?: string
          email?: string
          id?: string
          meeting_type?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          service?: string
        }
        Relationships: []
      }
      business_contacts: {
        Row: {
          business_name: string
          contact_person: string | null
          contact_type: string
          created_at: string
          custom_fields: Json
          email: string | null
          first_contacted_date: string | null
          id: string
          next_follow_up_date: string | null
          phone: string | null
          pipeline_stage: string
          referral_rate: number | null
          referral_rate_type: string | null
          referral_source: string | null
          updated_at: string
        }
        Insert: {
          business_name: string
          contact_person?: string | null
          contact_type?: string
          created_at?: string
          custom_fields?: Json
          email?: string | null
          first_contacted_date?: string | null
          id?: string
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string
          referral_rate?: number | null
          referral_rate_type?: string | null
          referral_source?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          contact_person?: string | null
          contact_type?: string
          created_at?: string
          custom_fields?: Json
          email?: string | null
          first_contacted_date?: string | null
          id?: string
          next_follow_up_date?: string | null
          phone?: string | null
          pipeline_stage?: string
          referral_rate?: number | null
          referral_rate_type?: string | null
          referral_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_profile: {
        Row: {
          ai_chat_widget_enabled: boolean
          business_name: string
          created_at: string
          default_referral_rate: number
          default_referral_rate_type: string
          email: string
          eo_insured_amount: string
          id: number
          is_bonded: boolean
          is_nna_certified: boolean
          is_texas_commissioned: boolean
          phone: string
          readiness_check_hours: number
          service_area: string
          service_pricing: Json
          updated_at: string
        }
        Insert: {
          ai_chat_widget_enabled?: boolean
          business_name?: string
          created_at?: string
          default_referral_rate?: number
          default_referral_rate_type?: string
          email?: string
          eo_insured_amount?: string
          id?: number
          is_bonded?: boolean
          is_nna_certified?: boolean
          is_texas_commissioned?: boolean
          phone?: string
          readiness_check_hours?: number
          service_area?: string
          service_pricing?: Json
          updated_at?: string
        }
        Update: {
          ai_chat_widget_enabled?: boolean
          business_name?: string
          created_at?: string
          default_referral_rate?: number
          default_referral_rate_type?: string
          email?: string
          eo_insured_amount?: string
          id?: number
          is_bonded?: boolean
          is_nna_certified?: boolean
          is_texas_commissioned?: boolean
          phone?: string
          readiness_check_hours?: number
          service_area?: string
          service_pricing?: Json
          updated_at?: string
        }
        Relationships: []
      }
      contact_activities: {
        Row: {
          activity_date: string
          activity_type: Database["public"]["Enums"]["bd_activity_type"]
          contact_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["bd_activity_type"]
          contact_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: Database["public"]["Enums"]["bd_activity_type"]
          contact_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_field_defs: {
        Row: {
          created_at: string
          field_key: string
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          is_active: boolean
          label: string
          options: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_active?: boolean
          label: string
          options?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_active?: boolean
          label?: string
          options?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_options: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          description: string
          id: string
          name: string
          placeholders: string[]
          sort_order: number
          subject: string
          template_key: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          placeholders?: string[]
          sort_order?: number
          subject?: string
          template_key: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          placeholders?: string[]
          sort_order?: number
          subject?: string
          template_key?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      inbound_emails: {
        Row: {
          contact_id: string | null
          created_at: string
          from_email: string
          from_name: string | null
          html_body: string | null
          id: string
          message_id: string | null
          received_at: string
          resend_email_id: string
          subject: string | null
          text_body: string | null
          to_emails: string[]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          from_email: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          message_id?: string | null
          received_at?: string
          resend_email_id: string
          subject?: string | null
          text_body?: string | null
          to_emails?: string[]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          from_email?: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          message_id?: string | null
          received_at?: string
          resend_email_id?: string
          subject?: string | null
          text_body?: string | null
          to_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_digest: boolean
          forward_replies: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest?: boolean
          forward_replies?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest?: boolean
          forward_replies?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email: string
          id: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quote_status_events: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          quote_id: string
          source: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          quote_id: string
          source?: string
          status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          quote_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          hosted_invoice_url: string | null
          id: string
          line_items: Json
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          subtotal: number
          total: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          hosted_invoice_url?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          hosted_invoice_url?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_checks: {
        Row: {
          appointment_id: string
          channel: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          replied_at: string | null
          reply_text: string | null
          sent_at: string | null
          status: string
          to_address: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          channel: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          replied_at?: string | null
          reply_text?: string | null
          sent_at?: string | null
          status?: string
          to_address: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          replied_at?: string | null
          reply_text?: string | null
          sent_at?: string | null
          status?: string
          to_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_checks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_checks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_chat_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_path?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          user_id?: string
        }
        Relationships: []
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_similar_contacts: {
        Args: { _names: string[]; _phones: string[]; _threshold?: number }
        Returns: {
          business_name: string
          id: string
          input_index: number
          name_score: number
          phone: string
          phone_score: number
          reason: string
        }[]
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_business_name: { Args: { _name: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      admin_permission:
        | "can_archive_users"
        | "can_deactivate_users"
        | "can_grant_permissions"
      app_role: "notary" | "admin" | "employee"
      bd_activity_type: "Call" | "Email" | "Meeting" | "Note"
      bd_contact_type:
        | "Title Company"
        | "Real Estate Agent"
        | "Attorney"
        | "Other Referral Source"
        | "Mortgage Lender/Loan Officer"
        | "Signing Service"
        | "Senior Living/Care Facility"
        | "Financial Advisor"
        | "Property Management Company"
        | "HR/Employer"
        | "Hospital"
        | "Hospice/Home Health Care Agency"
        | "Funeral Home"
        | "Immigration Services"
      bd_pipeline_stage:
        | "New Lead"
        | "Contacted"
        | "Meeting Scheduled"
        | "Active Referral Source"
        | "Inactive"
      custom_field_type: "text" | "number" | "date" | "dropdown"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admin_permission: [
        "can_archive_users",
        "can_deactivate_users",
        "can_grant_permissions",
      ],
      app_role: ["notary", "admin", "employee"],
      bd_activity_type: ["Call", "Email", "Meeting", "Note"],
      bd_contact_type: [
        "Title Company",
        "Real Estate Agent",
        "Attorney",
        "Other Referral Source",
        "Mortgage Lender/Loan Officer",
        "Signing Service",
        "Senior Living/Care Facility",
        "Financial Advisor",
        "Property Management Company",
        "HR/Employer",
        "Hospital",
        "Hospice/Home Health Care Agency",
        "Funeral Home",
        "Immigration Services",
      ],
      bd_pipeline_stage: [
        "New Lead",
        "Contacted",
        "Meeting Scheduled",
        "Active Referral Source",
        "Inactive",
      ],
      custom_field_type: ["text", "number", "date", "dropdown"],
    },
  },
} as const
