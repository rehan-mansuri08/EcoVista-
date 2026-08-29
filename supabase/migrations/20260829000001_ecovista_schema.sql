-- ============================================================
-- EcoVista schema: World > Countries > Regions_States > Destinations
-- With Weather_Cache, Seasonal_Profiles, Activities, Attractions_POI,
-- Destination_Media, User Trips & Itinerary Days
-- Row Level Security enabled throughout
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- ---------------- Countries ----------------
create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  currency text,
  continent text,
  created_at timestamptz default now()
);

-- ---------------- Regions / States / Provinces ----------------
create table if not exists public.regions_states (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references public.countries(id) on delete cascade,
  name text not null,
  type text check (type in ('state','union_territory','province','region')),
  capital text,
  description text,
  geo_bounds jsonb,
  created_at timestamptz default now()
);

-- ---------------- Destinations ----------------
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  state_id uuid references public.regions_states(id) on delete cascade,
  name text not null,
  slug text unique not null,
  tagline text,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision,
  terrain_type text,
  nearest_hub text,
  is_featured boolean default false,
  currency text default 'INR',
  timezone text default 'Asia/Kolkata',
  images jsonb,
  facts jsonb,
  geo geometry(point, 4326),
  created_at timestamptz default now()
);

-- PostGIS point for location queries
update public.destinations set geo = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) where geo is null;

-- ---------------- Weather Cache (15-min TTL) ----------------
create table if not exists public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  temp_c double precision,
  feels_like_c double precision,
  humidity double precision,
  wind_speed_kmph double precision,
  conditions text,
  aqi integer,
  rain_probability integer,
  uv_index double precision,
  source text default 'live',
  updated_at timestamptz default now(),
  unique(destination_id)
);

-- ---------------- Seasonal Intelligence ----------------
create table if not exists public.seasonal_profiles (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  month_number integer check (month_number between 1 and 12),
  crowd_index integer check (crowd_index between 1 and 10),
  budget_tier text check (budget_tier in ('budget','moderate','luxury')),
  temperature jsonb,
  weather text,
  highlights jsonb,
  is_off_season boolean default false
);

-- ---------------- Activities ----------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  name text not null,
  category text,
  weather_conditions_required jsonb,
  cost_tier text check (cost_tier in ('budget','moderate','luxury')),
  duration_hours double precision,
  indoor boolean default false,
  description text
);

-- ---------------- Attractions / POI ----------------
create table if not exists public.attractions_poi (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  name text not null,
  type text,
  latitude double precision,
  longitude double precision,
  entry_fee text,
  timings text,
  description text
);

-- ---------------- Destination Media ----------------
create table if not exists public.destination_media (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  url text not null,
  caption text,
  seasonal_tag text,
  credit text
);

-- ---------------- User Trips ----------------
create table if not exists public.user_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  title text,
  origin text,
  destination_ids jsonb,
  destinations jsonb,
  start_date date,
  end_date date,
  party_type text check (party_type in ('solo','couple','family','friends')),
  budget_tier text check (budget_tier in ('budget','moderate','luxury')),
  pacing text check (pacing in ('relaxed','balanced','packed')),
  interests jsonb,
  status text default 'draft' check (status in ('draft','planned')),
  days jsonb,
  cost_breakdown jsonb,
  share_token text default md5(random()::text || clock_timestamp()::text),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------- Itinerary Days ----------------
create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.user_trips(id) on delete cascade,
  day_number integer,
  date date,
  title text,
  slots jsonb,
  notes text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.countries enable row level security;
alter table public.regions_states enable row level security;
alter table public.destinations enable row level security;
alter table public.weather_cache enable row level security;
alter table public.seasonal_profiles enable row level security;
alter table public.activities enable row level security;
alter table public.attractions_poi enable row level security;
alter table public.destination_media enable row level security;
alter table public.user_trips enable row level security;
alter table public.itinerary_days enable row level security;

-- Directory/reference data readable by everyone
create policy "Countries public read" on public.countries for select using (true);
create policy "States public read" on public.regions_states for select using (true);
create policy "Destinations public read" on public.destinations for select using (true);
create policy "Weather public read" on public.weather_cache for select using (true);
create policy "Seasonal public read" on public.seasonal_profiles for select using (true);
create policy "Activities public read" on public.activities for select using (true);
create policy "Attractions public read" on public.attractions_poi for select using (true);
create policy "Media public read" on public.destination_media for select using (true);

-- Weather cache: allow service_role to upsert (server-side cache writes)
create policy "Weather service write" on public.weather_cache
  for all to service_role using (true) with check (true);

-- Trips are private per user
create policy "Users manage own trips" on public.user_trips
  for select using (auth.uid() = user_id);
create policy "Users insert trips" on public.user_trips
  for insert with check (auth.uid() = user_id);
create policy "Users update trips" on public.user_trips
  for update using (auth.uid() = user_id);
create policy "Users delete trips" on public.user_trips
  for delete using (auth.uid() = user_id);

-- Itinerary days follow trip ownership via the enclosing trip
create policy "Users view own itinerary days" on public.itinerary_days
  for select using (
    exists (select 1 from public.user_trips t where t.id = itinerary_days.trip_id and t.user_id = auth.uid())
  );
create policy "Users manage own itinerary days" on public.itinerary_days
  for all using (
    exists (select 1 from public.user_trips t where t.id = itinerary_days.trip_id and t.user_id = auth.uid())
  );

-- Trigger to create a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
