import { memo, useMemo, type MouseEvent, type ReactNode } from "react";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeRangeKey } from "@/config/constants";
import {
  formatChartAxisTime,
  formatTooltipTimestamp,
  getTickCount,
} from "@/utils/chartTimeFormatter";
import { chartColors } from "@/theme";
import { EmptyState } from "./EmptyState";

export interface ChartPoint {
  time: string;
  /** ISO timestamp when available — preferred for axis/tooltip parsing */
  timestamp?: string;
  value: number;
  label?: string;
  savingsPct?: number;
  savingsInrDaily?: number;
  savingsInrMonthly?: number;
  /** Drill-down: bucket start (epoch ms) */
  bucketStartMs?: number;
  /** Drill-down: bucket end (epoch ms, exclusive) */
  bucketEndMs?: number;
  underlyingRecordCount?: number;
  vehicleCount?: number;
}

interface ReferenceLineSpec {
  y: number;
  label: string;
  color?: string;
}

function referenceLineLabel(rl: ReferenceLineSpec) {
  const fill = rl.color ?? chartColors.warning;
  return {
    value: rl.label,
    position: "insideTopRight" as const,
    fill,
    fontSize: 10,
    fontWeight: 600,
  };
}

interface LineChartPanelProps {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  yLabel?: string;
  xLabel?: string;
  color?: string;
  multi?: { key: string; name: string; color: string }[];
  rawMulti?: Record<string, string | number>[];
  referenceLines?: ReferenceLineSpec[];
  timeRange?: TimeRangeKey;
  /** Compact Y-axis tick labels */
  axisValueFormatter?: (value: number) => string;
  /** Rich tooltip body (replaces default value tooltip) */
  renderTooltip?: (point: ChartPoint) => ReactNode;
  /** Extra left chart margin */
  marginLeft?: number;
  /** Plot area height in px */
  height?: number;
  /** Fixed Y-axis domain — e.g. [60, 120] for engine temperature */
  yDomain?: [number, number];
  /** Explicit Y-axis tick values when using a fixed domain */
  yTicks?: number[];
  /** Optional content below the title (e.g. status badge) */
  titleExtra?: ReactNode;
  /** Enable sparse-chart drill-down (clickable dots + hint) */
  drillDownEligible?: boolean;
  onDrillDownPointClick?: (point: ChartPoint) => void;
  isDrilled?: boolean;
  onDrillBack?: () => void;
}

function axisValue(point: ChartPoint): string {
  return point.timestamp ?? point.time;
}

function chartMargins(yLabel?: string, marginLeft?: number) {
  const left =
    marginLeft ?? (yLabel ? Math.max(80, yLabel.length * 5 + 36) : 12);
  return { top: 8, right: 16, bottom: 8, left };
}

function yAxisLabelProps(yLabel: string) {
  return {
    value: yLabel,
    angle: -90,
    position: "left" as const,
    offset: 12,
    style: { textAnchor: "middle", fontSize: 11, fill: "#5c6b7a" },
  };
}

function yAxisCommonProps(
  yLabel: string | undefined,
  axisValueFormatter: ((value: number) => string) | undefined,
  yDomain?: [number, number],
  yTicks?: number[]
) {
  return {
    tick: { fontSize: 11 },
    width: axisValueFormatter ? 52 : (56 as const),
    domain: yDomain,
    ticks: yTicks,
    allowDataOverflow: yDomain ? true : undefined,
    tickFormatter: axisValueFormatter
      ? (v: number) => axisValueFormatter(Number(v))
      : undefined,
    label: yLabel ? yAxisLabelProps(yLabel) : undefined,
  };
}

