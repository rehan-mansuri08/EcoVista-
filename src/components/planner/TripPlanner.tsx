"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Plane,
  CalendarDays,
  Users,
  Wallet,
  Gauge,
  Heart,
  Sparkles,
  Loader2,
  ArrowRight,
  MapPin,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Sun,
  CloudSun,
  Moon,
} from "lucide-react";
import { destinations } from "@/lib/data/destinations";
import type { BudgetTier, ItineraryDay, UserTrip } from "@/types";
import { generateItinerary, getSwapCandidates } from "@/lib/planner";
import InteractiveMap from "@/components/map/MapView";
import { ShareTripModal } from "@/components/ShareTripModal";
import { createClient } from "@/lib/supabase/client";

const interests = ["Nature", "Heritage", "Food", "Adventure", "Spiritual"];

function TripPlannerInner() {
  const searchParams = useSearchParams();
  const preDest = searchParams.get("d");

  const [step, setStep] = useState<"elicit" | "building" | "result">("elicit");
  const [trip, setTrip] = useState<UserTrip | null>(null);
  const [chat, setChat] = useState<{ role: string; text: string }[]>([
    {
      role: "ai",
      text: "Hi! I'm EcoVista AI. Tell me where you dream of going, your dates, budget, and interests — I'll craft a weather-aware itinerary.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharers, setSharers] = useState<string[]>(trip?.sharedWith || []);

  const [form, setForm] = useState({
    origin: "",
    startDate: "",
    endDate: "",
    partyType: "couple" as "solo" | "couple" | "family" | "friends",
    budgetTier: "moderate" as BudgetTier,
    pacing: "balanced" as "relaxed" | "balanced" | "packed",
    interests: ["Nature"] as string[],
    destinationIds: (preDest ? [destinations.find((d) => d.slug === preDest)?.id || ""] : [])
      .filter(Boolean),
  });

  useEffect(() => {
    if (preDest) {
      const id = destinations.find((d) => d.slug === preDest)?.id;
      if (id) setForm((f) => ({ ...f, destinationIds: [id] }));
    }
  }, [preDest]);

  const toggleInterest = (i: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));

  const toggleDest = (id: string) =>
    setForm((f) => ({
      ...f,
      destinationIds: f.destinationIds.includes(id)
        ? f.destinationIds.filter((x) => x !== id)
        : [...f.destinationIds, id],
    }));

  const buildTrip = async () => {
    setStep("building");
    await new Promise((r) => setTimeout(r, 900));
    const destIds = form.destinationIds.length
      ? form.destinationIds
      : ["goa"];

    // Gather live weather for each destination so planning is weather-aware.
    const weatherMap: Record<string, { conditions: string }> = {};
    try {
      await Promise.all(
        destIds.map(async (id) => {
          const dest = destinations.find((d) => d.id === id);
          if (!dest) return;
          const res = await fetch(
            `/api/weather?lat=${dest.coordinates.lat}&lng=${dest.coordinates.lng}`
          );
          if (res.ok) {
            const w = await res.json();
            weatherMap[id] = { conditions: w?.conditions || "clear" };
          }
        })
      );
    } catch {
      // non-fatal: fall back to rule-based selection
    }

    const result = generateItinerary({
      origin: form.origin || "Delhi",
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      endDate:
        form.endDate ||
        new Date(
          new Date().getTime() + 3 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0],
      partyType: form.partyType,
      budgetTier: form.budgetTier,
      pacing: form.pacing,
      interests: form.interests,
      destinationIds: destIds,
      weather: weatherMap,
    });

    const tripDestinations = destIds
      .map((id) => destinations.find((d) => d.id === id)?.name || "")
      .filter(Boolean);

    setTrip({
      id: `local-${Date.now()}`,
      title: `${tripDestinations.join(" & ") || "My Trip"} — ${result.days.length} days`,
      origin: form.origin || "Delhi",
      destinationIds: destIds,
      destinations: tripDestinations,
      startDate: form.startDate || "",
      endDate: form.endDate || "",
      partyType: form.partyType,
      budgetTier: form.budgetTier,
      pacing: form.pacing,
      interests: form.interests,
      status: "draft",
      days: result.days,
      costBreakdown: result.costBreakdown,
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setStep("result");
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChat((c) => [...c, { role: "user", text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setChat((c) => [...c, { role: "ai", text: data.reply || "Hmm, I couldn't answer that." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const reorderDays = (from: number, to: number) => {
    if (!trip) return;
    const days = [...trip.days];
    const [moved] = days.splice(from, 1);
    days.splice(to, 0, moved);
    setTrip({ ...trip, days, updatedAt: new Date().toISOString() });
  };

  const swapActivity = async (dayIdx: number, slotIdx: number) => {
    if (!trip) return;
    const slot = trip.days[dayIdx].slots[slotIdx];
    const destId = trip.destinationIds.find((id) => {
      const d = destinations.find((x) => x.id === id);
      return slot.title.toLowerCase().includes(d?.name.toLowerCase() || "");
    });
    const candidates = await getSwapCandidates(
      destId || trip.destinationIds[0],
      slot.activityId
    );
    if (!candidates.length) return;
    const replacement = candidates[0];
    const days = trip.days.map((d, di) =>
      di === dayIdx
        ? {
            ...d,
            slots: d.slots.map((s, si) =>
              si === slotIdx
                ? {
                    ...s,
                    activityId: replacement.id,
                    title: replacement.name,
                    category: replacement.category,
                    durationHours: replacement.durationHours,
                    cost: s.cost,
                    note: replacement.indoor ? "Indoor backup" : "Outdoor",
                  }
                : s
            ),
          }
        : d
    );
    setTrip({ ...trip, days, updatedAt: new Date().toISOString() });
  };

  const saveTrip = async () => {
    if (!trip) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("user_trips").insert({
      title: trip.title,
      origin: trip.origin,
      destination_ids: trip.destinationIds,
      destinations: trip.destinations,
      start_date: trip.startDate,
      end_date: trip.endDate,
      party_type: trip.partyType,
      budget_tier: trip.budgetTier,
      pacing: trip.pacing,
      interests: trip.interests,
      status: "planned",
      days: trip.days,
      cost_breakdown: trip.costBreakdown,
    });
    if (error) {
      if (error.message.includes("anon") || error.message.includes("permission")) {
        alert("Auth required to save trips to Supabase. Try: sign in or check RLS. (Demo: itinerary shown below)");
      } else {
        alert("Could not save: " + error.message);
      }
      return;
    }
    alert("Trip saved! It will appear in My Trips.");
  };

  const routes = useMemo(() => {
    if (!trip) return [];
    const seen = new Map<string, number>();
    const out: { lat: number; lng: number; day: number; label: string }[] = [];
    trip.days.forEach((d, i) => {
      const dest = destinations.find((x) => x.id === trip.destinationIds[i] || d.title.includes(x.name));
      if (dest && !seen.has(dest.id)) {
        seen.set(dest.id, i + 1);
        out.push({ lat: dest.coordinates.lat, lng: dest.coordinates.lng, day: i + 1, label: dest.name });
      }
    });
    return out;
  }, [trip]);

  // ---- RENDER ----
  if (step === "building") {
    return (
      <div className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-4 py-24 sm:px-6">
        <div className="relative grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 text-black shadow-2xl shadow-emerald-500/30">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold">Crafting your itinerary…</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking live weather & balancing your budget
        </p>
      </div>
    );
  }

  if (step !== "result") {
    return (
      <div className="mx-auto max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">AI Trip Planner</h1>
          <p className="mt-2 text-zinc-400">Answer a few questions to build a weather-aware, day-by-day itinerary.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="h-5 w-5 text-emerald-400" /> Trip Parameters
            </h2>

            <label className="mb-1 block text-sm font-medium text-zinc-300">Origin City</label>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="e.g. Delhi, Mumbai"
              className="mb-4 w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            />

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Users className="h-4 w-4" /> Party Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["solo", "couple", "family", "friends"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, partyType: p as any })}
                    className={`rounded-xl px-3 py-2 text-sm capitalize transition-colors ${
                      form.partyType === p ? "bg-emerald-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Wallet className="h-4 w-4" /> Budget Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["budget", "moderate", "luxury"] as BudgetTier[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setForm({ ...form, budgetTier: b })}
                    className={`rounded-xl px-3 py-2 text-sm capitalize transition-colors ${
                      form.budgetTier === b ? "bg-emerald-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Gauge className="h-4 w-4" /> Pacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["relaxed", "balanced", "packed"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, pacing: p })}
                    className={`rounded-xl px-3 py-2 text-sm capitalize transition-colors ${
                      form.pacing === p ? "bg-emerald-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Heart className="h-4 w-4" /> Interests
              </label>
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      form.interests.includes(i) ? "bg-sky-400 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={buildTrip}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 font-bold text-black transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="h-5 w-5" /> Generate AI Itinerary
            </button>
          </div>

          {/* Destination picker + chat */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <MapPin className="h-5 w-5 text-emerald-400" /> Choose Destinations
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {destinations.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toggleDest(d.id)}
                    className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      form.destinationIds.includes(d.id) ? "border border-emerald-400/60 bg-emerald-400/10" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-[11px] text-zinc-500">{d.state}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-emerald-400" /> Ask the AI Concierge
              </h2>
              <div className="mb-3 max-h-56 space-y-3 overflow-y-auto">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-emerald-400/15 text-emerald-100"
                        : "bg-white/5 text-zinc-200"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> thinking…
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask anything about India travel…"
                  className="flex-1 rounded-xl bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading}
                  className="rounded-xl bg-emerald-400 px-4 py-2.5 text-black disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  return (
    <div className="mx-auto max-w-7xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{trip?.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {trip?.destinations.join(" → ")} · {trip?.partyType} · {trip?.pacing} pacing · {trip?.budgetTier} budget
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={saveTrip} className="rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-4 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform">
            💾 Save to My Trips
          </button>
          <button onClick={() => setStep("elicit")} className="rounded-xl glass px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
            Edit Plan
          </button>
          {trip && (
            <ShareTripModal tripId={trip.id} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Itinerary */}
        <div className="space-y-4 lg:col-span-2">
          {trip?.days.map((day, di) => (
            <div key={di} className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">{day.title}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => di > 0 && reorderDays(di, di - 1)}
                    disabled={di === 0}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {day.slots.map((slot, si) => (
                  <div key={si} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                    <div className="flex flex-col items-center pt-0.5">
                      {slot.timeBlock === "morning" ? <Sun className="h-4 w-4 text-amber-300" />
                        : slot.timeBlock === "afternoon" ? <CloudSun className="h-4 w-4 text-sky-300" />
                        : <Moon className="h-4 w-4 text-indigo-300" />}
                      <span className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{slot.timeBlock}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{slot.title}</div>
                      <div className="text-xs text-zinc-500">{slot.location} · {slot.category} · {slot.durationHours}h</div>
                      {slot.note && <div className="mt-1 text-[11px] text-sky-300">{slot.note}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{slot.cost.toLocaleString("en-IN")}</div>
                      <button
                        onClick={() => swapActivity(di, si)}
                        className="mt-1 flex items-center gap-1 rounded-lg bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/25"
                      >
                        <RefreshCw className="h-3 w-3" /> Swap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: map + budget */}
        <div className="space-y-5">
          <InteractiveMap
            destinations={destinations.filter((d) => trip?.destinationIds.includes(d.id))}
            routes={routes}
            height="320px"
          />
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-1 text-lg font-bold">Detailed Budget</h3>
            <p className="mb-4 text-xs text-zinc-400">
              {trip?.costBreakdown.currency} · {trip?.costBreakdown.days} days · Party of {trip?.costBreakdown.partySize} · Per-head ₹{trip?.costBreakdown.perHeadTotal.toLocaleString("en-IN")}
            </p>
            {trip && (
              <>
                {/* Category summary with bars */}
                <div className="space-y-2.5 text-sm">
                  {(
                    [
                      ["Transit", trip.costBreakdown.transit, "bg-sky-400"],
                      ["Stay", trip.costBreakdown.stay, "bg-violet-400"],
                      ["Food", trip.costBreakdown.food, "bg-emerald-400"],
                      ["Activities", trip.costBreakdown.activities, "bg-amber-400"],
                      ["Misc", trip.costBreakdown.misc, "bg-rose-400"],
                    ] as const
                  ).map(([label, val, color]) => {
                    const pct = Math.round((val / Math.max(1, trip.costBreakdown.total)) * 100);
                    return (
                      <div key={label}>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">{label}</span>
                          <span className="font-medium">₹{val.toLocaleString("en-IN")} <span className="text-zinc-500">({pct}%)</span></span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="text-emerald-300">₹{trip.costBreakdown.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Transit legs */}
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Transit</h4>
                  <div className="space-y-1.5">
                    {trip.costBreakdown.transitLegs.map((leg, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{leg.label}</span>
                        <span className="font-medium">₹{leg.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-white/5 pt-1.5 text-xs font-semibold">
                      <span>Transit total</span>
                      <span>₹{trip.costBreakdown.transit.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Stay per destination */}
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Stay</h4>
                  <div className="space-y-1.5">
                    {trip.costBreakdown.stayLines.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{s.name} · {s.nights} night{s.nights > 1 ? "s" : ""} × ₹{(s.ratePerNight).toLocaleString("en-IN")}</span>
                        <span className="font-medium">₹{s.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-white/5 pt-1.5 text-xs font-semibold">
                      <span>Stay total</span>
                      <span>₹{trip.costBreakdown.stay.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Misc */}
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Other costs</h4>
                  <div className="space-y-1.5">
                    {trip.costBreakdown.miscLines.map((m, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{m.label}</span>
                        <span className="font-medium">₹{m.amount.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-day table */}
                <div className="mt-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Day-by-day</h4>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {trip.costBreakdown.perDay.map((d) => (
                      <div key={d.day} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Day {d.day} · {d.destination}</span>
                        <span className="font-medium">₹{d.total.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between border-t border-white/5 pt-1.5 text-xs font-semibold">
                    <span>Budgeted total</span>
                    <span>₹{trip.costBreakdown.totalPerDay.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </>
            )}
          </div>
<div className="glass rounded-2xl p-4 text-xs text-zinc-400">
            📌 Drag days to reorder · Use <span className="text-sky-300">Swap</span> for weather-aware alternates · Save to persist in Supabase.
          </div>
        </div>
      </div>
    </div>
  );
}
export function TripPlanner() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading planner…</div>}>
      <TripPlannerInner />
    </Suspense>
  );
}
