"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Mountain, Wind } from "lucide-react";
import type { Destination } from "@/types";
import { useWeather } from "@/hooks/useWeather";

const terrainLabel: Record<string, string> = {
  himalayas: "Himalayas",
  beaches: "Beaches",
  deserts: "Deserts",
  western_ghats: "Western Ghats",
  heritage: "Heritage",
  backwaters: "Backwaters",
  northeast: "Northeast",
  wildlife: "Wildlife",
  spiritual: "Spiritual",
  metropolitan: "Metropolitan",
};

export function DestinationCard({ destination, priority }: { destination: Destination; priority?: boolean }) {
  const { weather } = useWeather(
    destination.coordinates.lat,
    destination.coordinates.lng,
    destination.id,
    destination.name
  );

  const conditionsEmoji: Record<string, string> = {
    clear: "☀️", clouds: "⛅", rain: "🌧️", snow: "❄️", fog: "🌫️",
  };

  return (
    <Link
      href={`/india/${encodeURIComponent(destination.state)}/${destination.slug}`}
      className="group relative overflow-hidden rounded-2xl glass transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-xl hover:shadow-emerald-500/10"
    >
      <div className="relative h-44 overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium backdrop-blur">
          <MapPin className="h-3 w-3 text-emerald-400" />
          {destination.state}
        </div>
        {weather && (
          <div className="glass absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
            <span>{conditionsEmoji[weather.conditions]}</span>
            <span>{Math.round(weather.tempC)}°C</span>
            <span className="text-zinc-400">· {weather.rainProbability}% rain</span>
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-xl font-bold text-white drop-shadow">{destination.name}</h3>
          <p className="text-xs text-zinc-300">{destination.tagline}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-medium text-emerald-300">
            <Mountain className="h-3 w-3" /> {terrainLabel[destination.terrainType]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-medium text-sky-300">
            <Wind className="h-3 w-3" /> {destination.altitude} m
          </span>
          {destination.isFeatured && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300">
              Featured
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-zinc-400">{destination.facts.idealDuration}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 transition-transform group-hover:translate-x-1">
            Explore <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
