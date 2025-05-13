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
      attendees: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          position: string | null
          unique_code: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          position?: string | null
          unique_code: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          position?: string | null
          unique_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          attendee_id: string
          event_day: number
          id: string
          timestamp: string
        }
        Insert: {
          attendee_id: string
          event_day?: number
          id?: string
          timestamp?: string
        }
        Update: {
          attendee_id?: string
          event_day?: number
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          attendee_id: string
          distributed_by: string | null
          event_day: number
          event_id: string | null
          id: string
          item_type: string
          timestamp: string
        }
        Insert: {
          attendee_id: string
          distributed_by?: string | null
          event_day?: number
          event_id?: string | null
          id?: string
          item_type: string
          timestamp?: string
        }
        Update: {
          attendee_id?: string
          distributed_by?: string | null
          event_day?: number
          event_id?: string | null
          id?: string
          item_type?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributions_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_activities: {
        Row: {
          activity_description: string | null
          activity_name: string
          created_at: string
          end_time: string | null
          event_id: string
          id: string
          location: string | null
          required_resources: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          activity_description?: string | null
          activity_name: string
          created_at?: string
          end_time?: string | null
          event_id: string
          id?: string
          location?: string | null
          required_resources?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          activity_description?: string | null
          activity_name?: string
          created_at?: string
          end_time?: string | null
          event_id?: string
          id?: string
          location?: string | null
          required_resources?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          event_day: number | null
          event_id: string
          id: string
          ticket_id: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_day?: number | null
          event_id: string
          id?: string
          ticket_id?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_day?: number | null
          event_id?: string
          id?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_check_ins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "event_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_financials: {
        Row: {
          bill_amount: number
          bill_category: string
          bill_date: string
          bill_description: string | null
          bill_name: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          bill_amount: number
          bill_category: string
          bill_date?: string
          bill_description?: string | null
          bill_name: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          bill_amount?: number
          bill_category?: string
          bill_date?: string
          bill_description?: string | null
          bill_name?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_financials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_path_items: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          path_id: string
          sequence_order: number
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          path_id: string
          sequence_order: number
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          path_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_path_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_path_items_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "event_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      event_paths: {
        Row: {
          created_at: string | null
          description: string
          id: string
          path_name: string
          skill_focus: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          path_name: string
          skill_focus: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          path_name?: string
          skill_focus?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      event_reminders: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_sent: boolean | null
          reminder_date: string
          reminder_description: string
          reminder_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_sent?: boolean | null
          reminder_date: string
          reminder_description: string
          reminder_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_sent?: boolean | null
          reminder_date?: string
          reminder_description?: string
          reminder_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_skills: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          skill_level: number
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          skill_level?: number
          skill_name: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          skill_level?: number
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_skills_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          created_at: string
          event_id: string
          id: string
          purchase_date: string
          quantity: number
          ticket_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          purchase_date?: string
          quantity?: number
          ticket_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          purchase_date?: string
          quantity?: number
          ticket_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          attendees: number | null
          category: string
          created_at: string
          date: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          keywords: string[] | null
          location: string
          loyalty_discount: number | null
          organizer: string
          price: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: number | null
          category: string
          created_at?: string
          date: string
          description?: string | null
          end_date?: string | null
          id: string
          image_url: string
          is_featured?: boolean | null
          keywords?: string[] | null
          location: string
          loyalty_discount?: number | null
          organizer: string
          price: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: number | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          keywords?: string[] | null
          location?: string
          loyalty_discount?: number | null
          organizer?: string
          price?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          event_id: string
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          event_id: string
          id: string
          is_read: boolean | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          is_read?: boolean | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          is_read?: boolean | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_event_interactions: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          interaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_interactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          category: string
          created_at: string | null
          id: string
          interest_level: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          interest_level?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          interest_level?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_event_to_path: {
        Args: {
          p_path_id: string
          p_event_id: string
          p_sequence_order: number
        }
        Returns: boolean
      }
      create_event_path: {
        Args: {
          p_user_id: string
          p_path_name: string
          p_description: string
          p_skill_focus: string[]
        }
        Returns: string
      }
      generate_unique_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_attendees: {
        Args: { event_id_param: string; increment_by: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
