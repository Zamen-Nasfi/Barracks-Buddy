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
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          notes: string | null
          personnel_id: string
          record_date: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          personnel_id: string
          record_date: string
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          personnel_id?: string
          record_date?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          code: string
          created_at: string
          floors: number
          id: string
          is_active: boolean
          is_demo: boolean
          name_ar: string
          name_en: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          floors?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name_ar: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          floors?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          is_demo: boolean
          is_protected: boolean
          is_public: boolean
          mime_type: string | null
          personnel_id: string | null
          size_bytes: number | null
          storage_bucket: string | null
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_demo?: boolean
          is_protected?: boolean
          is_public?: boolean
          mime_type?: string | null
          personnel_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_demo?: boolean
          is_protected?: boolean
          is_public?: boolean
          mime_type?: string | null
          personnel_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          location: string | null
          min_quantity: number
          name_ar: string
          name_en: string | null
          notes: string | null
          quantity: number
          sku: string
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string | null
          min_quantity?: number
          name_ar: string
          name_en?: string | null
          notes?: string | null
          quantity?: number
          sku: string
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string | null
          min_quantity?: number
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          quantity?: number
          sku?: string
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reference: string | null
          tx_type: Database["public"]["Enums"]["inventory_tx_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reference?: string | null
          tx_type: Database["public"]["Enums"]["inventory_tx_type"]
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reference?: string | null
          tx_type?: Database["public"]["Enums"]["inventory_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          personnel_id: string
          reason: string | null
          requested_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          personnel_id: string
          reason?: string | null
          requested_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          personnel_id?: string
          reason?: string | null
          requested_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          building_id: string | null
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          location_text: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          reported_at: string
          requested_by: string | null
          resolved_at: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          building_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          location_text?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          reported_at?: string
          requested_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          building_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          location_text?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          reported_at?: string
          requested_by?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_consumption: {
        Row: {
          id: string
          meal_plan_id: string
          personnel_id: string | null
          recorded_at: string
          recorded_by: string | null
          served_count: number
          unit_id: string | null
        }
        Insert: {
          id?: string
          meal_plan_id: string
          personnel_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          served_count?: number
          unit_id?: string | null
        }
        Update: {
          id?: string
          meal_plan_id?: string
          personnel_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          served_count?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_consumption_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_consumption_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_consumption_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          meal_type: Database["public"]["Enums"]["meal_type"]
          menu_description: string | null
          plan_date: string
          planned_count: number
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          meal_type: Database["public"]["Enums"]["meal_type"]
          menu_description?: string | null
          plan_date: string
          planned_count?: number
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          meal_type?: Database["public"]["Enums"]["meal_type"]
          menu_description?: string | null
          plan_date?: string
          planned_count?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          id: string
          module: string
          name_ar: string
          name_en: string
          name_fr: string | null
        }
        Insert: {
          code: string
          id?: string
          module: string
          name_ar: string
          name_en: string
          name_fr?: string | null
        }
        Update: {
          code?: string
          id?: string
          module?: string
          name_ar?: string
          name_en?: string
          name_fr?: string | null
        }
        Relationships: []
      }
      personnel: {
        Row: {
          address: string | null
          archived_at: string | null
          blood_type: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          enlistment_date: string | null
          father_name: string | null
          first_name: string
          id: string
          is_demo: boolean
          last_name: string
          notes: string | null
          personnel_number: string
          phone: string | null
          rank: string
          status: Database["public"]["Enums"]["personnel_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          enlistment_date?: string | null
          father_name?: string | null
          first_name: string
          id?: string
          is_demo?: boolean
          last_name: string
          notes?: string | null
          personnel_number: string
          phone?: string | null
          rank: string
          status?: Database["public"]["Enums"]["personnel_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          blood_type?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          enlistment_date?: string | null
          father_name?: string | null
          first_name?: string
          id?: string
          is_demo?: boolean
          last_name?: string
          notes?: string | null
          personnel_number?: string
          phone?: string | null
          rank?: string
          status?: Database["public"]["Enums"]["personnel_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name_ar: string
          name_en: string
          name_fr: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar: string
          name_en: string
          name_fr?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar?: string
          name_en?: string
          name_fr?: string | null
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          personnel_id: string
          room_id: string
          started_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          personnel_id: string
          room_id: string
          started_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          personnel_id?: string
          room_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building_id: string
          capacity: number
          created_at: string
          floor: number
          id: string
          is_active: boolean
          notes: string | null
          room_number: string
          room_type: string
          updated_at: string
        }
        Insert: {
          building_id: string
          capacity: number
          created_at?: string
          floor?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          room_number: string
          room_type?: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          room_number?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          commander_personnel_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_demo: boolean
          location: string | null
          name_ar: string
          name_en: string | null
          name_fr: string | null
          notes: string | null
          parent_id: string | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          code: string
          commander_personnel_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string | null
          name_ar: string
          name_en?: string | null
          name_fr?: string | null
          notes?: string | null
          parent_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          commander_personnel_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string | null
          name_ar?: string
          name_en?: string | null
          name_fr?: string | null
          notes?: string | null
          parent_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_commander_personnel_id_fkey"
            columns: ["commander_personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
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
      bootstrap_profile: { Args: never; Returns: undefined }
      dashboard_stats: { Args: never; Returns: Json }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _meta?: Json
          _new?: Json
          _old?: Json
        }
        Returns: undefined
      }
      my_permissions: { Args: never; Returns: string[] }
      system_bootstrapped: { Args: never; Returns: boolean }
    }
    Enums: {
      attendance_status:
        | "PRESENT"
        | "ABSENT"
        | "LATE"
        | "ON_LEAVE"
        | "MISSION"
        | "SICK"
      inventory_tx_type: "IN" | "OUT" | "ADJUSTMENT"
      leave_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
      leave_type: "ANNUAL" | "SICK" | "EMERGENCY" | "SPECIAL"
      maintenance_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      maintenance_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "CLOSED"
        | "REJECTED"
      meal_type: "BREAKFAST" | "LUNCH" | "DINNER"
      personnel_status:
        | "ACTIVE"
        | "ON_LEAVE"
        | "TRANSFERRED"
        | "RETIRED"
        | "ARCHIVED"
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
      attendance_status: [
        "PRESENT",
        "ABSENT",
        "LATE",
        "ON_LEAVE",
        "MISSION",
        "SICK",
      ],
      inventory_tx_type: ["IN", "OUT", "ADJUSTMENT"],
      leave_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      leave_type: ["ANNUAL", "SICK", "EMERGENCY", "SPECIAL"],
      maintenance_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      maintenance_status: [
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
      ],
      meal_type: ["BREAKFAST", "LUNCH", "DINNER"],
      personnel_status: [
        "ACTIVE",
        "ON_LEAVE",
        "TRANSFERRED",
        "RETIRED",
        "ARCHIVED",
      ],
    },
  },
} as const