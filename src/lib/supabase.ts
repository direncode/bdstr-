// Types matching our DB schema
export interface Profile {
  id: string;
  display_name: string;
  password_hash: string;
  session_token: string | null;
  is_admin: boolean;
  total_points: number;
  games_played: number;
  best_streak: number;
  wallet_card_id: string | null;
  created_at: string;
}

export interface Round {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

export interface Question {
  id: string;
  round_id: string;
  question: string;
  answer: string;
  points: number;
  sort_order: number;
}

export interface AttendanceLog {
  id: string;
  player_id: string;
  admin_id: string;
  points_added: number;
  note: string | null;
  created_at: string;
}

export interface GameState {
  id: string;
  is_unlocked: boolean;
  active_round_id: string | null;
}
