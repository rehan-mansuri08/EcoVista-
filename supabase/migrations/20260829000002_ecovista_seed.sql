-- ============================================================
-- EcoVista: profiles + seed data (India taxonomy & destinations)
-- ============================================================

-- ---------------- Profiles ----------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ---------------- India (Country) ----------------
insert into public.countries (code, name, currency, continent)
values ('IN', 'India', 'INR', 'Asia');

-- ---------------- States / Union Territories of India ----------------
insert into public.regions_states (country_id, name, type, capital, description)
select c.id, s.name, s.type, s.capital, 'State of India'
from public.countries c
cross join (values
  ('Jammu & Kashmir','state','Srinagar'),
  ('Himachal Pradesh','state','Shimla'),
  ('Uttarakhand','state','Dehradun'),
  ('Ladakh','union_territory','Leh'),
  ('Punjab','state','Chandigarh'),
  ('Rajasthan','state','Jaipur'),
  ('Uttar Pradesh','state','Lucknow'),
  ('Gujarat','state','Gandhinagar'),
  ('Goa','state','Panaji'),
  ('Maharashtra','state','Mumbai'),
  ('Karnataka','state','Bengaluru'),
  ('Kerala','state','Thiruvananthapuram'),
  ('Tamil Nadu','state','Chennai'),
  ('West Bengal','state','Kolkata'),
  ('Sikkim','state','Gangtok'),
  ('Assam','state','Dispur'),
  ('Arunachal Pradesh','state','Itanagar')
) as s(name, type, capital)
where c.code = 'IN';

create index if not exists idx_regions_country on public.regions_states(country_id);
create index if not exists idx_destinations_state on public.destinations(state_id);
create index if not exists idx_weather_dest on public.weather_cache(destination_id);
create index if not exists idx_seasonal_dest on public.seasonal_profiles(destination_id);
create index if not exists idx_activities_dest on public.activities(destination_id);
create index if not exists idx_trips_user on public.user_trips(user_id);

-- Utility: seed destinations from app fallback data lives in code; the DB seed below
-- inserts a compact representation for querying.
insert into public.destinations (state_id, name, slug, tagline, latitude, longitude, altitude, terrain_type, nearest_hub, is_featured)
select rs.id, d.name, d.slug, d.tagline, d.lat, d.lng, d.alt, d.terrain, d.hub, d.featured
from (values
  ('gulmarg','Gulmarg','Pir Panjal ski resort','Jammu & Kashmir',34.0486,74.3808,2690,'himalayas','Srinagar',true),
  ('manali','Manali','Himalayan valley of snow & pine','Himachal Pradesh',32.2396,77.1887,2050,'himalayas','Kullu Airport',true),
  ('munnar','Munnar','Tea plantations in the Western Ghats','Kerala',10.0889,77.0595,1600,'western_ghats','Kochi',true),
  ('jaisalmer','Jaisalmer','The golden city of the Thar','Rajasthan',26.9157,70.9083,225,'deserts','Jodhpur',true),
  ('goa','North Goa','Sun sand & sea','Goa',15.4989,73.8278,10,'beaches','Goa Airport',true),
  ('agra','Agra','Home of the Taj Mahal','Uttar Pradesh',27.1767,78.0081,171,'heritage','Agra Cantt',true),
  ('ooty','Ooty','Queen of the Nilgiris','Tamil Nadu',11.4102,76.695,2240,'western_ghats','Coimbatore',true),
  ('darjeeling','Darjeeling','Land of the toy train','West Bengal',27.036,88.2627,2045,'northeast','Bagdogra',true),
  ('udaipur','Udaipur','City of Lakes & palaces','Rajasthan',24.5854,73.7125,598,'heritage','Udaipur Airport',true),
  ('kodaikanal','Kodaikanal','Princess of hill stations','Tamil Nadu',10.2381,77.4892,2183,'western_ghats','Madurai',false),
  ('leh','Leh','High-altitude desert of the Himalaya','Ladakh',34.1526,77.5771,3500,'himalayas','Leh Airport',true),
  ('alleppey','Alleppey','Backwaters capital of Kerala','Kerala',9.4981,76.3388,0,'backwaters','Kochi',true),
  ('shimla','Shimla','Colonial queen of the hills','Himachal Pradesh',31.1048,77.1734,2276,'himalayas','Chandigarh',true),
  ('rishikesh','Rishikesh','Yoga capital & adventure hub','Uttarakhand',30.0869,78.2676,372,'spiritual','Dehradun',true),
  ('mcleodganj','McLeod Ganj','Little Lhasa of the Himalayas','Himachal Pradesh',32.2407,76.3234,2082,'himalayas','Kangra',false),
  ('coorg','Coorg','Scotland of India','Karnataka',12.3375,75.8069,900,'western_ghats','Mysuru',false),
  ('varanasi','Varanasi','Spiritual capital on the Ganges','Uttar Pradesh',25.3176,82.9739,80,'spiritual','Varanasi Airport',true),
  ('gangtok','Gangtok','Gateway to the Eastern Himalayas','Sikkim',27.3389,88.6065,1650,'northeast','Pakyong',false),
  ('tawang','Tawang','Monasteries of the Eastern Himalaya','Arunachal Pradesh',27.5854,91.8582,3048,'northeast','Tezpur',false),
  ('kaziranga','Kaziranga','Home of the one-horned rhino','Assam',26.5775,93.1711,80,'wildlife','Guwahati',false)
) as d(slug, name, tagline, state, lat, lng, alt, terrain, hub, featured)
join public.regions_states rs on rs.name = d.state;

-- Keep the world-expansion structure ready for later countries.
