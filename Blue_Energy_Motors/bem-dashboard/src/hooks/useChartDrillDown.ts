import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartPoint } from "@/components/LineChartPanel";
import type { TimeRangeKey } from "@/config/constants";
import {
  filterRecordsInBucket,
  pickAdaptiveDrillBucketMs,
  pickAdaptiveOverviewBucketMs,
  shouldEnableDrillDown,
  type BucketRange,
} from "@/lib/chartDrillDown";

export interface UseChartDrillDownOptions<T extends { timestamp?: string }> {
  timeRange: TimeRangeKey;
  source: readonly T[];
  buildChart: (
    source: readonly T[],
    bucketMs: number,
    range?: BucketRange
  ) => ChartPoint[];
}

interface DrillState {
  range: BucketRange;
  bucketMs: number;
}

export function useChartDrillDown<T extends { timestamp?: string }>({
  timeRange,
  source,
  buildChart,
}: UseChartDrillDownOptions<T>) {
  const [drillState, setDrillState] = useState<DrillState | null>(null);

  const overviewBucketMs = useMemo(
    () => pickAdaptiveOverviewBucketMs(timeRange, source),
    [timeRange, source]
  );

  useEffect(() => {
    setDrillState(null);
  }, [timeRange]);

  const overviewData = useMemo(
    () => buildChart(source, overviewBucketMs),
    [source, buildChart, overviewBucketMs]
  );

  const drilldownData = useMemo(() => {
    if (!drillState) return [];
    return buildChart(source, drillState.bucketMs, drillState.range);
  }, [source, buildChart, drillState]);

  const isDrilled = drillState !== null;

  const chartData = isDrilled ? drilldownData : overviewData;

  const drillDownEligible =
    !isDrilled && shouldEnableDrillDown(overviewData.length);

  const handlePointClick = useCallback(
    (point: ChartPoint) => {
      if (
        point.bucketStartMs === undefined ||
        point.bucketEndMs === undefined
      ) {
        return;
      }
      const range = {
        startMs: point.bucketStartMs,
        endMs: point.bucketEndMs,
      };
      const bucketRecords = filterRecordsInBucket(source, range);
      const adaptiveBucketMs = pickAdaptiveDrillBucketMs(timeRange, bucketRecords);

      setDrillState({
        range,
        bucketMs: adaptiveBucketMs,
      });
    },
    [timeRange, source]
  );

  const handleDrillBack = useCallback(() => {
    setDrillState(null);
  }, []);

  return {
    chartData,
    overviewData,
    drilldownData,
    overviewBucketMs,
    drillDownEligible,
    isDrilled,
    drillRange: drillState?.range ?? null,
    drillBucketMs: drillState?.bucketMs ?? null,
    handlePointClick,
    handleDrillBack,
  };
}
