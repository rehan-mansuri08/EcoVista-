import { NextRequest, NextResponse } from "next/server";
import { estimateRoute } from "@/lib/travel";
import type { GeoPoint } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parse = (k: string): GeoPoint | null => {
    const lat = parseFloat(searchParams.get(`${k}lat`) || "");
    const lng = parseFloat(searchParams.get(`${k}lng`) || "");
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  };
  const from = parse("from");
  const to = parse("to");
  const mode = (searchParams.get("mode") as "car" | "flight") || "car";

  if (!from || !to) return NextResponse.json({ error: "Missing coords" }, { status: 400 });

  const route = await estimateRoute(from, to, mode);
  return NextResponse.json(route, {
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
