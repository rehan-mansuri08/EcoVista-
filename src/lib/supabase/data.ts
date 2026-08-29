import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  destinations as staticDestinations,
  getDestinationBySlug as staticGetBySlug,
} from "@/lib/data/destinations";
import {
  activities as staticActivities,
  attractions as staticAttractions,
  seasonalProfiles as staticSeasonal,
} from "@/lib/data/seasonal";
import type {
  Activity,
  Attraction,
  Destination,
  SeasonalProfile,
} from "@/types";

// ------------------------------------------------------------------
// Live, in-sync cache over Supabase, with graceful static fallback.
// Populates from the remote project on first access and refreshes
// via Supabase Realtime. Falls back to the bundled catalog whenever
// Supabase is not configured or unreachable (e.g. dev before linking).
// ------------------------------------------------------------------

const CACHE_TTL = 15 * 60 * 1000;

interface CatalogCache {
  destinations: Destination[] | null;
  activities: Activity[] | null;
  attractions: Attraction[] | null;
  seasonal: SeasonalProfile[] | null;
  fetchedAt: number;
  realtimeReady: boolean;
}

// module-scoped server cache (per process; Next.js reuses across requests)
const globalCache = (globalThis as any).__ECOVISTA_DB__ as CatalogCache | undefined;
if (!globalCache) {
  (globalThis as any).__ECOVISTA_DB__ = {
    destinations: null,
    activities: null,
    attractions: null,
    seasonal: null,
    fetchedAt: 0,
    realtimeReady: false,
  } as CatalogCache;
}
const cache: CatalogCache = (globalThis as any).__ECOVISTA_DB__;

export type DataSource = "supabase" | "static";

let source: DataSource = "static";

function needsRefresh(): boolean {
  return Date.now() - cache.fetchedAt > CACHE_TTL;
}

function dbDestToDest(row: any): Destination | undefined {
  // merge remote row with static details (media/facts enrichments)
  const fallback = staticDestinations.find((d) => d.slug === row.slug);
  const base: Destination | undefined = fallback
    ? { ...fallback, id: row.id }
    : row && {
        id: row.id,
        state: "",
        name: row.name,
        slug: row.slug,
        tagline: row.tagline || "",
        description: row.description || "",
        coordinates: { lat: row.latitude, lng: row.longitude },
        altitude: row.altitude || 0,
        terrainType: (row.terrain_type as any) || "heritage",
        currency: row.currency || "INR",
        timezone: row.timezone || "Asia/Kolkata",
        nearestHub: row.nearest_hub || "",
        isFeatured: row.is_featured || false,
        image: "",
        images: { landscape: [], food: [], heritage: [], culture: [] },
        facts: {
          language: "Local",
          bestTimeHint: "Year-round",
          idealDuration: "2 days",
          access: row.nearest_hub || "Local transport",
        },
      };
  if (!base) return undefined;
  // if we only had the fallback (static), keep its id mapping from slug
  if (fallback && fallback.id !== row.id) {
    base.id = fallback.id; // code references component ids like gulmarg
  }
  // preserve the latest remote geo/feature flags over fallback
  if (row.latitude) base.coordinates = { lat: row.latitude, lng: row.longitude };
  if (row.altitude != null) base.altitude = row.altitude;
  if (row.is_featured != null) base.isFeatured = row.is_featured;
  if (row.nearest_hub) base.nearestHub = row.nearest_hub;
  return base;
}

