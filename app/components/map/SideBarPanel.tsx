import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Loader2, MapPin, Play, Route as RouteIcon, LocateFixed } from "lucide-react";
import { type Stop } from "~/types/edl";
import { suggestPlaces, type PlaceSuggestion, reverseGeocode } from "~/lib/mapbox";

export default function SidebarPanel({
  sidebarOpen,
  stops, setStops,
  loadingRoute, onResolveRoute,
  cycleHoursUsed, setCycleHoursUsed,
  routePresent,
}: {
  sidebarOpen: boolean;
  stops: Stop[]; setStops: React.Dispatch<React.SetStateAction<Stop[]>>;
  loadingRoute: boolean; onResolveRoute: () => void;
  totalMiles: number; totalHours: number; routePresent: boolean;
  cycleHoursUsed?: number; setCycleHoursUsed?: React.Dispatch<React.SetStateAction<number>>;
}) {
  const normalizedStops = useMemo(() => {
    if (stops.length < 3) {
      const fill: Stop[] = [...stops];
      const labels = ["Current Location", "Pickup Location", "Dropoff Location"];
      for (let i = fill.length; i < 3; i++) fill.push({ label: labels[i], query: "", coord: undefined });
      return fill.slice(0, 3).map((s, i) => ({ ...s, label: labels[i] }));
    }
    return stops.slice(0, 3).map((s, i) => ({ ...s, label: ["Current Location", "Pickup Location", "Dropoff Location"][i] }));
  }, [stops]);

  const [internalCycleUsed, setInternalCycleUsed] = useState(0);
  const cycleValue = cycleHoursUsed ?? internalCycleUsed;
  const cycleSetter = setCycleHoursUsed ?? setInternalCycleUsed;

  const updateStopQuery = (index: number, value: string) => {
    setStops(prev => prev.map((s, i) => (i === index ? { ...s, query: value } : s)));
  };

  const [suggestions, setSuggestions] = useState<Record<number, PlaceSuggestion[]>>({});
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const debounceRef = useRef<Record<number, number>>({});
  const [geoLoading, setGeoLoading] = useState(false);

  const handleInputChange = (idx: number, val: string) => {
    updateStopQuery(idx, val);
    setOpenIndex(val.trim().length > 0 ? idx : null);
    if (debounceRef.current[idx]) window.clearTimeout(debounceRef.current[idx]);
    debounceRef.current[idx] = window.setTimeout(async () => {
      const list = await suggestPlaces(val, 6);
      setSuggestions(prev => ({ ...prev, [idx]: list }));
    }, 250);
  };

  const pickSuggestion = (idx: number, s: PlaceSuggestion) => {
    setStops(prev => prev.map((p, i) => (i === idx ? { ...p, query: s.label, coord: s.coord } : p)));
    setOpenIndex(null);
  };

  const useCurrentLocation = async (idx: number) => {
    if (idx !== 0) return;
    if (!navigator?.geolocation) {
      console.warn("Geolocation not supported in this browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        let label = "Current Location";
        try {
          const place = await reverseGeocode(longitude, latitude);
          if (place?.label) label = place.label;
        } catch {}
        setStops(prev => prev.map((p, i) => (i === idx ? { ...p, query: label, coord: { lat: latitude, lng: longitude } } : p)));
        setOpenIndex(null);
      } finally {
        setGeoLoading(false);
      }
    }, (err) => {
      console.warn("Geolocation error:", err?.message || err);
      setGeoLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  return (
    <aside className={`absolute z-40 left-4 top-20 bottom-4 transition-[transform,opacity] duration-300 ${sidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}>
      <Card className="w-[340px] max-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border shadow-xl bg-white/85 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><RouteIcon className="h-4 w-4" /> Trip Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 thin-scrollbar overflow-y-auto pr-2">
          <div className="space-y-3">
            {normalizedStops.map((s, idx) => (
              <div key={idx} className="space-y-1.5 relative">
                <Label className="text-xs text-muted-foreground">{s.label}
                {idx === 0 && (
                  <div className="flex justify-end ms-auto">
                    <button
                      type="button"
                      className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                      onClick={() => useCurrentLocation(idx)}
                      disabled={geoLoading}
                      title="Use my current location"
                      >
                      <LocateFixed className="h-3.5 w-3.5" /> {geoLoading ? "Locating…" : "Use my location"}
                    </button>
                  </div>
                )}
                </Label>
                <Input
                  className="bg-white/70"
                  placeholder={s.label}
                  value={s.query}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onFocus={() => s.query.trim() && setOpenIndex(idx)}
                />
                {openIndex === idx && (suggestions[idx]?.length || 0) > 0 && (
                  <div className="absolute z-50 mt-1 left-0 right-0 bg-white border rounded shadow max-h-60 overflow-auto">
                    {suggestions[idx]!.map((sg, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-muted/50 flex items-center gap-2"
                        onClick={() => pickSuggestion(idx, sg)}
                      >
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs">{sg.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Current Cycle Used (Hrs)</Label>
              <Input
                className="bg-white/70"
                inputMode="numeric"
                value={cycleValue}
                onChange={(e) => cycleSetter(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={onResolveRoute} className="gap-2" disabled={loadingRoute}>
                {loadingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Get Route
              </Button>
            </div>
            {routePresent && (
              <div className="pt-3">
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block"
                      style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: "#16a34a", boxShadow: "0 0 0 2px white" }}
                    />
                    <span className="text-xs">Start/Pickup/Dropoff</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block"
                      style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: "#f59e0b", boxShadow: "0 0 0 2px white" }}
                    />
                    <span className="text-xs">Rest Stop (≥ 30 min)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
