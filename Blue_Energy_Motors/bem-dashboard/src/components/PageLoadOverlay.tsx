import { Box, LinearProgress } from "@mui/material";

/** Shown only on initial load or filter change — not during background polling */
export function PageLoadOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <LinearProgress color="secondary" />
    </Box>
  );
}
