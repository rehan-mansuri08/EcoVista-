import type {
  Activity,
  ItineraryDay,
  BudgetTier,
  Destination,
  DetailedBudget,
  DayBudget,
  TransitLeg,
  StayLine,
  ActivityLine,
  MiscLine,
} from "@/types";
import { activities } from "@/lib/data/seasonal";
import { destinations } from "@/lib/data/destinations";
import { haversine } from "@/lib/travel";

export interface PlannerParams {
  origin: string;
  startDate: string;
  endDate: string;
  partyType: "solo" | "couple" | "family" | "friends";
  budgetTier: BudgetTier;
  pacing: "relaxed" | "balanced" | "packed";
  interests: string[];
  destinationIds: string[];
  weather?: Record<string, { conditions: string }>;
}

const COST_RATIO: Record<BudgetTier, number> = {
  budget: 0.6,
  moderate: 1,
  luxury: 1.8,
};

const SLOT_WEIGHTS: Record<string, number> = {
  morning: 4,
  afternoon: 3,
  evening: 3,
};

function partySize(pt: PlannerParams["partyType"]): number {
  return pt === "solo" ? 1 : pt === "couple" ? 2 : pt === "friends" ? 4 : 4;
}

function footfallMultiplier(tier: BudgetTier): number {
  return COST_RATIO[tier];
}

// Per-night stay rates (per room), scaled by tier and number of rooms.
function stayRates(tier: BudgetTier): number {
  return tier === "budget" ? 1200 : tier === "moderate" ? 3200 : 9000;
}

function foodPerPartyDay(tier: BudgetTier, size: number): number {
  const perHead = tier === "luxury" ? 2000 : tier === "moderate" ? 1200 : 700;
  return perHead * size;
}

// costTier -> base activity/entry cost in INR (before ratio scaling), per item.
function activityBaseCost(tier: Activity["costTier"]): number {
  return tier === "budget" ? 400 : tier === "moderate" ? 1200 : 3500;
}

interface SlotActivity extends Activity {
  cost: number;
}

interface ScoredActivity extends SlotActivity {
  score: number;
  slot: "morning" | "afternoon" | "evening";
}

export function generateItinerary(
  params: PlannerParams
): { days: ItineraryDay[]; costBreakdown: DetailedBudget } {
  const destinationsForTrip = params.destinationIds
    .map((id) => destinations.find((d) => d.id === id))
    .filter((d): d is Destination => !!d);

  const count = destinationsForTrip.length;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(params.endDate).getTime() -
        new Date(params.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const perDay = Math.ceil(nights / Math.max(1, count));
  const daysPerDestination: Record<string, number> = {};
  destinationsForTrip.forEach((d, i) => {
    daysPerDestination[d.id] =
      i === count - 1 ? nights - perDay * (count - 1) : perDay;
  });

  const days: ItineraryDay[] = [];
  const start = new Date(params.startDate);
  let dayIdx = 0;

  for (const dest of destinationsForTrip) {
    const numDays = Math.max(1, daysPerDestination[dest.id] || 1);
    const destActivities = activities.filter((a) => a.destinationId === dest.id);
    const available = destActivities.length
      ? destActivities
      : fallbackActivities(dest);

    for (let n = 0; n < numDays; n++) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIdx);
      const slotCount = params.pacing === "packed" ? 3 : 2;
      const picked = pickActivities(available, params, slotCount, dest);

      days.push({
        date: date.toISOString().split("T")[0],
        title: `Day ${dayIdx + 1} — ${dest.name}${
          n > 0 ? ` (Day ${n + 1})` : ""
        }`,
        slots: picked.map((p) => ({
          timeBlock: p.slot,
          activityId: p.id,
          title: p.name,
          location: dest.name,
          coordinates: dest.coordinates,
          category: p.category,
          durationHours: p.durationHours,
          cost: p.cost,
          note: buildNote(p, params),
        })),
      });
      dayIdx++;
    }
  }

  // Fill remaining nights if under-allocated.
  while (dayIdx < nights) {
    const dest = destinationsForTrip[0] || destinations[0];
    const date = new Date(start);
    date.setDate(start.getDate() + dayIdx);
    days.push({
      date: date.toISOString().split("T")[0],
      title: `Day ${dayIdx + 1} — ${dest.name} (buffer)`,
      slots: [],
    });
    dayIdx++;
  }

  const costBreakdown = buildDetailedBudget(days, params, destinationsForTrip);

  return { days, costBreakdown };
}

function buildNote(a: Activity, params: PlannerParams): string {
  const weather = params.weather?.[a.destinationId]?.conditions;
  const parts: string[] = [];
  if (weather) {
    if (weather === "rain" || weather === "fog") {
      parts.push(
        a.indoor
          ? "Indoor — perfect for this weather"
          : "⚠️ Outdoor — check conditions first"
      );
    } else if (weather === "snow") {
      parts.push("Carry warm layers — snow conditions");
    } else {
      parts.push("Clear skies — great conditions");
    }
  } else {
    parts.push(a.indoor ? "Indoor backup" : "Outdoor");
  }
  if (weather === "rain" && !a.indoor) parts.push("plan a sheltered alternative");
  return parts.join(" · ");
}

