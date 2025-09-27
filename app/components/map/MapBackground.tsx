import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import { useEffect, useRef } from "react";
import { type LngLat } from "~/types/edl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export default function MapBackground({
  routeGeoJSON,
  markers = [],
  className = "w-screen h-screen",
  restStops = [],
}: {
  routeGeoJSON: GeoJSON.LineString | null;
  markers?: LngLat[];
  restStops?: LngLat[];
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapboxRef = useRef<any>(null);
  const glRef = useRef<any>(null);

  console.log("MapBackground render", { routeGeoJSON, markers, restStops });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mapRef.current || mapboxRef.current) return;
      while (mapRef.current.firstChild) {
        mapRef.current.removeChild(mapRef.current.firstChild);
      }
      const mapboxgl = (await import("mapbox-gl")).default;
      glRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const firstPoint = markers[0] || restStops[0];
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/standard",
        center: firstPoint ? [firstPoint.lng, firstPoint.lat] : [-96.8, 32.8],
        zoom: 5,
        attributionControl: false,
        cooperativeGestures: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      mapboxRef.current = map;

      map.on("load", () => {
        if (!mounted) return;
        if (!map.getSource("route")) {
          map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: { "line-width": 5, "line-color": "#22c55e", "line-opacity": 0.85 },
            layout: { "line-join": "round", "line-cap": "round" },
          });
        }
      });
    })();
    return () => { mounted = false; mapboxRef.current?.remove(); mapboxRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapboxRef.current; const mapboxgl = glRef.current;
    if (!map || !mapboxgl) return;

    const apply = () => {
      const src = map.getSource("route");
      if (src && routeGeoJSON) {
        src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: routeGeoJSON, properties: {} }] });
        const coords = routeGeoJSON.coordinates as [number, number][];
        const bounds = coords.reduce((b, c) => b.extend(c as any), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 80, duration: 700 });
      }
      map._routeMarkers?.forEach((m: any) => m.remove());
      map._routeMarkers = [];
      const addMarker = (m: any, colorHex: string) => {
        const root = document.createElement("div");
        root.style.width = "0px";
        root.style.height = "0px";

        const dot = document.createElement("div");
        dot.style.width = "12px";
        dot.style.height = "12px";
        dot.style.borderRadius = "9999px";
        dot.style.backgroundColor = String(colorHex);
        dot.style.boxShadow = "0 0 0 2px white";
        dot.style.transition = "transform 120ms ease, box-shadow 120ms ease";
        dot.style.transformOrigin = "center";
        dot.style.cursor = "pointer";
        dot.addEventListener("mouseenter", () => {
          dot.style.transform = "scale(1.35)";
          dot.style.boxShadow = "0 0 0 3px white";
        });
        dot.addEventListener("mouseleave", () => {
          dot.style.transform = "scale(1)";
          dot.style.boxShadow = "0 0 0 2px white";
        });
        root.appendChild(dot);

        const mk = new mapboxgl.Marker(root).setLngLat([m.lng, m.lat]).addTo(map);
        map._routeMarkers.push(mk);
      };
      (markers || []).forEach((m) => addMarker(m, "#16a34a"));
      (restStops || []).forEach((m) => addMarker(m, "#f59e0b"));

      if (!routeGeoJSON) {
        const pts: [number, number][] = [
          ...((markers || []).map((m: any) => [m.lng, m.lat] as [number, number])),
          ...((restStops || []).map((m: any) => [m.lng, m.lat] as [number, number])),
        ];
        if (pts.length > 0) {
          const bounds = pts.reduce((b, c) => b.extend(c as any), new mapboxgl.LngLatBounds(pts[0], pts[0]));
          map.fitBounds(bounds, { padding: 80, duration: 500 });
        }
      }
    };

    if (!map.isStyleLoaded()) map.once("load", apply); else apply();
  }, [routeGeoJSON]);

  useEffect(() => {
    const map = mapboxRef.current; const mapboxgl = glRef.current;
    if (!map || !mapboxgl) return;

    const updateMarkers = () => {
      map._routeMarkers?.forEach((m: any) => m.remove());
      map._routeMarkers = [];

      const addMarker = (m: any, colorHex: string) => {
        const root = document.createElement("div");
        root.style.width = "0px";
        root.style.height = "0px";

        const dot = document.createElement("div");
        dot.style.width = "12px";
        dot.style.height = "12px";
        dot.style.borderRadius = "9999px";
        dot.style.backgroundColor = String(colorHex);
        dot.style.boxShadow = "0 0 0 2px white";
        dot.style.transition = "transform 120ms ease, box-shadow 120ms ease";
        dot.style.transformOrigin = "center";
        dot.style.cursor = "pointer";
        dot.addEventListener("mouseenter", () => {
          dot.style.transform = "scale(1.35)";
          dot.style.boxShadow = "0 0 0 3px white";
        });
        dot.addEventListener("mouseleave", () => {
          dot.style.transform = "scale(1)";
          dot.style.boxShadow = "0 0 0 2px white";
        });
        root.appendChild(dot);

        const mk = new mapboxgl.Marker(root).setLngLat([m.lng, m.lat]).addTo(map);
        map._routeMarkers.push(mk);
      };
      (markers || []).forEach((m) => addMarker(m, "#16a34a"));
      (restStops || []).forEach((m) => addMarker(m, "#f59e0b"));

      if (!routeGeoJSON) {
        const pts: [number, number][] = [
          ...((markers || []).map((m: any) => [m.lng, m.lat] as [number, number])),
          ...((restStops || []).map((m: any) => [m.lng, m.lat] as [number, number])),
        ];
        if (pts.length > 0) {
          const bounds = pts.reduce((b, c) => b.extend(c as any), new mapboxgl.LngLatBounds(pts[0], pts[0]));
          map.fitBounds(bounds, { padding: 80, duration: 500 });
        }
      }
    };

    if (!map.isStyleLoaded()) map.once("load", updateMarkers); else updateMarkers();
  }, [markers, restStops, routeGeoJSON]);

  return <div ref={mapRef} className={className} />;
}
