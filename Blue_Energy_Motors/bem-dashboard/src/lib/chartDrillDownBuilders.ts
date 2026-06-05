import type { ChartPoint } from "@/components/LineChartPanel";
import type { AlertRecord, TelemetryRecord } from "@/types";
import type { TimeRangeKey } from "@/config/constants";
import type { BucketRange } from "./chartDrillDown";
import { filterRecordsInBucket } from "./chartDrillDown";
import {
  buildFleetSavingsTrend,
  type SavingsViewMode,
} from "./costHelpers";
import { parseNum } from "./parsers";

interface BucketMeta {
  count: number;
  vehicles: Set<string>;
}

function bucketKey(ts: number, bucketMs: number): number {
  if (bucketMs <= 0) return ts;
  return Math.floor(ts / bucketMs) * bucketMs;
}

function toChartPoint(
  bucketStartMs: number,
  bucketMs: number,
  value: number,
  meta: BucketMeta
): ChartPoint {
  const endMs = bucketMs > 0 ? bucketStartMs + bucketMs : bucketStartMs + 60_000;
  return {
    time: new Date(bucketStartMs).toISOString(),
    timestamp: new Date(bucketStartMs).toISOString(),
    value,
    bucketStartMs,
    bucketEndMs: endMs,
    underlyingRecordCount: meta.count,
    vehicleCount: meta.vehicles.size,
  };
}

export function buildAlertTrendChart(
  alerts: readonly AlertRecord[],
  bucketMs: number,
  range?: BucketRange
): ChartPoint[] {
  const source = range
    ? filterRecordsInBucket(alerts, range)
    : [...alerts];
  if (!source.length) return [];

  if (bucketMs <= 0) {
    return source
      .map((a) => {
        const t = new Date(a.timestamp).getTime();
        return toChartPoint(t, 0, 1, {
          count: 1,
          vehicles: new Set([a.vehicle_id]),
        });
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
      );
  }

  const buckets = new Map<number, BucketMeta>();
  for (const a of source) {
    const t = new Date(a.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const key = bucketKey(t, bucketMs);
    const cur = buckets.get(key) ?? { count: 0, vehicles: new Set<string>() };
    cur.count += 1;
    cur.vehicles.add(a.vehicle_id);
    buckets.set(key, cur);
  }

  const points = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startMs, meta]) => toChartPoint(startMs, bucketMs, meta.count, meta));

  return points;
}

export function buildCostTrendChart(
  records: readonly TelemetryRecord[],
  latest: readonly TelemetryRecord[],
  bucketMs: number,
  range?: BucketRange
): ChartPoint[] {
  const source = range
    ? filterRecordsInBucket(records, range)
    : [...records];
  if (!source.length) return [];

  let historical: ChartPoint[];

  if (bucketMs <= 0) {
    historical = source
      .filter((r) => parseNum(r.daily_cost_inr) !== null)
      .map((r) => {
        const t = new Date(r.timestamp).getTime();
        const val = parseNum(r.daily_cost_inr) ?? 0;
        return toChartPoint(t, 0, val, {
          count: 1,
          vehicles: new Set([r.vehicle_id]),
        });
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
      );
  } else {
    const buckets = new Map<
      number,
      { values: number[]; vehicles: Set<string> }
    >();
    for (const r of source) {
      const cost = parseNum(r.daily_cost_inr);
      if (cost === null) continue;
      const t = new Date(r.timestamp).getTime();
      if (Number.isNaN(t)) continue;
      const key = bucketKey(t, bucketMs);
      const cur = buckets.get(key) ?? { values: [], vehicles: new Set<string>() };
      cur.values.push(cost);
      cur.vehicles.add(r.vehicle_id);
      buckets.set(key, cur);
    }

    historical = [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([startMs, { values, vehicles }]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return toChartPoint(startMs, bucketMs, Math.round(avg), {
          count: values.length,
          vehicles,
        });
      });
  }

  if (range) return historical;

  const latestCosts = latest
    .map((r) => parseNum(r.daily_cost_inr))
    .filter((v): v is number => v !== null);

  if (latestCosts.length === 0) return historical;

  const avgCost = Math.round(
    latestCosts.reduce((a, b) => a + b, 0) / latestCosts.length
  );
  const latestTimestamp = Math.max(
    ...latest.map((r) => new Date(r.timestamp).getTime())
  );
  const kpiBucketStart =
    bucketMs > 0 ? bucketKey(latestTimestamp, bucketMs) : latestTimestamp;

  const kpiPoint: ChartPoint = {
    time: new Date(latestTimestamp).toISOString(),
    timestamp: new Date(latestTimestamp).toISOString(),
    value: avgCost,
    bucketStartMs: kpiBucketStart,
    bucketEndMs: kpiBucketStart + (bucketMs > 0 ? bucketMs : 60_000),
    underlyingRecordCount: latest.length,
    vehicleCount: new Set(latest.map((r) => r.vehicle_id)).size,
  };

  if (historical.length === 0) return [kpiPoint];

  const last = historical[historical.length - 1];
  const lastTime = new Date(last.timestamp!).getTime();
  const lastBucket =
    bucketMs > 0 ? bucketKey(lastTime, bucketMs) : lastTime;

  if (kpiBucketStart === lastBucket) {
    return [...historical.slice(0, -1), kpiPoint];
  }

  if (latestTimestamp > lastTime) {
    return [...historical, kpiPoint];
  }

  return historical;
}

export function buildSavingsTrendChart(
  records: readonly TelemetryRecord[],
  latest: readonly TelemetryRecord[],
  view: SavingsViewMode,
  timeRange: TimeRangeKey,
  bucketMs: number,
  range?: BucketRange
): ChartPoint[] {
  const filteredRecords = range
    ? filterRecordsInBucket(records, range)
    : records;
  const filteredLatest = range
    ? filterRecordsInBucket(latest, range)
    : latest;

  const points = buildFleetSavingsTrend(
    filteredRecords,
    filteredLatest,
    view,
    timeRange,
    {
      bucketMs,
      alignKpi: !range,
    }
  );

  const chartPoints = points.map((p) => {
    const ts = new Date(p.timestamp).getTime();
    const startMs = bucketMs > 0 ? bucketKey(ts, bucketMs) : ts;
    const recordsInBucket = range
      ? filterRecordsInBucket(filteredRecords, {
          startMs,
          endMs: startMs + (bucketMs > 0 ? bucketMs : 60_000),
        })
      : filteredRecords.filter((r) => {
          const t = new Date(r.timestamp).getTime();
          if (Number.isNaN(t)) return false;
          const k = bucketKey(t, bucketMs);
          return k === startMs;
        });

    const vehicles = new Set(recordsInBucket.map((r) => r.vehicle_id));
    return {
      time: p.time,
      timestamp: p.timestamp,
      value: p.value,
      savingsPct: p.savingsPct,
      savingsInrDaily: p.savingsInrDaily,
      savingsInrMonthly: p.savingsInrMonthly,
      bucketStartMs: startMs,
      bucketEndMs: startMs + (bucketMs > 0 ? bucketMs : 60_000),
      underlyingRecordCount: recordsInBucket.length,
      vehicleCount: vehicles.size,
    };
  });

  return chartPoints;
}
