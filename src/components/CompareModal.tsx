"use client";

import { useWeather } from "@/hooks/useWeather";
import type { Destination } from "@/types";
import { X, Phone, Snowflake, Users, Wallet, MapPin } from "lucide-react";
import { useState } from "react";

function Row({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
      <Icon className="h-4 w-4 text-emerald-400" /> {label}
    </div>
  );
}

function CellA({ dest }: { dest: Destination }) {
  const { weather } = useWeather(dest.coordinates.lat, dest.coordinates.lng, dest.id, dest.name);
  const month = new Date().getMonth() + 1;
  const isHimalaya = dest.terrainType === "himalayas" || dest.terrainType === "northeast";
  const snowProb = isHimalaya && (month === 12 || month === 1 || month === 2) ? 90 : isHimalaya ? 60 : 0;

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-bold">{dest.name}</h3>
      <p className="text-xs text-zinc-400">{dest.state} · {dest.altitude}m</p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400"><Wallet className="h-3.5 w-3.5" /> Budget</span>
          <span className="font-semibold capitalize">{dest.facts.bestTimeHint.split(",")[0].trim() || "Moderate"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400"><Snowflake className="h-3.5 w-3.5" /> Snow Probability</span>
          <span className="font-semibold text-sky-300">{snowProb}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400"><Users className="h-3.5 w-3.5" /> Family-Friendly</span>
          <span className={`font-semibold capitalize ${dest.terrainType === "western_ghats" || dest.terrainType === "backwaters" || dest.terrainType === "beaches" ? "text-emerald-300" : "text-amber-300"}`}>
            {dest.terrainType === "himalayas" || dest.terrainType === "northeast" ? "Moderate" : "High"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400"><MapPin className="h-3.5 w-3.5" /> Access</span>
          <span className="text-right">{dest.facts.access}</span>
        </div>
        {weather && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400"><Phone className="hidden h-3.5 w-3.5" /> Live Temp</span>
            <span className="font-semibold">{Math.round(weather.tempC)}°C · {weather.conditions}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-400">Duration</span>
          <span>{dest.facts.idealDuration}</span>
        </div>
      </div>
    </div>
  );
}

export function CompareModal({
  a,
  b,
  onClose,
}: {
  a: Destination;
  b: Destination;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-strong w-full max-w-3xl rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Destination Comparison</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CellA dest={a} />
          <CellA dest={b} />
        </div>
        <div className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-zinc-300">
          <strong className="text-emerald-300">Tip:</strong> {a.name} and {b.name} differ most in{" "}
          {a.terrainType !== b.terrainType ? "terrain and seasonal focus" : "access and atmosphere"}.
          Use the{" "}
          <a href="/planner" className="font-semibold text-sky-300 underline">AI Trip Planner</a>{" "}
          to combine them into one itinerary.
        </div>
      </div>
    </div>
  );
}
