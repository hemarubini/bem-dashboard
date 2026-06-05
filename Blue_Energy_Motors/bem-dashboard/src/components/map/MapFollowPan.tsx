import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/** Follow mode: pans map to selected vehicle on each position update (zoom unchanged). */
export function MapFollowPan({
  lat,
  lon,
  trigger,
  enabled,
}: {
  lat: number;
  lon: number;
  trigger: number;
  enabled: boolean;
}) {
  const map = useMap();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (!enabled || trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    map.panTo([lat, lon], { animate: true, duration: 0.5 });
  }, [trigger, lat, lon, map, enabled]);

  return null;
}
