"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";

const suggestions = [
  "snow places in December",
  "beaches near Goa for 3 days",
  "family monsoon destinations",
  "budget hill stations",
  "desert camping Rajasthan",
];

export function SearchBar({ onQuery }: { onQuery?: (q: string) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (onQuery) {
      onQuery(q);
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
      <form
        onSubmit={submit}
        className="glass-strong flex items-center gap-2 rounded-2xl p-2 shadow-xl shadow-black/30"
      >
        <Search className="ml-3 h-5 w-5 shrink-0 text-emerald-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "snow places in December" or "family monsoon destinations"…'
          className="w-full bg-transparent py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
        >
          <Sparkles className="h-4 w-4" /> Search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 pb-8">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              if (onQuery) onQuery(s);
              else router.push(`/explore?q=${encodeURIComponent(s)}`);
            }}
            className="glass rounded-full px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
