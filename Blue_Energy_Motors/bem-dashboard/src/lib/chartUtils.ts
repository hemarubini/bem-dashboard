import type { AlertRecord, TelemetryRecord } from "@/types";
import { parseNum } from "./parsers";
import { formatTs } from "./parsers";

export function telemetryToSeries(
  records: TelemetryRecord[],
  field: string,
  vehicleFilter?: string
): { time: string; timestamp: string; value: number; vehicle?: string }[] {
  return records
    .filter((r) => !vehicleFilter || r.vehicle_id === vehicleFilter)
    .map((r) => ({
      time: formatTs(r.timestamp),
      timestamp: r.timestamp,
      value: parseNum(r[field]) ?? 0,
      vehicle: r.vehicle_id,
    }));
}

export function fleetSpeedTrend(records: TelemetryRecord[]) {
  return records.map((r) => ({
    time: formatTs(r.timestamp),
    value: parseNum(r.speed_kmh) ?? 0,
  }));
}

export function fleetHealthTrend(records: TelemetryRecord[]) {
  return records
    .filter(
      (r) =>
        r.vehicle_type === "LNG" ||
        r.vehicle_id.startsWith("LNG")
    )
    .map((r) => ({
      time: formatTs(r.timestamp),
      value: parseNum(r.engine_health_score) ?? 0,
    }));
}

export function alertTrendBuckets(
  alerts: AlertRecord[],
  bucketMinutes = 15
): { time: string; value: number }[] {
  if (!alerts.length) return [];
  const buckets = new Map<number, number>();
  for (const a of alerts) {
    const t = new Date(a.timestamp).getTime();
    const key =
      Math.floor(t / (bucketMinutes * 60 * 1000)) * bucketMinutes * 60 * 1000;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, count]) => ({
      time: new Date(ts).toLocaleString(),
      value: count,
    }));
}

export function tripsPerDay(trips: { last_updated?: string }[]) {
  const counts = new Map<string, number>();
  for (const t of trips) {
    if (!t.last_updated) continue;
    const day = new Date(t.last_updated).toLocaleDateString();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts.entries()].map(([time, value]) => ({ time, value }));
}

export function costByDate(records: TelemetryRecord[]) {
  const byDay = new Map<string, number[]>();
  for (const r of records) {
    const day = new Date(r.timestamp).toLocaleDateString();
    const cost = parseNum(r.daily_cost_inr);
    if (cost === null) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(cost);
  }
  return [...byDay.entries()].map(([time, vals]) => ({
    time,
    value: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
}

export function savingsByDate(records: TelemetryRecord[]) {
  const byDay = new Map<string, number[]>();
  for (const r of records) {
    const day = new Date(r.timestamp).toLocaleDateString();
    const s = parseNum(r.cost_savings_pct);
    if (s === null) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }
  return [...byDay.entries()].map(([time, vals]) => ({
    time,
    value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  }));
}

export function filterByTimeRange<T extends { timestamp?: string; last_updated?: string }>(
  items: T[],
  start: Date,
  end: Date
): T[] {
  return items.filter((item) => {
    const raw = item.timestamp ?? item.last_updated;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}
