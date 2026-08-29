"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

type MapProps = ComponentProps<
  typeof import("./InteractiveMap").InteractiveMap
>;

const InteractiveMap = dynamic(
  () => import("./InteractiveMap").then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-white/10 bg-surface text-sm text-zinc-400">
        Loading map…
      </div>
    ),
  }
) as React.ComponentType<MapProps>;

export default function MapView(props: MapProps) {
  return <InteractiveMap {...props} />;
}
