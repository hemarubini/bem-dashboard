export type BatteryMetricType = "soc" | "soh";

export type BatteryHealthBand = "Healthy" | "Warning" | "Critical";

export const BATTERY_PERCENT_DOMAIN: [number, number] = [0, 100];

export const BATTERY_BAND_COLORS = {
  healthy: "#2e7d32",
  warning: "#ed6c02",
  critical: "#d32f2f",
} as const;

/** SOC: 80+ healthy, 40–79 warning, <40 critical. SOH: 80+ healthy, 60–79 warning, <60 critical. */
export const BATTERY_ZONE_FILL_OPACITY = 0.06;

export const BATTERY_THRESHOLDS = {
  soc: { healthy: 80, warning: 40 },
  soh: { healthy: 80, warning: 60 },
} as const;

export function batteryBandLabel(
  value: number,
  type: BatteryMetricType
): BatteryHealthBand {
  const t = BATTERY_THRESHOLDS[type];
  if (value >= t.healthy) return "Healthy";
  if (value >= t.warning) return "Warning";
  return "Critical";
}

export function batteryBandColor(
  value: number,
  type: BatteryMetricType
): string {
  const band = batteryBandLabel(value, type);
  return batteryBandColorForBand(band);
}

export function batteryBandColorForBand(band: BatteryHealthBand): string {
  switch (band) {
    case "Healthy":
      return BATTERY_BAND_COLORS.healthy;
    case "Warning":
      return BATTERY_BAND_COLORS.warning;
    default:
      return BATTERY_BAND_COLORS.critical;
  }
}

export function batteryStatCardColor(
  value: number,
  type: BatteryMetricType
): "success" | "warning" | "error" | "primary" {
  const band = batteryBandLabel(value, type);
  switch (band) {
    case "Healthy":
      return "success";
    case "Warning":
      return "warning";
    default:
      return "error";
  }
}

export interface BatteryHealthZone {
  y1: number;
  y2: number;
  fill: string;
  fillOpacity: number;
  /** Single guide label shown inside the zone (no duplicate threshold text). */
  guideLabel: string;
}

function batteryZoneGuides(type: BatteryMetricType): [string, string, string] {
  const t = BATTERY_THRESHOLDS[type];
  return [
    `Critical (<${t.warning}%)`,
    `Warning (${t.warning}–${t.healthy - 1}%)`,
    `Healthy (${t.healthy}%)`,
  ];
}

/** Background zones (bottom → top) for chart ReferenceArea. */
export function batteryHealthZones(type: BatteryMetricType): BatteryHealthZone[] {
  const t = BATTERY_THRESHOLDS[type];
  const [critical, warning, healthy] = batteryZoneGuides(type);
  return [
    {
      y1: 0,
      y2: t.warning,
      fill: BATTERY_BAND_COLORS.critical,
      fillOpacity: BATTERY_ZONE_FILL_OPACITY,
      guideLabel: critical,
    },
    {
      y1: t.warning,
      y2: t.healthy,
      fill: BATTERY_BAND_COLORS.warning,
      fillOpacity: BATTERY_ZONE_FILL_OPACITY,
      guideLabel: warning,
    },
    {
      y1: t.healthy,
      y2: 100,
      fill: BATTERY_BAND_COLORS.healthy,
      fillOpacity: BATTERY_ZONE_FILL_OPACITY,
      guideLabel: healthy,
    },
  ];
}

export interface BatteryThresholdLine {
  y: number;
  label: string;
  color: string;
}

/** Dashed threshold lines only — labels live on zone guides. */
export function batteryThresholdLines(
  type: BatteryMetricType
): BatteryThresholdLine[] {
  const t = BATTERY_THRESHOLDS[type];
  if (type === "soc") {
    return [
      { y: t.healthy, label: "", color: BATTERY_BAND_COLORS.healthy },
      { y: t.warning, label: "", color: BATTERY_BAND_COLORS.critical },
    ];
  }
  return [
    { y: t.healthy, label: "", color: BATTERY_BAND_COLORS.healthy },
    { y: t.warning, label: "", color: BATTERY_BAND_COLORS.warning },
  ];
}

/** Title / tooltip status phrase — e.g. "Warning (46%)". */
export function batteryStatusPhrase(
  value: number,
  type: BatteryMetricType
): string {
  return `${batteryBandLabel(value, type)} (${Math.round(value)}%)`;
}

export function batteryMetricLabel(type: BatteryMetricType): string {
  return type === "soc" ? "SOC" : "SOH";
}

export function batteryChartTitleBase(type: BatteryMetricType): string {
  return type === "soc" ? "Battery SOC" : "Battery SOH";
}

/** @deprecated Use batteryChartTitleBase */
export function batteryTrendTitleBase(type: BatteryMetricType): string {
  return batteryChartTitleBase(type);
}
