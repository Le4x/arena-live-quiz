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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      buzzer_attempts: {
        Row: {
          buzzed_at: string | null
          game_session_id: string | null
          id: string
          is_first: boolean | null
          question_id: string | null
          question_instance_id: string | null
          team_id: string | null
        }
        Insert: {
          buzzed_at?: string | null
          game_session_id?: string | null
          id?: string
          is_first?: boolean | null
          question_id?: string | null
          question_instance_id?: string | null
          team_id?: string | null
        }
        Update: {
          buzzed_at?: string | null
          game_session_id?: string | null
          id?: string
          is_first?: boolean | null
          question_id?: string | null
          question_instance_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buzzer_attempts_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzer_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzer_attempts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string | null
          current_round_index: number | null
          ended_at: string | null
          id: string
          name: string
          selected_rounds: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_round_index?: number | null
          ended_at?: string | null
          id?: string
          name: string
          selected_rounds?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_round_index?: number | null
          ended_at?: string | null
          id?: string
          name?: string
          selected_rounds?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      game_state: {
        Row: {
          announcement_text: string | null
          answer_result: string | null
          current_question_id: string | null
          current_question_instance_id: string | null
          current_round_id: string | null
          current_round_intro: string | null
          excluded_teams: Json | null
          game_session_id: string | null
          id: string
          is_buzzer_active: boolean | null
          leaderboard_page: number | null
          show_ambient_screen: boolean | null
          show_leaderboard: boolean | null
          show_pause_screen: boolean | null
          show_round_intro: boolean | null
          timer_active: boolean | null
          timer_remaining: number | null
          updated_at: string | null
        }
        Insert: {
          announcement_text?: string | null
          answer_result?: string | null
          current_question_id?: string | null
          current_question_instance_id?: string | null
          current_round_id?: string | null
          current_round_intro?: string | null
          excluded_teams?: Json | null
          game_session_id?: string | null
          id?: string
          is_buzzer_active?: boolean | null
          leaderboard_page?: number | null
          show_ambient_screen?: boolean | null
          show_leaderboard?: boolean | null
          show_pause_screen?: boolean | null
          show_round_intro?: boolean | null
          timer_active?: boolean | null
          timer_remaining?: number | null
          updated_at?: string | null
        }
        Update: {
          announcement_text?: string | null
          answer_result?: string | null
          current_question_id?: string | null
          current_question_instance_id?: string | null
          current_round_id?: string | null
          current_round_intro?: string | null
          excluded_teams?: Json | null
          game_session_id?: string | null
          id?: string
          is_buzzer_active?: boolean | null
          leaderboard_page?: number | null
          show_ambient_screen?: boolean | null
          show_leaderboard?: boolean | null
          show_pause_screen?: boolean | null
          show_round_intro?: boolean | null
          timer_active?: boolean | null
          timer_remaining?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_state_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_current_round_id_fkey"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_current_round_intro_fkey"
            columns: ["current_round_intro"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_state_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          audio_url: string | null
          correct_answer: string | null
          created_at: string | null
          cue_points: Json | null
          display_order: number | null
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: string
          round_id: string | null
        }
        Insert: {
          audio_url?: string | null
          correct_answer?: string | null
          created_at?: string | null
          cue_points?: Json | null
          display_order?: number | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type: string
          round_id?: string | null
        }
        Update: {
          audio_url?: string | null
          correct_answer?: string | null
          created_at?: string | null
          cue_points?: Json | null
          display_order?: number | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: string
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string | null
          id: string
          jingle_url: string | null
          status: string | null
          timer_duration: number | null
          timer_started_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          jingle_url?: string | null
          status?: string | null
          timer_duration?: number | null
          timer_started_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          jingle_url?: string | null
          status?: string | null
          timer_duration?: number | null
          timer_started_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      team_answers: {
        Row: {
          answer: string
          answered_at: string | null
          game_session_id: string | null
          id: string
          is_correct: boolean | null
          points_awarded: number | null
          question_id: string | null
          question_instance_id: string | null
          team_id: string | null
        }
        Insert: {
          answer: string
          answered_at?: string | null
          game_session_id?: string | null
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id?: string | null
          question_instance_id?: string | null
          team_id?: string | null
        }
        Update: {
          answer?: string
          answered_at?: string | null
          game_session_id?: string | null
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id?: string | null
          question_instance_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_answers_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_answers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar: string | null
          color: string
          connected_device_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          score: number | null
        }
        Insert: {
          avatar?: string | null
          color: string
          connected_device_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          score?: number | null
        }
        Update: {
          avatar?: string | null
          color?: string
          connected_device_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          score?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_game_session: { Args: { session_id: string }; Returns: undefined }
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
