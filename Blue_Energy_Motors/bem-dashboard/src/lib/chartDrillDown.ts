import type { TimeRangeKey } from "@/config/constants";
import { savingsTrendBucketMs } from "./costHelpers";

const MS_MIN = 60 * 1000;
const MS_5M = 5 * MS_MIN;
const MS_15M = 15 * MS_MIN;
const MS_30M = 30 * MS_MIN;
const MS_1H = 60 * MS_MIN;
const MS_6H = 6 * MS_1H;
const MS_12H = 12 * MS_1H;
const MS_1D = 24 * MS_1H;
const MS_7D = 7 * MS_1D;

/** Descending bucket sizes used for adaptive refinement. */
const BUCKET_LADDER_MS = [
  MS_1D,
  MS_12H,
  MS_6H,
  MS_1H,
  MS_30M,
  MS_15M,
  MS_5M,
  MS_MIN,
  0,
] as const;

const MAX_CHART_POINTS = 48;
const MIN_CHART_POINTS = 2;
const SPARSE_POINT_THRESHOLD = 2;
const DENSE_RECORD_THRESHOLD = 10;

/** Top-level aggregation bucket for the selected time range. */
export function topLevelBucketMs(timeRange: TimeRangeKey): number {
  return savingsTrendBucketMs(timeRange);
}

/**
 * Nominal overview bucket before adaptive refinement.
 * 30d/custom uses 1 day only when data spans ≥7 days; otherwise 12 hours.
 */
export function nominalOverviewBucketMs(
  timeRange: TimeRangeKey,
  records: readonly { timestamp?: string }[]
): number {
  const base = savingsTrendBucketMs(timeRange);
  if (timeRange !== "30d" && timeRange !== "custom") return base;

  const timestamps = extractTimestamps(records);
  if (timestamps.length < 2) return base;

  const span = Math.max(...timestamps) - Math.min(...timestamps);
  return span >= MS_7D ? MS_1D : MS_12H;
}

/**
 * Finer bucket used after clicking a sparse chart point.
 * 15m → raw | 1h → 5m | 6h → 15m | 12h → 30m | 24h → 1h | 7d/custom/30d → 6h
 */
export function drillDownBucketMs(timeRange: TimeRangeKey): number {
  switch (timeRange) {
    case "15m":
      return 0;
    case "1h":
      return MS_5M;
    case "6h":
      return MS_15M;
    case "12h":
      return MS_30M;
    case "24h":
      return MS_1H;
    case "7d":
    case "30d":
    case "custom":
      return MS_6H;
    default:
      return MS_1H;
  }
}

export function formatBucketMs(ms: number): string {
  if (ms <= 0) return "raw";
  if (ms % MS_1D === 0) return `${ms / MS_1D}d`;
  if (ms % MS_1H === 0) return `${ms / MS_1H}h`;
  return `${ms / MS_MIN}m`;
}

export function shouldEnableDrillDown(pointCount: number): boolean {
  return pointCount > 0 && pointCount <= SPARSE_POINT_THRESHOLD;
}

function bucketKey(ts: number, bucketMs: number): number {
  if (bucketMs <= 0) return ts;
  return Math.floor(ts / bucketMs) * bucketMs;
}

export function countDistinctBuckets(
  timestamps: readonly number[],
  bucketMs: number
): number {
  if (!timestamps.length) return 0;
  if (bucketMs <= 0) return new Set(timestamps).size;
  return new Set(timestamps.map((t) => bucketKey(t, bucketMs))).size;
}

export function extractTimestamps(
  records: readonly { timestamp?: string }[]
): number[] {
  return records
    .map((r) => (r.timestamp ? new Date(r.timestamp).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
}

function buildBucketChainFrom(startMs: number): number[] {
  const exactIdx = BUCKET_LADDER_MS.indexOf(startMs as (typeof BUCKET_LADDER_MS)[number]);
  if (exactIdx >= 0) return [...BUCKET_LADDER_MS.slice(exactIdx)];
  return [startMs, ...BUCKET_LADDER_MS.filter((b) => b < startMs)];
}

/**
 * Step down bucket size until the chart has enough distinct time buckets.
 * Used for overview and drill-down when data is dense within coarse buckets.
 */
export function pickAdaptiveBucketMs(
  records: readonly { timestamp?: string }[],
  startBucketMs: number,
  options?: { minPoints?: number; maxPoints?: number }
): number {
  const timestamps = extractTimestamps(records);
  if (!timestamps.length) return startBucketMs;

  const minPoints =
    options?.minPoints ??
    (timestamps.length >= 100 ? 4 : MIN_CHART_POINTS);
  const maxPoints = options?.maxPoints ?? MAX_CHART_POINTS;

  const chain = buildBucketChainFrom(startBucketMs);
  let best = startBucketMs;

  for (const bucketMs of chain) {
    const n = countDistinctBuckets(timestamps, bucketMs);
    if (n >= minPoints && n <= maxPoints) return bucketMs;
    if (n >= MIN_CHART_POINTS) best = bucketMs;
  }

  return best;
}

/**
 * Overview bucket: start at nominal size for the range, then refine when
 * many records collapse into ≤2 chart points.
 */
export function pickAdaptiveOverviewBucketMs(
  timeRange: TimeRangeKey,
  records: readonly { timestamp?: string }[]
): number {
  const nominal = nominalOverviewBucketMs(timeRange, records);
  const timestamps = extractTimestamps(records);

  if (timestamps.length < DENSE_RECORD_THRESHOLD) return nominal;

  const nominalBuckets = countDistinctBuckets(timestamps, nominal);
  if (nominalBuckets > SPARSE_POINT_THRESHOLD) return nominal;

  return pickAdaptiveBucketMs(records, nominal);
}

/** Drill bucket with adaptive refinement inside the selected range. */
export function pickAdaptiveDrillBucketMs(
  timeRange: TimeRangeKey,
  records: readonly { timestamp?: string }[]
): number {
  return pickAdaptiveBucketMs(records, drillDownBucketMs(timeRange));
}

export interface BucketRange {
  startMs: number;
  endMs: number;
}

export function filterRecordsInBucket<T extends { timestamp?: string }>(
  items: readonly T[],
  range: BucketRange
): T[] {
  return items.filter((item) => {
    if (!item.timestamp) return false;
    const t = new Date(item.timestamp).getTime();
    return t >= range.startMs && t < range.endMs;
  });
}

export function formatBucketRangeLabel(
  startMs: number,
  endMs: number,
  timeRange: TimeRangeKey,
  isDrilled = false
): string {
  const start = new Date(startMs);
  const end = new Date(endMs - 1);
  const spanMs = endMs - startMs;

  const isMultiDay =
    !isDrilled &&
    (timeRange === "7d" ||
      timeRange === "30d" ||
      timeRange === "custom" ||
      start.toDateString() !== end.toDateString());

  if (isMultiDay) {
    const startDay = start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    const endDay = end.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    if (startDay === endDay) return startDay;
    return `${startDay} – ${endDay}`;
  }

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

  if (isDrilled || spanMs <= MS_6H) {
    return `${fmt(start)} – ${fmt(end)}`;
  }

  return `${fmt(start)} – ${fmt(end)}`;
}
