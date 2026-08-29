import { NextRequest, NextResponse } from "next/server";
import { getAllDestinations, searchDestinations } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const all = request.nextUrl.searchParams.get("all") === "1";

  if (all) {
    const list = await getAllDestinations();
    return NextResponse.json(
      { destinations: list, source: "supabase" },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  if (q) {
    const results = await searchDestinations(q);
    return NextResponse.json(
      { destinations: results },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }

  const list = await getAllDestinations();
  return NextResponse.json({ destinations: list });
}
