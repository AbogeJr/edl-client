import React, { useMemo, useState } from "react";
import { MapPin, PanelLeft, Truck } from "lucide-react";

import MapBackground from "~/components/map/MapBackground";
import DailyLogDialog from "~/components/log/DailyLogDialog";
import TripSummaryDialog from "~/components/log/TripSummaryDialog";

import type { LngLat, Segment, Stop } from "~/types/edl";
import { planRoute } from "~/lib/api";
import SidebarPanel from "~/components/map/SideBarPanel";

export default function DailyLogPage() {
  const [driver] = useState({ name: "Jane Driver", carrier: "Acme Logistics LLC", office: "123 Main St, Dallas, TX", home: "Fort Worth, TX" });
  const [segments, setSegments] = useState<Segment[]>([]);

  const [stops, setStops] = useState<Stop[]>([
    { label: "Current Location", query: "", coord: undefined },
    { label: "Pickup Location", query: "", coord: undefined },
    { label: "Dropoff Location", query: "", coord: undefined },
  ]);
  const selectedMarkers = useMemo(() => {
    return stops
      .map((s, i) => (s.coord ? { ...s.coord, kind: i === 0 ? 'start' : i === 1 ? 'pickup' : 'stop' as const } : null))
      .filter(Boolean) as Array<LngLat & { kind: 'start'|'pickup'|'stop' }>;
  }, [stops]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [route, setRoute] = useState<any | null>(null);
  const [absSegments, setAbsSegments] = useState<Array<{ start: string; end: string; status: "OFF"|"SB"|"DRIVE"|"OND"; note?: string }>>([]);
  const [plannedDays, setPlannedDays] = useState<{ date: string; segments: Segment[] }[]>([]);
  const [planning, setPlanning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const waypoints = useMemo(() => stops.filter((s) => s.coord), [stops]);

  async function resolveAndRoute() {
    setLoadingRoute(true);
    try {
  const validCoords: LngLat[] = waypoints.map((s) => s.coord!) as LngLat[];
      if (validCoords.length < 2) { setRoute(null); setPlannedDays([]); return; }
      setPlanning(true);
  try {
  const now = new Date();
  const today9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  const startLocal = now <= today9 ? today9 : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const resp = await planRoute(validCoords, 55, startLocal.toISOString(), tzOffsetMin);
        setRoute({ distance: resp.route.distance_m, duration: resp.route.duration_s, geometry: resp.route.geometry });
  setAbsSegments(resp.segments || []);
        setPlannedDays(resp.days);
        if (resp.days[0]) setSegments(resp.days[0].segments);
      } finally { setPlanning(false); }
    } finally { setLoadingRoute(false); }
  }

  const routeLine: GeoJSON.LineString | null = useMemo(() => (route?.geometry?.coordinates ? route.geometry : null), [route]);
  const totalMiles = route ? Math.round(route.distance / 1609.344) : 0;
  const totalHours = route ? route.duration / 3600 : 0;

  // Derive rest stop markers from OFF/SB absolute segments by projecting
  // the midpoint of each rest onto the route geometry as an approximation.
  const restStopMarkers: LngLat[] = useMemo(() => {
    const coords = routeLine?.coordinates as [number, number][] | undefined;
    if (!coords || coords.length === 0 || !absSegments || absSegments.length === 0) return [];
    const toMs = (iso: string) => new Date(iso).getTime();
    const startMs = Math.min(...absSegments.map(s => toMs(s.start)));
    const endMs = Math.max(...absSegments.map(s => toMs(s.end)));
    const span = Math.max(1, endMs - startMs);
    const markers: LngLat[] = [];
    for (const s of absSegments) {
      if (s.status !== "OFF" && s.status !== "SB") continue;
      const sMs = toMs(s.start); const eMs = toMs(s.end);
      const durMin = (eMs - sMs) / 60000;
      if (durMin < 30) continue;
      const mid = sMs + (eMs - sMs) / 2;
      const t = Math.min(1, Math.max(0, (mid - startMs) / span));
      const idx = Math.min(coords.length - 1, Math.max(0, Math.round(t * (coords.length - 1))));
      const [lng, lat] = coords[idx];
      markers.push({ lat, lng });
    }
    return markers;
  }, [routeLine, absSegments]);

  return (
    <div className="relative h-[100vh] w-full overflow-hidden">
  <MapBackground routeGeoJSON={routeLine} markers={selectedMarkers} restStops={restStopMarkers} />
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center rounded-xl bg-white/70 backdrop-blur px-2 py-1 text-sm border hover:bg-white/80"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeft className="h-4 w-4 mr-1" />
            {sidebarOpen ? "Hide" : "Show"} Panel
          </button>
          <div className="hidden sm:flex bg-white/70 rounded-xl p-1 items-center gap-2 text-sm">
            <Truck className="h-4 w-4" />
            <span>EDL Trip Planner</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {route && (
            <div className="flex items-center gap-2 rounded-xl bg-white/75 backdrop-blur px-3 py-1.5 text-sm border shadow-sm">
              <MapPin className="h-4 w-4" />
              <span>{totalMiles.toLocaleString()} mi • {totalHours.toFixed(1)} h</span>
            </div>
          )}
    {route && (
      <DailyLogDialog
        days={plannedDays.length > 0 ? plannedDays.map(d => ({
          date: d.date,
          segments: d.segments,
          metadata: {
            date: d.date,
            driverName: driver.name,
            carrier: driver.carrier,
            mainOffice: driver.office,
            homeTerminal: driver.home,
            currentLocation: stops[0]?.query,
            pickupLocation: stops[1]?.query,
            dropoffLocation: stops[2]?.query,
            totalMiles: totalMiles,
            totalMilesDrivingToday: totalMiles,
            totalMileageToday: totalMiles,
          }
        })) : undefined}
        segments={segments}
      />
    )}
    {absSegments.length > 0 && <TripSummaryDialog segments={absSegments} />}
        </div>
      </header>

      <SidebarPanel
        sidebarOpen={sidebarOpen}
        stops={stops} setStops={setStops}
        loadingRoute={loadingRoute} onResolveRoute={resolveAndRoute}
        totalMiles={totalMiles} totalHours={totalHours} routePresent={!!route}
      />
      {planning && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded shadow text-sm">Planning trip…</div>
      )}
    </div>
  );
}
