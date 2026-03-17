import { createServerSupabase } from "./supabase-server";

interface CachedGameState {
  unlocked: boolean;
  activeRoundId: string | null;
  round: Record<string, unknown> | null;
  questions: Record<string, unknown>[];
  fetchedAt: number;
}

let cache: CachedGameState | null = null;
const CACHE_TTL_MS = 3000; // 3 seconds — admin changes appear within seconds

export async function getGameState(): Promise<CachedGameState> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const supabase = await createServerSupabase();
  const { data: state } = await supabase
    .from("game_state")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle();

  if (!state?.is_unlocked) {
    cache = { unlocked: false, activeRoundId: null, round: null, questions: [], fetchedAt: Date.now() };
    return cache;
  }

  if (!state.active_round_id) {
    cache = { unlocked: true, activeRoundId: null, round: null, questions: [], fetchedAt: Date.now() };
    return cache;
  }

  const [roundRes, questionsRes] = await Promise.all([
    supabase.from("rounds").select("*").eq("id", state.active_round_id).maybeSingle(),
    supabase.from("questions").select("*").eq("round_id", state.active_round_id).order("sort_order"),
  ]);

  cache = {
    unlocked: true,
    activeRoundId: state.active_round_id,
    round: roundRes.data,
    questions: questionsRes.data || [],
    fetchedAt: Date.now(),
  };
  return cache;
}

export function invalidateGameCache() {
  cache = null;
}
