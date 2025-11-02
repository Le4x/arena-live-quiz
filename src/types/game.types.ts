/**
 * Types TypeScript stricts pour toute l'application
 */

// ==================== TYPES DE BASE ====================

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  score: number;
  is_active: boolean;
  is_excluded: boolean;
  yellow_cards: number;
  connection_pin: string | null;
  game_session_id: string | null;
  last_seen_at: string;
  connected_device_id: string | null;
  created_at: string;
}

export interface GameSession {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'ended';
  selected_rounds: string[];
  has_final: boolean;
  logo_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  current_round_index: number;
  created_at: string;
}

export interface Round {
  id: string;
  title: string;
  type: 'qcm' | 'blind_test' | 'text';
  status: 'pending' | 'active' | 'completed';
  jingle_url: string | null;
  timer_duration: number | null;
  timer_started_at: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  round_id: string;
  question_type: 'qcm' | 'blind_test' | 'text';
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  penalty_points: number;
  display_order: number;
  audio_url: string | null;
  image_url: string | null;
  cue_points: CuePoints | null;
  lyrics: LyricLine[] | null;
  stop_time: number | null;
  created_at: string;
}

export interface CuePoints {
  search: { start: number; end: number };
  solution: { start: number; end: number };
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface GameState {
  id: string;
  game_session_id: string | null;
  current_round_id: string | null;
  current_question_id: string | null;
  current_question_instance_id: string | null;
  is_buzzer_active: boolean;
  timer_active: boolean;
  timer_remaining: number | null;
  timer_started_at: string | null;
  timer_duration: number | null;
  show_leaderboard: boolean;
  show_ambient_screen: boolean;
  show_round_intro: boolean;
  show_pause_screen: boolean;
  show_waiting_screen: boolean;
  show_welcome_screen: boolean;
  show_team_connection_screen: boolean;
  show_sponsors_screen: boolean;
  show_thanks_screen: boolean;
  show_answer: boolean;
  excluded_teams: string[];
  audio_is_playing: boolean;
  audio_current_time: number;
  karaoke_playing: boolean;
  karaoke_revealed: boolean;
  final_mode: boolean;
  final_id: string | null;
  announcement_text: string | null;
  answer_result: string | null;
  leaderboard_page: number;
  current_round_intro: string | null;
  updated_at: string;
}

export interface BuzzerAttempt {
  id: string;
  team_id: string;
  question_id: string;
  question_instance_id: string;
  game_session_id: string;
  is_first: boolean;
  buzzed_at: string;
  teams?: Team;
}

export interface TeamAnswer {
  id: string;
  team_id: string;
  question_id: string;
  question_instance_id: string;
  game_session_id: string;
  answer: string;
  is_correct: boolean | null;
  points_awarded: number;
  answered_at: string;
}

export interface Final {
  id: string;
  game_session_id: string;
  status: 'pending' | 'active' | 'completed';
  finalist_teams: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  team_id: string;
  game_session_id: string;
  message: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  teams?: Team;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: 'gold' | 'silver' | 'bronze';
  display_order: number;
  game_session_id: string | null;
  created_at: string;
}

export interface JokerType {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export interface FinalJoker {
  id: string;
  final_id: string;
  team_id: string;
  joker_type_id: string;
  quantity: number;
  used_count: number;
  created_at: string;
}

export interface PublicVote {
  id: string;
  final_id: string;
  question_instance_id: string;
  voter_team_id: string;
  voted_answer: string;
  created_at: string;
}

export interface QuestionInstance {
  id: string;
  question_id: string;
  game_session_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

// ==================== TYPES POUR L'AUDIO ====================

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  cues: AudioCuePoint[];
  duration?: number;
}

export interface AudioCuePoint {
  label: string;
  time: number;
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: AudioTrack | null;
}

// ==================== TYPES POUR LES ÉVÉNEMENTS ====================

export type GameEventType = 
  | 'BUZZER_RESET'
  | 'START_QUESTION'
  | 'STOP_QUESTION'
  | 'SHOW_LEADERBOARD'
  | 'HIDE_LEADERBOARD'
  | 'PLAY_JINGLE'
  | 'SYNC_STATE'
  | 'RESET_ALL'
  | 'KICK_ALL'
  | 'KICK_TEAM'
  | 'WAITING_SHOW'
  | 'WAITING_HIDE'
  | 'TOGGLE_BUZZER'
  | 'REVEAL_ANSWER'
  | 'TEAM_BLOCKED'
  | 'SHOW_PUBLIC_VOTES'
  | 'HIDE_PUBLIC_VOTES'
  | 'JOKER_ACTIVATED';

export interface GameEvent<T = any> {
  type: GameEventType;
  timestamp: number;
  data?: T;
}

export interface StartQuestionEventData {
  questionId: string;
  questionInstanceId: string;
  sessionId: string;
}

export interface BuzzerResetEventData {
  questionInstanceId: string;
}

export interface KickTeamEventData {
  teamId: string;
}

export interface JokerActivatedEventData {
  teamId: string;
  jokerType: 'fifty_fifty' | 'team_call' | 'public_vote';
  finalId: string;
  questionOptions?: string[];
  correctAnswer?: string;
}

export interface RevealAnswerEventData {
  teamId: string;
  isCorrect: boolean;
  correctAnswer?: string;
}
