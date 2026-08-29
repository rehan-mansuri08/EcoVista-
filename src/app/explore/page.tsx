"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Destination, TerrainType } from "@/types";
import { useLiveDestinations } from "@/hooks/useLiveDestinations";
import { DestinationCard } from "@/components/DestinationCard";
import { SearchBar } from "@/components/SearchBar";
import { CompareModal } from "@/components/CompareModal";
import { SlidersHorizontal, GitCompare, X, Database } from "lucide-react";

const terrains: { id: TerrainType | "all"; label: string }[] = [
  { id: "all", label: "All Terrains" },
  { id: "himalayas", label: "Himalayas" },
  { id: "beaches", label: "Beaches" },
  { id: "deserts", label: "Deserts" },
  { id: "western_ghats", label: "Western Ghats" },
  { id: "heritage", label: "Heritage" },
  { id: "backwaters", label: "Backwaters" },
  { id: "northeast", label: "Northeast" },
  { id: "wildlife", label: "Wildlife" },
  { id: "spiritual", label: "Spiritual" },
];

function ExploreInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const { destinations: liveDests, liveSource, syncing } = useLiveDestinations();

  const [terrain, setTerrain] = useState<TerrainType | "all">("all");
  const [state, setState] = useState("all");
  const [condition, setCondition] = useState("all");
  const [compare, setCompare] = useState<Destination[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const states = useMemo(
    () => Array.from(new Set(liveDests.map((d) => d.state))).sort(),
    [liveDests]
  );

  const filtered = useMemo(() => {
    let list = liveDests;
    if (terrain !== "all") list = list.filter((d) => d.terrainType === terrain);
    if (state !== "all") list = list.filter((d) => d.state === state);
    const month = new Date().getMonth() + 1;
    if (condition === "snow") {
      list = list.filter((d) => d.terrainType === "himalayas" || d.terrainType === "northeast");
    } else if (condition === "monsoon") {
      list = list.filter(
        (d) =>
          d.terrainType === "western_ghats" ||
          d.terrainType === "backwaters" ||
          d.terrainType === "beaches"
      );
    } else if (condition === "clear") {
      list = list.filter((d) => !["himalayas", "northeast"].includes(d.terrainType));
    } else if (condition === "fog") {
      list = list.filter((d) => d.terrainType === "western_ghats");
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q) ||
          d.tagline.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [terrain, state, query, condition, liveDests]);

  // condition filter uses live weather

  const toggleCompare = (d: Destination) => {
    setCompare((prev) => {
      if (prev.some((x) => x.id === d.id)) return prev.filter((x) => x.id !== d.id);
      if (prev.length >= 2) return prev;
      return [...prev, d];
    });
  };

  return (
    <div className="mx-auto max-w-7xl flex-1 px-4 pb-16 sm:px-6">
      <div className="py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">Explore India</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${syncing ? "bg-amber-500/15 text-amber-300" : liveSource === "supabase" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"}`}>
            <Database className="h-3.5 w-3.5" />
            {syncing ? "Syncing…" : liveSource === "supabase" ? "Live · Supabase" : "Offline catalog"}
          </span>
        </div>
        <p className="mt-2 text-zinc-400">
          Filter by terrain, state, and live conditions to find your perfect escape.
        </p>
      </div>

      <SearchBar />

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={terrain}
            onChange={(e) => setTerrain(e.target.value as any)}
            className="glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            {terrains.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface text-white">
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all" className="bg-surface text-white">All States</option>
            {states.map((s) => (
              <option key={s} value={s} className="bg-surface text-white">{s}</option>
            ))}
          </select>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="glass rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all" className="bg-surface text-white">All Seasons</option>
            <option value="snow" className="bg-surface text-white">❄️ Snow</option>
            <option value="monsoon" className="bg-surface text-white">🌧️ Monsoon</option>
            <option value="clear" className="bg-surface text-white">☀️ Clear</option>
            <option value="fog" className="bg-surface text-white">🌫️ Fog</option>
          </select>
        </div>
      </div>

      {/* Compare bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowCompare(true)}
          disabled={compare.length !== 2}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GitCompare className="h-4 w-4" />
          Compare ({compare.length}/2)
        </button>
        {compare.length > 0 && (
          <div className="flex items-center gap-2">
            {compare.map((d) => (
              <span key={d.id} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm">
                {d.name}
                <button onClick={() => toggleCompare(d)} className="text-zinc-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {query && (
        <div className="mb-4 text-sm text-zinc-400">
          Results for <span className="font-semibold text-emerald-300">“{query}”</span> — {filtered.length} destination{filtered.length === 1 ? "" : "s"}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-lg font-semibold">No destinations match those filters</p>
          <button onClick={() => { setTerrain("all"); setState("all"); }} className="mt-3 text-sm text-emerald-400">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((d) => (
            <div key={d.id} className="relative">
              <button
                onClick={() => toggleCompare(d)}
                disabled={compare.length >= 2 && !compare.some((x) => x.id === d.id)}
                className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-zinc-100 opacity-0 transition-opacity hover:bg-white/10 disabled:opacity-0 group-hover:opacity-100 bg-black/40"
              >
                <GitCompare className="h-4 w-4" />
              </button>
              <DestinationCard destination={d} />
            </div>
          ))}
        </div>
      )}

      {showCompare && compare.length === 2 && (
        <CompareModal a={compare[0]} b={compare[1]} onClose={() => setShowCompare(false)} />
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading…</div>}>
      <ExploreInner />
    </Suspense>
  );
}
