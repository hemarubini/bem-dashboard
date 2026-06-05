import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Recalculates tile layout after container size changes (e.g. fullscreen toggle). */
export function MapResizeHandler({ layoutKey }: { layoutKey: string | number }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 150);
    return () => window.clearTimeout(id);
  }, [layoutKey, map]);

  return null;
}
