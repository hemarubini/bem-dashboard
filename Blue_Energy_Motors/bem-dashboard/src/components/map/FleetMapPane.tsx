import { memo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { FleetMapVehicle } from "@/lib/fleetMapHelpers";
import { VehicleMarkersLayer } from "./VehicleMarkersLayer";
import { TrailPolylineLayer } from "./TrailPolylineLayer";
import { MapFlyTo } from "./MapFlyTo";
import { MapFitBounds } from "./MapFitBounds";
import { MapFollowPan } from "./MapFollowPan";
import { MapResizeHandler } from "./MapResizeHandler";
import { MapFullscreenControl } from "./MapFullscreenControl";

/** India-wide default — map does not auto-focus on fleet/Mumbai. */
const MAP_CENTER: [number, number] = [22.5, 79.0];
const MAP_ZOOM = 5;

export interface FleetMapPaneProps {
  vehicles: FleetMapVehicle[];
  selectedId: string | null;
  trailPositions: [number, number][];
  flyTarget: { lat: number; lon: number } | null;
  flyTrigger: number;
  followPanTrigger: number;
  followEnabled: boolean;
  fitBoundsTrigger: number;
  fitBoundsPositions: [number, number][];
  mapExpanded: boolean;
  onToggleExpand: () => void;
  onVehicleClick: (v: FleetMapVehicle) => void;
}

function FleetMapPaneInner({
  vehicles,
  selectedId,
  trailPositions,
  flyTarget,
  flyTrigger,
  followPanTrigger,
  followEnabled,
  fitBoundsTrigger,
  fitBoundsPositions,
  mapExpanded,
  onToggleExpand,
  onVehicleClick,
}: FleetMapPaneProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      doubleClickZoom
      dragging
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizeHandler layoutKey={mapExpanded ? "expanded" : "normal"} />
      <MapFullscreenControl
        expanded={mapExpanded}
        onToggle={onToggleExpand}
      />
      <TrailPolylineLayer positions={trailPositions} />
      <VehicleMarkersLayer
        vehicles={vehicles}
        selectedId={selectedId}
        onVehicleClick={onVehicleClick}
      />
      <MapFitBounds
        positions={fitBoundsPositions}
        trigger={fitBoundsTrigger}
      />
      {flyTarget && flyTrigger > 0 && (
        <MapFlyTo
          lat={flyTarget.lat}
          lon={flyTarget.lon}
          zoom={14}
          trigger={flyTrigger}
        />
      )}
      {flyTarget && followEnabled && followPanTrigger > 0 && (
        <MapFollowPan
          lat={flyTarget.lat}
          lon={flyTarget.lon}
          trigger={followPanTrigger}
          enabled={followEnabled}
        />
      )}
    </MapContainer>
  );
}

export const FleetMapPane = memo(FleetMapPaneInner);
