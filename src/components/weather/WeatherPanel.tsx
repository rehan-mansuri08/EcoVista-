"use client";

import type { WeatherData } from "@/types";
import {
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  Sun,
  RefreshCw,
  MapPin,
  Compass,
} from "lucide-react";

const conditionMeta: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  clear: { label: "Clear", color: "text-amber-300", emoji: "☀️" },
  clouds: { label: "Partly Cloudy", color: "text-sky-300", emoji: "⛅" },
  rain: { label: "Rain / Monsoon", color: "text-sky-400", emoji: "🌧️" },
  snow: { label: "Snow", color: "text-cyan-200", emoji: "❄️" },
  fog: { label: "Mist / Fog", color: "text-zinc-300", emoji: "🌫️" },
};

function aqiLabel(aqi: number): [string, string] {
  if (aqi <= 50) return ["Good", "bg-emerald-500/20 text-emerald-300"];
  if (aqi <= 100) return ["Moderate", "bg-yellow-500/20 text-yellow-300"];
  if (aqi <= 150) return ["Unhealthy (Sensitive)", "bg-orange-500/20 text-orange-300"];
  if (aqi <= 200) return ["Unhealthy", "bg-red-500/20 text-red-300"];
  return ["Very Unhealthy", "bg-rose-500/20 text-rose-300"];
}

export function liveTelemetry(
  weather: WeatherData
): { label: string; value: string; icon: any; sub?: string }[] {
  return [
    { label: "Temperature", value: `${Math.round(weather.tempC)}°C`, icon: Sun },
    { label: "RealFeel", value: `${Math.round(weather.feelsLikeC)}°C`, icon: Gauge },
    { label: "Humidity", value: `${weather.humidity}%`, icon: Droplets },
    {
      label: "Wind",
      value: `${weather.windSpeedKmph} km/h ${weather.windDirection}`,
      icon: Wind,
      sub: weather.windDirection ? `${weather.windDirection} · Compass` : undefined,
    },
    {
      label: "Rain Probability",
      value: `${weather.rainProbability}%`,
      icon: CloudRain,
    },
    {
      label: "AQI",
      value: `${weather.aqi}`,
      icon: Compass,
      sub: aqiLabel(weather.aqi)[0],
    },
    { label: "UV Index", value: `${weather.uvIndex}`, icon: Sun },
  ];
}

export function WeatherPanel({
  weather,
  onRefresh,
}: {
  weather: WeatherData;
  onRefresh?: () => void;
}) {
  const meta = conditionMeta[weather.conditions] || conditionMeta.clouds;
  const [aqiWord, aqiColor] = aqiLabel(weather.aqi);
  const updatedText =
    weather.updatedMinutesAgo === 0
      ? "Just now"
      : `${weather.updatedMinutesAgo} min ago`;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <span>{weather.name}</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Refresh weather"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-5xl font-bold tracking-tight text-white">
            {Math.round(weather.tempC)}°
            <span className="text-2xl text-zinc-400">C</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            <span>{meta.emoji}</span>
            <span className={meta.color}>{meta.label}</span>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-zinc-400">Feels {Math.round(weather.feelsLikeC)}°C</div>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${aqiColor}`}>
            AQI {weather.aqi} · {aqiWord}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 p-2.5 text-center">
          <Droplets className="mx-auto h-4 w-4 text-sky-400" />
          <div className="mt-1 text-sm font-semibold">{weather.humidity}%</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Humidity</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2.5 text-center">
          <Wind className="mx-auto h-4 w-4 text-emerald-400" />
          <div className="mt-1 text-sm font-semibold">
            {weather.windSpeedKmph} <span className="text-[10px]">km/h</span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">{weather.windDirection} Wind</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2.5 text-center">
          <CloudRain className="mx-auto h-4 w-4 text-sky-400" />
          <div className="mt-1 text-sm font-semibold">{weather.rainProbability}%</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Rain</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
        <span className="text-zinc-500">
          Updated {updatedText}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            weather.source === "live"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              weather.source === "live" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          {weather.source === "live" ? "Live" : "Seasonal Average"}
        </span>
      </div>

      {weather.updatedMinutesAgo === 0 && weather.source === "live" && (
        <div className="mt-2 hidden">
          {/* forecast placeholder */}
        </div>
      )}
    </div>
  );
}
