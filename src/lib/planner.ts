import type {
  Activity,
  ItineraryDay,
  BudgetTier,
  Destination,
} from "@/types";
import { activities, attractions } from "@/lib/data/seasonal";
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

interface ScoredActivity extends Activity {
  score: number;
  slot: "morning" | "afternoon" | "evening";
}

export function generateItinerary(
  params: PlannerParams
): {
  days: ItineraryDay[];
  costBreakdown: { transit: number; stay: number; food: number; activities: number; total: number };
} {
  const destinationsForTrip = params.destinationIds
    .map((id) => destinations.find((d) => d.id === id))
    .filter((d): d is Destination => !!d);

  const count = destinationsForTrip.length;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Distribute days across destinations
  const perDay = Math.ceil(nights / Math.max(1, count));
  const daysPerDestination: Record<string, number> = {};
  destinationsForTrip.forEach((d, i) => {
    daysPerDestination[d.id] = i === count - 1 ? nights - perDay * (count - 1) : perDay;
  });

  const pacingMultiplier = params.pacing === "packed" ? 2 : params.pacing === "relaxed" ? 0.7 : 1;
  const partyFactor = params.partyType === "solo" ? 0.7 : params.partyType === "friends" ? 1 : 1;

  const days: ItineraryDay[] = [];
  const start = new Date(params.startDate);
  let dayIdx = 0;

  for (const dest of destinationsForTrip) {
    const numDays = Math.max(1, daysPerDestination[dest.id] || 1);
    const destActivities = activities.filter((a) => a.destinationId === dest.id);
    const available = destActivities.length ? destActivities : fallbackActivities(dest);

    for (let n = 0; n < numDays; n++) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIdx);
      const slotCount = params.pacing === "packed" ? 3 : 2;
      const picked = pickActivities(available, params, slotCount);

      days.push({
        date: date.toISOString().split("T")[0],
        title: `Day ${dayIdx + 1} — ${dest.name}${n > 0 ? ` (Day ${n + 1})` : ""}`,
        slots: picked.map((p) => ({
          timeBlock: p.slot,
          activityId: p.id,
          title: p.name,
          location: dest.name,
          coordinates: dest.coordinates,
          category: p.category,
          durationHours: p.durationHours,
          cost: Math.round(p.costTier === "budget" ? 500 * COST_RATIO[params.budgetTier] : p.costTier === "moderate" ? 1500 * COST_RATIO[params.budgetTier] : 4000 * COST_RATIO[params.budgetTier]),
          note: p.indoor ? "Indoor — great bad-weather backup" : "Outdoor",
        })),
      });
      dayIdx++;
    }
  }

  // Fill remaining nights if under-allocated
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

  const costBreakdown = buildBudget(days, params, destinationsForTrip);

  return { days, costBreakdown };
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
  slotCount: number
): ScoredActivity[] {
  const slots: ("morning" | "afternoon" | "evening")[] = ["morning", "afternoon", "evening"];
  const result: ScoredActivity[] = [];
  const used = new Set<string>();

  for (let i = 0; i < slotCount; i++) {
    const slot = slots[i];
    const candidates = available.filter((a) => !used.has(a.id));
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
      score += params.pacing === "relaxed" ? -a.durationHours * 0.5 : a.durationHours * 0.3;
      return {
        ...a,
        score,
        slot,
      };
    });

    scored.sort((x, y) => y.score - x.score);
    const pick = scored[0];
    result.push(pick);
    used.add(pick.id);
  }

  return result;
}

function buildBudget(
  days: ItineraryDay[],
  params: PlannerParams,
  dests: Destination[]
) {
  const partySize =
    params.partyType === "solo" ? 1 : params.partyType === "couple" ? 2 : params.partyType === "friends" ? 4 : 4;
  const daysCount = Math.max(1, days.length);

  let stay = 0;
  let food = 0;
  let activities = 0;

  days.forEach((d) => {
    const baseRates: Record<BudgetTier, number> = { budget: 1200, moderate: 3200, luxury: 9000 };
    // average over destinations
    const avgRate =
      dests.reduce((s, de) => s + baseRates[params.budgetTier], 0) / Math.max(1, dests.length);
    stay += avgRate;
    food += (params.budgetTier === "luxury" ? 2000 : params.budgetTier === "moderate" ? 1000 : 600) * partySize;
    d.slots.forEach((s) => (activities += s.cost));
  });

  // transit estimate between destinations
  let transit = 3500 * (dests.length - 1);
  if (dests.length > 1) {
    let dist = 0;
    for (let i = 1; i < dests.length; i++) {
      dist += haversine(dests[i - 1].coordinates, dests[i].coordinates);
    }
    transit = Math.round(dist * (params.partyType === "solo" ? 3 : 2) * COST_RATIO[params.budgetTier]);
  }
  if (transit === 0) transit = 2000;

  const total = Math.round(stay + food + activities + transit);
  return {
    transit: Math.round(transit),
    stay: Math.round(stay),
    food: Math.round(food),
    activities: Math.round(activities),
    total,
  };
}

export async function getSwapCandidates(
  destinationId: string,
  excludeId: string
): Promise<Activity[]> {
  return activities
    .filter((a) => a.destinationId === destinationId && a.id !== excludeId)
    .concat(fallbackActivities(destinations.find((d) => d.id === destinationId) || destinations[0]))
    .filter((a) => a.id !== excludeId);
}
