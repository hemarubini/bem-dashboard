import type { AlertRecord } from "@/types";
import type { TelemetryRecord } from "@/types";
import { formatTs, isOnline, parseNum } from "./parsers";
import { getVehicleColor } from "./vehicleColor";

export const FLEET_MAP_TRAIL_POINTS = 20;

export type VehicleAlertLevel = "Healthy" | "Warning" | "Critical" | "Offline";

export type AlertStatusFilter = "All" | "Healthy" | "Warning" | "Critical";

export interface VehicleAlertState {
  warning: boolean;
  critical: boolean;
  topSeverity: VehicleAlertLevel;
  description: string;
}

/** Latest alert per vehicle (by timestamp) within the caller's time-filtered set. */
export function buildAlertMap(alerts: AlertRecord[]): Map<string, VehicleAlertState> {
  const latestByVehicle = new Map<string, AlertRecord>();
  for (const a of alerts) {
    const existing = latestByVehicle.get(a.vehicle_id);
    if (!existing) {
      latestByVehicle.set(a.vehicle_id, a);
      continue;
    }
    const tNew = new Date(a.timestamp).getTime();
    const tOld = new Date(existing.timestamp).getTime();
    if (tNew >= tOld) {
      latestByVehicle.set(a.vehicle_id, a);
    }
  }

  const map = new Map<string, VehicleAlertState>();
  for (const [vehicleId, a] of latestByVehicle) {
    const s = a.severity?.toUpperCase() ?? "";
    if (s === "CRITICAL") {
      map.set(vehicleId, {
        warning: false,
        critical: true,
        topSeverity: "Critical",
        description: a.description,
      });
    } else if (s === "WARNING") {
      map.set(vehicleId, {
        warning: true,
        critical: false,
        topSeverity: "Warning",
        description: a.description,
      });
    }
  }
  return map;
}

export function vehicleAlertLevel(
  online: boolean,
  alert?: VehicleAlertState
): VehicleAlertLevel {
  if (!online) return "Offline";
  if (alert?.critical) return "Critical";
  if (alert?.warning) return "Warning";
  return "Healthy";
}

/** Marker ring / border — alert status only (fill uses getVehicleColor). */
export function statusBorderColorForLevel(level: VehicleAlertLevel): string {
  switch (level) {
    case "Critical":
      return "#d32f2f";
    case "Warning":
      return "#ed6c02";
    case "Offline":
      return "#757575";
    default:
      return "#2e7d32";
  }
}

export function matchesAlertFilter(
  level: VehicleAlertLevel,
  filter: AlertStatusFilter
): boolean {
  if (filter === "All") return true;
  if (filter === "Healthy") return level === "Healthy";
  if (filter === "Warning") return level === "Warning";
  if (filter === "Critical") return level === "Critical";
  return true;
}

export interface FleetMapListFilters {
  vehicleIds: readonly string[];
  vehicle: string;
  alertFilter: AlertStatusFilter;
}

/** Filters map markers and table rows. Does not apply time range — latest position is always shown. */
export function filterFleetMapVehicles(
  vehicles: FleetMapVehicle[],
  { vehicleIds, vehicle, alertFilter }: FleetMapListFilters
): FleetMapVehicle[] {
  const typeIds = new Set(vehicleIds);
  return vehicles.filter((v) => {
    if (!typeIds.has(v.id)) return false;
    if (vehicle !== "All Vehicles" && v.id !== vehicle) return false;
    if (!matchesAlertFilter(v.level, alertFilter)) return false;
    return true;
  });
}

export interface FleetMapVehicle {
  id: string;
  lat: number;
  lon: number;
  rec: TelemetryRecord;
  online: boolean;
  level: VehicleAlertLevel;
  vehicleColor: string;
  statusBorderColor: string;
  isLNG: boolean;
  alertText: string;
}

export function toFleetMapVehicle(
  rec: TelemetryRecord,
  alertMap: Map<string, VehicleAlertState>
): FleetMapVehicle | null {
  const lat = Number(rec.gps_lat);
  const lon = Number(rec.gps_lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const online = isOnline(rec.timestamp);
  const al = alertMap.get(rec.vehicle_id);
  const level = vehicleAlertLevel(online, al);
  return {
    id: rec.vehicle_id,
    lat,
    lon,
    rec,
    online,
    level,
    vehicleColor: getVehicleColor(rec.vehicle_id),
    statusBorderColor: statusBorderColorForLevel(level),
    isLNG: rec.vehicle_type === "LNG" || rec.vehicle_id.startsWith("LNG"),
    alertText: al?.description || "None",
  };
}

export function vehicleMapPopupHtml(v: FleetMapVehicle): string {
  const type = v.rec.vehicle_type ?? (v.isLNG ? "LNG" : "EV");
  const extra = v.isLNG
    ? `Fuel: ${parseNum(v.rec.lng_level_pct) ?? "—"}% · Pressure: ${parseNum(v.rec.tank_pressure_bar) ?? "—"} bar`
    : `SOC: ${parseNum(v.rec.soc_pct) ?? "—"}% · Battery: ${parseNum(v.rec.battery_temp_c) ?? "—"} °C`;
  const status =
    v.online ? "ONLINE" : "OFFLINE";
  const level =
    v.level !== "Healthy" && v.level !== "Offline"
      ? ` · ${v.level.toUpperCase()}`
      : "";
  return `<div class="bem-vehicle-popup">
    <strong>${v.id}</strong><br/>
    Type: ${type}<br/>
    Speed: ${parseNum(v.rec.speed_kmh) ?? "—"} km/h<br/>
    ${extra}<br/>
    Last Seen: ${formatTs(v.rec.timestamp)}<br/>
    <strong>Status: ${status}${level}</strong><br/>
    Trip: ${v.rec.trip_id ?? "—"}
  </div>`;
}
