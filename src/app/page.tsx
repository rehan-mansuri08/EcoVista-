import Link from "next/link";
import {
  Sparkles,
  CloudSun,
  Map as MapIcon,
  Calendar,
  ArrowRight,
  Search,
  Compass,
  Plane,
  Wand2,
} from "lucide-react";
import { getAllDestinations } from "@/lib/supabase/data";
import { DestinationCard } from "@/components/DestinationCard";
import { SearchBar } from "@/components/SearchBar";

export default async function Home() {
  const all = await getAllDestinations();
  const featured = all.filter((d) => d.isFeatured).slice(0, 8);

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 via-transparent to-background" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm font-medium text-emerald-300">
              <CloudSun className="h-4 w-4" />
              Realtime India Travel Intelligence
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Explore India with <span className="text-gradient">live awareness</span> &
              AI-crafted trips
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-zinc-400">
              EcoVista blends visual discovery, real-time weather telemetry, seasonal
              intelligence, and an AI trip builder — plan smart trips across every state
              and union territory of India.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
              >
                <Wand2 className="h-5 w-5" />
                Build Trip with AI
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Compass className="h-5 w-5" />
                Explore Destinations
              </Link>
            </div>
          </div>
        </div>
        <SearchBar />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CloudSun, title: "Live Weather Telemetry", desc: "15-min cached temperature, AQI, rain & UV for every destination." },
            { icon: MapIcon, title: "Interactive India Map", desc: "Leaflet vector map with state overlays & live atmospheric pins." },
            { icon: Sparkles, title: "AI Trip Planner", desc: "Multi-day itineraries with weather-adaptive routing & budgets." },
            { icon: Calendar, title: "Seasonal Intelligence", desc: "\"What can I do right now?\" powered by month + live conditions." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-5 transition-colors hover:border-emerald-400/30">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-black">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured destinations */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Featured Destinations</h2>
            <p className="mt-1 text-sm text-zinc-400">Hand-picked escapes across India</p>
          </div>
          <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((d, i) => (
            <DestinationCard key={d.id} destination={d} priority={i < 4} />
          ))}
        </div>
      </section>

      {/* Quick inspiration bands */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/explore?q=snow" className="group relative h-44 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600/40 to-cyan-900/60 transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-4 left-4">
              <div className="text-2xl">❄️</div>
              <h3 className="text-lg font-bold text-white">Snow Escapes</h3>
              <p className="text-sm text-zinc-200">Gulmarg · Manali · Darjeeling</p>
            </div>
          </Link>
          <Link href="/explore?q=beach" className="group relative h-44 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400/40 to-blue-900/60 transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-4 left-4">
              <div className="text-2xl">🏖️</div>
              <h3 className="text-lg font-bold text-white">Beach Getaways</h3>
              <p className="text-sm text-zinc-200">Goa · Andaman · Kerala</p>
            </div>
          </Link>
          <Link href="/explore?q=heritage" className="group relative h-44 overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-orange-900/60 transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-4 left-4">
              <div className="text-2xl">🏛️</div>
              <h3 className="text-lg font-bold text-white">Heritage Trails</h3>
              <p className="text-sm text-zinc-200">Agra · Udaipur · Jaisalmer</p>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-8 text-center sm:p-12">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-sky-500/10" />
          <div className="relative">
            <Plane className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold sm:text-3xl">
              Let AI design your perfect Indian adventure
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-zinc-400">
              Answer a few questions about your dates, budget, and interests and let
              EcoVista build a weather-aware, day-by-day itinerary with live route mapping.
            </p>
            <Link
              href="/planner"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-8 py-3 font-semibold text-black transition-transform hover:scale-105"
            >
              <Search className="h-5 w-5" />
              Start Planning Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
