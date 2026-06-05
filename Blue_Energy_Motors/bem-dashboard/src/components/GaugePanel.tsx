import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import {
  batteryBandColor,
  BATTERY_THRESHOLDS,
  type BatteryMetricType,
} from "@/lib/batteryHealthHelpers";

interface GaugePanelProps {
  title: string;
  value: number | null;
  type?: BatteryMetricType;
  unit?: string;
}

export function GaugePanel({
  title,
  value,
  type = "soc",
  unit = "%",
}: GaugePanelProps) {
  const v = value ?? 0;
  const fill = batteryBandColor(v, type);
  const data = [{ name: title, value: Math.min(100, Math.max(0, v)), fill }];

  const legend =
    type === "soc"
      ? `${BATTERY_THRESHOLDS.soc.healthy}–100 Healthy · ${BATTERY_THRESHOLDS.soc.warning}–${BATTERY_THRESHOLDS.soc.healthy - 1} Warning · 0–${BATTERY_THRESHOLDS.soc.warning - 1} Critical`
      : `${BATTERY_THRESHOLDS.soh.healthy}+ Healthy · ${BATTERY_THRESHOLDS.soh.warning}–${BATTERY_THRESHOLDS.soh.healthy - 1} Warning · below ${BATTERY_THRESHOLDS.soh.warning} Critical`;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" color="primary" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            barSize={14}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background
              dataKey="value"
              cornerRadius={6}
              fill={fill}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <Box textAlign="center">
          <Typography variant="h4" fontWeight={700} sx={{ color: fill }}>
            {value !== null ? `${Math.round(v)}${unit}` : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {legend}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
