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
import { fetchDTCAnalyticsData } from "@/lib/queries";
import { aggregateFaultRows, dtcFrequency } from "@/lib/faultAggregates";
import { parseJsonArray } from "@/lib/parsers";
import { formatTs } from "@/lib/parsers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { FilterSelect } from "@/components/FilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LineChartPanel } from "@/components/LineChartPanel";
import { VehicleLink } from "@/components/VehicleLink";
import { SeverityChip } from "@/components/SeverityChip";
import { chartColors } from "@/theme";

export function DTCAnalytics() {
  const filters = usePageFilters("7d");
  const [dtcFilter, setDtcFilter] = useState("All");

  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["dtc-analytics", ...filters.filterDeps, dtcFilter],
    queryFn: () =>
      fetchDTCAnalyticsData(
        filters.vehicleIds,
        filters.sinceIso,
        filters.timeRange,
        filters.until.toISOString()
      ),
  });

  const faultRows = useMemo(
    () => aggregateFaultRows(data?.records ?? []),
    [data]
  );

  const filteredRows = useMemo(() => {
    if (dtcFilter === "All") return faultRows;
    return faultRows.filter((r) => r.code === dtcFilter);
  }, [faultRows, dtcFilter]);

  const dtcOptions = useMemo(() => {
    const codes = new Set(faultRows.map((r) => r.code));
    return [
      { value: "All", label: "All DTC Codes" },
      ...[...codes].map((c) => ({ value: c, label: c })),
    ];
  }, [faultRows]);

  const activeDtc = faultRows.length;
  const affectedVehicles = new Set(faultRows.map((r) => r.vehicle_id)).size;
  const mostFrequent = dtcFrequency(faultRows).sort((a, b) => b.value - a.value)[0];

  const timeline = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of data?.records ?? []) {
      const codes = parseJsonArray(r.dtc_codes);
      if (!codes.length) continue;
      const t = formatTs(r.timestamp);
      buckets.set(t, (buckets.get(t) ?? 0) + codes.length);
    }
    return [...buckets.entries()].slice(-30).map(([time, value]) => ({ time, value }));
  }, [data]);

  const dtcTimeline = useStableChartData(`dtc-timeline-${filters.sinceIso}`, timeline);

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
        DTC Analytics
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
          <FilterSelect label="DTC Code" value={dtcFilter} options={dtcOptions} onChange={setDtcFilter} />
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error}>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <StatCard title="Active DTC" value={activeDtc} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Resolved DTC" value={0} subtitle="No history deactivation in table" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Affected Vehicles" value={affectedVehicles} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Most Frequent DTC"
            value={mostFrequent?.name ?? "—"}
            subtitle={mostFrequent ? `${mostFrequent.value} occurrences` : undefined}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>DTC Frequency</Typography>
            {!dtcFrequency(faultRows).length ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dtcFrequency(faultRows)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" label={{ value: "DTC Code", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Occurrence Count", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={chartColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <LineChartPanel title="DTC Timeline" data={dtcTimeline} yLabel="Fault Count" xLabel="Time" timeRange={filters.timeRange} />
        </Grid>
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>DTC Table</Typography>
      {!filteredRows.length ? (
        <EmptyState />
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
              {filteredRows.map((row) => (
                <TableRow key={`${row.vehicle_id}-${row.code}`}>
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
