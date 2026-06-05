import { useMemo, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { LNG_VEHICLES } from "@/config/constants";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchLNGPageData } from "@/lib/queries";
import { telemetryToSeries } from "@/lib/chartUtils";
import { aggregateFaultRows } from "@/lib/faultAggregates";
import { parseNum, formatTs } from "@/lib/parsers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { FilterSelect } from "@/components/FilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LineChartPanel } from "@/components/LineChartPanel";
import { EngineTempStatusBadge } from "@/components/EngineTempStatusBadge";
import {
  ENGINE_TEMP_Y_DOMAIN,
  ENGINE_TEMP_Y_TICKS,
  engineTempBand as getEngineTempBand,
  engineTempReferenceLines,
  formatEngineTempYTick,
} from "@/lib/lngEngineHelpers";
import { VehicleLink } from "@/components/VehicleLink";
import { SeverityChip } from "@/components/SeverityChip";

export function LNGDashboard() {
  const filters = usePageFilters("1h");
  const [lngVehicle, setLngVehicle] = useState("all");

  const vehicleKey =
    filters.vehicle !== "All Vehicles" ? filters.vehicle : lngVehicle;

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["lng-fleet", ...filters.filterDeps, lngVehicle, vehicleKey],
    queryFn: () =>
      fetchLNGPageData(
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
    if (chartVehicle) return data.latest.find((t) => t.vehicle_id === chartVehicle) ?? data.latest[0];
    return data.latest[0];
  }, [data, chartVehicle]);

  const faultRows = useMemo(
    () => aggregateFaultRows(data?.records ?? []),
    [data]
  );

  const lngVehicleOptions = [
    { value: "all", label: "All LNG" },
    ...LNG_VEHICLES.map((id) => ({ value: id, label: id })),
  ];

  const records = data?.records ?? [];
  const chartScope = `${filters.sinceIso}-${vehicleKey}`;
  const tempChart = useStableChartData(
    `lng-temp-${chartScope}`,
    telemetryToSeries(records, "engine_temp_c", chartVehicle)
  );
  const rateChart = useStableChartData(
    `lng-rate-${chartScope}`,
    telemetryToSeries(records, "engine_temp_rate", chartVehicle)
  );
  const fuelChart = useStableChartData(
    `lng-fuel-${chartScope}`,
    telemetryToSeries(records, "lng_level_pct", chartVehicle)
  );
  const pressureChart = useStableChartData(
    `lng-pressure-${chartScope}`,
    telemetryToSeries(records, "tank_pressure_bar", chartVehicle)
  );
  const speedChart = useStableChartData(
    `lng-speed-${chartScope}`,
    telemetryToSeries(records, "speed_kmh", chartVehicle)
  );

  const latestEngineTemp = parseNum(latest?.engine_temp_c);
  const currentEngineTempBand =
    latestEngineTemp !== null ? getEngineTempBand(latestEngineTemp) : null;

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom mb={2}>
        LNG Fleet
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
              label="LNG Vehicle"
              value={lngVehicle}
              options={lngVehicleOptions}
              onChange={setLngVehicle}
            />
          ) : null
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error}>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={2}>
          <StatCard title="Engine Temperature" value={`${parseNum(latest?.engine_temp_c) ?? "—"} °C`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard title="Fuel Level" value={`${parseNum(latest?.lng_level_pct) ?? "—"} %`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard title="Tank Pressure" value={`${parseNum(latest?.tank_pressure_bar) ?? "—"} bar`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard title="Engine Health" value={`${parseNum(latest?.engine_health_score) ?? "—"} %`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard title="Distance Travelled" value={`${parseNum(latest?.distance_km) ?? "—"} km`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatCard title="Cost Per KM" value={`₹${parseNum(latest?.cost_per_km_inr) ?? "—"}`} />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <LineChartPanel
            title="Engine Temperature Trend"
            data={tempChart}
            yLabel="Temperature (°C)"
            timeRange={filters.timeRange}
            yDomain={ENGINE_TEMP_Y_DOMAIN}
            yTicks={[...ENGINE_TEMP_Y_TICKS]}
            axisValueFormatter={formatEngineTempYTick}
            referenceLines={engineTempReferenceLines()}
            titleExtra={
              latestEngineTemp !== null && currentEngineTempBand ? (
                <EngineTempStatusBadge
                  band={currentEngineTempBand}
                  valueC={latestEngineTemp}
                />
              ) : undefined
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <LineChartPanel
            title="Temperature Rate Change"
            data={rateChart}
            yLabel="Rate Change (°C/min)"
            timeRange={filters.timeRange}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <LineChartPanel
            title="Fuel Level Trend"
            data={fuelChart}
            yLabel="Fuel Level (%)"
            timeRange={filters.timeRange}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <LineChartPanel
            title="Tank Pressure Trend"
            data={pressureChart}
            yLabel="Pressure (Bar)"
            timeRange={filters.timeRange}
          />
        </Grid>
        <Grid item xs={12}>
          <LineChartPanel
            title="Speed Trend"
            data={speedChart}
            yLabel="Speed (km/h)"
            timeRange={filters.timeRange}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>
        LNG Fault Table
      </Typography>
      {!faultRows.length ? (
        <EmptyState message="No DTC / fault codes in range" />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {["Vehicle", "Code", "Description", "First Seen", "Last Seen", "Severity"].map(
                  (h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>{h}</TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {faultRows.slice(0, 50).map((row) => (
                <TableRow key={`${row.vehicle_id}-${row.code}-${row.source}`}>
                  <TableCell><VehicleLink vehicleId={row.vehicle_id} /></TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{formatTs(row.firstSeen)}</TableCell>
                  <TableCell>{formatTs(row.lastSeen)}</TableCell>
                  <TableCell><SeverityChip severity={row.severity} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      </QueryPageShell>
    </Box>
  );
}
