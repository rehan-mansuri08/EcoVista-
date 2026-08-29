import type { WeatherData, Destination } from "@/types";
import { activities } from "@/lib/data/seasonal";

export interface LiveRecommendation {
  status: "active" | "caution" | "restricted" | "advisory" | "best-window";
  statusLabel: string;
  emoji: string;
  summary: string;
  recommended: {
    activityId: string;
    name: string;
    reason: string;
  }[];
  tips: string[];
}

export function evaluateDestination(
  destination: Destination,
  weather: WeatherData,
  month: number
): LiveRecommendation {
  const destActivities = activities.filter((a) => a.destinationId === destination.id);
  const isSnowMonth = month === 12 || month === 1 || month === 2;
  const isMonsoonMonth = month === 6 || month === 7 || month === 8;
  const isSummerMonth = month === 5 || month === 6;
  const isWinterMonth = month === 11 || month === 12 || month === 1 || month === 2;

  const recommended: LiveRecommendation["recommended"] = [];
  let status: LiveRecommendation["status"] = "active";
  let statusLabel = "Active Now";
  let emoji = "✅";
  let summary = "";
  const tips: string[] = [];

  const pickByName = (namePart: string) =>
    destActivities.find((a) => a.name.toLowerCase().includes(namePart.toLowerCase()));

  // Snow destinations (Gulmarg, Manali, etc.)
  if (destination.terrainType === "himalayas" && isSnowMonth) {
    status = "active";
    statusLabel = "Snow Active";
    emoji = "🎿";
    summary = "Best snow conditions of the year. Skiing, gondola & snow trekking are live.";
    const ski = pickByName("Ski");
    const gondola = pickByName("Gondola");
    const trek = pickByName("Trekking");
    if (gondola) recommended.push({ activityId: gondola.id, name: gondola.name, reason: "Iconic cable car running in peak snow" });
    if (ski) recommended.push({ activityId: ski.id, name: ski.name, reason: "Fresh powder on the slopes" });
    if (trek) recommended.push({ activityId: trek.id, name: trek.name, reason: "Snow trekking routes are open" });
    tips.push("Carry thermal layers & sturdy snow boots", "Book gondola tickets in advance");
  }

  // Monsoon destinations (Munnar, Coorg, Western Ghats, backwaters)
  else if (isMonsoonMonth && (destination.terrainType === "western_ghats" || destination.terrainType === "backwaters")) {
    status = "caution";
    statusLabel = "Monsoon";
    emoji = "⚠️";
    summary = "Trails partially restricted. Indoor & covered experiences shine now.";
    tips.push("Check road closures & landslide alerts", "Pack rain gear & waterproof shoes");
    const tea = pickByName("Tea");
    const ayr = pickByName("Ayurveda");
    const water = pickByName("Waterfall");
    if (tea) recommended.push({ activityId: tea.id, name: tea.name, reason: "Tea factory & museum tours stay open" });
    if (ayr) recommended.push({ activityId: ayr.id, name: ayr.name, reason: "Ideal for cozy indoor wellness" });
    if (water) recommended.push({ activityId: water.id, name: water.name, reason: "Waterfalls at fullest monsoon flow" });
  }

  // Winter pleasant (Rajasthan deserts)
  else if (isWinterMonth && destination.terrainType === "deserts") {
    status = "best-window";
    statusLabel = "Perfect Season";
    emoji = "⛺";
    summary = "Pleasant winter makes desert camping & safaris ideal.";
    const camp = pickByName("Camping");
    const camel = pickByName("Camel");
    const fort = pickByName("Fort");
    if (camp) recommended.push({ activityId: camp.id, name: camp.name, reason: "Sam Sand Dunes camping at its best" });
    if (camel) recommended.push({ activityId: camel.id, name: camel.name, reason: "Comfortable daytime safaris" });
    if (fort) recommended.push({ activityId: fort.id, name: fort.name, reason: "Fort walks in mild weather" });
    tips.push("Book desert camps early — peak season", "Carry warm layers for cold nights");
  }

  // High summer (Agra, heritage plains)
  else if (isSummerMonth && destination.terrainType === "heritage") {
    status = "advisory";
    statusLabel = "High Summer";
    emoji = "🏛️";
    summary = "Intense heat — schedule major sights for early morning & use indoor backup.";
    const taj = pickByName("Taj");
    const fort = pickByName("Fort");
    if (taj) recommended.push({ activityId: taj.id, name: taj.name, reason: "Visit Taj at sunrise (6:00–8:30 am)" });
    if (fort) recommended.push({ activityId: fort.id, name: fort.name, reason: "Agra Fort best before 10 am" });
    tips.push("Avoid outdoor sightseeing 12:00–4:00 pm", "Visit indoor craft museums in peak heat", "Hydrate constantly, carry sun protection");
  }

  // Beach default
  else if (destination.terrainType === "beaches") {
    status = isMonsoonMonth ? "caution" : "active";
    statusLabel = isMonsoonMonth ? "Monsoon" : "Beach Season";
    emoji = isMonsoonMonth ? "🌧️" : "🏖️";
    summary = isMonsoonMonth
      ? "Rougher seas — enjoy calm beaches, food & heritage instead."
      : "Perfect beach weather for sun, sand & water sports.";
    const beach = pickByName("Beach");
    const church = pickByName("Church");
    if (beach && !isMonsoonMonth) recommended.push({ activityId: beach.id, name: beach.name, reason: "Clear skies & calm sea" });
    if (church && isMonsoonMonth) recommended.push({ activityId: church.id, name: church.name, reason: "Indoor heritage during monsoon" });
    if (isMonsoonMonth) tips.push("Avoid water sports in rough sea", "Some beach shacks close during monsoon");
  }

  // Default: active
  else {
    status = "active";
    statusLabel = isMonsoonMonth ? "Pleasant" : "Good to Go";
    emoji = "🌤️";
    summary = "Favorable conditions for exploring this destination now.";
  }

  // If no recommendations found, add generic based on weather
  if (recommended.length === 0) {
    destActivities.slice(0, 2).forEach((a) => {
      recommended.push({
        activityId: a.id,
        name: a.name,
        reason: a.indoor
          ? "Indoor — a reliable option in current weather"
          : "Great in the current conditions",
      });
    });
  }

  // Weather-based adjustment
  if (weather.conditions === "rain" && status === "active") {
    status = "caution";
    emoji = "☔";
    tips.unshift("Live rain detected — prefer indoor activities this window");
  }
  if (weather.conditions === "snow" && destination.terrainType === "himalayas") {
    tips.unshift("Live snowfall — check road & gondola status");
  }

  return { status, statusLabel, emoji, summary, recommended, tips };
}
