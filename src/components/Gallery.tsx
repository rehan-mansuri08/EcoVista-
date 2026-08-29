"use client";

import { useState } from "react";
import Image from "next/image";
import type { Destination } from "@/types";

const tabs = ["landscape", "food", "heritage", "culture"] as const;
const tabLabels: Record<string, string> = {
  landscape: "Landscapes",
  food: "Food",
  heritage: "Heritage",
  culture: "Culture",
};

export function Gallery({ destination }: { destination: Destination }) {
  const [active, setActive] = useState<(typeof tabs)[number]>("landscape");
  const images = destination.images[active];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Gallery</h3>
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                active === t ? "bg-emerald-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((src, i) => (
          <div key={i} className="relative h-40 overflow-hidden rounded-xl sm:h-56">
            <Image
              src={src}
              alt={`${destination.name} ${tabLabels[active]} ${i + 1}`}
              fill
              sizes="(max-width:768px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
