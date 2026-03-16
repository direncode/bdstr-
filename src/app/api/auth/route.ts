import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/auth — login by name + PIN
export async function POST(req: NextRequest) {
  try {
    const { name, pin, action } = await req.json();

    if (action === "register") {
      if (!name || name.length < 2) return NextResponse.json({ error: "Name too short" }, { status: 400 });

      const { data: existing } = await supabase.from("players").select("id").eq("name", name).single();
      if (existing) return NextResponse.json({ error: "Name taken, pick another" }, { status: 409 });

      const { data: player, error } = await supabase
        .from("players")
        .insert({ name, pin: pin || "1234" })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const res = NextResponse.json({ player });
      res.cookies.set("player_id", player.id, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
      return res;
    }

    // Login
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const { data: player, error } = await supabase
      .from("players")
      .select("*")
      .eq("name", name)
      .eq("pin", pin || "1234")
      .single();

    if (error || !player) return NextResponse.json({ error: "Wrong name or PIN" }, { status: 401 });

    const res = NextResponse.json({ player });
    res.cookies.set("player_id", player.id, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/auth — get current player
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get("player_id")?.value;
  if (!playerId) return NextResponse.json({ player: null });

  const { data: player } = await supabase.from("players").select("*").eq("id", playerId).single();
  return NextResponse.json({ player: player || null });
}

// DELETE /api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("player_id", "", { maxAge: 0, path: "/" });
  return res;
}
