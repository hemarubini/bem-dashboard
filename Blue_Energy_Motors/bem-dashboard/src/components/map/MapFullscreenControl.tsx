import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface MapFullscreenControlProps {
  expanded: boolean;
  onToggle: () => void;
}

/** Leaflet control: ⛶ Full screen / ⊟ minimize — map stays mounted. */
export function MapFullscreenControl({
  expanded,
  onToggle,
}: MapFullscreenControlProps) {
  const map = useMap();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    const control = new L.Control({ position: "topright" });

    control.onAdd = () => {
      const wrap = L.DomUtil.create("div", "bem-map-fs-control");
      const btn = L.DomUtil.create("button", "bem-map-fs-btn", wrap);
      btn.type = "button";
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.on(btn, "click", (e) => {
        L.DomEvent.preventDefault(e);
        onToggleRef.current();
      });
      btnRef.current = btn;
      return wrap;
    };

    control.addTo(map);
    return () => {
      control.remove();
      btnRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.title = expanded ? "Minimize map" : "Full screen map";
    btn.setAttribute(
      "aria-label",
      expanded ? "Minimize map" : "Full screen map"
    );
    btn.textContent = expanded ? "⊟" : "⛶";
  }, [expanded]);

  return null;
}
