import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types matching our DB schema
export interface Player {
  id: string;
  name: string;
  pin: string;
  is_admin: boolean;
  total_points: number;
  games_played: number;
  best_streak: number;
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
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: "A" | "B" | "C" | "D";
  points: number;
  sort_order: number;
}

export interface Answer {
  id: string;
  player_id: string;
  question_id: string;
  selected: string;
  is_correct: boolean;
  points: number;
  created_at: string;
}

export interface GameState {
  id: string;
  is_unlocked: boolean;
  active_round_id: string | null;
  updated_at: string;
}
