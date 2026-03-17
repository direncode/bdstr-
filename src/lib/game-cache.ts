import { createServerSupabase } from "./supabase-server";
import { getBusyness } from "./busyness";

interface CachedGameState {
  unlocked: boolean;
  activeRoundId: string | null;
  round: Record<string, unknown> | null;
  questions: Record<string, unknown>[];       // all questions in round
  availableQuestions: Record<string, unknown>[]; // limited by busyness
  busynessPercent: number;
  questionsAllowed: number;
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

  const emptyState = (unlocked: boolean): CachedGameState => ({
    unlocked,
    activeRoundId: null,
    round: null,
    questions: [],
    availableQuestions: [],
    busynessPercent: 0,
    questionsAllowed: 9,
    fetchedAt: Date.now(),
  });

  if (!state?.is_unlocked) {
    cache = emptyState(false);
    return cache;
  }

  if (!state.active_round_id) {
    cache = emptyState(true);
    return cache;
  }

  // Fetch round, questions, and busyness in parallel
  const [roundRes, questionsRes, busynessData] = await Promise.all([
    supabase.from("rounds").select("*").eq("id", state.active_round_id).maybeSingle(),
    supabase.from("questions").select("*").eq("round_id", state.active_round_id).order("sort_order"),
    getBusyness(),
  ]);

  const allQuestions = questionsRes.data || [];
  const allowed = busynessData.questionsAllowed;

  // Slice questions to only show what busyness allows
  const availableQuestions = allQuestions.slice(0, allowed);

  cache = {
    unlocked: true,
    activeRoundId: state.active_round_id,
    round: roundRes.data,
    questions: allQuestions,
    availableQuestions,
    busynessPercent: busynessData.percent,
    questionsAllowed: allowed,
    fetchedAt: Date.now(),
  };
  return cache;
}

export function invalidateGameCache() {
  cache = null;
}
