import { type Segment } from "~/types/edl";

export interface PlanRouteDay { date: string; segments: Segment[] }
export interface PlanRouteResponse {
  route: { distance_m: number; duration_s: number; geometry: GeoJSON.LineString };
  segments: Array<{ start: string; end: string; status: 'OFF'|'SB'|'DRIVE'|'OND'; note?: string }>;
  days: PlanRouteDay[];
}

export async function planRoute(
  waypoints: { lat: number; lng: number }[],
  avgMph = 55,
  startIso?: string,
  tzOffsetMin?: number,
): Promise<PlanRouteResponse> {
  const tzOffset = tzOffsetMin ?? -new Date().getTimezoneOffset();
  const body = JSON.stringify({ waypoints, avg_mph: avgMph, start_ts: startIso, tz_offset_min: tzOffset });
  const res = await fetch(`${import.meta.env.VITE_API_URL}/plan-route/`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  if (!res.ok) throw new Error('planRoute failed');
  return res.json() as Promise<PlanRouteResponse>;
}
