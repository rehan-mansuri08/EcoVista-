import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllDestinations, getDestinationBySlug, getActivitiesForDest, getAttractionsForDest } from "@/lib/supabase/data";
import { DestinationHero } from "@/components/DestinationHero";
import { SeasonMatrix } from "@/components/SeasonMatrix";
import { Gallery } from "@/components/Gallery";
import {
  Activity as ActivityIcon,
  MapPin,
  Clock,
  Ticket,
  Info,
} from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ state: string; destination: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const all = await getAllDestinations();
  return all.map((d) => ({
    state: d.state,
    destination: d.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { destination } = await params;
  const dest = await getDestinationBySlug(destination);
  if (!dest) return {};
  return {
    title: `${dest.name} — ${dest.state} | EcoVista`,
    description: dest.description,
    openGraph: { title: dest.name, description: dest.tagline, images: [dest.image] },
  };
}

export default async function DestinationPage({ params }: Props) {
  const { destination } = await params;
  const dest = await getDestinationBySlug(destination);
  if (!dest) notFound();

  const destActivities = await getActivitiesForDest(dest.id);
  const destAttractions = await getAttractionsForDest(dest.id);

  return (
    <div className="flex-1">
      <DestinationHero destination={dest} />

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* Overview + facts */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Gallery destination={dest} />
            {destActivities.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ActivityIcon className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">Activities & Experiences</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {destActivities.map((a) => (
                    <div key={a.id} className="rounded-xl bg-white/5 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{a.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.indoor ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                          {a.indoor ? "Indoor" : "Outdoor"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{a.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                        <span className="capitalize">{a.category}</span>
                        <span>·</span>
                        <span>{a.durationHours}h</span>
                        <span>·</span>
                        <span className="capitalize">{a.costTier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {destAttractions.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">Top Attractions</h3>
                </div>
                <div className="space-y-3">
                  {destAttractions.map((at) => (
                    <div key={at.id} className="rounded-xl bg-white/5 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{at.name}</span>
                        <span className="text-xs font-semibold text-emerald-300">{at.entryFee}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{at.description}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                        <Clock className="h-3 w-3" /> {at.timings}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <SeasonMatrix destination={dest} />
            <div className="glass rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Info className="h-5 w-5 text-emerald-400" /> Quick Facts
              </h3>
              <dl className="space-y-3 text-sm">
                {[
                  ["Language", dest.facts.language],
                  ["Access", dest.facts.access],
                  ["Ideal Duration", dest.facts.idealDuration],
                  ["Nearest Hub", dest.nearestHub],
                  ["Timezone", dest.timezone || "Asia/Kolkata"],
                  ["Currency", dest.currency || "INR (₹)"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                    <dt className="text-zinc-400">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Link
              href={`/planner?d=${dest.slug}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
            >
              Build an AI itinerary for {dest.name}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
