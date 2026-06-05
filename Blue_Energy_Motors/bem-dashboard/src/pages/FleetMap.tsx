import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  IconButton,
  Modal,
  Paper,
  Table,
  Tooltip,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { ALL_VEHICLES, TOTAL_VEHICLES, vehiclesForType } from "@/config/constants";
import { usePageFilters } from "@/hooks/usePageFilters";
import { fetchFleetMapData, fetchVehicleGpsTrail } from "@/lib/queries";
import { useLastUpdated } from "@/context/LastUpdatedContext";
import {
  buildAlertMap,
  FLEET_MAP_TRAIL_POINTS,
  filterFleetMapVehicles,
  toFleetMapVehicle,
  type AlertStatusFilter,
  type FleetMapVehicle,
  type VehicleAlertLevel,
} from "@/lib/fleetMapHelpers";
import { getTimeRangeBounds } from "@/config/constants";
import { filterByTimeRange } from "@/lib/chartUtils";
import { formatTs, parseNum } from "@/lib/parsers";
import { StatCard } from "@/components/StatCard";
import { FilterRow, FilterSelect } from "@/components/FilterBar";
import { QueryPageShell } from "@/components/QueryPageShell";
import { FleetMapPane } from "@/components/map/FleetMapPane";
import { FleetMapSummaryPanel } from "@/components/map/FleetMapSummaryPanel";
import { VehicleColorLegend } from "@/components/map/VehicleColorLegend";
import { vehiclesWithMapDisplayCoords } from "@/lib/mapMarkerSpread";

const FLEET_MAP_REFRESH_MS = 5000;

