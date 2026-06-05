import { Box, Chip, Typography } from "@mui/material";
import {
  engineTempBandColorForBand,
  type EngineTempBand,
} from "@/lib/lngEngineHelpers";

interface EngineTempStatusBadgeProps {
  band: EngineTempBand;
  valueC: number;
}

export function EngineTempStatusBadge({
  band,
  valueC,
}: EngineTempStatusBadgeProps) {
  const color = engineTempBandColorForBand(band);

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
        {Math.round(valueC)}°C
      </Typography>
    </Box>
  );
}
