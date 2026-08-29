"use client";

import { useMemo } from "react";
import { evaluateDestination } from "@/lib/intelligence";
import type { Destination, WeatherData } from "@/types";
import { Sparkles, Check, Lightbulb, ShieldAlert } from "lucide-react";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "best-window": "bg-sky-500/15 text-sky-300 border-sky-500/30",
  caution: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  advisory: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  restricted: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function NowRecommendation({
  destination,
  weather,
}: {
  destination: Destination;
  weather: WeatherData;
}) {
  const rec = useMemo(
    () => evaluateDestination(destination, weather, new Date().getMonth() + 1),
    [destination, weather]
  );

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-bold">What Can I Do Right Now?</h3>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${statusStyles[rec.status]}`}>
          <span>{rec.emoji}</span>
          {rec.statusLabel}
        </span>
        <span className="text-sm text-zinc-400">
          {new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric" })}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-300">{rec.summary}</p>

      {rec.recommended.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Recommended
          </div>
          {rec.recommended.map((r) => (
            <div
              key={r.activityId}
              className="flex items-start gap-2 rounded-xl bg-white/5 p-2.5"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-white">{r.name}</div>
                <div className="text-xs text-zinc-400">{r.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rec.tips.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400">
            <Lightbulb className="h-3.5 w-3.5" /> Pro Tips
          </div>
          {rec.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
