export const LNG_VEHICLES = [
  "LNG-001",
  "LNG-002",
  "LNG-003",
  "LNG-004",
  "LNG-005",
] as const;

export const EV_VEHICLES = ["EV-001", "EV-002", "EV-003"] as const;

export const ALL_VEHICLES = [...LNG_VEHICLES, ...EV_VEHICLES] as const;

export type VehicleId = (typeof ALL_VEHICLES)[number];

export const TOTAL_VEHICLES = 8;

/** Auto-refresh interval per spec */
export const REFRESH_INTERVAL_MS = 5_000;

export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export type VehicleTypeFilter = "All" | "LNG" | "EV";

export type TimeRangeKey =
  | "15m"
  | "1h"
  | "6h"
  | "12h"
  | "24h"
  | "7d"
  | "30d"
  | "custom";

export const TIME_RANGE_OPTIONS: { value: TimeRangeKey; label: string }[] = [
  { value: "15m", label: "Last 15 Minutes" },
  { value: "1h", label: "Last 1 Hour" },
  { value: "6h", label: "Last 6 Hours" },
  { value: "12h", label: "Last 12 Hours" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

export interface TimeRangeBounds {
  start: Date;
  end: Date;
}

export function getTimeRangeBounds(
  key: TimeRangeKey,
  customStart?: string,
  customEnd?: string
): TimeRangeBounds {
  const now = new Date();
  const end = customEnd ? new Date(customEnd) : now;
  if (key === "custom" && customStart) {
    return { start: new Date(customStart), end };
  }
  const ms: Record<Exclude<TimeRangeKey, "custom">, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const offset = key === "custom" ? 60 * 60 * 1000 : ms[key as keyof typeof ms];
  return { start: new Date(end.getTime() - offset), end };
}

/** Simulator publish interval (bem_simulator.py PUBLISH_INTERVAL = 3). */
export const TELEMETRY_PUBLISH_INTERVAL_MS = 3_000;

/**
 * Max telemetry rows to read per vehicle for a time window.
 * Sized for ~3s publish cadence; capped to keep browser/DynamoDB reads bounded.
 */
export function historyLimitForSpanMs(spanMs: number): number {
  const expected =
    Math.ceil(spanMs / TELEMETRY_PUBLISH_INTERVAL_MS) + 50;
  if (spanMs <= 15 * 60 * 1000) return Math.min(expected, 500);
  if (spanMs <= 60 * 60 * 1000) return Math.min(expected, 2_500);
  if (spanMs <= 6 * 60 * 60 * 1000) return Math.min(expected, 8_000);
  if (spanMs <= 24 * 60 * 60 * 1000) return Math.min(expected, 12_000);
  return Math.min(expected, 20_000);
}

export function historyLimitForRange(
  key: TimeRangeKey,
  sinceIso?: string,
  untilIso?: string
): number {
  const bounds =
    sinceIso && untilIso
      ? { start: new Date(sinceIso), end: new Date(untilIso) }
      : getTimeRangeBounds(key);
  const spanMs = Math.max(
    0,
    bounds.end.getTime() - bounds.start.getTime()
  );
  return historyLimitForSpanMs(spanMs);
}

export function vehiclesForType(filter: VehicleTypeFilter): readonly string[] {
  if (filter === "LNG") return LNG_VEHICLES;
  if (filter === "EV") return EV_VEHICLES;
  return ALL_VEHICLES;
}

export function alertCategory(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("overheating") || d.includes("over-temp") || d.includes("temp"))
    return "Over Temp";
  if (d.includes("lng") || d.includes("fuel")) return "Low Fuel";
  if (d.includes("soc") || d.includes("battery low")) return "Low SOC";
  if (d.includes("pressure")) return "Pressure High";
  return "Other";
}
