import { Box, Typography, Divider } from "@mui/material";
import type { TelemetryRecord } from "@/types";
import { formatTs, parseNum } from "@/lib/parsers";
import type { VehicleAlertLevel } from "@/lib/fleetMapHelpers";
import { VehicleLink } from "@/components/VehicleLink";

interface VehicleMapPopupProps {
  vehicleId: string;
  rec: TelemetryRecord;
  online: boolean;
  level: VehicleAlertLevel;
  isLNG: boolean;
}

export function VehicleMapPopup({
  vehicleId,
  rec,
  online,
  level,
  isLNG,
}: VehicleMapPopupProps) {
  return (
    <Box sx={{ minWidth: 220 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Vehicle: <VehicleLink vehicleId={vehicleId} />
      </Typography>
      <Typography variant="body2">
        Type: {rec.vehicle_type ?? (isLNG ? "LNG" : "EV")}
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2">
        Speed: {parseNum(rec.speed_kmh) ?? "—"} km/h
      </Typography>
      {isLNG ? (
        <>
          <Typography variant="body2">
            Fuel: {parseNum(rec.lng_level_pct) ?? "—"}%
          </Typography>
          <Typography variant="body2">
            Pressure: {parseNum(rec.tank_pressure_bar) ?? "—"} bar
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="body2">
            SOC: {parseNum(rec.soc_pct) ?? "—"}%
          </Typography>
          <Typography variant="body2">
            Battery Temp: {parseNum(rec.battery_temp_c) ?? "—"} °C
          </Typography>
        </>
      )}
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2">
        Last Seen: {formatTs(rec.timestamp)}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        Status: {online ? "ONLINE" : "OFFLINE"}
        {level !== "Healthy" && level !== "Offline" ? ` · ${level.toUpperCase()}` : ""}
      </Typography>
      <Typography variant="body2">
        Current Trip: {rec.trip_id ?? "—"}
      </Typography>
    </Box>
  );
}
