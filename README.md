# 🌍 EcoVista — Real-time India Travel Intelligence & AI Trip Planner

EcoVista combines the visual discovery of Airbnb, the breadth of Google Travel,
the precision of a live data dashboard, and an integrated AI trip builder into a
single responsive web app — built initially for **India** with a scalable
worldwide foundation.

## ✨ Features

- **Live Weather Telemetry** — 15-min cached temperature, RealFeel, humidity,
  wind, rain probability, AQI & UV per destination (Open-Meteo, no API key),
  with graceful seasonal-average fallback + "Updated X min ago" status.
- **Procedural Weather Canvas** — GPU-friendly HTML5 Canvas atmospheric graphics:
  drifting snow, monsoon rain with splash, multi-layer Perlin fog, and a
  sun/moon solar-cycle sky synced to the destination's local hour.
- **"What Can I Do Right Now?"** — rule-based engine that fuses current month +
  live weather to recommend active/caution/advisory activities (e.g. Gulmarg
  skiing in Dec–Feb, Munnar tea tours in monsoon).
- **Interactive India Map** — Leaflet + OpenStreetMap/CartoDB/OpenTopoMap tile
  switching, GeoJSON state overlays, live weather pins, flyTo animations and
  itinerary polyline routing.
- **AI Trip Planner** — NVIDIA LLM-driven destination chat + a structured,
  weather-aware multi-day itinerary builder with drag-to-reorder days,
  one-click activity swaps, itemized budget estimates, and route mapping.
- **Explore / Search Hub** — natural-language queries
  ("snow places in December", "family monsoon destinations"), multi-attribute
  filtering by state/terrain/season, and a side-by-side destination comparison.
- **World-ready schema** — World › Countries › Regions › Destinations with
  activities, attractions, seasonal profiles, media, weather cache and
  user-saved trips, all under **Row Level Security**.

## 🧱 Tech Stack

| Layer       | Technology                                        |
|-------------|---------------------------------------------------|
| Framework   | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| UI          | Lucide Icons, Framer Motion-ready                 |
| Backend/DB  | Supabase (PostgreSQL, Auth, RLS, Realtime)        |
| Maps        | Leaflet / React-Leaflet (OpenStreetMap & CartoDB) |
| Weather     | Open-Meteo (free) with server-side caching        |
| AI Engine   | NVIDIA NIM (OpenAI-compatible chat completions)   |

## 🚀 Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + NVIDIA keys
npm run dev                  # → http://localhost:3000
```

### Environment variables (`.env.local`)

```ini
NEXT_PUBLIC_SUPABASE_URL=https://vxwujqafskzhmlxvyfuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server-only, for /api/sync & /api/weather

AI_API_KEY=nvapi-...                          # NVIDIA API key
AI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL=nvidia/nemotron-3-super-120b-a12b
```

## 🗄️ Database

Migrations live in [`supabase/migrations/`](supabase/migrations/). To apply:

```bash
supabase login
supabase link --project-ref vxwujqafskzhmlxvyfuu
supabase db push
```

The app reads destinations/activities/attractions/seasonal data **live from
Supabase** with an in-memory cache, automatically falling back to the bundled
catalog if Supabase isn't reachable. To seed the DB from the catalog:

```bash
curl -X POST http://localhost:3000/api/sync
```

### Data model

```
World
 └── Countries (code, name, currency, continent)
      └── Regions_States (country_id, name, type, capital)
           └── Destinations (state_id, name, slug, geo, altitude, terrain)
                ├── Weather_Cache       (destination_id, temp, aqi, …, 15-min TTL)
                ├── Seasonal_Profiles   (destination_id, month, crowd, budget)
                ├── Activities          (destination_id, name, weather_required, cost)
                ├── Attractions_POI     (destination_id, name, coords, entry_fee)
                └── Destination_Media   (destination_id, url, caption, seasonal_tag)
User Trips ── Itinerary Days (day slots, notes, cost breakdowns)
```

## 📁 Project Structure

```
src/
  app/                 # App Router pages
    api/               # weather, ai, traveltime, destinations, sync routes
    explore/           # Explore India hub + compare
    map/               # full-screen interactive map
    planner/           # AI trip planner
    search/            # natural-language search + AI concierge
    trips/             # saved trips (Supabase)
    auth/              # Supabase Auth
    india/[state]/[destination]/  # destination detail pages
  components/
    map/               # Leaflet InteractiveMap + client MapView
    weather/           # Canvas visualizer + telemetry panel
    planner/           # TripPlanner workspace
    ...                # cards, gallery, season matrix, compare, search
  hooks/               # useWeather, useLiveDestinations
  lib/
    data/              # bundled catalog (fallback) + India GeoJSON
    supabase/          # client/server/data repository
    planner.ts         # itinerary generation engine
    intelligence.ts    # "What can I do right now" engine
    weather.ts         # weather fetch + fallback
    travel.ts          # routing / haversine / OSRM
supabase/migrations/   # schema + RLS + seed
```

## 🔒 Security & Scale

- Row Level Security enabled on every table (reference data is public read;
  trips are private per-user via `auth.uid()`).
- `.env.local` (with secrets) is git-ignored; only `.env.example` is committed.
- Server-side weather caching (15-min TTL) + dead-letter fallback to seasonal
  averages keeps external API usage minimal and the dashboard always live.
