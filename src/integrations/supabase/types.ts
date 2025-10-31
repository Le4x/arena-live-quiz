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
            referencedRelation: "public_questions"
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
      final_jokers: {
        Row: {
          created_at: string | null
          final_id: string
          id: string
          joker_type_id: string
          quantity: number | null
          team_id: string
          used_count: number | null
        }
        Insert: {
          created_at?: string | null
          final_id: string
          id?: string
          joker_type_id: string
          quantity?: number | null
          team_id: string
          used_count?: number | null
        }
        Update: {
          created_at?: string | null
          final_id?: string
          id?: string
          joker_type_id?: string
          quantity?: number | null
          team_id?: string
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "final_jokers_final_id_fkey"
            columns: ["final_id"]
            isOneToOne: false
            referencedRelation: "finals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_jokers_joker_type_id_fkey"
            columns: ["joker_type_id"]
            isOneToOne: false
            referencedRelation: "joker_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_jokers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      finals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          finalist_teams: Json | null
          game_session_id: string
          id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          finalist_teams?: Json | null
          game_session_id: string
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          finalist_teams?: Json | null
          game_session_id?: string
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finals_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string | null
          current_round_index: number | null
          ended_at: string | null
          has_final: boolean | null
          id: string
          logo_url: string | null
          name: string
          selected_rounds: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          current_round_index?: number | null
          ended_at?: string | null
          has_final?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          selected_rounds?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          current_round_index?: number | null
          ended_at?: string | null
          has_final?: boolean | null
          id?: string
          logo_url?: string | null
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
          final_id: string | null
          final_mode: boolean | null
          game_session_id: string | null
          id: string
          is_buzzer_active: boolean | null
          leaderboard_page: number | null
          show_ambient_screen: boolean | null
          show_answer: boolean | null
          show_leaderboard: boolean | null
          show_pause_screen: boolean | null
          show_round_intro: boolean | null
          show_sponsors_screen: boolean | null
          show_team_connection_screen: boolean | null
          show_thanks_screen: boolean | null
          show_waiting_screen: boolean | null
          show_welcome_screen: boolean | null
          timer_active: boolean | null
          timer_duration: number | null
          timer_remaining: number | null
          timer_started_at: string | null
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
          final_id?: string | null
          final_mode?: boolean | null
          game_session_id?: string | null
          id?: string
          is_buzzer_active?: boolean | null
          leaderboard_page?: number | null
          show_ambient_screen?: boolean | null
          show_answer?: boolean | null
          show_leaderboard?: boolean | null
          show_pause_screen?: boolean | null
          show_round_intro?: boolean | null
          show_sponsors_screen?: boolean | null
          show_team_connection_screen?: boolean | null
          show_thanks_screen?: boolean | null
          show_waiting_screen?: boolean | null
          show_welcome_screen?: boolean | null
          timer_active?: boolean | null
          timer_duration?: number | null
          timer_remaining?: number | null
          timer_started_at?: string | null
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
          final_id?: string | null
          final_mode?: boolean | null
          game_session_id?: string | null
          id?: string
          is_buzzer_active?: boolean | null
          leaderboard_page?: number | null
          show_ambient_screen?: boolean | null
          show_answer?: boolean | null
          show_leaderboard?: boolean | null
          show_pause_screen?: boolean | null
          show_round_intro?: boolean | null
          show_sponsors_screen?: boolean | null
          show_team_connection_screen?: boolean | null
          show_thanks_screen?: boolean | null
          show_waiting_screen?: boolean | null
          show_welcome_screen?: boolean | null
          timer_active?: boolean | null
          timer_duration?: number | null
          timer_remaining?: number | null
          timer_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_state_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "public_questions"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "game_state_final_id_fkey"
            columns: ["final_id"]
            isOneToOne: false
            referencedRelation: "finals"
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
      help_requests: {
        Row: {
          created_at: string | null
          game_session_id: string | null
          id: string
          message: string | null
          resolved_at: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          game_session_id?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          game_session_id?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      joker_types: {
        Row: {
          created_at: string | null
          description: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      public_votes: {
        Row: {
          created_at: string | null
          final_id: string
          id: string
          question_instance_id: string
          voted_answer: string
          voter_team_id: string
        }
        Insert: {
          created_at?: string | null
          final_id: string
          id?: string
          question_instance_id: string
          voted_answer: string
          voter_team_id: string
        }
        Update: {
          created_at?: string | null
          final_id?: string
          id?: string
          question_instance_id?: string
          voted_answer?: string
          voter_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_votes_final_id_fkey"
            columns: ["final_id"]
            isOneToOne: false
            referencedRelation: "finals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_votes_question_instance_id_fkey"
            columns: ["question_instance_id"]
            isOneToOne: false
            referencedRelation: "question_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_votes_voter_team_id_fkey"
            columns: ["voter_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      question_instances: {
        Row: {
          created_at: string
          ended_at: string | null
          game_session_id: string
          id: string
          question_id: string
          started_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          game_session_id: string
          id?: string
          question_id: string
          started_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          game_session_id?: string
          id?: string
          question_id?: string
          started_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          audio_url: string | null
          correct_answer: string | null
          created_at: string | null
          cue_points: Json | null
          display_order: number | null
          id: string
          image_url: string | null
          options: Json | null
          penalty_points: number | null
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
          image_url?: string | null
          options?: Json | null
          penalty_points?: number | null
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
          image_url?: string | null
          options?: Json | null
          penalty_points?: number | null
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
      sponsors: {
        Row: {
          created_at: string | null
          display_order: number | null
          game_session_id: string | null
          id: string
          logo_url: string
          name: string
          tier: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          game_session_id?: string | null
          id?: string
          logo_url: string
          name: string
          tier: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          game_session_id?: string | null
          id?: string
          logo_url?: string
          name?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "public_questions"
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
          connection_pin: string | null
          created_at: string | null
          game_session_id: string | null
          id: string
          is_active: boolean | null
          is_excluded: boolean
          last_seen_at: string | null
          name: string
          score: number | null
          yellow_cards: number
        }
        Insert: {
          avatar?: string | null
          color: string
          connected_device_id?: string | null
          connection_pin?: string | null
          created_at?: string | null
          game_session_id?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean
          last_seen_at?: string | null
          name: string
          score?: number | null
          yellow_cards?: number
        }
        Update: {
          avatar?: string | null
          color?: string
          connected_device_id?: string | null
          connection_pin?: string | null
          created_at?: string | null
          game_session_id?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean
          last_seen_at?: string | null
          name?: string
          score?: number | null
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
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
    }
    Views: {
      public_questions: {
        Row: {
          audio_url: string | null
          created_at: string | null
          cue_points: Json | null
          display_order: number | null
          id: string | null
          options: Json | null
          points: number | null
          question_text: string | null
          question_type: string | null
          round_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          cue_points?: Json | null
          display_order?: number | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          question_type?: string | null
          round_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          cue_points?: Json | null
          display_order?: number | null
          id?: string | null
          options?: Json | null
          points?: number | null
          question_text?: string | null
          question_type?: string | null
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
    }
    Functions: {
      generate_team_pin: { Args: never; Returns: string }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      reset_game_session: { Args: { session_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
