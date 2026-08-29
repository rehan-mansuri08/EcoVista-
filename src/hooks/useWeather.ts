"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/types";
import { getSeasonalFallback } from "@/lib/weather";

export function useWeather(
  lat: number,
  lng: number,
  destinationId: string,
  destinationName: string
) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "seasonal-average">(
    "seasonal-average"
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      // Immediate fallback so UI renders
      if (!cancelled) {
        setWeather(await getSeasonalFallback(destinationId, destinationName, lat, lng));
      }

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          id: destinationId,
          name: destinationName,
        });
        const res = await fetch(`/api/weather?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad");
        const data: WeatherData = await res.json();
        if (!cancelled) {
          setWeather(data);
          setSource(data.source);
        }
      } catch {
        // keep fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    // refresh every 5 min
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [lat, lng, destinationId, destinationName]);

  return { weather, loading, source };
}
