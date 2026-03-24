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
  // Daily schedule: all rounds for today (unlimited)
  todaysRounds: { id: string; name: string; category: string; sort_order: number }[];
  fetchedAt: number;
}

let cache: CachedGameState | null = null;
const CACHE_TTL_MS = 3000; // 3 seconds — admin changes appear within seconds

export async function getGameState(): Promise<CachedGameState> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const supabase = await createServerSupabase();

  const today = new Date().toISOString().split("T")[0];

  const [{ data: state }, { data: allRounds }, { data: allQuestions }, busynessData] = await Promise.all([
    supabase.from("game_state").select("*").eq("id", "singleton").maybeSingle(),
    supabase.from("rounds").select("*").order("sort_order"),
    supabase.from("questions").select("*").order("sort_order"),
    getBusyness(),
  ]);

  // Rounds scheduled for today
  const todaysRounds = (allRounds || [])
    .filter((r: Record<string, unknown>) => r.scheduled_date === today)
    .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      category: r.category as string,
      sort_order: r.sort_order as number,
    }));

  const emptyState = (unlocked: boolean): CachedGameState => ({
    unlocked,
    activeRoundId: null,
    round: null,
    questions: [],
    availableQuestions: [],
    busynessPercent: busynessData.percent,
    questionsAllowed: busynessData.questionsAllowed,
    todaysRounds,
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

  const round = (allRounds || []).find((r: Record<string, unknown>) => r.id === state.active_round_id);
  const roundQuestions = (allQuestions || []).filter((q: Record<string, unknown>) => q.round_id === state.active_round_id);
  // Cap allowed questions to the actual number of questions in the round
  const allowed = Math.min(busynessData.questionsAllowed, roundQuestions.length);
  const availableQuestions = roundQuestions.slice(0, allowed);

  cache = {
    unlocked: true,
    activeRoundId: state.active_round_id,
    round: round || null,
    questions: roundQuestions,
    availableQuestions,
    busynessPercent: busynessData.percent,
    questionsAllowed: allowed,
    todaysRounds,
    fetchedAt: Date.now(),
  };
  return cache;
}

export function invalidateGameCache() {
  cache = null;
}
