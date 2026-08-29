import { NextRequest, NextResponse } from "next/server";
import { generateItinerary, type PlannerParams } from "@/lib/planner";
import { destinations } from "@/lib/data/destinations";
import { getSeasonalFallback } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    // Chat mode
    let reply: string;
    try {
      reply = await callLLM(message);
    } catch {
      reply = ruleBasedRespond(message);
    }

    // enrich with live weather headers if requested
    return NextResponse.json({ type: "chat", reply });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
