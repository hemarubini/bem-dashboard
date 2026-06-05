import type { AlertRecord, TelemetryRecord, TripRecord } from "@/types";
import type { ChartPoint } from "@/components/LineChartPanel";

function recordEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (String(a[k] ?? "") !== String(b[k] ?? "")) return false;
  }
  return true;
}

export function mergeByKey<T extends { vehicle_id?: string; alert_id?: string; trip_id?: string; timestamp?: string }>(
  prev: T[] | undefined,
  next: T[],
  keyFn: (item: T) => string
): T[] {
  if (!prev?.length) return next;
  const prevMap = new Map(prev.map((item) => [keyFn(item), item]));
  let sameRef = next.length === prev.length;
  const merged = next.map((item) => {
    const key = keyFn(item);
    const old = prevMap.get(key);
    if (old && recordEqual(old as Record<string, unknown>, item as Record<string, unknown>)) {
      return old;
    }
    sameRef = false;
    return item;
  });
  return sameRef && merged.every((item, i) => item === prev[i]) ? prev : merged;
}

export function mergeTelemetryHistory(
  prev: TelemetryRecord[] | undefined,
  next: TelemetryRecord[]
): TelemetryRecord[] {
  return mergeByKey(
    prev,
    next,
    (r) => `${r.vehicle_id}:${r.timestamp}`
  );
}

export function mergeLatestTelemetry(
  prev: TelemetryRecord[] | undefined,
  next: TelemetryRecord[]
): TelemetryRecord[] {
  return mergeByKey(prev, next, (r) => r.vehicle_id);
}

export function mergeAlerts(
  prev: AlertRecord[] | undefined,
  next: AlertRecord[]
): AlertRecord[] {
  return mergeByKey(prev, next, (r) => r.alert_id);
}

export function mergeTrips(
  prev: TripRecord[] | undefined,
  next: TripRecord[]
): TripRecord[] {
  return mergeByKey(prev, next, (r) => `${r.vehicle_id}:${r.trip_id}`);
}

export function mergeChartPoints(
  prev: ChartPoint[] | undefined,
  next: ChartPoint[]
): ChartPoint[] {
  if (!prev?.length) return next;
  const prevMap = new Map(prev.map((p) => [p.time, p]));
  let unchanged = next.length === prev.length;
  const merged = next.map((p) => {
    const old = prevMap.get(p.time);
    if (
      old &&
      old.value === p.value &&
      old.label === p.label &&
      old.bucketStartMs === p.bucketStartMs &&
      old.underlyingRecordCount === p.underlyingRecordCount
    ) {
      return old;
    }
    unchanged = false;
    return p;
  });
  return unchanged && merged.every((p, i) => p === prev[i]) ? prev : merged;
}

/** TanStack Query structuralSharing — preserve referential equality where values match */
export function structuralMerge<T>(oldData: T | undefined, newData: T): T {
  if (oldData === undefined || oldData === null) return newData;
  if (Array.isArray(newData) && Array.isArray(oldData)) {
    if (newData.length && "vehicle_id" in (newData[0] as object)) {
      if ("alert_id" in (newData[0] as object)) {
        return mergeAlerts(oldData as AlertRecord[], newData as AlertRecord[]) as T;
      }
      if ("trip_id" in (newData[0] as object) && "last_updated" in (newData[0] as object)) {
        return mergeTrips(oldData as TripRecord[], newData as TripRecord[]) as T;
      }
      return mergeTelemetryHistory(
        oldData as TelemetryRecord[],
        newData as TelemetryRecord[]
      ) as T;
    }
    if (newData.length && "time" in (newData[0] as object) && "value" in (newData[0] as object)) {
      return mergeChartPoints(oldData as ChartPoint[], newData as ChartPoint[]) as T;
    }
    return newData;
  }
  if (
    typeof newData === "object" &&
    newData !== null &&
    typeof oldData === "object" &&
    oldData !== null
  ) {
    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    const arrayMergers: Record<string, (p: unknown[] | undefined, n: unknown[]) => unknown[]> = {
      history: (p, n) => mergeTelemetryHistory(p as TelemetryRecord[], n as TelemetryRecord[]),
      records: (p, n) => mergeTelemetryHistory(p as TelemetryRecord[], n as TelemetryRecord[]),
      latestTelemetry: (p, n) => mergeLatestTelemetry(p as TelemetryRecord[], n as TelemetryRecord[]),
      latest: (p, n) => mergeLatestTelemetry(p as TelemetryRecord[], n as TelemetryRecord[]),
      alerts: (p, n) => mergeAlerts(p as AlertRecord[], n as AlertRecord[]),
      trips: (p, n) => mergeTrips(p as TripRecord[], n as TripRecord[]),
    };

    let stable = true;
    for (const key of Object.keys(newObj)) {
      const nextVal = newObj[key];
      const prevVal = oldObj[key];
      if (Array.isArray(nextVal) && arrayMergers[key]) {
        const merged = arrayMergers[key](prevVal as unknown[] | undefined, nextVal as unknown[]);
        result[key] = merged;
        if (merged !== prevVal) stable = false;
      } else {
        const merged = structuralMerge(prevVal, nextVal);
        result[key] = merged;
        if (merged !== prevVal) stable = false;
      }
    }
    return (stable ? oldData : (result as T));
  }
  return newData;
}
