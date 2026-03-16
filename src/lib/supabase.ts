import { createBrowserClient } from "@supabase/ssr";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // During build/SSR without env vars, return a dummy that won't crash
    return createBrowserClient("https://placeholder.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder");
  }
  cachedClient = createBrowserClient(url, key);
  return cachedClient;
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
