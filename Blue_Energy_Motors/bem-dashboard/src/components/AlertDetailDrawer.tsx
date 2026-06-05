import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { AlertRecord } from "@/types";
import { queryLatestTelemetry } from "@/lib/queries";
import { formatTs } from "@/lib/parsers";
import { alertTypeFromDescription, alertStatus } from "@/lib/alertHelpers";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { SeverityChip } from "./SeverityChip";
import { VehicleLink } from "./VehicleLink";

interface AlertDetailDrawerProps {
  alert: AlertRecord | null;
  open: boolean;
  onClose: () => void;
}

export function AlertDetailDrawer({
  alert,
  open,
  onClose,
}: AlertDetailDrawerProps) {
  const { data: telemetry } = useBackgroundQuery({
    queryKey: ["telemetry-snapshot", alert?.vehicle_id],
    queryFn: () => queryLatestTelemetry(alert!.vehicle_id),
    enabled: open && !!alert,
  });

  if (!alert) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color="primary">
            Alert Details
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary">
          Vehicle Details
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <ListItemText
              primary="Vehicle ID"
              secondary={<VehicleLink vehicleId={alert.vehicle_id} />}
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Vehicle Type"
              secondary={alert.vehicle_type ?? "—"}
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText primary="Trip ID" secondary={alert.trip_id || "—"} />
          </ListItem>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
          Alert Details
        </Typography>
        <List dense>
          <ListItem disablePadding>
            <ListItemText
              primary="Timestamp"
              secondary={formatTs(alert.timestamp)}
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Severity"
              secondary={<SeverityChip severity={alert.severity} />}
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText
              primary="Alert Type"
              secondary={alertTypeFromDescription(alert.description)}
            />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText primary="Description" secondary={alert.description} />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText primary="Status" secondary={alertStatus(alert)} />
          </ListItem>
          <ListItem disablePadding>
            <ListItemText primary="Channel" secondary={alert.channel ?? "—"} />
          </ListItem>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
          Vehicle Status at Alert
        </Typography>
        {telemetry ? (
          <List dense disablePadding>
            <ListItem disablePadding>
              <ListItemText
                primary="Speed"
                secondary={
                  telemetry.speed_kmh ? `${telemetry.speed_kmh} km/h` : "—"
                }
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Location"
                secondary={
                  telemetry.gps_lat && telemetry.gps_lon
                    ? `${telemetry.gps_lat}, ${telemetry.gps_lon}`
                    : "—"
                }
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Last Signal"
                secondary={formatTs(telemetry.timestamp)}
              />
            </ListItem>
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {open ? "Loading vehicle status…" : "No vehicle data available"}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
