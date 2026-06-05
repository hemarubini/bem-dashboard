import { useMemo, useState, useCallback } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchCostAnalyticsData } from "@/lib/queries";
import { parseNum } from "@/lib/parsers";
import {
  buildCostTrendChart,
  buildSavingsTrendChart,
} from "@/lib/chartDrillDownBuilders";
import { useChartDrillDown } from "@/hooks/useChartDrillDown";
import { TrendChartTooltip } from "@/components/TrendChartTooltip";
import {
  computeFleetSavings,
  formatDieselComparisonLabel,
  formatSavingsTrendAxisPercent,
  formatSavingsTrendAxisValue,
  formatSavingsTrendTooltipValue,
  getFleetSavingsCardDisplay,
  savingsChartModeFromView,
  savingsTrendChartLabels,
  savingsTrendLineColor,
  savingsTrendTooltipMetricLabel,
  type SavingsViewMode,
} from "@/lib/costHelpers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { SavingsAnalysisToggle } from "@/components/SavingsAnalysisToggle";
import { EmptyState } from "@/components/EmptyState";
import { LineChartPanel, type ChartPoint } from "@/components/LineChartPanel";
import { chartColors } from "@/theme";

export function CostAnalytics() {
  const filters = usePageFilters("7d");
  const [savingsView, setSavingsView] = useState<SavingsViewMode>("combined");

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["cost-analytics", ...filters.filterDeps],
    queryFn: () =>
      fetchCostAnalyticsData(
        filters.vehicleIds,
        filters.sinceIso,
        filters.timeRange,
        filters.until.toISOString()
      ),
  });

  const latest = data?.latest ?? [];
  const records = data?.records ?? [];

  const avgCostKm = useMemo(() => {
    const vals = latest
      .map((t) => parseNum(t.cost_per_km_inr))
      .filter((n): n is number => n !== null);
    if (!vals.length) return "—";
    return `₹${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)}`;
  }, [latest]);

  const dailyCost = useMemo(() => {
    const vals = latest
      .map((t) => parseNum(t.daily_cost_inr))
      .filter((n): n is number => n !== null);
    if (!vals.length) return "—";
    return `₹${vals.reduce((a, b) => a + b, 0).toLocaleString("en-IN")}`;
  }, [latest]);

  const monthlyCost = useMemo(() => {
    const vals = latest
      .map((t) => parseNum(t.daily_cost_inr))
      .filter((n): n is number => n !== null);
    if (!vals.length) return "—";
    const fleetDaily = vals.reduce((a, b) => a + b, 0);
    return `₹${(fleetDaily * 30).toLocaleString("en-IN")}`;
  }, [latest]);

  const fleetSavings = useMemo(() => computeFleetSavings(latest), [latest]);

  const savingsCard = useMemo(
    () => getFleetSavingsCardDisplay(fleetSavings, savingsView),
    [fleetSavings, savingsView]
  );

  const vehicleCompare = latest.map((t) => ({
    name: t.vehicle_id,
    cost: parseNum(t.cost_per_km_inr) ?? 0,
  }));

  const buildCostChart = useCallback(
    (
      src: readonly typeof records[number][],
      bucketMs: number,
      range?: { startMs: number; endMs: number }
    ) => buildCostTrendChart(src, latest, bucketMs, range),
    [latest]
  );

  const buildSavingsChart = useCallback(
    (
      src: readonly typeof records[number][],
      bucketMs: number,
      range?: { startMs: number; endMs: number }
    ) =>
      buildSavingsTrendChart(
        src,
        latest,
        savingsView,
        filters.timeRange,
        bucketMs,
        range
      ),
    [latest, savingsView, filters.timeRange]
  );

  const costDrill = useChartDrillDown({
    timeRange: filters.timeRange,
    source: records,
    buildChart: buildCostChart,
  });

  const savingsDrill = useChartDrillDown({
    timeRange: filters.timeRange,
    source: records,
    buildChart: buildSavingsChart,
  });

  const chartScope = filters.sinceIso;

  const costOverviewStable = useStableChartData(
    `cost-trend-overview-${chartScope}`,
    costDrill.overviewData
  );
  const costTrend = costDrill.isDrilled
    ? costDrill.drilldownData
    : costOverviewStable;

  const savingsOverviewStable = useStableChartData(
    `savings-trend-overview-${chartScope}-${savingsView}-${filters.timeRange}`,
    savingsDrill.overviewData
  );
  const savingsTrend = savingsDrill.isDrilled
    ? savingsDrill.drilldownData
    : savingsOverviewStable;

  const savingsTrendLabels = useMemo(
    () => savingsTrendChartLabels(savingsView),
    [savingsView]
  );

  const savingsLineColor = useMemo(() => {
    const last = savingsTrend[savingsTrend.length - 1]?.value ?? 0;
    return savingsTrendLineColor(last);
  }, [savingsTrend]);

  const savingsAxisFormatter = useMemo(() => {
    const chartMode = savingsChartModeFromView(savingsView);
    if (chartMode === "percent") {
      return formatSavingsTrendAxisPercent;
    }
    return formatSavingsTrendAxisValue;
  }, [savingsView]);

  const savingsTooltipRenderer = useMemo(
    () => (point: ChartPoint) => {
      const ts = point.timestamp ?? point.time;
      const pct = point.savingsPct ?? 0;
      return (
        <TrendChartTooltip
          timestamp={ts}
          primaryLabel={savingsTrendTooltipMetricLabel(savingsView)}
          primaryValue={formatSavingsTrendTooltipValue(point, savingsView)}
          secondaryText={formatDieselComparisonLabel(pct)}
          secondaryColor={pct >= 0 ? "success.main" : "error.main"}
        />
      );
    },
    [savingsView]
  );

  const costTrendTooltip = useCallback(
    (point: ChartPoint) => (
      <TrendChartTooltip
        timestamp={point.timestamp ?? point.time}
        primaryLabel="Average Cost"
        primaryValue={`₹${Math.round(point.value).toLocaleString("en-IN")}`}
      />
    ),
    []
  );

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
        Cost Analytics
      </Typography>

      <GlobalFilterBar
        vehicleType={filters.vehicleType}
        onVehicleTypeChange={filters.setVehicleType}
        vehicle={filters.vehicle}
        onVehicleChange={filters.setVehicle}
        vehicleOptions={filters.vehicleOptions}
        timeRange={filters.timeRange}
        onTimeRangeChange={filters.setTimeRange}
        customStart={filters.customStart}
        customEnd={filters.customEnd}
        onCustomStartChange={filters.setCustomStart}
        onCustomEndChange={filters.setCustomEnd}
        extra={
          <SavingsAnalysisToggle
            value={savingsView}
            onChange={setSavingsView}
          />
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error}>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={3}>
            <StatCard title="Cost Per KM" value={avgCostKm} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard title="Daily Cost" value={dailyCost} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Monthly Cost"
              value={monthlyCost}
              subtitle="daily × 30 est."
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              title="Savings vs Diesel"
              value={savingsCard.primary}
              secondaryValue={savingsCard.secondary}
              subtitle={savingsCard.subtitle}
              compactValue={savingsCard.compactValue}
              valueColor={savingsCard.valueColor ?? "primary"}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <LineChartPanel
              title="Cost Trend"
              data={costTrend}
              yLabel="Cost (₹)"
              xLabel="Time"
              timeRange={filters.timeRange}
              marginLeft={80}
              renderTooltip={costTrendTooltip}
              drillDownEligible={costDrill.drillDownEligible}
              onDrillDownPointClick={costDrill.handlePointClick}
              isDrilled={costDrill.isDrilled}
              onDrillBack={costDrill.handleDrillBack}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChartPanel
              title={savingsTrendLabels.title}
              subtitle={savingsTrendLabels.subtitle}
              data={savingsTrend}
              yLabel={savingsTrendLabels.yLabel}
              xLabel="Time"
              color={savingsLineColor}
              timeRange={filters.timeRange}
              axisValueFormatter={savingsAxisFormatter}
              renderTooltip={savingsTooltipRenderer}
              marginLeft={88}
              drillDownEligible={savingsDrill.drillDownEligible}
              onDrillDownPointClick={savingsDrill.handlePointClick}
              isDrilled={savingsDrill.isDrilled}
              onDrillBack={savingsDrill.handleDrillBack}
            />
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Vehicle Cost Comparison
              </Typography>
              {!vehicleCompare.length ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vehicleCompare}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      label={{
                        value: "Vehicle",
                        position: "insideBottom",
                        offset: -5,
                      }}
                    />
                    <YAxis
                      label={{
                        value: "Cost Per KM (₹)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="cost"
                      fill={chartColors.primary}
                      name="₹/km"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </QueryPageShell>
    </Box>
  );
}
