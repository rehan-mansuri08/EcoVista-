"use client";

import { useMemo } from "react";
import type { Destination } from "@/types";

// Per-destination month quality assessment (1-5)
const qualityMap: Record<string, number[]> = {
  gulmarg: [5, 5, 4, 3, 3, 3, 3, 3, 3, 4, 4, 5],
  manali: [4, 4, 4, 5, 4, 3, 3, 3, 3, 4, 4, 4],
  munnar: [4, 4, 4, 4, 3, 2, 2, 2, 3, 4, 5, 5],
  jaisalmer: [4, 5, 5, 3, 2, 1, 1, 1, 2, 3, 4, 4],
  goa: [5, 5, 5, 4, 3, 2, 2, 2, 3, 4, 5, 5],
  agra: [5, 5, 5, 3, 2, 1, 1, 1, 2, 3, 4, 5],
  ooty: [3, 3, 3, 4, 4, 3, 2, 2, 3, 4, 4, 3],
  darjeeling: [3, 3, 3, 4, 5, 4, 3, 3, 3, 4, 4, 3],
  leh: [1, 1, 1, 2, 4, 5, 5, 5, 5, 3, 2, 1],
  alleppey: [4, 4, 4, 4, 3, 2, 2, 2, 3, 4, 5, 5],
  shimla: [3, 4, 4, 4, 5, 4, 4, 4, 4, 4, 3, 3],
  rishikesh: [4, 4, 4, 4, 4, 3, 3, 3, 4, 4, 4, 4],
  udaipur: [4, 5, 5, 4, 3, 2, 2, 2, 3, 4, 4, 4],
  varanasi: [4, 4, 5, 4, 3, 2, 2, 2, 3, 4, 4, 4],
  coorg: [4, 4, 4, 4, 3, 2, 2, 2, 3, 4, 5, 5],
  kodaikanal: [3, 3, 4, 4, 5, 4, 3, 3, 4, 4, 4, 3],
  mcleodGanj: [4, 4, 4, 5, 5, 4, 4, 4, 4, 4, 4, 4],
  gangtok: [3, 3, 4, 4, 5, 4, 4, 4, 4, 4, 4, 3],
  tawang: [2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 2],
  kaziranga: [4, 4, 4, 3, 1, 1, 1, 1, 1, 3, 4, 4],
};

const gradeColor = (q: number) =>
  q === 5 ? "bg-emerald-500 text-black"
  : q === 4 ? "bg-emerald-500/70 text-black"
  : q === 3 ? "bg-amber-500/60 text-black"
  : q === 2 ? "bg-orange-500/50 text-white"
  : "bg-red-500/50 text-white";

export const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SeasonMatrix({ destination }: { destination: Destination }) {
  const matrix = useMemo(() => qualityMap[destination.id] || Array(12).fill(3), [destination.id]);
  const currentMonth = new Date().getMonth();

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Best Time to Visit</h3>
        <span className="text-xs text-zinc-400">Monthly rating</span>
      </div>

      <div className="flex items-end gap-1">
        {matrix.map((q, i) => (
          <div key={i} className="group flex-1">
            <div
              className={`relative rounded-t-md ${gradeColor(q)} ${
                i === currentMonth ? "ring-2 ring-sky-400 ring-offset-1 ring-offset-surface" : ""
              }`}
              style={{ height: `${q * 14 + 6}px` }}
            />
            <div className="mt-1 text-center text-[10px] font-semibold text-zinc-400">
              {MONTHS[i]}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Excellent</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" /> Good</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60" /> Fair</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500/50" /> Poor</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500/50" /> Avoid</span>
      </div>

      <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm">
        <span className="text-emerald-300 font-semibold">Best time: </span>
        <span className="text-zinc-300">{destination.facts.bestTimeHint}</span>
        <span className="mt-1 block text-xs text-zinc-400">
          Ideal duration: {destination.facts.idealDuration}
        </span>
      </div>
    </div>
  );
}
