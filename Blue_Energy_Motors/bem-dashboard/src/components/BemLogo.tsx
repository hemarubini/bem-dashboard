import { Box, Typography } from "@mui/material";

interface BemLogoProps {
  /** Dark logo for light backgrounds (header) */
  variant?: "dark" | "light";
  height?: number;
  /** Stacked title for app header (logo + company name + tagline) */
  layout?: "header" | "compact";
}

export function BemLogo({
  variant = "dark",
  height = 44,
  layout = "header",
}: BemLogoProps) {
  const src =
    variant === "light"
      ? "/assets/bem-logo-white.svg"
      : "/assets/bem-logo.svg";

  if (layout === "compact") {
    return (
      <Box
        component="img"
        src={src}
        alt="Blue Energy Motors"
        sx={{
          height,
          width: "auto",
          maxWidth: 220,
          objectFit: "contain",
          display: "block",
        }}
      />
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box
        component="img"
        src={src}
        alt="Blue Energy Motors"
        sx={{
          height,
          width: "auto",
          maxWidth: 200,
          objectFit: "contain",
          display: "block",
        }}
      />
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            color: "primary.main",
            fontWeight: 700,
            letterSpacing: "0.06em",
            lineHeight: 1.2,
            fontSize: { xs: "0.8rem", sm: "0.95rem" },
          }}
        >
         
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.3, fontWeight: 500 }}
        >
          
        </Typography>
      </Box>
    </Box>
  );
}
