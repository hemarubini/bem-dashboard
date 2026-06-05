import { Box, CircularProgress, Typography } from "@mui/material";
import { LOADING_MESSAGES } from "@/config/messages";

export function LoadingSpinner({
  label = LOADING_MESSAGES.default,
}: {
  label?: string;
}) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={6}
      gap={2}
    >
      <CircularProgress color="secondary" size={48} />
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
    </Box>
  );
}
