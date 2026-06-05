import { Box, Divider, Paper, Typography } from "@mui/material";
import type { VehicleAlertLevel } from "@/lib/fleetMapHelpers";
import { statusBorderColorForLevel } from "@/lib/fleetMapHelpers";

const cardSx = {
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "12px",
  p: 2,
} as const;

const STATUS_ROWS: {
  level: VehicleAlertLevel;
  label: string;
}[] = [
  { level: "Healthy", label: "Healthy" },
  { level: "Warning", label: "Warning" },
  { level: "Critical", label: "Critical" },
  { level: "Offline", label: "Offline" },
];

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <Box display="flex" justifyContent="space-between" py={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

export interface FleetMapSummaryPanelProps {
  total: number;
  lngCount: number;
  evCount: number;
  statusCounts: Record<VehicleAlertLevel, number>;
}

export function FleetMapSummaryPanel({
  total,
  lngCount,
  evCount,
  statusCounts,
}: FleetMapSummaryPanelProps) {
  return (
    <Paper elevation={0} sx={cardSx}>
      <Typography variant="subtitle1" color="primary" fontWeight={700} gutterBottom>
        Fleet Summary
      </Typography>

      <SummaryRow label="Total Vehicles" value={total} />
      <SummaryRow label="LNG Vehicles" value={lngCount} />
      <SummaryRow label="EV Vehicles" value={evCount} />

      <Divider sx={{ my: 1.5 }} />

      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        textTransform="uppercase"
        letterSpacing={0.5}
        display="block"
        mb={1}
      >
        Status
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Marker ring color
      </Typography>

      {STATUS_ROWS.map(({ level, label }) => (
        <Box key={level} display="flex" alignItems="center" justifyContent="space-between" py={0.4}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              component="span"
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#e8e8e8",
                border: `2.5px solid ${statusBorderColorForLevel(level)}`,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2">{label}</Typography>
          </Box>
          <Typography variant="body2" fontWeight={600}>
            {statusCounts[level]}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}
