import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/** Pans/zooms only when `trigger` changes — not when lat/lon update on refresh. */
export function MapFlyTo({
  lat,
  lon,
  zoom = 14,
  trigger,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  trigger: number;
}) {
  const map = useMap();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    map.flyTo([lat, lon], zoom, { duration: 1.2 });
  }, [trigger, lat, lon, zoom, map]);

  return null;
}
