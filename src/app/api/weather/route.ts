import { NextRequest, NextResponse } from "next/server";
import { fetchLiveWeather, WEATHER_CACHE_TTL } from "@/lib/weather";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { destinations as staticDestinations } from "@/lib/data/destinations";

export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const id = searchParams.get("id") || "unknown";
  const name = searchParams.get("name") || id;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const data = await fetchLiveWeather(lat, lng, id, name);

  // Best-effort: sync this telemetry row into Supabase weather_cache
  // (source of truth for the dashboard), keyed by destination slug→uuid.
  if (data.source === "live") {
    const sb = adminClient();
    if (sb) {
      const staticDest = staticDestinations.find((d) => d.id === id);
      const slug = staticDest?.slug || id;
      try {
        const { data: destRow } = await sb
          .from("destinations")
          .select("id")
          .eq("slug", slug)
          .single();
        if (destRow?.id) {
          await sb.from("weather_cache").upsert(
            {
              destination_id: destRow.id,
              temp_c: data.tempC,
              feels_like_c: data.feelsLikeC,
              humidity: data.humidity,
              wind_speed_kmph: data.windSpeedKmph,
              conditions: data.conditions,
              aqi: data.aqi,
              rain_probability: data.rainProbability,
              uv_index: data.uvIndex,
              source: "live",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "destination_id" }
          );
        }
      } catch {
        // non-fatal: don't fail the weather response if sync fails
      }
    }
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${WEATHER_CACHE_TTL / 1000}, stale-while-revalidate=300`,
    },
  });
}
