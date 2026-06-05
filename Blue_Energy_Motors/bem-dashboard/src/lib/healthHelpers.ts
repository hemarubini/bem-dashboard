import type { TelemetryRecord } from "@/types";
import { parseNum } from "./parsers";
import { isOnline } from "./parsers";
import type { TripRecord } from "@/types";

export function vehicleHealthScore(rec: TelemetryRecord | null): string {
  if (!rec) return "—";
  if (rec.vehicle_id.startsWith("LNG") || rec.vehicle_type === "LNG") {
    const h = parseNum(rec.engine_health_score);
    return h !== null ? `${Math.round(h)}%` : "—";
  }
  const soh = parseNum(rec.soh_pct);
  const soc = parseNum(rec.soc_pct);
  if (soh !== null) return `${Math.round(soh)}%`;
  if (soc !== null) return `${Math.round(soc)}%`;
  return "—";
}

export type BatteryHealthStatus = "Healthy" | "Warning" | "Critical";

export function batteryHealthStatus(rec: TelemetryRecord | null): {
  label: BatteryHealthStatus;
  color: "success" | "warning" | "error";
} {
  if (!rec) return { label: "Healthy", color: "success" };
  const soc = parseNum(rec.soc_pct) ?? 100;
  const temp = parseNum(rec.battery_temp_c) ?? 25;
  if (soc < 10 || temp > 50)
    return { label: "Critical", color: "error" };
  if (soc < 20 || temp > 42)
    return { label: "Warning", color: "warning" };
  return { label: "Healthy", color: "success" };
}

export function chargingTimeEstimate(rec: TelemetryRecord | null): string {
  if (!rec) return "—";
  const status = rec.charging_status ?? "";
  const power = parseNum(rec.charging_power_kw) ?? 0;
  const mins = parseNum(rec.charging_time_min);
  if (status.toLowerCase().includes("charg") && mins && mins > 0) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (power > 0 && status.toLowerCase().includes("charg")) {
    const soc = parseNum(rec.soc_pct) ?? 80;
    const remaining = (100 - soc) / 100 * 300;
    const hours = remaining / power;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }
  return "N/A (discharging)";
}

export function energyConsumptionDisplay(rec: TelemetryRecord | null): string {
  const kwh = parseNum(rec?.energy_consumption_kwhkm);
  if (kwh === null) return "—";
  return `${Math.round(kwh * 100)} Wh/km`;
}

export type TripStatus = "Active" | "Completed" | "Aborted";

export function tripStatus(trip: TripRecord): TripStatus {
  if (trip.trip_id?.includes("TEST")) return "Aborted";
  const dist = parseNum(trip.distance_km) ?? 0;
  if (dist === 0 && !isOnline(trip.last_updated)) return "Aborted";
  if (isOnline(trip.last_updated)) return "Active";
  return "Completed";
}
