import { Card, CardContent, Typography } from "@mui/material";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Second line under value (e.g. percentage for combined savings). */
  secondaryValue?: string;
  /** Smaller type for long KPI strings (e.g. combined savings). */
  compactValue?: boolean;
  /** Overrides primary/secondary text color (e.g. green/red savings). */
  valueColor?: "success" | "warning" | "error" | "primary";
}

export function StatCard({
  title,
  value,
  subtitle,
  secondaryValue,
  compactValue,
  valueColor = "primary",
}: StatCardProps) {
  const valueSx =
    valueColor === "success"
      ? { color: "success.main" }
      : valueColor === "warning"
        ? { color: "warning.main" }
        : valueColor === "error"
          ? { color: "error.main" }
          : { color: "primary.main" };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography
          variant={compactValue ? "h5" : "h4"}
          fontWeight={700}
          sx={{
            ...valueSx,
            ...(compactValue
              ? { fontSize: { xs: "1.25rem", sm: "1.5rem" }, lineHeight: 1.25 }
              : {}),
          }}
        >
          {value}
        </Typography>
        {secondaryValue && (
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{ mt: 0.25, lineHeight: 1.3, ...valueSx }}
          >
            {secondaryValue}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
