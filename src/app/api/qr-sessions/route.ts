import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Valid QR types: outside (1x), inside (2x), trivia_night (3x)
type QrType = "outside" | "inside" | "trivia_night";
const VALID_QR_TYPES: QrType[] = ["outside", "inside", "trivia_night"];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}

// GET /api/qr-sessions — list all QR sessions (admin) or validate a code (player)
export async function GET(req: Request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Player: validate a specific code
  if (code) {
    const { data: session } = await supabase
      .from("qr_sessions")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Invalid or inactive QR code" }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      code: session.code,
      name: session.name,
      qr_type: session.qr_type || "inside",
      claimed: !!session.claimed_by,
      claimedBy: session.claimed_by,
    });
  }

  // Admin: list all sessions
  const profile = await getSession();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const { data: sessions } = await supabase
    .from("qr_sessions")
    .select("id, code, name, qr_type, claimed_by, claimed_at, is_active, created_at")
    .order("created_at", { ascending: false });

  // Get player names for claimed sessions
  const claimedIds = (sessions || []).filter(s => s.claimed_by).map(s => s.claimed_by);
  let playerMap: Record<string, string> = {};
  if (claimedIds.length > 0) {
    const { data: players } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", claimedIds);
    playerMap = Object.fromEntries((players || []).map(p => [p.id, p.display_name]));
  }

  return NextResponse.json({
    sessions: (sessions || []).map(s => ({
      ...s,
      qr_type: s.qr_type || "inside",
      claimed_name: s.claimed_by ? playerMap[s.claimed_by] || "Unknown" : null,
    })),
  });
}

// POST /api/qr-sessions — create, claim, reset, or delete QR sessions
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const body = await req.json();
  const { action } = body;

  // Claim a QR code (player action — no admin required)
  if (action === "claim") {
    const profile = await getSession();
    if (!profile) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const { code } = body;
    const { data: session } = await supabase
      .from("qr_sessions")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Invalid or inactive QR code" }, { status: 404 });
    }

    const qrType = session.qr_type || "inside";

    // Outside codes are never claimed — they're permanent/reusable
    if (qrType === "outside") {
      return NextResponse.json({ ok: true, qr_type: "outside" });
    }

    // Already claimed by this player — that's fine
    if (session.claimed_by === profile.id) {
      return NextResponse.json({ ok: true, alreadyClaimed: true, qr_type: qrType });
    }

    // Already claimed by someone else
    if (session.claimed_by) {
      return NextResponse.json({ error: "This QR code has already been claimed by another player" }, { status: 409 });
    }

    // Claim it
    const { error } = await supabase
      .from("qr_sessions")
      .update({ claimed_by: profile.id, claimed_at: new Date().toISOString() })
      .eq("id", session.id)
      .is("claimed_by", null);

    if (error) {
      return NextResponse.json({ error: "Failed to claim — may have been taken" }, { status: 409 });
    }

    return NextResponse.json({ ok: true, qr_type: qrType });
  }

  // Admin actions below
  const profile = await getSession();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  if (action === "create") {
    const { name, count = 1, qr_type = "inside" } = body;
    const type = VALID_QR_TYPES.includes(qr_type) ? qr_type : "inside";
    const sessions = [];
    for (let i = 0; i < Math.min(count, 50); i++) {
      const label = count > 1 ? `${name} ${i + 1}` : name;
      sessions.push({ code: generateCode(), name: label, qr_type: type, is_active: true });
    }
    const { error } = await supabase.from("qr_sessions").insert(sessions);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, created: sessions.length });
  }

  if (action === "reset-all") {
    const { qr_type } = body;
    const query = supabase
      .from("qr_sessions")
      .update({ claimed_by: null, claimed_at: null })
      .eq("is_active", true);
    // Optionally filter by type
    if (qr_type && VALID_QR_TYPES.includes(qr_type)) {
      query.eq("qr_type", qr_type);
    }
    await query;
    return NextResponse.json({ ok: true });
  }

  if (action === "reset-one") {
    const { sessionId } = body;
    await supabase
      .from("qr_sessions")
      .update({ claimed_by: null, claimed_at: null })
      .eq("id", sessionId);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { sessionId } = body;
    await supabase.from("qr_sessions").delete().eq("id", sessionId);
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle-active") {
    const { sessionId, isActive } = body;
    await supabase.from("qr_sessions").update({ is_active: isActive }).eq("id", sessionId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
