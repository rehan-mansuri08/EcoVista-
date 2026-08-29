-- ============================================================
-- EcoVista: unique conflict targets for /api/sync upserts
-- The route upserts activities/attractions by (destination_id,name)
-- and seasonal_profiles by (destination_id,month_number).
-- ============================================================

-- Clean possible duplicates first (dedupe keeps lowest id)
delete from public.activities a
using public.activities b
where a.destination_id = b.destination_id and a.name = b.name and a.id > b.id;

delete from public.attractions_poi a
using public.attractions_poi b
where a.destination_id = b.destination_id and a.name = b.name and a.id > b.id;

delete from public.seasonal_profiles a
using public.seasonal_profiles b
where a.destination_id = b.destination_id and a.month_number = b.month_number and a.id > b.id;

create unique index if not exists ux_activities_dest_name
  on public.activities(destination_id, name);

create unique index if not exists ux_attractions_dest_name
  on public.attractions_poi(destination_id, name);

create unique index if not exists ux_seasonal_dest_month
  on public.seasonal_profiles(destination_id, month_number);
