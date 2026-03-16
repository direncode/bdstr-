import { NextResponse } from "next/server";
import { getBusyness } from "@/lib/busyness";

export async function GET() {
  const data = await getBusyness();
  return NextResponse.json(data);
}
