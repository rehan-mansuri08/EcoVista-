"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiveDestinations } from "@/hooks/useLiveDestinations";
import { DestinationCard } from "@/components/DestinationCard";
import { SearchBar } from "@/components/SearchBar";
import { Sparkles, Loader2, Database, ArrowRight } from "lucide-react";

interface AIMatch {
  id: string;
  name: string;
  slug: string;
  state: string;
  tagline: string;
  image: string;
  terrainType: string;
  reasons: string[];
}

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { destinations, liveSource, syncing } = useLiveDestinations();
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const filtered = destinations.filter((d) => {
    const q = query.toLowerCase();
    return q
      ? d.name.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q) ||
          d.tagline.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      : true;
  });

  const runAI = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query || "recommend India destinations" }),
      });
      const data = await res.json();
      setAiReply(data.reply || "No response.");
      setMatches(data.matches || []);
    } finally {
      setLoadingAi(false);
    }
  };

  const planThis = (slug: string) => {
    router.push(`/planner?d=${slug}`);
  };

  return (
    <div className="mx-auto max-w-7xl flex-1 px-4 pb-16 sm:px-6">
      <div className="py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Search & AI Concierge</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${syncing ? "bg-amber-500/15 text-amber-300" : liveSource === "supabase" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"}`}>
            <Database className="h-3.5 w-3.5" />
            {syncing ? "Syncing…" : liveSource === "supabase" ? "Live · Supabase" : "Offline catalog"}
          </span>
        </div>
        <p className="mt-2 text-zinc-400">Ask in natural language or browse results.</p>
      </div>

      <SearchBar />

      {query && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-zinc-400">
            <span>Results for</span>
            <span className="font-semibold text-emerald-300">“{query}”</span>
          </div>

          {matches.length > 0 && (
            <div className="mb-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Sparkles className="h-4 w-4" /> AI Recommended matches
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {matches.map((m) => (
                  <div key={m.id} className="glass relative overflow-hidden rounded-2xl">
                    <div
                      className="h-28 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${m.image})` }}
                    />
                    <div className="p-3">
                      <div className="font-bold">{m.name}</div>
                      <div className="text-[11px] text-zinc-500">{m.state}</div>
                      {m.reasons.length > 0 && (
                        <div className="mt-1 text-[11px] text-sky-300">✦ {m.reasons.join(" · ")}</div>
                      )}
                      <button
                        onClick={() => planThis(m.slug)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-sky-500 px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
                      >
                        Plan this trip <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={runAI}
            disabled={loadingAi}
            className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Ask AI about this
          </button>
          {aiReply && (
            <div className="mt-4 glass rounded-2xl p-5 text-sm leading-relaxed text-zinc-200">
              <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-300">
                <Sparkles className="h-4 w-4" /> EcoVista AI
              </div>
              <div className="whitespace-pre-line">{aiReply}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((d) => (
          <DestinationCard key={d.id} destination={d} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
