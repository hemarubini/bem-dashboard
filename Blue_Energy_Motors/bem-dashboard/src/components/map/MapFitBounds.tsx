import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/** Fits map to bounds only when `trigger` changes (user clicked Locate Fleet). */
export function MapFitBounds({
  positions,
  trigger,
}: {
  positions: [number, number][];
  trigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (trigger === 0 || positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [trigger, map]);

  return null;
}
