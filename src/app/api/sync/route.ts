import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { destinations } from "@/lib/data/destinations";
import { activities, attractions, seasonalProfiles } from "@/lib/data/seasonal";
import { indianStates } from "@/lib/data/destinations";
import { invalidateCache } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

// Server-side, bypasses RLS using the service-role key.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST() {
  const sb = adminClient();
  if (!sb) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "SUPABASE_SERVICE_ROLE_KEY not set. Add it to .env.local to seed the catalog into Supabase.",
      },
      { status: 400 }
    );
  }

  const results: Record<string, number> = {};

  // 1. Country
  let { data: country } = await sb
    .from("countries")
    .select("id")
    .eq("code", "IN")
    .single();
  let countryId = country?.id;
  if (!countryId) {
    const { data, error } = await sb
      .from("countries")
      .insert({ code: "IN", name: "India", currency: "INR", continent: "Asia" })
      .select()
      .single();
    if (!error) countryId = data.id;
  }

  // 2. States
  const stateRows = await sb.from("regions_states").select("id,name");
  const stateIdByName = new Map((stateRows.data || []).map((s) => [s.name, s.id]));
  const stateByDest = new Map<string, string>();

  for (const st of indianStates) {
    let id = stateIdByName.get(st.name);
    if (!id) {
      const { data, error } = await sb
        .from("regions_states")
        .insert({ country_id: countryId, name: st.name, type: st.ut ? "union_territory" : "state", capital: "" })
        .select("id")
        .single();
      if (!error) id = data.id;
    }
    if (id) stateIdByName.set(st.name, id);
  }
  results.states = stateIdByName.size;

  // ensure every destination's state exists, then collect state->dest id
  for (const d of destinations) {
    let stId = stateIdByName.get(d.state);
    if (!stId) {
      const { data, error } = await sb
        .from("regions_states")
        .insert({ country_id: countryId, name: d.state, type: "state", capital: "" })
        .select("id")
        .single();
      if (!error) {
        stId = data.id;
        stateIdByName.set(d.state, stId);
      } else {
        continue;
      }
    }
    stateByDest.set(d.slug, stId);
  }

  // 3. Destinations (upsert)
  let destCount = 0;
  for (const d of destinations) {
    const stateId = stateByDest.get(d.slug);
    if (!stateId) continue;
    const payload = {
      state_id: stateId,
      name: d.name,
      slug: d.slug,
      tagline: d.tagline,
      description: d.description,
      latitude: d.coordinates.lat,
      longitude: d.coordinates.lng,
      altitude: d.altitude,
      terrain_type: d.terrainType,
      nearest_hub: d.nearestHub,
      is_featured: d.isFeatured,
      currency: d.currency,
      timezone: d.timezone,
      images: d.images,
      facts: d.facts,
    };
    const { data } = await sb
      .from("destinations")
      .upsert(payload, { onConflict: "slug" })
      .select("id,slug");
    if (data && data[0]) {
      destCount++;
      stateByDest.set(`id:${d.slug}`, data[0].id);
    }
  }
  results.destinations = destCount;

  // 4. Activities, attractions, seasonal (upsert by name per destination)
  const destIdBySlug = new Map<string, string>();
  for (const slug of stateByDest.keys()) {
    const v = stateByDest.get(`id:${slug}`);
    if (v) destIdBySlug.set(slug, v);
  }

  let actCount = 0;
  for (const a of activities) {
    const did = destIdBySlug.get(a.destinationId) || (await findDestIdBySlug(sb, a.destinationId));
    if (!did) continue;
    await sb
      .from("activities")
      .upsert(
        {
          destination_id: did,
          name: a.name,
          category: a.category,
          weather_conditions_required: a.weatherConditionsRequired,
          cost_tier: a.costTier,
          duration_hours: a.durationHours,
          indoor: a.indoor,
          description: a.description,
        },
        { onConflict: "destination_id,name" }
      );
    actCount++;
  }
  results.activities = actCount;

  let attCount = 0;
  for (const at of attractions) {
    const did = destIdBySlug.get(at.destinationId) || (await findDestIdBySlug(sb, at.destinationId));
    if (!did) continue;
    await sb
      .from("attractions_poi")
      .upsert(
        {
          destination_id: did,
          name: at.name,
          type: at.type,
          latitude: at.coordinates.lat,
          longitude: at.coordinates.lng,
          entry_fee: at.entryFee,
          timings: at.timings,
          description: at.description,
        },
        { onConflict: "destination_id,name" }
      );
    attCount++;
  }
  results.attractions = attCount;

  let seaCount = 0;
  const seenSea = new Set<string>();
  for (const s of seasonalProfiles) {
    const did = destIdBySlug.get(s.destinationId) || (await findDestIdBySlug(sb, s.destinationId));
    if (!did) continue;
    const key = `${did}-${s.monthNumber}`;
    if (seenSea.has(key)) continue;
    seenSea.add(key);
    await sb
      .from("seasonal_profiles")
      .upsert(
        {
          destination_id: did,
          month_number: s.monthNumber,
          crowd_index: s.crowdIndex,
          budget_tier: s.budgetTier,
          temperature: s.temperature,
          weather: s.weather,
          highlights: s.highlights,
          is_off_season: s.isOffSeason || false,
        },
        { onConflict: "destination_id,month_number" }
      );
    seaCount++;
  }
  results.seasonal = seaCount;

  await invalidateCache();

  return NextResponse.json({
    ok: true,
    message: "Catalog synced to Supabase.",
    results,
  });
}

async function findDestIdBySlug(sb: any, slug: string): Promise<string | null> {
  try {
    const { data } = await sb.from("destinations").select("id").eq("slug", slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
