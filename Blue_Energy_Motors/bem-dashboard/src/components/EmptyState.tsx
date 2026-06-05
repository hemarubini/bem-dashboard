import { Box, Typography } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

export function EmptyState({ message = "No data found" }: { message?: string }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={4}
      color="text.secondary"
    >
      <InboxOutlinedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
      <Typography>{message}</Typography>
    </Box>
  );
}
