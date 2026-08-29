import { NextRequest, NextResponse } from "next/server";
import { generateItinerary, type PlannerParams } from "@/lib/planner";
import { destinations } from "@/lib/data/destinations";
import type { Destination, TerrainType } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TERRAIN_KEYWORDS: Record<TerrainType, string[]> = {
  himalayas: ["snow", "mountain", "ski", "hill station", "himalaya", "trek", "valley"],
  beaches: ["beach", "sea", "coast", "goa", "island", "sun", "sand"],
  deserts: ["desert", "rajasthan", "sand dune", "jaisalmer", "camel", "thar"],
  western_ghats: ["tea", "munnar", "monsoon", "mist", "hill", "ghats", "coorg"],
  heritage: ["fort", "palace", "heritage", "taj", "history", "temple", "monument"],
  backwaters: ["backwater", "houseboat", "kerala", "cruise", "alleppey"],
  northeast: ["shillong", "northeast", "meghalaya", "north east", "scotland"],
  wildlife: ["wildlife", "safari", "national park", "jungle", "animal", "tiger"],
  spiritual: ["spiritual", "yoga", "rishikesh", "meditation", "ashram", "ganga", "varanasi"],
  metropolitan: ["city", "metro", "mumbai", "delhi", "bangalore", "urban"],
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  budget: ["budget", "cheap", "low cost", "affordable", "economical", "under "],
  family: ["family", "kids", "children", "family-friendly", "toddler"],
  honeymoon: ["honeymoon", "romantic", "couple"],
  adventure: ["adventure", "trek", "rafting", "ski", "paragliding", "adrenaline"],
  food: ["food", "cuisine", "eat", "street food", "dining"],
  winter: ["winter", "snow", "december", "january", "february", "snowfall", "cold"],
  monsoon: ["monsoon", "rain", "june", "july", "august", "september", "rainy"],
  summer: ["summer", "april", "may", "june", "heat", "escape heat"],
};

function detectMonth(text: string): number | null {
  const map: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const lower = text.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

interface SearchMatch {
  id: string;
  name: string;
  slug: string;
  state: string;
  tagline: string;
  image: string;
  terrainType: TerrainType;
  score: number;
  reasons: string[];
}

function searchCatalog(message: string): SearchMatch[] {
  const text = message.toLowerCase();
  const month = detectMonth(message);
  const matchedIntents = Object.entries(INTENT_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => text.includes(k)))
    .map(([k]) => k);

  const scored = destinations.map((d: Destination) => {
    let score = 0;
    const reasons: string[] = [];
    const haystack = `${d.name} ${d.state} ${d.tagline} ${d.description} ${d.facts?.bestTimeHint || ""} ${d.facts?.access || ""}`.toLowerCase();
    const terrainKws = TERRAIN_KEYWORDS[d.terrainType] || [];

    // keyword hit in core description fields
    [d.name, d.state, d.tagline].forEach((field) => {
      if (field && text.includes(field.toLowerCase())) {
        score += 6;
        reasons.push(`Mentions ${d.name}`);
      }
    });
    if (text.includes(d.terrainType.replace("_", " "))) {
      score += 4;
      reasons.push(contentLabel(d.terrainType));
    }

    // terrain keyword overlap
    const overlap = terrainKws.filter((k) => text.includes(k));
    if (overlap.length) {
      score += overlap.length * 3;
      reasons.push(contentLabel(d.terrainType));
    }

    // intent-based boosts
    if (matchedIntents.includes("budget") && d.facts?.idealDuration) score += 2;
    if (matchedIntents.includes("adventure") && ["himalayas", "deserts"].includes(d.terrainType)) score += 2;
    if (matchedIntents.includes("food")) score += 1;
    if (matchedIntents.includes("honeymoon") && ["backwaters", "beaches", "western_ghats"].includes(d.terrainType)) score += 2;
    if (matchedIntents.includes("monsoon") && ["western_ghats", "backwaters", "northeast"].includes(d.terrainType)) {
      score += 3;
      reasons.push("Monsoon-friendly terrain");
    }
    if (matchedIntents.includes("winter") || (month && month >= 11 && month <= 2)) {
      if (["himalayas", "northeast"].includes(d.terrainType)) {
        score += 3;
        reasons.push("Winter / snow destination");
      }
    }
    if (matchedIntents.includes("summer") || (month && month >= 4 && month <= 6)) {
      if (["himalayas", "western_ghats", "backwaters", "northeast"].includes(d.terrainType)) {
        score += 2;
        reasons.push("Cool summer escape");
      }
    }

    return { ...d, score, reasons };
  });

  return scored
    .filter((d) => d.score > 0 || text.length < 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      state: d.state,
      tagline: d.tagline,
      image: d.image,
      terrainType: d.terrainType,
      score: d.score,
      reasons: d.reasons.slice(0, 2),
    }));
}

