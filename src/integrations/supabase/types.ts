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
      display_heartbeat: {
        Row: {
          current_slide_index: number | null
          current_slide_url: string | null
          id: string
          last_seen: string
          updated_at: string
        }
        Insert: {
          current_slide_index?: number | null
          current_slide_url?: string | null
          id?: string
          last_seen?: string
          updated_at?: string
        }
        Update: {
          current_slide_index?: number | null
          current_slide_url?: string | null
          id?: string
          last_seen?: string
          updated_at?: string
        }
        Relationships: []
      }
      macros: {
        Row: {
          action_target_id: string | null
          action_type: string
          condition_type: string
          condition_value: string
          created_at: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          recurrence_interval_minutes: number | null
        }
        Insert: {
          action_target_id?: string | null
          action_type?: string
          condition_type?: string
          condition_value?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          recurrence_interval_minutes?: number | null
        }
        Update: {
          action_target_id?: string | null
          action_type?: string
          condition_type?: string
          condition_value?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          recurrence_interval_minutes?: number | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          play_mode: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          play_mode?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          play_mode?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          birthday_enabled: boolean
          birthday_sheet_url: string
          default_fallback_playlist_id: string | null
          display_offset_x: number
          display_offset_y: number
          display_scale: number
          global_object_fit: string
          id: string
          interrupted_playlist_id: string | null
          manual_override: boolean
          overlay_offset_x: number
          overlay_offset_y: number
          overlay_position: string
          overlay_size: number
          overlay_url: string
          single_image_active: boolean
          single_image_url: string
          sky_mode_duration_seconds: number
          sky_mode_enabled: boolean
          sky_mode_interval_minutes: number
          sky_mode_manual_trigger: number
          sky_mode_names_per_screen: number
          ticker_enabled: boolean
          ticker_font_size: number
          ticker_offset_y: number
          ticker_speed: number
          ticker_text: string
          transition_duration: number
          transition_type: string
          updated_at: string
        }
        Insert: {
          birthday_enabled?: boolean
          birthday_sheet_url?: string
          default_fallback_playlist_id?: string | null
          display_offset_x?: number
          display_offset_y?: number
          display_scale?: number
          global_object_fit?: string
          id?: string
          interrupted_playlist_id?: string | null
          manual_override?: boolean
          overlay_offset_x?: number
          overlay_offset_y?: number
          overlay_position?: string
          overlay_size?: number
          overlay_url?: string
          single_image_active?: boolean
          single_image_url?: string
          sky_mode_duration_seconds?: number
          sky_mode_enabled?: boolean
          sky_mode_interval_minutes?: number
          sky_mode_manual_trigger?: number
          sky_mode_names_per_screen?: number
          ticker_enabled?: boolean
          ticker_font_size?: number
          ticker_offset_y?: number
          ticker_speed?: number
          ticker_text?: string
          transition_duration?: number
          transition_type?: string
          updated_at?: string
        }
        Update: {
          birthday_enabled?: boolean
          birthday_sheet_url?: string
          default_fallback_playlist_id?: string | null
          display_offset_x?: number
          display_offset_y?: number
          display_scale?: number
          global_object_fit?: string
          id?: string
          interrupted_playlist_id?: string | null
          manual_override?: boolean
          overlay_offset_x?: number
          overlay_offset_y?: number
          overlay_position?: string
          overlay_size?: number
          overlay_url?: string
          single_image_active?: boolean
          single_image_url?: string
          sky_mode_duration_seconds?: number
          sky_mode_enabled?: boolean
          sky_mode_interval_minutes?: number
          sky_mode_manual_trigger?: number
          sky_mode_names_per_screen?: number
          ticker_enabled?: boolean
          ticker_font_size?: number
          ticker_offset_y?: number
          ticker_speed?: number
          ticker_text?: string
          transition_duration?: number
          transition_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      slides: {
        Row: {
          created_at: string
          duration: number
          id: string
          image_url: string
          media_type: string
          object_fit: string
          playlist_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          duration?: number
          id?: string
          image_url: string
          media_type?: string
          object_fit?: string
          playlist_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          image_url?: string
          media_type?: string
          object_fit?: string
          playlist_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "slides_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_active_playlist: { Args: { playlist_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
