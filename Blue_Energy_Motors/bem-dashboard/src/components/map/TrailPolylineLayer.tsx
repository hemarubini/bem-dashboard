import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface TrailPolylineLayerProps {
  positions: [number, number][];
}

/** Updates route trail via setLatLngs — polyline is not recreated on refresh. */
export function TrailPolylineLayer({ positions }: TrailPolylineLayerProps) {
  const map = useMap();
  const lineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!lineRef.current) {
      lineRef.current = L.polyline([], {
        color: "#00a8e8",
        weight: 4,
        opacity: 0.85,
      });
    }

    const line = lineRef.current;

    if (positions.length > 1) {
      line.setLatLngs(positions);
      if (!map.hasLayer(line)) {
        line.addTo(map);
      }
    } else if (map.hasLayer(line)) {
      map.removeLayer(line);
      line.setLatLngs([]);
    }
  }, [positions, map]);

  return null;
}
