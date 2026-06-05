import { Typography } from "@mui/material";
import { formatChartTooltipDateTime } from "@/utils/chartTimeFormatter";

interface TrendChartTooltipProps {
  timestamp: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryText?: string;
  secondaryColor?: "success.main" | "error.main" | "text.secondary";
}

export function TrendChartTooltip({
  timestamp,
  primaryLabel,
  primaryValue,
  secondaryText,
  secondaryColor = "text.secondary",
}: TrendChartTooltipProps) {
  return (
    <>
      <Typography variant="body2" color="text.secondary">
        Date/Time: {formatChartTooltipDateTime(timestamp)}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
        {primaryLabel}: {primaryValue}
      </Typography>
      {secondaryText && (
        <Typography variant="body2" color={secondaryColor} sx={{ mt: 0.5 }}>
          {secondaryText}
        </Typography>
      )}
    </>
  );
}
