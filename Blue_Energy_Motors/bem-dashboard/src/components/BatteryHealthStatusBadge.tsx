import { Box, Chip, Typography } from "@mui/material";
import {
  batteryBandColorForBand,
  type BatteryHealthBand,
} from "@/lib/batteryHealthHelpers";

interface BatteryHealthStatusBadgeProps {
  band: BatteryHealthBand;
  value: number;
}

export function BatteryHealthStatusBadge({
  band,
  value,
}: BatteryHealthStatusBadgeProps) {
  const color = batteryBandColorForBand(band);

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip
        label={band.toUpperCase()}
        size="small"
        sx={{
          bgcolor: color,
          color: "#fff",
          fontWeight: 700,
          letterSpacing: 0.6,
          fontSize: "0.7rem",
          height: 24,
        }}
      />
      <Typography
        variant="body1"
        fontWeight={700}
        sx={{ color, lineHeight: 1 }}
      >
        {Math.round(value)}%
      </Typography>
    </Box>
  );
}
