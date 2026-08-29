"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveDestinations } from "@/hooks/useLiveDestinations";
import { DestinationCard } from "@/components/DestinationCard";
import { SearchBar } from "@/components/SearchBar";
import { Sparkles, Loader2, Database } from "lucide-react";

function SearchInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { destinations, liveSource, syncing } = useLiveDestinations();
  const [aiReply, setAiReply] = useState<string | null>(null);
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
    } finally {
      setLoadingAi(false);
    }
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
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-zinc-400">
            <span>Results for</span>
            <span className="font-semibold text-emerald-300">“{query}”</span>
          </div>
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