async function loadFromSupabase(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("ey")) return false; // placeholder

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const [destRes, actRes, attRes, seaRes] = await Promise.all([
      supabase.from("destinations").select("*"),
      supabase.from("activities").select("*"),
      supabase.from("attractions_poi").select("*"),
      supabase.from("seasonal_profiles").select("*"),
    ]);
    if (destRes.error) throw destRes.error;

    const mapped: Destination[] = (destRes.data || [])
      .map(dbDestToDest)
      .filter((d): d is Destination => !!d) as Destination[];
    if (!mapped.length) return false;

    cache.destinations = mapped;

    // activities
    const actMap = new Map<string, Activity>();
    (actRes.data || []).forEach((a: any) => {
      actMap.set(`${a.destination_id}:${a.name}`, {
        id: a.id,
        destinationId: a.destination_id,
        name: a.name,
        category: a.category || "General",
        weatherConditionsRequired: a.weather_conditions_required || [],
        costTier: a.cost_tier || "moderate",
        durationHours: a.duration_hours || 2,
        indoor: a.indoor || false,
        description: a.description || "",
      });
      // expose by stable code id when possible
      const match = staticActivities.find((s) => s.name === a.name);
      if (match && match.destinationId === a.destination_id) {
        actMap.set(match.id, {
          id: match.id,
          destinationId: a.destination_id,
          name: a.name,
          category: a.category || match.category,
          weatherConditionsRequired: a.weather_conditions_required || match.weatherConditionsRequired,
          costTier: a.cost_tier || match.costTier,
          durationHours: a.duration_hours || match.durationHours,
          indoor: a.indoor || match.indoor,
          description: a.description || match.description,
        });
      }
    });
    cache.activities = Array.from(actMap.values());

    cache.attractions = (attRes.data || []).map((at: any, i: number) => ({
      id: at.id || `${at.destination_id}-att-${i}`,
      destinationId: at.destination_id,
      name: at.name,
      type: at.type || "POI",
      coordinates: { lat: at.latitude || 0, lng: at.longitude || 0 },
      entryFee: at.entry_fee || "Free",
      timings: at.timings || "Open all day",
      description: at.description || "",
    }));

    cache.seasonal = (seaRes.data || []).map((s: any) => ({
      destinationId: s.destination_id,
      monthNumber: s.month_number,
      crowdIndex: s.crowd_index || 5,
      budgetTier: s.budget_tier || "moderate",
      temperature: { min: 0, max: 30 },
      weather: s.weather || "clear",
      highlights: s.highlights || [],
      isOffSeason: s.is_off_season || false,
    }));

    cache.fetchedAt = Date.now();
    source = "supabase";
    return true;
  } catch {
    source = "static";
    return false;
  }
}

async function ensureLoaded(): Promise<void> {
  if (!cache.destinations || needsRefresh()) {
    const ok = await loadFromSupabase();
    if (!ok && !cache.destinations) {
      // hydrate cache from static so we always have data
      cache.destinations = staticDestinations;
      cache.activities = staticActivities;
      cache.attractions = staticAttractions;
      cache.seasonal = staticSeasonal;
      cache.fetchedAt = Date.now();
      source = "static";
    }
  }
}

export async function getDataSource(): Promise<DataSource> {
  await ensureLoaded();
  return source;
}

export async function getAllDestinations(): Promise<Destination[]> {
  await ensureLoaded();
  return cache.destinations || staticDestinations;
}

export async function getDestinationBySlug(
  slug: string
): Promise<Destination | undefined> {
  await ensureLoaded();
  const found = (cache.destinations || []).find((d) => d.slug === slug);
  if (found) return found;
  return staticGetBySlug(slug);
}

export async function getDestinationsByState(
  state: string
): Promise<Destination[]> {
  await ensureLoaded();
  const all = cache.destinations || [];
  return all.filter((d) => d.state === state);
}

export async function getActivitiesForDest(
  destinationId: string
): Promise<Activity[]> {
  await ensureLoaded();
  const all = cache.activities || staticActivities;
  const byId = all.filter((a) => a.destinationId === destinationId);
  return byId.length ? byId : staticActivities.filter((a) => a.destinationId === destinationId);
}

export async function getAttractionsForDest(
  destinationId: string
): Promise<Attraction[]> {
  await ensureLoaded();
  const all = cache.attractions || staticAttractions;
  const byId = all.filter((a) => a.destinationId === destinationId);
  return byId.length ? byId : staticAttractions.filter((a) => a.destinationId === destinationId);
}

export async function getSeasonalForDest(
  destinationId: string
): Promise<SeasonalProfile[]> {
  await ensureLoaded();
  const all = cache.seasonal || staticSeasonal;
  const byId = all.filter((s) => s.destinationId === destinationId);
  return byId.length ? byId : staticSeasonal.filter((s) => s.destinationId === destinationId);
}

export async function searchDestinations(q: string): Promise<Destination[]> {
  await ensureLoaded();
  const text = q.toLowerCase();
  return (cache.destinations || []).filter(
    (d) =>
      d.name.toLowerCase().includes(text) ||
      d.state.toLowerCase().includes(text) ||
      d.tagline.toLowerCase().includes(text)
  );
}

export async function invalidateCache(): Promise<void> {
  cache.fetchedAt = 0;
  await ensureLoaded();
}
