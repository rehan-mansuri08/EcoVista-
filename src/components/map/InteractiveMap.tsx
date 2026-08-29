"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { Destination, GeoPoint } from "@/types";
import { indiaStatesGeoJSON } from "@/lib/data/india-states";
import { useWeather } from "@/hooks/useWeather";

export type TileId = "light" | "dark" | "terrain";

const TILES: Record<TileId, { url: string; attribution: string; label: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: "Light",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: "Dark",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: "Terrain",
  },
};

const weatherEmoji: Record<string, string> = {
  clear: "☀️", clouds: "⛅", rain: "🌧️", snow: "❄️", fog: "🌫️",
};

function FitBounds({ points, zoom }: { points: GeoPoint[]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50] });
    } else if (points.length === 1 && zoom) {
      map.flyTo([points[0].lat, points[0].lng], zoom);
    }
  }, [points, map, zoom]);
  return null;
}

function WeatherMarker({ destination }: { destination: Destination }) {
  const { weather } = useWeather(
    destination.coordinates.lat,
    destination.coordinates.lng,
    destination.id,
    destination.name
  );

  const icon = L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;
      font-family:inherit;">
      <div style="background:rgba(13,19,34,0.85);backdrop-filter:blur(6px);
        border:1px solid rgba(74,222,128,0.4);border-radius:12px;padding:3px 8px;
        color:#fff;font-size:11px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.4);
        white-space:nowrap;">${weather ? weatherEmoji[weather.conditions] : "📍"} ${
        weather ? Math.round(weather.tempC) + "°C" : destination.name.split(" ")[0]
      }</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:8px solid rgba(74,222,128,0.6);"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  return (
    <Marker position={[destination.coordinates.lat, destination.coordinates.lng]} icon={icon}>
      <Popup>
        <div className="min-w-[180px]">
          <div className="font-bold text-black">{destination.name}</div>
          <div className="text-xs text-gray-600">{destination.tagline}</div>
          <div className="mt-2">
            {weather ? (
              <>
                <div className="text-sm font-semibold">
                  {weatherEmoji[weather.conditions]} {Math.round(weather.tempC)}°C · {weather.conditions}
                </div>
                <div className="text-xs text-gray-600">
                  Feels {Math.round(weather.feelsLikeC)}°C · {weather.rainProbability}% rain · AQI {weather.aqi}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500">Loading weather…</div>
            )}
          </div>
          <a
            href={`/india/${encodeURIComponent(destination.state)}/${destination.slug}`}
            className="mt-2 inline-block text-xs font-semibold text-emerald-600"
          >
            View destination →
          </a>
        </div>
      </Popup>
    </Marker>
  );
}

interface RouteStop {
  lat: number;
  lng: number;
  day: number;
  label: string;
}

export function InteractiveMap({
  destinations: dests,
  routes = [],
  selected,
  onSelect,
  height = "100%",
}: {
  destinations: Destination[];
  routes?: RouteStop[];
  selected?: Destination | null;
  onSelect?: (d: Destination) => void;
  height?: string;
}) {
  const [tile, setTile] = useState<TileId>("dark");
  const [hovered, setHovered] = useState<string | null>(null);
  const basePoints = dests.map((d) => d.coordinates);
  const routePoints = routes.map((r) => ({ lat: r.lat, lng: r.lng }));
  const fitPoints = selected
    ? [selected.coordinates]
    : routePoints.length > 1
    ? routePoints
    : basePoints;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <div className="absolute left-3 top-3 z-[1000] flex gap-1.5">
        {(Object.keys(TILES) as TileId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTile(id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold backdrop-blur transition-colors ${
              tile === id
                ? "bg-emerald-400 text-black"
                : "glass text-zinc-300 hover:bg-white/10"
            }`}
          >
            {TILES[id].label}
          </button>
        ))}
      </div>

      <div style={{ height }}>
        <MapContainer
          center={[22.5, 79]}
          zoom={5}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url={TILES[tile].url}
            attribution={TILES[tile].attribution}
          />
          <GeoJSON
            data={indiaStatesGeoJSON as any}
            style={(feature) => ({
              color: hovered === feature?.properties?.name ? "#4ade80" : "#94a3b8",
              weight: 1,
              fillColor: hovered === feature?.properties?.name ? "#4ade80" : "#1e293b",
              fillOpacity: hovered === feature?.properties?.name ? 0.25 : 0.12,
            })}
            onEachFeature={(feature, layer) => {
              layer.on({
                mouseover: (e) => setHovered(feature?.properties?.name ?? null),
                mouseout: () => setHovered(null),
              });
            }}
          />
          {routes.length > 1 && (
            <Polyline
              positions={routePoints.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#4ade80", weight: 3, dashArray: "6 6", opacity: 0.85 }}
            />
          )}
          {dests.map((d) => (
            <WeatherMarker key={d.id} destination={d} />
          ))}
          <FitBounds points={fitPoints} zoom={selected ? 8 : 5} />
        </MapContainer>
      </div>

      <div className="absolute bottom-3 left-3 z-[1000] text-xs text-zinc-400">
        <span className="glass rounded-lg px-2 py-1">{dests.length} destinations · OpenStreetMap</span>
      </div>
    </div>
  );
}
