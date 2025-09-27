import type { LngLat } from "~/types/edl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

function ensureToken() {
  if (!MAPBOX_TOKEN) {
    console.warn("Mapbox token missing: set VITE_MAPBOX_TOKEN in your .env file.");
    throw new Error("Missing Mapbox token");
  }
  return MAPBOX_TOKEN;
}

export type PlaceSuggestion = {
  label: string;
  text: string;
  coord: LngLat;
};

export async function suggestPlaces(q: string, limit = 5): Promise<PlaceSuggestion[]> {
  const query = q.trim();
  if (!query) return [];
  const token = ensureToken();
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&limit=${limit}&types=address,place,poi&language=en&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .filter((f: any) => Array.isArray(f?.center) && f.center.length === 2)
    .map((f: any) => ({
      label: f.place_name as string,
      text: (f.text || f.place_name) as string,
      coord: { lng: f.center[0], lat: f.center[1] } as LngLat,
    }));
}

export async function reverseGeocode(lng: number, lat: number): Promise<PlaceSuggestion | null> {
  const token = ensureToken();
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&types=address,place,poi&language=en&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const f = Array.isArray(data?.features) && data.features.length > 0 ? data.features[0] : null;
  if (!f || !Array.isArray(f.center) || f.center.length < 2) return null;
  return {
    label: f.place_name as string,
    text: (f.text || f.place_name) as string,
    coord: { lng: f.center[0], lat: f.center[1] } as LngLat,
  };
}
