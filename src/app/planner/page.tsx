import { TripPlanner } from "@/components/planner/TripPlanner";

export const metadata = {
  title: "AI Trip Planner | EcoVista",
  description: "Build a weather-aware, multi-day India itinerary with EcoVista AI.",
};

export default function PlannerPage() {
  return <TripPlanner />;
}
