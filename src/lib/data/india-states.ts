// Simplified, coarse GeoJSON polygons for Indian states/UTs.
// These are approximate bounding shapes used purely for visual highlighting on
// the Leaflet map and are NOT survey-grade boundaries.

export interface StateShape {
  name: string;
  // rough bounding polygon
  poly: [number, number][];
}

const states: StateShape[] = [
  { name: "Jammu & Kashmir", poly: [[32.6, 73.7], [34.4, 73.9], [35.4, 75.5], [34.6, 77.5], [32.8, 76.9], [32.5, 75.5]] },
  { name: "Ladakh", poly: [[31.3, 76.6], [34.4, 76.8], [35.2, 78.3], [34.5, 79.6], [32.75, 78.3], [32.0, 77.2]] },
  { name: "Himachal Pradesh", poly: [[30.4, 75.7], [32.5, 75.7], [33.2, 78.4], [30.9, 78.9], [30.5, 77.2]] },
  { name: "Punjab", poly: [[29.6, 73.9], [32.0, 73.9], [32.3, 76.5], [29.6, 76.9]] },
  { name: "Uttarakhand", poly: [[29.0, 77.6], [30.5, 77.6], [31.5, 80.0], [28.9, 80.1]] },
  { name: "Rajasthan", poly: [[23.5, 69.5], [30.2, 69.7], [30.2, 77.2], [24.0, 76.8], [23.5, 73.2]] },
  { name: "Gujarat", poly: [[20.0, 68.6], [24.7, 68.4], [24.7, 72.7], [21.9, 74.2], [20.4, 73.0]] },
  { name: "Goa", poly: [[14.9, 73.7], [15.8, 73.7], [15.6, 74.2], [15.0, 74.2]] },
  { name: "Maharashtra", poly: [[15.6, 72.7], [21.8, 73.0], [21.9, 79.6], [16.6, 80.1], [15.6, 77.5]] },
  { name: "Karnataka", poly: [[11.6, 74.0], [17.3, 74.0], [17.3, 78.5], [12.7, 78.6], [11.6, 76.9]] },
  { name: "Kerala", poly: [[8.2, 76.2], [12.8, 74.9], [12.6, 77.2], [9.9, 77.3], [8.3, 77.2]] },
  { name: "Tamil Nadu", poly: [[8.0, 77.2], [13.5, 79.7], [12.7, 80.3], [8.1, 78.2]] },
  { name: "Uttar Pradesh", poly: [[24.0, 77.8], [30.2, 77.2], [29.7, 83.7], [24.4, 84.0]] },
  { name: "Madhya Pradesh", poly: [[21.2, 74.5], [26.8, 74.8], [26.9, 82.2], [21.5, 82.0]] },
  { name: "West Bengal", poly: [[21.5, 85.8], [27.0, 88.9], [23.6, 88.8], [21.7, 88.7]] },
  { name: "Sikkim", poly: [[27.0, 88.0], [28.1, 88.3], [27.9, 88.8], [27.1, 88.8]] },
  { name: "Assam", poly: [[24.5, 89.7], [27.9, 89.5], [27.7, 96.0], [24.5, 95.0]] },
  { name: "Arunachal Pradesh", poly: [[26.6, 92.0], [29.0, 94.0], [28.0, 96.6], [26.8, 97.2]] },
];

export const indiaStatesGeoJSON = {
  type: "FeatureCollection",
  features: states.map((s) => ({
    type: "Feature",
    properties: { name: s.name },
    geometry: {
      type: "Polygon",
      coordinates: [[...s.poly, s.poly[0]]],
    },
  })),
};
