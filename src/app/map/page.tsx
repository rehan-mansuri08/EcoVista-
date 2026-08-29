"use client";

import { useState } from "react";
import type { Destination } from "@/types";
import { useLiveDestinations } from "@/hooks/useLiveDestinations";
import InteractiveMap from "@/components/map/MapView";
import { MapPin, Database } from "lucide-react";

export default function MapPage() {
  const [selected, setSelected] = useState<Destination | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { destinations, liveSource, syncing } = useLiveDestinations();

  const filtered = destinations.filter(
    (d) => filter === "all" || d.terrainType === filter
  );

  const terrains = ["all", "himalayas", "beaches", "deserts", "western_ghats", "heritage", "backwaters", "northeast", "spiritual"];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 pb-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Interactive India Map</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${syncing ? "bg-amber-500/15 text-amber-300" : liveSource === "supabase" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"}`}>
            <Database className="h-3.5 w-3.5" />
            {syncing ? "Syncing…" : liveSource === "supabase" ? "Live · Supabase" : "Offline catalog"}
          </span>
        </div>
        <p className="mt-1 text-zinc-400">
          Live weather pins · tap a destination to zoom · toggle map style
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {terrains.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === t
                  ? "bg-gradient-to-r from-emerald-400 to-sky-500 text-black"
                  : "glass text-zinc-300 hover:bg-white/10"
              }`}
            >
              {t === "all" ? "All" : t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-4 sm:px-6">
        <InteractiveMap
          destinations={filtered}
          selected={selected}
          height="calc(100vh - 300px)"
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <h2 className="mb-3 mt-4 text-lg font-bold">Destinations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setSelected(d);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex items-center gap-3 rounded-xl glass p-3 text-left transition-colors hover:border-emerald-400/40 ${
                selected?.id === d.id ? "border-emerald-400/60 bg-emerald-400/5" : ""
              }`}
            >
              <MapPin className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold">{d.name}</div>
                <div className="text-xs text-zinc-500">{d.state} · {d.altitude}m</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
