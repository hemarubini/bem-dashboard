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
import { useNavigate } from "react-router-dom";
import { TOTAL_VEHICLES } from "@/config/constants";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchFleetOverviewData } from "@/lib/queries";
import {
  alertTrendBuckets,
  filterByTimeRange,
  fleetHealthTrend,
  fleetSpeedTrend,
} from "@/lib/chartUtils";
import { isOnline, parseNum, formatTs } from "@/lib/parsers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LOADING_MESSAGES } from "@/config/messages";
import { LineChartPanel } from "@/components/LineChartPanel";
import { VehicleLink } from "@/components/VehicleLink";

export function FleetOverview() {
  const navigate = useNavigate();
  const filters = usePageFilters("1h");

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["fleet-overview", ...filters.filterDeps],
    queryFn: () =>
      fetchFleetOverviewData(
        filters.vehicleIds,
        filters.sinceIso,
        filters.timeRange,
        filters.until.toISOString()
      ),
  });

  const chartScope = `${filters.sinceIso}-${filters.vehicleIds.join(",")}`;
  const speedChart = useStableChartData(
    `fleet-speed-${chartScope}`,
    data ? fleetSpeedTrend(data.history) : []
  );
  const healthChart = useStableChartData(
    `fleet-health-${chartScope}`,
    data ? fleetHealthTrend(data.history) : []
  );
  const alertChart = useStableChartData(
    `fleet-alerts-${chartScope}`,
    alertTrendBuckets(
      data
        ? filterByTimeRange(
            data.alerts.filter((a) =>
              new Set(filters.vehicleIds).has(a.vehicle_id)
            ),
            filters.since,
            filters.until
          )
        : []
    )
  );

  const displayIds = data?.filterVehicleIds ?? filters.vehicleIds;
  const idSet = useMemo(() => new Set(displayIds), [displayIds]);

  const filteredAlerts = useMemo(() => {
    if (!data) return [];
    return filterByTimeRange(
      data.alerts.filter((a) => idSet.has(a.vehicle_id)),
      filters.since,
      filters.until
    );
  }, [data, idSet, filters.since, filters.until]);

  const latestForTable = useMemo(() => {
    if (!data) return [];
    return data.latestTelemetry.filter((t) => idSet.has(t.vehicle_id));
  }, [data, idSet]);

  const onlineCount = latestForTable.filter((t) => isOnline(t.timestamp)).length;
  const offlineCount = latestForTable.length - onlineCount;

  const avgSpeed = useMemo(() => {
    const speeds = data?.history
      .map((t) => parseNum(t.speed_kmh))
      .filter((n): n is number => n !== null) ?? [];
    if (!speeds.length) return "—";
    return `${Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)} km/h`;
  }, [data]);

  const fleetHealth = useMemo(() => {
    const scores = latestForTable
      .filter((t) => t.vehicle_id.startsWith("LNG"))
      .map((t) => parseNum(t.engine_health_score))
      .filter((n): n is number => n !== null);
    if (!scores.length) return "—";
    return `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`;
  }, [latestForTable]);

  const fleetUptime = useMemo(() => {
    const vals = latestForTable
      .map((t) => parseNum(t.uptime_pct))
      .filter((n): n is number => n !== null);
    if (!vals.length) return "—";
    return `${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)}%`;
  }, [latestForTable]);

  const alertByVehicle = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of filteredAlerts) {
      if (!map.has(a.vehicle_id)) map.set(a.vehicle_id, a.description);
    }
    return map;
  }, [filteredAlerts]);

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom mb={2}>
        Fleet Overview
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
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error} loadingLabel={LOADING_MESSAGES.fleet}>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Total Vehicles" value={TOTAL_VEHICLES} />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Active Vehicles" value={onlineCount} subtitle="Within 2 min" />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Vehicles Offline" value={offlineCount} />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Active Alerts" value={filteredAlerts.length} />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Fleet Health Score" value={fleetHealth} />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Average Speed" value={avgSpeed} />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.7}>
          <StatCard title="Fleet Uptime" value={fleetUptime} />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <LineChartPanel
            title="Fleet Speed Trend"
            data={speedChart}
            yLabel="Speed (km/h)"
            xLabel="Timestamp"
            timeRange={filters.timeRange}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LineChartPanel
            title="Fleet Health Trend"
            data={healthChart}
            yLabel="Health Score (%)"
            xLabel="Timestamp"
            timeRange={filters.timeRange}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LineChartPanel
            title="Alert Trend"
            data={alertChart}
            yLabel="Alert Count"
            xLabel="Time"
            color="#d32f2f"
            timeRange={filters.timeRange}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>
        Fleet Status Table
      </Typography>
      {!latestForTable.length ? (
        <EmptyState />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {[
                  "Vehicle ID",
                  "Vehicle Type",
                  "Current Speed",
                  "Last Seen",
                  "Status",
                  "Current Trip",
                  "Engine Health",
                  "Active Alert",
                ].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayIds.map((id) => {
                const rec = data?.latestTelemetry.find((t) => t.vehicle_id === id);
                return (
                  <TableRow
                    key={id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/vehicle/${id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <VehicleLink vehicleId={id} />
                    </TableCell>
                    <TableCell>
                      {rec?.vehicle_type ?? (id.startsWith("LNG") ? "LNG" : "EV")}
                    </TableCell>
                    <TableCell>
                      {rec ? `${parseNum(rec.speed_kmh) ?? "—"} km/h` : "—"}
                    </TableCell>
                    <TableCell>{rec ? formatTs(rec.timestamp) : "—"}</TableCell>
                    <TableCell>
                      {rec && isOnline(rec.timestamp) ? "Online" : "Offline"}
                    </TableCell>
                    <TableCell>{rec?.trip_id ?? "—"}</TableCell>
                    <TableCell>
                      {rec?.engine_health_score
                        ? `${parseNum(rec.engine_health_score)}%`
                        : rec && !id.startsWith("LNG")
                          ? `${parseNum(rec.soh_pct) ?? parseNum(rec.soc_pct) ?? "—"}%`
                          : "—"}
                    </TableCell>
                    <TableCell>{alertByVehicle.get(id) ?? "None"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      </QueryPageShell>
    </Box>
  );
}
