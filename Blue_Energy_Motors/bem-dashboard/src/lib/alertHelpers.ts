import type { AlertRecord } from "@/types";

export function alertTypeFromDescription(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("overheating") || d.includes("over-temp")) return "ENGINE_OVERHEAT";
  if (d.includes("oil")) return "LOW_OIL";
  if (d.includes("lng") || d.includes("fuel")) return "LOW_FUEL";
  if (d.includes("pressure")) return "TANK_PRESSURE";
  if (d.includes("dtc")) return "DTC_FAULT";
  if (d.includes("soc") || d.includes("battery low")) return "LOW_SOC";
  if (d.includes("cell voltage")) return "CELL_SPREAD";
  if (d.includes("motor")) return "MOTOR_OVERTEMP";
  if (d.includes("speed")) return "OVER_SPEED";
  return "GENERAL";
}

export function severityColor(severity: string): string {
  const s = severity.toUpperCase();
  if (s === "CRITICAL") return "#d32f2f";
  if (s === "WARNING") return "#ed6c02";
  if (s === "INFO") return "#0288d1";
  return "#757575";
}

export function alertStatus(alert: AlertRecord): string {
  if (String(alert.acknowledged) === "true" || alert.acknowledged === true)
    return "ACKNOWLEDGED";
  return "OPEN";
}

export function countSeverity(alerts: AlertRecord[]) {
  let critical = 0;
  let warning = 0;
  let info = 0;
  for (const a of alerts) {
    const s = a.severity?.toUpperCase() ?? "";
    if (s === "CRITICAL") critical++;
    else if (s === "WARNING") warning++;
    else if (s === "INFO") info++;
  }
  return { critical, warning, info };
}
