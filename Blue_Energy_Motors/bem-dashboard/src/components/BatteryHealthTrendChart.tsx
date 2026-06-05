import { memo, useMemo } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeRangeKey } from "@/config/constants";
import {
  formatXAxisTime,
  getTickCount,
} from "@/utils/chartTimeFormatter";
import {
  BATTERY_PERCENT_DOMAIN,
  batteryBandColor,
  batteryBandLabel,
  batteryHealthZones,
  batteryMetricLabel,
  batteryThresholdLines,
  batteryChartTitleBase,
  type BatteryMetricType,
} from "@/lib/batteryHealthHelpers";
import { BatteryHealthStatusBadge } from "./BatteryHealthStatusBadge";
import type { ChartPoint } from "./LineChartPanel";
import { EmptyState } from "./EmptyState";

interface BatteryHealthTrendChartProps {
  type: BatteryMetricType;
  data: ChartPoint[];
  latestValue: number | null;
  timeRange: TimeRangeKey;
  /** Chart plot height in px — default 230 (~18% shorter than standard). */
  height?: number;
}

const DEFAULT_BATTERY_CHART_HEIGHT = 230;

function chartMargins() {
  return { top: 20, right: 24, bottom: 8, left: 56 };
}

function yAxisLabelProps(label: string) {
  return {
    value: label,
    angle: -90,
    position: "left" as const,
    offset: 8,
    style: { textAnchor: "middle", fontSize: 11, fill: "#5c6b7a" },
  };
}

function BatteryHealthTrendChartInner({
  type,
  data,
  latestValue,
  timeRange,
  height = DEFAULT_BATTERY_CHART_HEIGHT,
}: BatteryHealthTrendChartProps) {
  const hasData = data.length > 0;
  const metric = batteryMetricLabel(type);
  const yLabel = `${metric} (%)`;
  const zones = batteryHealthZones(type);
  const thresholds = batteryThresholdLines(type);
  const lineColor =
    latestValue !== null
      ? batteryBandColor(latestValue, type)
      : "#1e3a5f";

  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        timestamp: p.timestamp ?? p.time,
      })),
    [data]
  );

  const tickCount = getTickCount(timeRange);

  const statusBand =
    latestValue !== null ? batteryBandLabel(latestValue, type) : null;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box mb={1}>
          <Typography variant="h6" color="primary">
            {batteryChartTitleBase(type)}
          </Typography>
          {latestValue !== null && statusBand && (
            <Box mt={0.75}>
              <BatteryHealthStatusBadge
                band={statusBand}
                value={latestValue}
              />
            </Box>
          )}
        </Box>

        {!hasData ? (
          <EmptyState message="No chart data" />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={chartMargins()}>
              {zones.map((zone) => (
                <ReferenceArea
                  key={zone.guideLabel}
                  y1={zone.y1}
                  y2={zone.y2}
                  fill={zone.fill}
                  fillOpacity={zone.fillOpacity}
                  ifOverflow="extendDomain"
                  label={{
                    value: zone.guideLabel,
                    position: "insideLeft",
                    fill: zone.fill,
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 8,
                  }}
                />
              ))}
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatXAxisTime(value, timeRange)}
                tickCount={tickCount}
                minTickGap={40}
                angle={-20}
                textAnchor="end"
                height={56}
                label={{ value: "Time", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                domain={BATTERY_PERCENT_DOMAIN}
                tick={{ fontSize: 11 }}
                width={48}
                tickCount={6}
                label={yAxisLabelProps(yLabel)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as ChartPoint;
                  const val = point.value;
                  const band = batteryBandLabel(val, type);
                  const bandClr = batteryBandColor(val, type);
                  return (
                    <Box
                      sx={{
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 1.25,
                        boxShadow: 2,
                        minWidth: 160,
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {metric}: {Math.round(val)}%
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: bandClr }}
                      >
                        Status: {band}
                      </Typography>
                    </Box>
                  );
                }}
              />
              {thresholds.map((tl) => (
                <ReferenceLine
                  key={`${tl.y}-${tl.color}`}
                  y={tl.y}
                  stroke={tl.color}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ))}
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export const BatteryHealthTrendChart = memo(BatteryHealthTrendChartInner);
