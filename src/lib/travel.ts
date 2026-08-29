import type { GeoPoint } from "@/types";

export function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteSegment {
  from: GeoPoint;
  to: GeoPoint;
  distanceKm: number;
  durationMin: number;
  polyline: GeoPoint[];
}

// Estimate driving distance/travel time. Prefer OSRM public API, fallback to haversine.
export async function estimateRoute(
  from: GeoPoint,
  to: GeoPoint,
  mode: "car" | "flight" = "car"
): Promise<RouteSegment> {
  const polyline: GeoPoint[] = [from, to];
  try {
    if (mode === "car") {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceKm = route.distance / 1000;
          const durationMin = Math.round(route.duration / 60);
          const coords: GeoPoint[] = (route.geometry?.coordinates || []).map(
            (c: [number, number]) => ({ lat: c[1], lng: c[0] })
          );
          return {
            from,
            to,
            distanceKm: Math.round(distanceKm),
            durationMin,
            polyline: coords.length ? coords : polyline,
          };
        }
      }
    }
    // flights use straight-line estimate with ~speed
    const dist = haversine(from, to);
    const speed = mode === "flight" ? 600 : 50;
    const durationMin = Math.round((dist / speed) * 60);
    return { from, to, distanceKm: Math.round(dist), durationMin, polyline };
  } catch {
    const dist = haversine(from, to);
    return {
      from,
      to,
      distanceKm: Math.round(dist),
      durationMin: Math.round((dist / 50) * 60),
      polyline,
    };
  }
}
