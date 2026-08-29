export type TerrainType =
  | "himalayas"
  | "beaches"
  | "deserts"
  | "western_ghats"
  | "heritage"
  | "backwaters"
  | "northeast"
  | "wildlife"
  | "spiritual"
  | "metropolitan";

export type BudgetTier = "budget" | "moderate" | "luxury";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  state: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coordinates: GeoPoint;
  altitude: number;
  terrainType: TerrainType;
  currency: string;
  timezone: string;
  nearestHub: string;
  isFeatured: boolean;
  image: string;
  images: {
    landscape: string[];
    food: string[];
    heritage: string[];
    culture: string[];
  };
  facts: {
    population?: string;
    language: string;
    bestTimeHint: string;
    idealDuration: string;
    access: string;
  };
}

export interface SeasonalProfile {
  destinationId: string;
  monthNumber: number; // 1-12
  crowdIndex: number; // 1-10
  budgetTier: BudgetTier;
  temperature: { min: number; max: number };
  weather: string;
  highlights: string[];
  isOffSeason?: boolean;
}

export interface Activity {
  id: string;
  destinationId: string;
  name: string;
  category: string;
  weatherConditionsRequired: string[];
  costTier: BudgetTier;
  durationHours: number;
  indoor: boolean;
  description: string;
}

export interface Attraction {
  id: string;
  destinationId: string;
  name: string;
  type: string;
  coordinates: GeoPoint;
  entryFee: string;
  timings: string;
  description: string;
}

export interface WeatherData {
  destinationId: string;
  name: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windSpeedKmph: number;
  windDirection: string;
  conditions: string; // clear, rain, snow, fog, clouds
  rainProbability: number;
  aqi: number;
  uvIndex: number;
  precipitationMm: number;
  sunrise: string;
  sunset: string;
  hour: number;
  updatedMinutesAgo: number;
  source: "live" | "seasonal-average";
  forecast: {
    day: string;
    tempMax: number;
    tempMin: number;
    conditions: string;
  }[];
}

export interface ItineraryDay {
  date: string;
  title: string;
  slots: {
    timeBlock: "morning" | "afternoon" | "evening";
    activityId: string;
    title: string;
    location: string;
    coordinates?: GeoPoint;
    category: string;
    durationHours: number;
    cost: number;
    note?: string;
  }[];
}

export interface UserTrip {
  id: string;
  title: string;
  origin: string;
  destinationIds: string[];
  destinations: string[];
  startDate: string;
  endDate: string;
  partyType: "solo" | "couple" | "family" | "friends";
  budgetTier: BudgetTier;
  pacing: "relaxed" | "balanced" | "packed";
  interests: string[];
  status: "draft" | "planned";
  days: ItineraryDay[];
  costBreakdown: {
    transit: number;
    stay: number;
    food: number;
    activities: number;
    total: number;
  };
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}
