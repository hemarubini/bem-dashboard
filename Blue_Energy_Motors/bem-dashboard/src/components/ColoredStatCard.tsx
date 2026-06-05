import { Card, CardContent, Typography } from "@mui/material";

interface ColoredStatCardProps {
  title: string;
  value: string;
  color?: "success" | "warning" | "error" | "primary";
}

const colorMap = {
  success: { main: "#2e7d32", bg: "rgba(46,125,50,0.08)" },
  warning: { main: "#ed6c02", bg: "rgba(237,108,2,0.08)" },
  error: { main: "#d32f2f", bg: "rgba(211,47,47,0.08)" },
  primary: { main: "#0a1628", bg: "rgba(10,22,40,0.04)" },
};

export function ColoredStatCard({
  title,
  value,
  color = "primary",
}: ColoredStatCardProps) {
  const c = colorMap[color];
  return (
    <Card sx={{ height: "100%", bgcolor: c.bg, borderColor: c.main, borderWidth: 1 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: c.main, fontWeight: 700 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