function LineChartPanelInner({
  title,
  subtitle,
  data,
  yLabel,
  xLabel = "Time",
  color = chartColors.primary,
  multi,
  rawMulti,
  referenceLines,
  timeRange = "1h",
  axisValueFormatter,
  renderTooltip,
  marginLeft,
  height = 280,
  yDomain,
  yTicks,
  titleExtra,
  drillDownEligible = false,
  onDrillDownPointClick,
  isDrilled = false,
  onDrillBack,
}: LineChartPanelProps) {
  const hasData =
    (data && data.length > 0) || (rawMulti && rawMulti.length > 0);

  const chartId = useMemo(
    () => title.replace(/\s+/g, "-").toLowerCase(),
    [title]
  );

  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        timestamp: axisValue(p),
      })),
    [data]
  );

  const chartRenderKey = `${chartId}-${isDrilled ? "drill" : "overview"}-${data.length}-${data[0]?.bucketStartMs ?? 0}`;

  const axisContext = useMemo(() => {
    const times = data
      .map((p) => new Date(p.timestamp ?? p.time).getTime())
      .filter((t) => !Number.isNaN(t));
    const bucketSpans = data
      .map((p) =>
        p.bucketStartMs !== undefined && p.bucketEndMs !== undefined
          ? p.bucketEndMs - p.bucketStartMs
          : 0
      )
      .filter((s) => s > 0);

    return {
      isDrilled,
      dataSpanMs:
        times.length >= 2 ? Math.max(...times) - Math.min(...times) : 0,
      maxBucketMs: bucketSpans.length ? Math.max(...bucketSpans) : undefined,
    };
  }, [data, isDrilled]);

  const tickCount = getTickCount(timeRange);
  const axisTickCount =
    axisContext.maxBucketMs !== undefined && axisContext.maxBucketMs <= 6 * 60 * 60 * 1000
      ? Math.min(Math.max(data.length, 4), 12)
      : isDrilled
        ? Math.min(data.length, 8)
        : tickCount;

  const timeXAxis = (
    <XAxis
      dataKey="timestamp"
      tick={{ fontSize: 11 }}
      tickFormatter={(value) =>
        formatChartAxisTime(value, timeRange, axisContext)
      }
      tickCount={axisTickCount}
      minTickGap={40}
      angle={-20}
      textAnchor="end"
      height={56}
      label={{ value: xLabel, position: "insideBottom", offset: -5 }}
    />
  );

  const timeTooltip = renderTooltip ? (
    <Tooltip
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const point = payload[0].payload as ChartPoint;
        return (
          <Box
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 1.25,
              boxShadow: 2,
              maxWidth: 220,
            }}
          >
            {renderTooltip(point)}
          </Box>
        );
      }}
    />
  ) : (
    <Tooltip
      labelFormatter={(value) => `Timestamp: ${formatTooltipTimestamp(value)}`}
    />
  );

  const showDrillDots = drillDownEligible || isDrilled;

  const handleDotClick = (point: ChartPoint, e: MouseEvent<SVGElement>) => {
    e.stopPropagation();
    onDrillDownPointClick?.(point);
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box mb={titleExtra ? 1 : 0}>
          <Typography variant="h6" gutterBottom={!titleExtra} color="primary">
            {title}
          </Typography>
          {titleExtra && <Box mt={0.75}>{titleExtra}</Box>}
        </Box>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}
        {isDrilled && onDrillBack && (
          <Button size="small" onClick={onDrillBack} sx={{ mb: 1 }}>
            ← Back to overview
          </Button>
        )}
        {!hasData ? (
          <EmptyState message="No chart data" />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {rawMulti && multi ? (
              <LineChart
                data={rawMulti}
                id={chartId}
                margin={chartMargins(yLabel, marginLeft)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  label={{ value: xLabel, position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  {...yAxisCommonProps(yLabel, axisValueFormatter, yDomain, yTicks)}
                />
                <Tooltip />
                <Legend />
                {referenceLines?.map((rl) => (
                  <ReferenceLine
                    key={`${rl.y}-${rl.label}`}
                    y={rl.y}
                    stroke={rl.color ?? chartColors.warning}
                    strokeDasharray="4 4"
                    label={referenceLineLabel(rl)}
                  />
                ))}
                {multi.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : (
              <LineChart
                key={chartRenderKey}
                data={chartData}
                id={chartId}
                margin={chartMargins(yLabel, marginLeft)}
                onClick={(state) => {
                  if (!drillDownEligible || !onDrillDownPointClick) return;
                  const active = (
                    state as { activePayload?: { payload?: ChartPoint }[] }
                  ).activePayload?.[0]?.payload;
                  if (active?.bucketStartMs !== undefined) {
                    onDrillDownPointClick(active);
                  }
                }}
                style={{
                  cursor: drillDownEligible ? "pointer" : "default",
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                {timeXAxis}
                <YAxis
                  {...yAxisCommonProps(yLabel, axisValueFormatter, yDomain, yTicks)}
                />
                {timeTooltip}
                {!yDomain && (
                  <ReferenceLine y={0} stroke="#9e9e9e" strokeDasharray="3 3" />
                )}
                {referenceLines?.map((rl) => (
                  <ReferenceLine
                    key={`${rl.y}-${rl.label}`}
                    y={rl.y}
                    stroke={rl.color ?? chartColors.warning}
                    strokeDasharray="4 4"
                    label={referenceLineLabel(rl)}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  dot={
                    showDrillDots
                      ? (props: {
                          cx?: number;
                          cy?: number;
                          payload?: ChartPoint;
                        }) => {
                          const { cx = 0, cy = 0, payload } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={payload ? 5 : 0}
                              fill={color}
                              stroke={color}
                              strokeWidth={1}
                              style={{
                                cursor:
                                  drillDownEligible && payload
                                    ? "pointer"
                                    : "default",
                              }}
                              onClick={(e) => {
                                if (drillDownEligible && payload) {
                                  handleDotClick(payload, e);
                                }
                              }}
                            />
                          );
                        }
                      : false
                  }
                  activeDot={
                    showDrillDots && drillDownEligible
                      ? { r: 7, stroke: color, strokeWidth: 2 }
                      : showDrillDots
                        ? { r: 6 }
                        : false
                  }
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export const LineChartPanel = memo(LineChartPanelInner);