export function FleetMap() {
  const filters = usePageFilters("15m");
  const { markUpdated } = useLastUpdated();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchVehicle, setSearchVehicle] = useState("All Vehicles");
  const [alertFilter, setAlertFilter] = useState<AlertStatusFilter>("All");
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [followPanTrigger, setFollowPanTrigger] = useState(0);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [followVehicle, setFollowVehicle] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["fleet-map", filters.vehicleType, filters.vehicle, alertFilter],
    queryFn: async () => {
      const result = await fetchFleetMapData();
      markUpdated();
      return result;
    },
    refetchInterval: FLEET_MAP_REFRESH_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const trailVehicleId =
    selectedId ?? (searchVehicle !== "All Vehicles" ? searchVehicle : null);

  const { data: trailPoints } = useQuery({
    queryKey: [
      "fleet-map-trail",
      trailVehicleId,
      filters.timeRange,
      filters.customStart,
      filters.customEnd,
    ],
    queryFn: () => {
      const { start } = getTimeRangeBounds(
        filters.timeRange,
        filters.customStart,
        filters.customEnd
      );
      return fetchVehicleGpsTrail(
        trailVehicleId!,
        start.toISOString(),
        FLEET_MAP_TRAIL_POINTS
      );
    },
    enabled: !!trailVehicleId,
    refetchInterval: FLEET_MAP_REFRESH_MS,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const alertsInRange = useMemo(
    () =>
      filterByTimeRange(data?.alerts ?? [], filters.since, filters.until),
    [data?.alerts, filters.since, filters.until]
  );

  const alertMap = useMemo(
    () => buildAlertMap(alertsInRange),
    [alertsInRange]
  );

  const allVehicles = useMemo(() => {
    if (!data?.latest) return [];
    const latestById = new Map(
      data.latest.map((t) => [t.vehicle_id, t] as const)
    );
    return ALL_VEHICLES.map((id) => {
      const rec = latestById.get(id);
      if (!rec) return null;
      return toFleetMapVehicle(rec, alertMap);
    }).filter((v): v is FleetMapVehicle => v !== null);
  }, [data, alertMap]);

  /** Search "All Vehicles" always shows full fleet (Vehicle + Search dropdowns stay synced). */
  const mapVehicleFilter =
    searchVehicle === "All Vehicles" ? "All Vehicles" : searchVehicle;

  const filteredVehicles = useMemo(
    () =>
      filterFleetMapVehicles(allVehicles, {
        vehicleIds: filters.vehicleIds,
        vehicle: mapVehicleFilter,
        alertFilter,
      }),
    [allVehicles, filters.vehicleIds, mapVehicleFilter, alertFilter]
  );

  const legendVehicles = useMemo(
    () => allVehicles.filter((v) => filters.vehicleIds.includes(v.id)),
    [allVehicles, filters.vehicleIds]
  );

  const onlineCount = allVehicles.filter((v) => v.online).length;
  const offlineCount = allVehicles.length - onlineCount;
  const vehiclesInAlert = useMemo(() => {
    let count = 0;
    for (const state of alertMap.values()) {
      if (state.critical || state.warning) count++;
    }
    return count;
  }, [alertMap]);

  const fleetSummary = useMemo(() => {
    const statusCounts: Record<VehicleAlertLevel, number> = {
      Healthy: 0,
      Warning: 0,
      Critical: 0,
      Offline: 0,
    };
    let lngCount = 0;
    let evCount = 0;
    for (const v of legendVehicles) {
      statusCounts[v.level]++;
      if (v.isLNG) lngCount++;
      else evCount++;
    }
    return {
      total: legendVehicles.length,
      lngCount,
      evCount,
      statusCounts,
    };
  }, [legendVehicles]);

  const searchOptions = useMemo(
    () => [
      { value: "All Vehicles", label: "All Vehicles" },
      ...vehiclesForType(filters.vehicleType).map((id) => ({
        value: id,
        label: id,
      })),
    ],
    [filters.vehicleType]
  );

  const flyToVehicle = useCallback((v: FleetMapVehicle) => {
    setFlyTarget({ lat: v.lat, lon: v.lon });
    setFlyTrigger((n) => n + 1);
  }, []);

  const focusVehicle = useCallback((v: FleetMapVehicle, options?: { fly?: boolean }) => {
    setSelectedId(v.id);
    setSearchVehicle(v.id);
    filters.setVehicle(v.id);
    if (options?.fly) flyToVehicle(v);
  }, [flyToVehicle, filters]);

  const onSearchVehicleChange = (id: string) => {
    setSearchVehicle(id);
    if (id === "All Vehicles") {
      filters.setVehicle("All Vehicles");
      setSelectedId(null);
      setFollowVehicle(false);
      return;
    }
    filters.setVehicle(id);
    const v = allVehicles.find((x) => x.id === id);
    if (v) focusVehicle(v);
  };

  const onFilterVehicleChange = (id: string) => {
    filters.setVehicle(id);
    setSearchVehicle(id);
    if (id === "All Vehicles") {
      setSelectedId(null);
      setFollowVehicle(false);
      return;
    }
    const v = allVehicles.find((x) => x.id === id);
    if (v) focusVehicle(v);
  };

  useEffect(() => {
    if (searchVehicle === "All Vehicles") return;
    if (!searchOptions.some((o) => o.value === searchVehicle)) {
      setSearchVehicle("All Vehicles");
      filters.setVehicle("All Vehicles");
      setSelectedId(null);
      setFollowVehicle(false);
    }
  }, [searchVehicle, searchOptions, filters]);

  useEffect(() => {
    if (!followVehicle || !selectedId) return;
    const v = filteredVehicles.find((x) => x.id === selectedId);
    if (v) {
      setFlyTarget({ lat: v.lat, lon: v.lon });
      setFollowPanTrigger((n) => n + 1);
    }
  }, [followVehicle, selectedId, filteredVehicles]);

  const locateFleet = () => {
    if (filteredVehicles.length > 0) {
      setFitBoundsTrigger((n) => n + 1);
    }
  };

  const toggleFollowVehicle = () => {
    if (!selectedId) return;
    setFollowVehicle((on) => !on);
    if (!followVehicle) {
      const v = allVehicles.find((x) => x.id === selectedId);
      if (v) flyToVehicle(v);
    }
  };

  const trailPositions = useMemo(() => {
    if (!trailPoints?.length) return [];
    const pts = trailPoints.slice(-FLEET_MAP_TRAIL_POINTS);
    return pts.map((p) => [p.lat, p.lon] as [number, number]);
  }, [trailPoints]);

  const fitBoundsPositions = useMemo(
    () =>
      vehiclesWithMapDisplayCoords(filteredVehicles).map(
        (v) => [v.displayLat, v.displayLon] as [number, number]
      ),
    [filteredVehicles]
  );

  const mapPaneProps = {
    vehicles: filteredVehicles,
    selectedId,
    trailPositions,
    flyTarget,
    flyTrigger,
    followPanTrigger,
    followEnabled: followVehicle,
    fitBoundsTrigger,
    fitBoundsPositions,
    mapExpanded,
    onToggleExpand: () => setMapExpanded((e) => !e),
    onVehicleClick: (v: FleetMapVehicle) => focusVehicle(v),
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" color="primary" fontWeight={700}>
            Fleet Map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-Time Vehicle Tracking
          </Typography>
        </Box>
        <FilterSelect
          label="Search Vehicle"
          value={searchVehicle}
          options={searchOptions}
          onChange={onSearchVehicleChange}
          minWidth={200}
        />
      </Box>

      {!mapExpanded && (
        <QueryPageShell
          isLoading={isLoading}
          data={data}
          error={error ? (error instanceof Error ? error.message : "Query failed") : null}
        >
          <Grid container spacing={2} mb={2}>
          <Grid item xs={6} sm={3}>
            <StatCard title="Total Vehicles" value={TOTAL_VEHICLES} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              title="Online Vehicles"
              value={onlineCount}
              subtitle="Active within 2 min"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Offline Vehicles" value={offlineCount} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Vehicles In Alert" value={vehiclesInAlert} />
          </Grid>
        </Grid>

        <FilterRow>
          <FilterSelect
            label="Vehicle Type"
            value={filters.vehicleType}
            options={[
              { value: "All", label: "All" },
              { value: "LNG", label: "LNG" },
              { value: "EV", label: "EV" },
            ]}
            onChange={(v) => {
              filters.setVehicleType(v as typeof filters.vehicleType);
              setSearchVehicle("All Vehicles");
              filters.setVehicle("All Vehicles");
              setSelectedId(null);
              setFollowVehicle(false);
            }}
          />
          <FilterSelect
            label="Vehicle"
            value={filters.vehicle}
            options={filters.vehicleOptions}
            onChange={onFilterVehicleChange}
          />
          <FilterSelect
            label="Alert Status"
            value={alertFilter}
            options={[
              { value: "All", label: "All" },
              { value: "Healthy", label: "Healthy" },
              { value: "Warning", label: "Warning" },
              { value: "Critical", label: "Critical" },
            ]}
            onChange={(v) => setAlertFilter(v as AlertStatusFilter)}
          />
          <FilterSelect
            label="Time Range"
            value={filters.timeRange}
            options={[
              { value: "15m", label: "Last 15 Minutes" },
              { value: "1h", label: "Last 1 Hour" },
              { value: "6h", label: "Last 6 Hours" },
              { value: "12h", label: "Last 12 Hours" },
              { value: "24h", label: "Last 24 Hours" },
              { value: "7d", label: "Last 7 Days" },
              { value: "30d", label: "Last 30 Days" },
              { value: "custom", label: "Custom Range" },
            ]}
            onChange={(v) => filters.setTimeRange(v as typeof filters.timeRange)}
          />
        </FilterRow>

          {trailVehicleId && (
            <Box mb={1}>
              <Typography variant="caption" color="secondary.main">
                Route trail: {trailVehicleId}
              </Typography>
            </Box>
          )}
        </QueryPageShell>
      )}

      <Box
        mb={1}
        display="flex"
        gap={1}
        flexWrap="wrap"
        alignItems="center"
        sx={
          mapExpanded
            ? {
                position: "fixed",
                top: "calc(5vh + 8px)",
                left: "calc(2.5vw + 8px)",
                zIndex: 1402,
              }
            : undefined
        }
      >
        <ButtonGroup variant="outlined" size="small">
          <Button
            startIcon={<MyLocationIcon />}
            onClick={locateFleet}
            disabled={filteredVehicles.length === 0}
          >
            Locate Fleet
          </Button>
          <Button
            startIcon={<GpsFixedIcon />}
            onClick={toggleFollowVehicle}
            disabled={!selectedId}
            variant={followVehicle ? "contained" : "outlined"}
            color={followVehicle ? "secondary" : "primary"}
          >
            Follow Vehicle
          </Button>
        </ButtonGroup>
        <Tooltip title={mapExpanded ? "Minimize map" : "Full screen map"}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => setMapExpanded((e) => !e)}
            aria-label={mapExpanded ? "Minimize map" : "Full screen map"}
          >
            {mapExpanded ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
        {followVehicle && selectedId && (
          <Typography variant="caption" color="text.secondary">
            Following {selectedId}
          </Typography>
        )}
      </Box>

      <Modal
        open={mapExpanded}
        onClose={() => setMapExpanded(false)}
        sx={{ zIndex: 1300 }}
        slotProps={{
          backdrop: { sx: { bgcolor: "rgba(10, 22, 40, 0.72)" } },
        }}
      >
        <Box sx={{ outline: "none" }} aria-hidden />
      </Modal>

      <Grid container spacing={2} mb={2}>
        <Grid
          item
          xs={12}
          md={mapExpanded ? 12 : 8}
          sx={{
            height: mapExpanded ? 0 : "auto",
            minHeight: mapExpanded ? 0 : undefined,
            overflow: "visible",
            p: mapExpanded ? 0 : undefined,
          }}
        >
          <Box
            sx={{
              position: mapExpanded ? "fixed" : "relative",
              top: mapExpanded ? "5vh" : "auto",
              left: mapExpanded ? "2.5vw" : "auto",
              width: mapExpanded ? "95vw" : "100%",
              height: mapExpanded ? "90vh" : 520,
              zIndex: mapExpanded ? 1401 : "auto",
            }}
          >
            <Paper
              sx={{
                height: "100%",
                width: "100%",
                overflow: "hidden",
                position: "relative",
                boxShadow: mapExpanded ? 8 : 1,
              }}
            >
              {mapExpanded && (
                <IconButton
                  aria-label="Close full screen map"
                  onClick={() => setMapExpanded(false)}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 1500,
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              )}
              <FleetMapPane {...mapPaneProps} />
            </Paper>
          </Box>
        </Grid>
        {!mapExpanded && (
          <Grid item xs={12} md={4}>
            <FleetMapSummaryPanel {...fleetSummary} />
          </Grid>
        )}
      </Grid>

      {!mapExpanded && legendVehicles.length > 0 && (
        <VehicleColorLegend vehicles={legendVehicles} />
      )}

      {!mapExpanded && (
        <>
      <Typography variant="h6" color="primary" gutterBottom>
        Fleet Vehicles
      </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                {[
                  "Vehicle ID",
                  "Type",
                  "Speed",
                  "Location",
                  "Status",
                  "Last Seen",
                  "Alert",
                ].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVehicles.map((v) => (
                <TableRow
                  key={v.id}
                  hover
                  selected={selectedId === v.id}
                  sx={{ cursor: "pointer" }}
                  onClick={() => focusVehicle(v)}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        component="span"
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: v.vehicleColor,
                          border: `2px solid ${v.statusBorderColor}`,
                          flexShrink: 0,
                        }}
                      />
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {v.id}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{v.isLNG ? "LNG" : "EV"}</TableCell>
                  <TableCell>
                    {parseNum(v.rec.speed_kmh) ?? "—"} km/h
                  </TableCell>
                  <TableCell>
                    {v.lat.toFixed(4)}, {v.lon.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{
                        color: v.statusBorderColor,
                        fontWeight: 600,
                      }}
                    >
                      {v.online ? "Online" : "Offline"}
                      {v.level !== "Healthy" && v.level !== "Offline"
                        ? ` · ${v.level}`
                        : ""}
                    </Box>
                  </TableCell>
                  <TableCell>{formatTs(v.rec.timestamp)}</TableCell>
                  <TableCell>{v.alertText}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}

        <style>{`
          @keyframes bem-blink-ring {
            0%, 100% { stroke-opacity: 1; }
            50% { stroke-opacity: 0.25; }
          }
          .bem-marker-critical path {
            animation: bem-blink-ring 1s ease-in-out infinite;
          }
          .bem-map-fs-control {
            margin-top: 6px !important;
          }
          .bem-map-fs-btn {
            width: 34px;
            height: 34px;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            background: #fff;
            border: 2px solid rgba(30,58,95,0.35);
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          .bem-map-fs-btn:hover {
            background: #f0f6fc;
          }
          .bem-vehicle-popup {
            font-size: 12px;
            line-height: 1.45;
            min-width: 200px;
          }
        `}</style>
    </Box>
  );
}
