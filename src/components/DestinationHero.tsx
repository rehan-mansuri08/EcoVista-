"use client";

import type { Destination } from "@/types";
import { useWeather } from "@/hooks/useWeather";
import { WeatherVisualizer } from "@/components/weather/WeatherVisualizer";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import { NowRecommendation } from "@/components/NowRecommendation";
import { MapPin, Mountain, ArrowRight } from "lucide-react";
import Link from "next/link";

export function DestinationHero({ destination }: { destination: Destination }) {
  const { weather, source, loading } = useWeather(
    destination.coordinates.lat,
    destination.coordinates.lng,
    destination.id,
    destination.name
  );

  const src = weather ? (weather.source === "live" ? weather : source) : "seasonal-average";

  return (
    <div className="relative min-h-[70vh] overflow-hidden">
      {/* Canvas weather background */}
      {weather && (
        <div className="absolute inset-0">
          <WeatherVisualizer weather={weather} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span>{destination.state}</span>
            <span className="text-zinc-500">·</span>
            <span>Nearest hub: {destination.nearestHub}</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
            {destination.name}
          </h1>
          <p className="mt-3 text-lg text-zinc-300">{destination.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full glass px-3 py-1 text-sm">
              <Mountain className="h-4 w-4 text-sky-300" /> {destination.altitude} m altitude
            </span>
            <span className="inline-flex items-center gap-1 rounded-full glass px-3 py-1 text-sm">
              {destination.facts.idealDuration} recommended
            </span>
            {destination.isFeatured && (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-300">
                Featured
              </span>
            )}
          </div>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300">
            {destination.description}
          </p>
          <Link
            href={`/planner?d=${destination.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
          >
            Plan Trip Here with AI <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Live panels */}
      <div className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {weather && <NowRecommendation destination={destination} weather={weather} />}
          </div>
          <div>
            {weather ? (
              <WeatherPanel weather={weather} />
            ) : (
              <div className="glass h-64 animate-pulse rounded-2xl" />
            )}
          </div>
        </div>
        {loading && (
          <div className="mt-3 text-xs text-zinc-500">
            {src === "seasonal-average" ? "Showing seasonal averages… fetching live data." : "Loading live data…"}
          </div>
        )}
      </div>
    </div>
  );
}