function weatherSuitable(a: Activity, conditions?: string): boolean {
  if (!conditions) return true;
  return a.weatherConditionsRequired.includes(conditions);
}

function fallbackActivities(dest: Destination): Activity[] {
  return [
    {
      id: `${dest.id}-walk`,
      destinationId: dest.id,
      name: `${dest.name} Exploration Walk`,
      category: "Nature",
      weatherConditionsRequired: ["clear", "clouds"],
      costTier: "budget",
      durationHours: 3,
      indoor: false,
      description: "Guided walk through the highlights",
    },
    {
      id: `${dest.id}-culture`,
      destinationId: dest.id,
      name: "Local Culture & Food Tour",
      category: "Culture",
      weatherConditionsRequired: ["clear", "rain", "fog"],
      costTier: "moderate",
      durationHours: 3,
      indoor: true,
      description: "Sampling local cuisine and heritage",
    },
    {
      id: `${dest.id}-sunset`,
      destinationId: dest.id,
      name: "Sunset Viewpoint",
      category: "Nature",
      weatherConditionsRequired: ["clear"],
      costTier: "budget",
      durationHours: 2,
      indoor: false,
      description: "Best panoramic sunset spot",
    },
  ];
}

function pickActivities(
  available: Activity[],
  params: PlannerParams,
  slotCount: number,
  dest: Destination
): ScoredActivity[] {
  const slots: ("morning" | "afternoon" | "evening")[] = [
    "morning",
    "afternoon",
    "evening",
  ];
  const conditions = params.weather?.[dest.id]?.conditions;
  const result: ScoredActivity[] = [];
  const used = new Set<string>();

  for (let i = 0; i < slotCount; i++) {
    const slot = slots[i];
    let candidates = available.filter(
      (a) => !used.has(a.id) && weatherSuitable(a, conditions)
    );
    if (!candidates.length) {
      // relaxed weather filter -> try all activities when under very bad weather
      candidates = available.filter((a) => !used.has(a.id));
    }
    if (!candidates.length) break;

    const interestPriority = params.interests.length
      ? candidates.filter((a) =>
          params.interests.some((inter) =>
            a.category.toLowerCase().includes(inter.toLowerCase())
          )
        )
      : candidates;

    const pool = interestPriority.length ? interestPriority : candidates;

    const scored = pool.map((a) => {
      let score = SLOT_WEIGHTS[slot] + (a.indoor ? 1 : 2);
      score +=
        params.pacing === "relaxed"
          ? -a.durationHours * 0.5
          : a.durationHours * 0.3;
      // penalty for repeating same category on consecutive chosen
      if (result.length && result.some((r) => r.category === a.category)) {
        score -= 1.5;
      }
      return {
        ...a,
        cost: Math.round(
          activityBaseCost(a.costTier) * footfallMultiplier(params.budgetTier)
        ),
        score,
        slot,
      };
    });

    scored.sort((x, y) => y.score - x.score);
    const pick = scored[0];
    result.push(pick);
    used.add(pick.id);
  }

  return result.map((a) => ({ ...a }));
}

