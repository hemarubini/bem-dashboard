import { useMemo, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { EV_VEHICLES } from "@/config/constants";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchEVPageData } from "@/lib/queries";
import { telemetryToSeries } from "@/lib/chartUtils";
import { parseNum } from "@/lib/parsers";
import { batteryStatCardColor } from "@/lib/batteryHealthHelpers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { FilterSelect } from "@/components/FilterBar";
import { LineChartPanel } from "@/components/LineChartPanel";
import { BatteryHealthTrendChart } from "@/components/BatteryHealthTrendChart";

export function EVDashboard() {
  const filters = usePageFilters("1h");
  const [evVehicle, setEvVehicle] = useState("all");
  const vehicleKey =
    filters.vehicle !== "All Vehicles" ? filters.vehicle : evVehicle;

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["ev-fleet", ...filters.filterDeps, evVehicle, vehicleKey],
    queryFn: () =>
      fetchEVPageData(
        vehicleKey === "All Vehicles" ? "all" : vehicleKey,
        filters.sinceIso,
        filters.timeRange,
        filters.until.toISOString()
      ),
  });

  const chartVehicle =
    vehicleKey === "all" || vehicleKey === "All Vehicles" ? undefined : vehicleKey;

  const latest = useMemo(() => {
    if (!data?.latest.length) return null;
    if (chartVehicle)
      return data.latest.find((t) => t.vehicle_id === chartVehicle) ?? data.latest[0];
    return data.latest[0];
  }, [data, chartVehicle]);

  const latestSoc = parseNum(latest?.soc_pct);
  const latestSoh = parseNum(latest?.soh_pct);

  const records = data?.records ?? [];
  const chartScope = `${filters.sinceIso}-${vehicleKey}`;
  const socChart = useStableChartData(
    `ev-soc-${chartScope}`,
    telemetryToSeries(records, "soc_pct", chartVehicle)
  );
  const sohChart = useStableChartData(
    `ev-soh-${chartScope}`,
    telemetryToSeries(records, "soh_pct", chartVehicle)
  );
  const tempChart = useStableChartData(
    `ev-temp-${chartScope}`,
    telemetryToSeries(records, "battery_temp_c", chartVehicle)
  );
  const rangeChart = useStableChartData(
    `ev-range-${chartScope}`,
    telemetryToSeries(records, "remaining_range_km", chartVehicle)
  );

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom mb={2}>
        EV Fleet
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
          filters.vehicle === "All Vehicles" ? (
            <FilterSelect
              label="EV Vehicle"
              value={evVehicle}
              options={[
                { value: "all", label: "All EV" },
                ...EV_VEHICLES.map((id) => ({ value: id, label: id })),
              ]}
              onChange={setEvVehicle}
            />
          ) : null
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error}>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Battery SOC"
              value={`${latestSoc ?? "—"}${latestSoc !== null ? " %" : ""}`}
              valueColor={
                latestSoc !== null
                  ? batteryStatCardColor(latestSoc, "soc")
                  : "primary"
              }
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Battery SOH"
              value={`${latestSoh ?? "—"}${latestSoh !== null ? " %" : ""}`}
              valueColor={
                latestSoh !== null
                  ? batteryStatCardColor(latestSoh, "soh")
                  : "primary"
              }
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Battery Temperature"
              value={`${parseNum(latest?.battery_temp_c) ?? "—"} °C`}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Remaining Range"
              value={`${parseNum(latest?.remaining_range_km) ?? "—"} km`}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Speed"
              value={`${parseNum(latest?.speed_kmh) ?? "—"} km/h`}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <StatCard
              title="Cost Per KM"
              value={`₹${parseNum(latest?.cost_per_km_inr) ?? "—"}`}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12}>
            <BatteryHealthTrendChart
              type="soc"
              data={socChart}
              latestValue={latestSoc}
              timeRange={filters.timeRange}
            />
          </Grid>
          <Grid item xs={12}>
            <BatteryHealthTrendChart
              type="soh"
              data={sohChart}
              latestValue={latestSoh}
              timeRange={filters.timeRange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChartPanel
              title="Battery Temperature"
              data={tempChart}
              yLabel="Temperature (°C)"
              xLabel="Time"
              timeRange={filters.timeRange}
              marginLeft={72}
              height={300}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <LineChartPanel
              title="Range Trend"
              data={rangeChart}
              yLabel="Range (km)"
              xLabel="Time"
              timeRange={filters.timeRange}
              marginLeft={72}
              height={300}
            />
          </Grid>
        </Grid>
      </QueryPageShell>
    </Box>
  );
}
