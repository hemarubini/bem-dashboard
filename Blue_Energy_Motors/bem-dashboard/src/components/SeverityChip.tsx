import { Chip } from "@mui/material";
import { severityColor } from "@/lib/alertHelpers";

export function SeverityChip({ severity }: { severity: string }) {
  const color = severityColor(severity);
  return (
    <Chip
      label={severity}
      size="small"
      sx={{
        bgcolor: color,
        color: "#fff",
        fontWeight: 600,
      }}
    />
  );
}
