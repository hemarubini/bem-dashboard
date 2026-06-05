import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { TripRecord } from "@/types";
import type { AlertRecord } from "@/types";
import { scanAllAlerts } from "@/lib/queries";
import { formatTs } from "@/lib/parsers";
import { tripStatus } from "@/lib/healthHelpers";
import { useBackgroundQuery } from "@/hooks/useBackgroundQuery";
import { VehicleLink } from "./VehicleLink";
import { SeverityChip } from "./SeverityChip";

interface TripDetailModalProps {
  trip: TripRecord | null;
  open: boolean;
  onClose: () => void;
}

export function TripDetailModal({ trip, open, onClose }: TripDetailModalProps) {
  const { data: allAlerts } = useBackgroundQuery({
    queryKey: ["trip-modal-alerts"],
    queryFn: () => scanAllAlerts(),
    enabled: open && !!trip,
  });

  const tripAlerts: AlertRecord[] =
    trip && allAlerts
      ? allAlerts.filter(
          (a) =>
            a.vehicle_id === trip.vehicle_id &&
            (a.trip_id === trip.trip_id || !a.trip_id)
        )
      : [];

  if (!trip) return null;

  const status = tripStatus(trip);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
        Trip Details
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Trip ID
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {trip.trip_id}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Vehicle
            </Typography>
            <Typography variant="body1">
              <VehicleLink vehicleId={trip.vehicle_id} />
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Distance
            </Typography>
            <Typography variant="body1">
              {trip.distance_km ?? "—"} km
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {trip.trip_time_min ?? "—"} min
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Speed
            </Typography>
            <Typography variant="body1">
              {trip.speed_kmh ?? "—"} km/h
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body1">{status}</Typography>
          </Grid>
        </Grid>

        <Typography variant="subtitle1" color="primary" gutterBottom>
          Alerts During Trip
        </Typography>
        {!allAlerts ? (
          <Typography variant="body2" color="text.secondary">
            Loading alerts…
          </Typography>
        ) : !tripAlerts.length ? (
          <Typography variant="body2" color="text.secondary">
            No alerts recorded for this trip
          </Typography>
        ) : (
          <List dense>
            {tripAlerts.slice(0, 20).map((a) => (
              <ListItem key={a.alert_id} divider>
                <ListItemText
                  primary={
                    <>
                      <SeverityChip severity={a.severity} /> {a.description}
                    </>
                  }
                  secondary={formatTs(a.timestamp)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
