import type { TimeRangeKey } from "@/config/constants";

function isYesterday(date: Date, now = new Date()): boolean {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return (
    date.getFullYear() === y.getFullYear() &&
    date.getMonth() === y.getMonth() &&
    date.getDate() === y.getDate()
  );
}

/**
 * Adaptive X-axis labels for Recharts (axis rendering only — does not mutate source data).
 * When `isDrilled`, always use time-of-day labels regardless of top-level time range.
 */
export function formatXAxisTime(
  timestamp: string | number,
  timeRange: TimeRangeKey,
  isDrilled = false
): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }

  if (isDrilled) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  switch (timeRange) {
    case "15m":
    case "1h":
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    case "6h":
    case "12h":
      return date.toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      });

    case "24h": {
      const time = date.toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      });
      if (isYesterday(date)) return `Yesterday ${time}`;
      return time;
    }

    case "7d":
    case "30d":
    case "custom":
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });

    default:
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}

export interface ChartAxisContext {
  isDrilled?: boolean;
  dataSpanMs?: number;
  maxBucketMs?: number;
}

/**
 * X-axis labels that reflect actual bucket timestamps.
 * Uses date+time when buckets are sub-daily or data spans multiple days.
 */
export function formatChartAxisTime(
  timestamp: string | number,
  timeRange: TimeRangeKey,
  context: ChartAxisContext = {}
): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }

  const span = context.dataSpanMs ?? 0;
  const bucketMs = context.maxBucketMs ?? Number.POSITIVE_INFINITY;
  const MS_1D = 24 * 60 * 60 * 1000;
  const MS_6H = 6 * 60 * 60 * 1000;

  const useDetailedTime =
    context.isDrilled ||
    bucketMs <= MS_6H ||
    span <= MS_1D;

  if (useDetailedTime) {
    if (span > MS_1D) {
      return formatChartTooltipDateTime(timestamp);
    }
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return formatXAxisTime(timestamp, timeRange, false);
}

export function getTickCount(timeRange: TimeRangeKey): number {
  switch (timeRange) {
    case "15m":
      return 5;
    case "1h":
      return 6;
    case "6h":
      return 7;
    case "12h":
      return 8;
    case "24h":
      return 8;
    case "7d":
      return 7;
    case "30d":
      return 6;
    case "custom":
      return 6;
    default:
      return 6;
  }
}

/** Tooltip date/time — e.g. "Jun 5, 11:00 PM" */
export function formatChartTooltipDateTime(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}, ${time}`;
}

/** Chart tooltip date line — e.g. "Jun 7, 2026" */
export function formatTooltipDate(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Full timestamp for generic tooltips */
export function formatTooltipTimestamp(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}
