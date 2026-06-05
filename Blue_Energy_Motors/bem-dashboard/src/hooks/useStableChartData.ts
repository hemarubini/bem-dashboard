import { useMemo, useRef } from "react";
import type { ChartPoint } from "@/components/LineChartPanel";
import { mergeChartPoints } from "@/lib/mergeData";

/**
 * Merges chart points by time key so unchanged points keep the same object reference
 * and Recharts avoids full redraw on background refresh.
 */
export function useStableChartData(
  seriesKey: string,
  points: ChartPoint[],
  enabled = true
): ChartPoint[] {
  const cacheRef = useRef<Map<string, ChartPoint[]>>(new Map());

  return useMemo(() => {
    if (!enabled) return points;
    const prev = cacheRef.current.get(seriesKey) ?? [];
    const merged = mergeChartPoints(prev, points);
    cacheRef.current.set(seriesKey, merged);
    return merged;
  }, [seriesKey, points, enabled]);
}
