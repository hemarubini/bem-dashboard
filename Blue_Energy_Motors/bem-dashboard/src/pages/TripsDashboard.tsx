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
import { fetchTripsPageData } from "@/lib/queries";
import { filterByTimeRange, tripsPerDay } from "@/lib/chartUtils";
import { parseNum, formatTs } from "@/lib/parsers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { FilterSelect } from "@/components/FilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LOADING_MESSAGES } from "@/config/messages";
import { TripDetailModal } from "@/components/TripDetailModal";
import { VehicleLink } from "@/components/VehicleLink";
import { LineChartPanel } from "@/components/LineChartPanel";
import type { TripRecord } from "@/types";
import { chartColors } from "@/theme";

export function TripsDashboard() {
  const filters = usePageFilters("7d");
  const [trip, setTrip] = useState("All Trips");
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["trips", ...filters.filterDeps, trip],
    queryFn: () => fetchTripsPageData(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return filterByTimeRange(
      data.filter((t) => {
        if (
          filters.vehicle !== "All Vehicles" &&
          t.vehicle_id !== filters.vehicle
        )
          return false;
        if (!filters.vehicleIds.includes(t.vehicle_id)) return false;
        if (trip !== "All Trips" && t.trip_id !== trip) return false;
        return true;
      }),
      filters.since,
      filters.until
    );
  }, [data, filters, trip]);

  const tripOptions = useMemo(() => {
    const ids = new Set(filtered.map((t) => t.trip_id));
    return [
      { value: "All Trips", label: "All Trips" },
      ...[...ids].map((id) => ({ value: id, label: id })),
    ];
  }, [filtered]);

  const totalDistance = filtered.reduce(
    (s, t) => s + (parseNum(t.distance_km) ?? 0),
    0
  );
  const avgDuration = filtered.length
    ? filtered.reduce((s, t) => s + (parseNum(t.trip_time_min) ?? 0), 0) /
      filtered.length
    : 0;
  const avgSpeed = filtered.length
    ? filtered.reduce((s, t) => s + (parseNum(t.speed_kmh) ?? 0), 0) /
      filtered.length
    : 0;

  const barData = filtered.map((t) => ({
    name: t.trip_id.slice(0, 14),
    distance: parseNum(t.distance_km) ?? 0,
    duration: parseNum(t.trip_time_min) ?? 0,
    speed: parseNum(t.speed_kmh) ?? 0,
  }));

  const fleetUtil = filtered.length
    ? Math.min(100, Math.round((filtered.length / 8) * 100))
    : 0;

  const tripsDayChart = useStableChartData(
    `trips-day-${filters.sinceIso}-${trip}`,
    tripsPerDay(filtered)
  );

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
        Trips Dashboard
      </Typography>

      <GlobalFilterBar
        vehicleType={filters.vehicleType}
        onVehicleTypeChange={filters.setVehicleType}
        vehicle={filters.vehicle}
        onVehicleChange={(v) => {
          filters.setVehicle(v);
          setTrip("All Trips");
        }}
        vehicleOptions={filters.vehicleOptions}
        timeRange={filters.timeRange}
        onTimeRangeChange={filters.setTimeRange}
        customStart={filters.customStart}
        customEnd={filters.customEnd}
        onCustomStartChange={filters.setCustomStart}
        onCustomEndChange={filters.setCustomEnd}
        extra={
          <FilterSelect label="Trip" value={trip} options={tripOptions} onChange={setTrip} />
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error} loadingLabel={LOADING_MESSAGES.trips}>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Total Trips" value={filtered.length} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Distance Travelled" value={`${totalDistance.toFixed(1)} km`} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Average Duration" value={`${avgDuration.toFixed(1)} min`} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Average Speed" value={`${avgSpeed.toFixed(0)} km/h`} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <StatCard title="Fleet Utilization" value={`${fleetUtil}%`} />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>Distance Per Trip</Typography>
            {!barData.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} label={{ value: "Trip ID", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Distance (km)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="distance" fill={chartColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>Trip Duration</Typography>
            {!barData.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis label={{ value: "Duration (min)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="duration" fill={chartColors.secondary} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>Speed Per Trip</Typography>
            {!barData.length ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis label={{ value: "Speed (km/h)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="speed" fill={chartColors.warning} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <LineChartPanel title="Trips Per Day" data={tripsDayChart} yLabel="Trip Count" xLabel="Date" timeRange={filters.timeRange} />
        </Grid>
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>Trip Table</Typography>
      {!filtered.length ? (
        <EmptyState />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {["Trip ID", "Vehicle", "Start Time", "End Time", "Distance", "Duration", "Speed"].map(
                  (h) => (
                    <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>{h}</TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={`${row.vehicle_id}-${row.trip_id}`}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => setSelectedTrip(row)}
                >
                  <TableCell>{row.trip_id}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <VehicleLink vehicleId={row.vehicle_id} />
                  </TableCell>
                  <TableCell>{formatTs(row.last_updated)}</TableCell>
                  <TableCell>{formatTs(row.last_updated)}</TableCell>
                  <TableCell>{row.distance_km ?? "—"} km</TableCell>
                  <TableCell>{row.trip_time_min ?? "—"} min</TableCell>
                  <TableCell>{row.speed_kmh ?? "—"} km/h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      </QueryPageShell>

      <TripDetailModal trip={selectedTrip} open={!!selectedTrip} onClose={() => setSelectedTrip(null)} />
    </Box>
  );
}
