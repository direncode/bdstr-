import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getBusyness,
  overrideBusyness,
  invalidateBusynessCache,
  busynessLabel,
  busynessMessage,
} from "@/lib/busyness";

export const dynamic = "force-dynamic";

// GET /api/busyness — current busyness + questions allowed
export async function GET() {
  const data = await getBusyness();

  return NextResponse.json({
    percent: data.percent,
    questionsAllowed: data.questionsAllowed,
    label: busynessLabel(data.percent),
    message: busynessMessage(data.percent, data.questionsAllowed),
    source: data.source,
    date: data.date,
  });
}

// POST /api/busyness — admin override or refresh
export async function POST(req: Request) {
  const profile = await getSession();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { action, percent } = await req.json();

  if (action === "override" && typeof percent === "number") {
    const data = overrideBusyness(percent);
    return NextResponse.json({
      percent: data.percent,
      questionsAllowed: data.questionsAllowed,
      label: busynessLabel(data.percent),
      message: busynessMessage(data.percent, data.questionsAllowed),
      source: "admin_override",
    });
  }

  if (action === "refresh") {
    invalidateBusynessCache();
    const data = await getBusyness();
    return NextResponse.json({
      percent: data.percent,
      questionsAllowed: data.questionsAllowed,
      label: busynessLabel(data.percent),
      message: busynessMessage(data.percent, data.questionsAllowed),
      source: data.source,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
