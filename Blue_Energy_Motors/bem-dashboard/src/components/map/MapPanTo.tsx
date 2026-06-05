import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/** Pans map when `trigger` changes (follow mode GPS updates). Keeps zoom level. */
export function MapPanTo({
  lat,
  lon,
  trigger,
}: {
  lat: number;
  lon: number;
  trigger: number;
}) {
  const map = useMap();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    map.panTo([lat, lon], { animate: true, duration: 0.6 });
  }, [trigger, lat, lon, map]);

  return null;
}
