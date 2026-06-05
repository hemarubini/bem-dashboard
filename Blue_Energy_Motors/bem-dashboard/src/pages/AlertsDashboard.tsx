import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Button,
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
import { useQueryClient } from "@tanstack/react-query";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { useStableChartData } from "@/hooks/useStableChartData";
import { QueryPageShell } from "@/components/QueryPageShell";
import { usePageFilters } from "@/hooks/usePageFilters";
import { acknowledgeAlert, fetchAlertsPageData } from "@/lib/queries";
import { filterByTimeRange } from "@/lib/chartUtils";
import { buildAlertTrendChart } from "@/lib/chartDrillDownBuilders";
import { useChartDrillDown } from "@/hooks/useChartDrillDown";
import { TrendChartTooltip } from "@/components/TrendChartTooltip";
import { countSeverity } from "@/lib/alertHelpers";
import { formatTs } from "@/lib/parsers";
import { alertStatus } from "@/lib/alertHelpers";
import { StatCard } from "@/components/StatCard";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { FilterSelect } from "@/components/FilterBar";
import { EmptyState } from "@/components/EmptyState";
import { LOADING_MESSAGES } from "@/config/messages";
import { PieChartPanel } from "@/components/PieChartPanel";
import { LineChartPanel, type ChartPoint } from "@/components/LineChartPanel";
import { VehicleLink } from "@/components/VehicleLink";
import { SeverityChip } from "@/components/SeverityChip";
import { AlertDetailDrawer } from "@/components/AlertDetailDrawer";
import type { AlertRecord } from "@/types";
import { chartColors } from "@/theme";

export function AlertsDashboard() {
  const filters = usePageFilters("24h");
  const [severity, setSeverity] = useState("All");
  const [drawerAlert, setDrawerAlert] = useState<AlertRecord | null>(null);
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useBackgroundQuery({
    queryKey: ["alerts", ...filters.filterDeps, severity],
    queryFn: () => fetchAlertsPageData(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return filterByTimeRange(
      data.filter((a) => {
        if (severity !== "All" && a.severity.toUpperCase() !== severity.toUpperCase())
          return false;
        if (
          filters.vehicle !== "All Vehicles" &&
          a.vehicle_id !== filters.vehicle
        )
          return false;
        if (!filters.vehicleIds.includes(a.vehicle_id)) return false;
        return true;
      }),
      filters.since,
      filters.until
    );
  }, [data, severity, filters]);

  const sevCounts = countSeverity(filtered);
  const pieData = [
    { name: "Critical", value: sevCounts.critical },
    { name: "Warning", value: sevCounts.warning },
    { name: "Info", value: sevCounts.info },
  ];

  const handleAck = async (row: AlertRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setAckLoading(row.alert_id);
    try {
      await acknowledgeAlert(row.vehicle_id, row.alert_id);
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setAckLoading(null);
    }
  };

  const alertDrill = useChartDrillDown({
    timeRange: filters.timeRange,
    source: filtered,
    buildChart: buildAlertTrendChart,
  });

  const alertOverviewStable = useStableChartData(
    `alerts-trend-overview-${filters.sinceIso}-${severity}`,
    alertDrill.overviewData
  );
  const alertTrend = alertDrill.isDrilled
    ? alertDrill.drilldownData
    : alertOverviewStable;

  const alertTrendTooltip = useCallback(
    (point: ChartPoint) => (
      <TrendChartTooltip
        timestamp={point.timestamp ?? point.time}
        primaryLabel="Alerts"
        primaryValue={String(Math.round(point.value))}
      />
    ),
    []
  );

  return (
    <Box>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
        Alerts Dashboard
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
          <FilterSelect
            label="Severity"
            value={severity}
            options={[
              { value: "All", label: "All" },
              { value: "CRITICAL", label: "Critical" },
              { value: "WARNING", label: "Warning" },
              { value: "INFO", label: "Info" },
            ]}
            onChange={setSeverity}
          />
        }
      />

      <QueryPageShell isLoading={isLoading} data={data} error={error} loadingLabel={LOADING_MESSAGES.alerts}>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <StatCard title="Critical Alerts" value={sevCounts.critical} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Warning Alerts" value={sevCounts.warning} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Info Alerts" value={sevCounts.info} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="Affected Vehicles"
            value={new Set(filtered.map((a) => a.vehicle_id)).size}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <PieChartPanel
            title="Alert Distribution"
            data={pieData}
            colors={[chartColors.critical, chartColors.warning, chartColors.secondary]}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <LineChartPanel
            title="Alert Trend"
            data={alertTrend}
            yLabel="Alert Count"
            xLabel="Time"
            color={chartColors.critical}
            timeRange={filters.timeRange}
            renderTooltip={alertTrendTooltip}
            drillDownEligible={alertDrill.drillDownEligible}
            onDrillDownPointClick={alertDrill.handlePointClick}
            isDrilled={alertDrill.isDrilled}
            onDrillBack={alertDrill.handleDrillBack}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" color="primary" gutterBottom>
        Alerts Table
      </Typography>
      {!filtered.length ? (
        <EmptyState />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {[
                  "Timestamp",
                  "Vehicle",
                  "Severity",
                  "Description",
                  "Channel",
                  "Trip ID",
                  "Acknowledged",
                  "Action",
                ].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 100).map((row) => (
                <TableRow
                  key={row.alert_id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => setDrawerAlert(row)}
                >
                  <TableCell>{formatTs(row.timestamp)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <VehicleLink vehicleId={row.vehicle_id} />
                  </TableCell>
                  <TableCell><SeverityChip severity={row.severity} /></TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.channel ?? "—"}</TableCell>
                  <TableCell>{row.trip_id ?? "—"}</TableCell>
                  <TableCell>{alertStatus(row)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      disabled={
                        alertStatus(row) === "ACKNOWLEDGED" ||
                        ackLoading === row.alert_id
                      }
                      onClick={(e) => handleAck(row, e)}
                    >
                      ACKNOWLEDGE
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      </QueryPageShell>

      <AlertDetailDrawer
        alert={drawerAlert}
        open={!!drawerAlert}
        onClose={() => setDrawerAlert(null)}
      />
    </Box>
  );
}
