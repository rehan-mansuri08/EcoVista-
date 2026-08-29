"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserTrip } from "@/types";
import { Loader2, Map, Trash2, Download } from "lucide-react";

function TripsInner() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthMessage("Sign in to view and sync your saved trips across devices.");
      }
      const { data, error } = await supabase
        .from("user_trips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error && error.code === "42501") {
        setAuthMessage("Sign in required to view trips.");
      } else if (data) {
        setTrips(data);
      }
      setLoading(false);
    };
    load();
  }, []);

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("user_trips").delete().eq("id", id);
    if (!error) setTrips((t) => t.filter((x) => x.id !== id));
  };

  const exportICS = (trip: any) => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EcoVista//Trip//EN"];
    trip.days.forEach((d: any) => {
      const start = d.date.replace(/-/g, "") + "T090000";
      const end = d.date.replace(/-/g, "") + "T180000";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${trip.id}-${d.date}@ecovista`);
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
      lines.push(`SUMMARY:${d.title}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/\s+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading trips…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">My Trips</h1>
      <p className="mt-2 text-zinc-400">
        {authMessage || `${trips.length} saved itinerary${trips.length === 1 ? "" : "ies"}`}
      </p>

      {trips.length === 0 ? (
        <div className="glass mt-8 rounded-2xl p-12 text-center">
          <Map className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-4 text-lg font-semibold">No saved trips yet</p>
          <p className="mt-1 text-sm text-zinc-400">Build one with the AI Trip Planner and it will appear here.</p>
          <a href="/planner" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 font-bold text-black">
            Plan a Trip
          </a>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-5">
              <h3 className="font-bold">{t.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {t.destinations?.join(" → ")} · {t.party_type} · {t.budget_tier}
              </p>
              <div className="mt-3 text-sm">
                <span className="text-zinc-400">
                  {t.days?.length || 0} days · Total ₹{(t.cost_breakdown?.total || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => exportICS(t)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" /> iCal
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading…</div>}>
      <TripsInner />
    </Suspense>
  );
}
