import { useMemo } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import { ALL_VEHICLES } from "@/config/constants";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchVehicleDetailsData } from "@/lib/queries";
import { filterByTimeRange, telemetryToSeries } from "@/lib/chartUtils";
import { isOnline, parseNum, formatTs } from "@/lib/parsers";
import { vehicleHealthScore, tripStatus } from "@/lib/healthHelpers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LOADING_MESSAGES } from "@/config/messages";
import { LineChartPanel } from "@/components/LineChartPanel";
import { SeverityChip } from "@/components/SeverityChip";

export function VehicleDetails() {
  const { vehicleId: paramId } = useParams();
  const navigate = useNavigate();
  const filters = usePageFilters("1h");
  const vehicleId =
    paramId ??
    (filters.vehicle !== "All Vehicles" ? filters.vehicle : "LNG-001");

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["vehicle-details", vehicleId, ...filters.filterDeps],
    queryFn: () =>
      fetchVehicleDetailsData(
        vehicleId,
        filters.sinceIso,
        filters.timeRange,
        filters.until.toISOString()
      ),
  });

  const isLNG = vehicleId.startsWith("LNG");
  const latest = data?.latest;
  const history = data?.history ?? [];

  const filteredAlerts = useMemo(
    () =>
      data
        ? filterByTimeRange(data.alerts, filters.since, filters.until)
        : [],
    [data, filters.since, filters.until]
  );

  const chartScope = `${vehicleId}-${filters.sinceIso}`;
  const chartTempLng = useStableChartData(
    `vd-temp-${chartScope}`,
    isLNG ? telemetryToSeries(history, "engine_temp_c") : []
  );
  const chartFuel = useStableChartData(
    `vd-fuel-${chartScope}`,
    isLNG ? telemetryToSeries(history, "lng_level_pct") : []
  );
  const chartPressure = useStableChartData(
    `vd-pressure-${chartScope}`,
    isLNG ? telemetryToSeries(history, "tank_pressure_bar") : []
  );
  const chartSpeed = useStableChartData(
    `vd-speed-${chartScope}`,
    telemetryToSeries(history, "speed_kmh")
  );
  const chartSoc = useStableChartData(
    `vd-soc-${chartScope}`,
    !isLNG ? telemetryToSeries(history, "soc_pct") : []
  );
  const chartSoh = useStableChartData(
    `vd-soh-${chartScope}`,
    !isLNG ? telemetryToSeries(history, "soh_pct") : []
  );
  const chartBattTemp = useStableChartData(
    `vd-btemp-${chartScope}`,
    !isLNG ? telemetryToSeries(history, "battery_temp_c") : []
  );
  const chartRange = useStableChartData(
    `vd-range-${chartScope}`,
    !isLNG ? telemetryToSeries(history, "remaining_range_km") : []
  );

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
        Vehicle Details
      </Typography>

      <GlobalFilterBar
        vehicleType={filters.vehicleType}
        onVehicleTypeChange={filters.setVehicleType}
        vehicle={vehicleId}
        onVehicleChange={(v) => navigate(`/vehicle/${v}`)}
        vehicleOptions={ALL_VEHICLES.map((id) => ({ value: id, label: id }))}
        timeRange={filters.timeRange}
        onTimeRangeChange={filters.setTimeRange}
        customStart={filters.customStart}
        customEnd={filters.customEnd}
        onCustomStartChange={filters.setCustomStart}
        onCustomEndChange={filters.setCustomEnd}
        showVehicleType={false}
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error} loadingLabel={LOADING_MESSAGES.vehicle}>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          Vehicle Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={2.4}>
            <Typography variant="caption" color="text.secondary">Vehicle ID</Typography>
            <Typography variant="h6">{vehicleId}</Typography>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Typography variant="caption" color="text.secondary">Vehicle Type</Typography>
            <Typography variant="h6">{latest?.vehicle_type ?? (isLNG ? "LNG" : "EV")}</Typography>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Typography variant="caption" color="text.secondary">Current Trip</Typography>
            <Typography variant="h6">{latest?.trip_id ?? "—"}</Typography>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography variant="h6">
              {latest && isOnline(latest.timestamp) ? "Online" : "Offline"}
            </Typography>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Typography variant="caption" color="text.secondary">Last Seen</Typography>
            <Typography variant="h6">{latest ? formatTs(latest.timestamp) : "—"}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard title="Vehicle Health Score" value={vehicleHealthScore(latest ?? null)} />
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" color="primary" gutterBottom>Latest Vehicle Data</Typography>
      <Grid container spacing={2} mb={3}>
        {isLNG ? (
          <>
            <Grid item xs={6} md={3}><StatCard title="Engine Temp" value={`${parseNum(latest?.engine_temp_c) ?? "—"} °C`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="Fuel Level" value={`${parseNum(latest?.lng_level_pct) ?? "—"} %`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="Pressure" value={`${parseNum(latest?.tank_pressure_bar) ?? "—"} bar`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="Speed" value={`${parseNum(latest?.speed_kmh) ?? "—"} km/h`} /></Grid>
          </>
        ) : (
          <>
            <Grid item xs={6} md={3}><StatCard title="SOC" value={`${parseNum(latest?.soc_pct) ?? "—"} %`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="SOH" value={`${parseNum(latest?.soh_pct) ?? "—"} %`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="Battery Temp" value={`${parseNum(latest?.battery_temp_c) ?? "—"} °C`} /></Grid>
            <Grid item xs={6} md={3}><StatCard title="Range" value={`${parseNum(latest?.remaining_range_km) ?? "—"} km`} /></Grid>
          </>
        )}
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>Historical Graphs</Typography>
      <Grid container spacing={2} mb={3}>
        {isLNG ? (
          <>
            <Grid item xs={12} md={6}><LineChartPanel title="Temperature" data={chartTempLng} yLabel="°C" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="Fuel" data={chartFuel} yLabel="%" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="Pressure" data={chartPressure} yLabel="bar" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="Speed" data={chartSpeed} yLabel="km/h" timeRange={filters.timeRange} /></Grid>
          </>
        ) : (
          <>
            <Grid item xs={12} md={6}><LineChartPanel title="SOC" data={chartSoc} yLabel="%" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="SOH" data={chartSoh} yLabel="%" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="Temperature" data={chartBattTemp} yLabel="°C" timeRange={filters.timeRange} /></Grid>
            <Grid item xs={12} md={6}><LineChartPanel title="Range" data={chartRange} yLabel="km" timeRange={filters.timeRange} /></Grid>
          </>
        )}
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>Vehicle Alert History</Typography>
      {!filteredAlerts.length ? (
        <EmptyState message="No alerts in range" />
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {["Timestamp", "Alert", "Severity"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map((a) => (
                <TableRow key={a.alert_id}>
                  <TableCell>{formatTs(a.timestamp)}</TableCell>
                  <TableCell>{a.description}</TableCell>
                  <TableCell><SeverityChip severity={a.severity} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="h6" color="primary" gutterBottom>Vehicle Trip History</Typography>
      {!data?.trips?.length ? (
        <EmptyState message="No trips" />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {["Trip ID", "Distance", "Duration", "Status"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.trips ?? []).map((t) => (
                <TableRow key={t.trip_id}>
                  <TableCell>{t.trip_id}</TableCell>
                  <TableCell>{t.distance_km} km</TableCell>
                  <TableCell>{t.trip_time_min} min</TableCell>
                  <TableCell>{tripStatus(t)}</TableCell>
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
