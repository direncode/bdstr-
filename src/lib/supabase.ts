import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
  );
}

// Types matching our DB schema
export interface Profile {
  id: string;
  email: string;
  display_name: string;
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

export interface GameState {
  id: string;
  is_unlocked: boolean;
  active_round_id: string | null;
}