function contentLabel(t: TerrainType): string {
  const map: Record<TerrainType, string> = {
    himalayas: "Snow & mountains",
    beaches: "Beaches",
    deserts: "Desert landscape",
    western_ghats: "Western Ghats / tea hills",
    heritage: "Heritage & monuments",
    backwaters: "Backwaters",
    northeast: "Northeast",
    wildlife: "Wildlife",
    spiritual: "Spiritual",
    metropolitan: "Metropolitan",
  };
  return map[t] || "Destination";
}

const SYSTEM_PROMPT = `You are EcoVista AI, an expert Indian travel planner. Respond in short, structured, friendly JSON-friendly text. When asked about destinations, mention specific places, best seasons, and weather-aware tips. Keep answers under 150 words.`;

async function callLLM(userPrompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  if (!apiKey) {
    throw new Error("AI_API_KEY not configured");
  }
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 350,
    }),
  });
  if (!res.ok) throw new Error("LLM request failed");
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function ruleBasedRespond(message: string): string {
  const text = message.toLowerCase();
  const month = new Date().getMonth() + 1;

  if (text.includes("snow") || text.includes("winter") || text.includes("hill station")) {
    return `🏔️ Best snow/winter destinations right now (month ${month}):\n• Gulmarg (J&K) — Gondola + skiing Dec–Feb\n• Manali (HP) — Solang Valley snow sports\n• Shimla & Darjeeling — cozy winter charm\n\nPro tip: Book Gondola Phase II tickets early; carry warm layers.`;
  }
  if (text.includes("beach") || text.includes("goa")) {
    return `🏖️ Beach picks:\n• Goa — Nov–Mar best (clear, 30°C)\n• Alleppey (Kerala) — backwater cruises\n• Andaman — turquoise waters\n\nMonsoon (Jun–Sep) gives lush landscapes but rougher seas.`;
  }
  if (text.includes("monsoon") || text.includes("rain") || text.includes("family")) {
    return `☔ Family monsoon-friendly escapes:\n• Munnar (Kerala) — misty tea hills, indoor factories\n• Coorg (Karnataka) — waterfalls & resorts\n• Shillong — Scotland of the East\n\nPrefer resorts with indoor activities and check road closures.`;
  }
  if (text.includes("desert") || text.includes("rajasthan")) {
    return `🏜️ Desert itineraries:\n• Jaisalmer — Sam Sand Dunes camping (Nov–Feb)\n• Jodhpur & Udaipur — royal heritage\n\nAvoid May–Jun peak heat; plan Fort visits for mornings.`;
  }
  if (text.includes("budget")) {
    return `💰 Budget travel tips:\n• Use overnight trains & hostels\n• Kerala & Rajasthan have great value stays\n• Travel in shoulder season (Sep–Oct, Feb–Mar) for lower prices\n\nAvg budget trip: ₹2–4k/day/person moderate.`;
  }
  return `✨ Try asking me for:\n• "snow places in December"\n• "beaches near Goa for 3 days"\n• "family monsoon destinations"\n• "budget itinerary for Rajasthan"\n\nI plan multi-day itineraries with live weather awareness!`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body.message || "";

    // Build itinerary if structured params provided
    if (body.planner && body.planner.destinationIds?.length) {
      const params: PlannerParams = body.planner;
      const result = generateItinerary(params);
      const destNames = params.destinationIds
        .map((id) => destinations.find((d) => d.id === id)?.name)
        .filter(Boolean);
      return NextResponse.json({
        type: "itinerary",
        itinerary: result.days,
        costBreakdown: result.costBreakdown,
        destinations: destNames,
      });
    }

    // AI search: rank destinations by natural-language query
    const matches = searchCatalog(message || "recommend India destinations");

    // Chat mode
    let reply: string;
    try {
      reply = await callLLM(message);
    } catch {
      reply = ruleBasedRespond(message);
    }

    return NextResponse.json({ type: "chat", reply, matches });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
