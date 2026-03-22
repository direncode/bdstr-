import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ADMIN_KEY = "trivia";

export async function POST(req: Request) {
  const profile = await getSession();
  if (!profile) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  if (profile.is_admin) {
    return NextResponse.json({ ok: true, message: "Already an admin" });
  }

  const { key } = await req.json();

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  await supabase
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", profile.id);

  return NextResponse.json({ ok: true, message: "Admin access granted!" });
}
