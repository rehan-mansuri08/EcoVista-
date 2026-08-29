"use client";

import { useEffect, useState } from "react";
import type { Destination } from "@/types";
import { destinations as staticDestinations } from "@/lib/data/destinations";

export function useLiveDestinations(ids?: string[]) {
  const [destinations, setDestinations] = useState<Destination[]>(
    (ids && ids.length
      ? staticDestinations.filter((d) => ids.includes(d.id))
      : staticDestinations
    ).filter((d): d is Destination => !!d)
  );
  const [liveSource, setLiveSource] = useState<"supabase" | "static">("static");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSyncing(true);
    fetch("/api/destinations?all=1")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: Destination[] = data?.destinations || [];
        if (list.length) {
          setDestinations(ids && ids.length ? list.filter((d) => ids.includes(d.id)) : list);
          setLiveSource("supabase");
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setSyncing(false));
    return () => {
      cancelled = true;
    };
  }, [ids ? ids.join(",") : ""]);

  return { destinations, liveSource, syncing };
}
