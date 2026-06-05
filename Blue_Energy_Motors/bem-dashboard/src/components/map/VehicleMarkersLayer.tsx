import { useMemo } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { CircleMarkerOptions } from "leaflet";
import {
  type FleetMapVehicle,
  vehicleMapPopupHtml,
} from "@/lib/fleetMapHelpers";
import { vehiclesWithMapDisplayCoords } from "@/lib/mapMarkerSpread";

function markerStyle(
  v: FleetMapVehicle,
  selected: boolean
): CircleMarkerOptions {
  const ring = selected ? 5 : v.level === "Critical" ? 4 : 3;
  return {
    radius: selected ? 14 : 10,
    fillColor: v.vehicleColor,
    color: v.statusBorderColor,
    fillOpacity: 0.88,
    weight: ring,
    className: v.level === "Critical" ? "bem-marker-critical" : undefined,
  };
}

interface VehicleMarkersLayerProps {
  vehicles: FleetMapVehicle[];
  selectedId: string | null;
  onVehicleClick: (v: FleetMapVehicle) => void;
}

/** Clustered markers; duplicate GPS coords are spread for demo visibility. */
export function VehicleMarkersLayer({
  vehicles,
  selectedId,
  onVehicleClick,
}: VehicleMarkersLayerProps) {
  const displayed = useMemo(
    () => vehiclesWithMapDisplayCoords(vehicles),
    [vehicles]
  );

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={55}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      disableClusteringAtZoom={16}
    >
      {displayed.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.displayLat, v.displayLon]}
          {...markerStyle(v, selectedId === v.id)}
          eventHandlers={{
            click: () => onVehicleClick(v),
          }}
        >
          <Popup maxWidth={280}>
            <div
              dangerouslySetInnerHTML={{
                __html:
                  vehicleMapPopupHtml(v) +
                  (v.displayOffset
                    ? `<br/><span style="font-size:11px;color:#666">Map position offset for visibility (true GPS in table).</span>`
                    : ""),
              }}
            />
          </Popup>
        </CircleMarker>
      ))}
    </MarkerClusterGroup>
  );
}