function buildDetailedBudget(
  days: ItineraryDay[],
  params: PlannerParams,
  dests: Destination[]
): DetailedBudget {
  const size = partySize(params.partyType);
  const daysCount = Math.max(1, days.length);
  const ratio = footfallMultiplier(params.budgetTier);
  const rooms = Math.max(1, size === 1 ? 1 : size === 2 ? 1 : 2);
  const rate = stayRates(params.budgetTier) * rooms;

  // ---- Stay: per destination, count nights (each itinerary day = 1 night except last buffer)
  const stayLines: StayLine[] = [];
  const stayByDay: number[] = new Array(daysCount).fill(0);
  const dayDest: string[] = new Array(daysCount).fill("");
  days.forEach((d, i) => {
    const destName = d.title.split("— ")[1]?.split(" (Day")[0] || dests[0]?.name || "Destination";
    dayDest[i] = destName;
    const line = stayLines.find((s) => s.name === destName);
    if (line) {
      line.nights += 1;
      line.amount += rate;
    } else {
      stayLines.push({ destinationId: "", name: destName, nights: 1, ratePerNight: rate, amount: rate });
    }
    stayByDay[i] += d.slots.length ? rate : 0; // count stay only on days with plans
  });
  const stay = stayLines.reduce((s, l) => s + l.amount, 0);

  // ---- Food: per party per day
  const perDayFood = foodPerPartyDay(params.budgetTier, size);
  const food = perDayFood * daysCount;

  // ---- Activities: per day cost (from slots) + real attraction entry fees for context
  const activityLines: ActivityLine[] = [];
  const activityByDay: number[] = new Array(daysCount).fill(0);
  days.forEach((d, i) => {
    let dayActivity = 0;
    d.slots.forEach((s) => {
      dayActivity += s.cost;
      activityLines.push({
        title: s.title,
        day: i + 1,
        location: s.location,
        amount: s.cost,
      });
    });
    // add a real signature attraction entry (from attractions data) on first day of each destination
    activityByDay[i] = dayActivity;
  });
  const activitiesTotal = activityLines.reduce((s, a) => s + a.amount, 0);

  // ---- Transit: origin->d1, between dests, last->origin
  const transitLegs: TransitLeg[] = [];
  let transit = 0;
  if (dests.length > 1) {
    let acc = 0;
    for (let i = 1; i < dests.length; i++) {
      acc += haversine(dests[i - 1].coordinates, dests[i].coordinates);
    }
    const dist = acc;
    const perKm = ratio * (params.partyType === "solo" ? 3 : 2);
    const inter = Math.round(dist * perKm);
    transit += inter;
    if (inter > 0) {
      transitLegs.push({
        label: `Between destinations (${dests.map((d) => d.name).join(" → ")})`,
        mode: "car",
        amount: inter,
      });
    }
    // origin legs estimated
    const firstDest = dests[0];
    const lastDest = dests[dests.length - 1];
    const toKm = Math.max(100, Math.round(haversine({ lat: 28.61, lng: 77.2 }, firstDest.coordinates)));
    const backKm = Math.max(100, Math.round(haversine(lastDest.coordinates, { lat: 28.61, lng: 77.2 })));
    const toCost = Math.round(toKm * perKm);
    const backCost = Math.round(backKm * perKm);
    transit += toCost + backCost;
    transitLegs.unshift(
      { label: `${params.origin || "Origin"} → ${firstDest.name}`, mode: "car", amount: toCost },
      { label: `${lastDest.name} → ${params.origin || "Origin"}`, mode: "car", amount: backCost }
    );
  } else if (dests.length === 1) {
    const d = dests[0];
    const toKm = Math.max(100, Math.round(haversine({ lat: 28.61, lng: 77.2 }, d.coordinates)));
    const perKm = ratio * (params.partyType === "solo" ? 3 : 2);
    const toCost = Math.round(toKm * perKm);
    const backCost = toCost;
    transit = toCost + backCost;
    transitLegs.push(
      { label: `${params.origin || "Origin"} → ${d.name}`, mode: "car", amount: toCost },
      { label: `${d.name} → ${params.origin || "Origin"}`, mode: "car", amount: backCost }
    );
  }
  if (transit === 0) {
    transit = Math.round(2000 * ratio);
    transitLegs.push({ label: "Local transport allowance", mode: "car", amount: transit });
  }

  // ---- Misc: buffer + tips/insurance
  const miscLines: MiscLine[] = [
    { label: "Contingency buffer (8%)", amount: 0 },
    { label: "Local transport & tips", amount: Math.round(150 * size * daysCount * ratio) },
  ];
  const miscBase = miscLines[1].amount;

  // ---- Per-day grouping
  const perDay: DayBudget[] = days.map((d, i) => ({
    day: i + 1,
    date: d.date,
    destination: dayDest[i],
    stay: stayByDay[i],
    food: perDayFood,
    activities: activityByDay[i],
    misc: Math.round(150 * size * ratio),
    total: stayByDay[i] + perDayFood + activityByDay[i] + Math.round(150 * size * ratio),
  }));
  const totalPerDay = perDay.reduce((s, p) => s + p.total, 0);

  const misc = miscBase;
  const total = Math.round(transit + stay + food + activitiesTotal + misc);
  const bufferLineIndex = 0;
  miscLines[bufferLineIndex] = {
    label: "Contingency buffer (8%)",
    amount: Math.round(total * 0.08),
  };
  const miscWithBuffer = misc + Math.round(total * 0.08);
  const totalWithBuffer = Math.round(total + total * 0.08);

  return {
    currency: "INR",
    partySize: size,
    days: daysCount,
    perHeadTotal: Math.round(totalWithBuffer / size),
    transitLegs,
    stayLines,
    activityLines,
    miscLines,
    perDay,
    totalPerDay,
    transit: Math.round(transit),
    stay: Math.round(stay),
    food: Math.round(food),
    activities: Math.round(activitiesTotal),
    misc: miscWithBuffer,
    total: totalWithBuffer,
  };
}

export async function getSwapCandidates(
  destinationId: string,
  excludeId: string
): Promise<Activity[]> {
  return activities
    .filter((a) => a.destinationId === destinationId && a.id !== excludeId)
    .concat(
      fallbackActivities(
        destinations.find((d) => d.id === destinationId) || destinations[0]
      )
    )
    .filter((a) => a.id !== excludeId);
}
