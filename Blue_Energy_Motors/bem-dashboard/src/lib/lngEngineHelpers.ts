/** Fixed Y-axis for LNG engine temperature trend — always shows up to 120°C. */
export const ENGINE_TEMP_Y_DOMAIN: [number, number] = [60, 120];

export const ENGINE_TEMP_Y_TICKS = [60, 70, 80, 90, 100, 110, 120] as const;

export const ENGINE_TEMP_THRESHOLDS = {
  warning: 95,
  critical: 105,
} as const;

export const ENGINE_TEMP_BAND_COLORS = {
  normal: "#2e7d32",
  warning: "#ed6c02",
  critical: "#d32f2f",
} as const;

export type EngineTempBand = "Normal" | "Warning" | "Critical";

export function engineTempBand(tempC: number): EngineTempBand {
  if (tempC >= ENGINE_TEMP_THRESHOLDS.critical) return "Critical";
  if (tempC >= ENGINE_TEMP_THRESHOLDS.warning) return "Warning";
  return "Normal";
}

export function engineTempBandColor(tempC: number): string {
  return engineTempBandColorForBand(engineTempBand(tempC));
}

export function engineTempBandColorForBand(band: EngineTempBand): string {
  switch (band) {
    case "Normal":
      return ENGINE_TEMP_BAND_COLORS.normal;
    case "Warning":
      return ENGINE_TEMP_BAND_COLORS.warning;
    default:
      return ENGINE_TEMP_BAND_COLORS.critical;
  }
}

export function formatEngineTempYTick(value: number): string {
  return `${Math.round(value)}°C`;
}

export function engineTempReferenceLines() {
  const { warning, critical } = ENGINE_TEMP_THRESHOLDS;
  return [
    {
      y: warning,
      label: `${warning}°C Warning`,
      color: ENGINE_TEMP_BAND_COLORS.warning,
    },
    {
      y: critical,
      label: `${critical}°C Critical`,
      color: ENGINE_TEMP_BAND_COLORS.critical,
    },
  ];
}
