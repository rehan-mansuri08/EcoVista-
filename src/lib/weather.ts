import type { WeatherData } from "@/types";
import { destinations } from "@/lib/data/destinations";

export const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

type WeatherCache = Record<
  string,
  { data: WeatherData; expiresAt: number }
>;
(globalThis as any).__WEATHER_CACHE__ = (globalThis as any).__WEATHER_CACHE__ || {};

function getCache() {
  return (globalThis as any).__WEATHER_CACHE__ as Record<
    string,
    { data: WeatherData; expiresAt: number }
  >;
}

export interface WeatherLike {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation_probability: number;
  precipitation: number;
  uv_index: number;
  weather_code: number;
}

function weatherCodeToConditions(code: number): {
  conditions: WeatherData["conditions"];
  rainProbability: number;
} {
  if (code === 0) return { conditions: "clear", rainProbability: 0 };
  if (code === 1 || code === 2) return { conditions: "clouds", rainProbability: 10 };
  if (code === 3) return { conditions: "clouds", rainProbability: 20 };
  if (code >= 45 && code <= 48) return { conditions: "fog", rainProbability: 30 };
  if (code >= 51 && code <= 57) return { conditions: "rain", rainProbability: 60 };
  if (code >= 61 && code <= 67) return { conditions: "rain", rainProbability: 85 };
  if (code >= 71 && code <= 77) return { conditions: "snow", rainProbability: 80 };
  if (code >= 80 && code <= 82) return { conditions: "rain", rainProbability: 75 };
  if (code >= 95) return { conditions: "rain", rainProbability: 90 };
  return { conditions: "clouds", rainProbability: 30 };
}

function windDegreeToDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export async function fetchLiveWeather(
  lat: number,
  lng: number,
  destinationId: string,
  destinationName: string
): Promise<WeatherData> {
  const cache = getCache();
  const cacheKey = `${destinationId}`;
  const cached = cache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, updatedMinutesAgo: Math.max(0, 1) };
  }

  let result: WeatherData;
  try {
    const now = new Date();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,` +
      `wind_direction_10m,precipitation,weather_code,uv_index` +
      `&hourly=precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=7`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error("Bad response");
    const data = await res.json();
    const current = data.current;
    const today = new Date();

    const { conditions, rainProbability } = weatherCodeToConditions(
      current.weather_code
    );

    const hourlyProb = data.hourly?.precipitation_probability?.[today.getHours()];
    const forecast = (data.daily?.time || []).map((t: string, i: number) => {
      const day = new Date(t + "T00:00:00");
      const { conditions: c } = weatherCodeToConditions(
        data.daily?.weather_code?.[i] ?? 0
      );
      return {
        day: day.toLocaleDateString("en-IN", { weekday: "short" }),
        tempMax: data.daily?.temperature_2m_max?.[i],
        tempMin: data.daily?.temperature_2m_min?.[i],
        conditions: c,
      };
    });

    result = {
      destinationId,
      name: destinationName,
      tempC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeedKmph: Math.round(current.wind_speed_10m * 3.6),
      windDirection: windDegreeToDir(current.wind_direction_10m),
      conditions,
      rainProbability:
        hourlyProb ?? rainProbability ?? current.precipitation > 0 ? 50 : 10,
      aqi: estimateAQI(destinationId),
      uvIndex: current.uv_index ?? 0,
      precipitationMm: current.precipitation ?? 0,
      sunrise: "",
      sunset: "",
      hour: today.getHours(),
      updatedMinutesAgo: 0,
      source: "live",
      forecast,
    };
  } catch {
    result = await getSeasonalFallback(destinationId, destinationName, lat, lng);
  }

  cache[cacheKey] = { data: result, expiresAt: Date.now() + WEATHER_CACHE_TTL };
  return result;
}

function estimateAQI(destinationId: string): number {
  // deterministic pseudo-random based on destination id + day for consistent display
  const map: Record<string, number> = {
    agra: 165,
    delhi: 182,
    varanasi: 152,
    jaisalmer: 98,
    goa: 62,
    munnar: 42,
  };
  if (map[destinationId]) return map[destinationId];
  const seed = destinationId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 35 + (seed % 70);
}

function seasonalAverageForNow(destinationId: string, month: number) {
  const tempTable: Record<string, [number, number]> = {
    gulmarg: [0, 12],
    manali: [6, 18],
    munnar: [16, 25],
    jaisalmer: [15, 30],
    goa: [24, 33],
    agra: [28, 38],
    ooty: [11, 19],
    darjeeling: [6, 14],
    alleppey: [24, 31],
    leh: [8, 22],
    udaipur: [25, 35],
    shimla: [14, 24],
    rishikesh: [22, 33],
    varanasi: [26, 36],
  };
  const defaultT = [20, 30] as [number, number];
  return tempTable[destinationId] || defaultT;
}

export async function getSeasonalFallback(
  destinationId: string,
  destinationName: string,
  lat: number,
  lng: number
): Promise<WeatherData> {
  const month = new Date().getMonth() + 1;
  const [min, max] = seasonalAverageForNow(destinationId, month);
  const avg = Math.round((min + max) / 2);
  const profile = destinations.find((d) => d.id === destinationId);
  let conditions: WeatherData["conditions"] = "clear";
  if (destinationId === "munnar" && month >= 6 && month <= 8) conditions = "rain";
  if ((destinationId === "gulmarg" || destinationId === "manali") && (month === 12 || month === 1 || month === 2)) conditions = "snow";
  if (destinationId === "ooty" || destinationId === "darjeeling") conditions = "fog";

  return {
    destinationId,
    name: destinationName,
    tempC: avg,
    feelsLikeC: avg - 1,
    humidity: conditions === "rain" ? 82 : 55,
    windSpeedKmph: conditions === "snow" ? 25 : 12,
    windDirection: "N",
    conditions,
    rainProbability: conditions === "rain" ? 70 : conditions === "snow" ? 40 : 10,
    aqi: estimateAQI(destinationId),
    uvIndex: conditions === "clear" ? 7 : 3,
    precipitationMm: 0,
    sunrise: "",
    sunset: "",
    hour: new Date().getHours(),
    updatedMinutesAgo: 0,
    source: "seasonal-average",
    forecast: [],
  };
}
