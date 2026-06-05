import type { TelemetryRecord } from "@/types";
import type { TimeRangeKey } from "@/config/constants";
import { parseNum } from "./parsers";

/** Matches Monthly Cost KPI on Cost Analytics (daily × 30). */
export const FLEET_MONTHLY_COST_MULTIPLIER = 30;

export type SavingsViewMode = "monthly" | "daily" | "combined";

export const SAVINGS_ANALYSIS_OPTIONS: {
  value: SavingsViewMode;
  label: string;
}[] = [
  { value: "monthly", label: "Monthly Savings (₹)" },
  { value: "daily", label: "Daily Savings (₹)" },
  { value: "combined", label: "Combined (₹ + %)" },
];

/** @deprecated Use SAVINGS_ANALYSIS_OPTIONS */
export const SAVINGS_VIEW_OPTIONS = SAVINGS_ANALYSIS_OPTIONS;

export interface FleetSavingsResult {
  /** Sum of latest daily_cost_inr across filtered vehicles. */
  fleetActualCostDaily: number;
  /** Sum of derived diesel-equivalent daily costs. */
  fleetDieselCostDaily: number;
  /** Fleet Diesel Cost − Fleet Actual Cost (daily). */
  fleetSavingsInrDaily: number;
  /** Same ratio on monthly totals — identical to daily % when ×30 is applied uniformly. */
  fleetSavingsPctDaily: number;
  fleetActualCostMonthly: number;
  fleetDieselCostMonthly: number;
  fleetSavingsInrMonthly: number;
  /** (Monthly savings ₹ / Monthly diesel cost) × 100 — used with monthly ₹ display. */
  fleetSavingsPctMonthly: number;
  hasData: boolean;
}

function fleetSavingsPct(savingsInr: number, dieselCost: number): number {
  return dieselCost > 0 ? (savingsInr / dieselCost) * 100 : 0;
}

/**
 * Derives diesel-equivalent daily cost from actual daily cost and savings %.
 * cost_savings_pct = (1 − actual/diesel) × 100  ⇒  diesel = actual / (1 − pct/100)
 */
export function dieselEquivalentDailyCost(
  actualDailyCost: number,
  savingsPct: number
): number | null {
  const ratio = 1 - savingsPct / 100;
  if (ratio === 0) return null;
  return actualDailyCost / ratio;
}

/** Fleet-level savings from latest telemetry snapshot (respects vehicle filters). */
export function computeFleetSavings(
  latest: readonly TelemetryRecord[]
): FleetSavingsResult {
  let fleetActualCostDaily = 0;
  let fleetDieselCostDaily = 0;
  let vehiclesWithData = 0;

  for (const t of latest) {
    const actual = parseNum(t.daily_cost_inr);
    const pct = parseNum(t.cost_savings_pct);
    if (actual === null || pct === null) continue;

    const diesel = dieselEquivalentDailyCost(actual, pct);
    if (diesel === null) continue;

    fleetActualCostDaily += actual;
    fleetDieselCostDaily += diesel;
    vehiclesWithData++;
  }

  if (vehiclesWithData === 0) {
    return {
      fleetActualCostDaily: 0,
      fleetDieselCostDaily: 0,
      fleetSavingsInrDaily: 0,
      fleetSavingsPctDaily: 0,
      fleetActualCostMonthly: 0,
      fleetDieselCostMonthly: 0,
      fleetSavingsInrMonthly: 0,
      fleetSavingsPctMonthly: 0,
      hasData: false,
    };
  }

  const fleetSavingsInrDaily = fleetDieselCostDaily - fleetActualCostDaily;
  const fleetActualCostMonthly =
    fleetActualCostDaily * FLEET_MONTHLY_COST_MULTIPLIER;
  const fleetDieselCostMonthly =
    fleetDieselCostDaily * FLEET_MONTHLY_COST_MULTIPLIER;
  const fleetSavingsInrMonthly =
    fleetDieselCostMonthly - fleetActualCostMonthly;

  const fleetSavingsPctDaily = fleetSavingsPct(
    fleetSavingsInrDaily,
    fleetDieselCostDaily
  );
  const fleetSavingsPctMonthly = fleetSavingsPct(
    fleetSavingsInrMonthly,
    fleetDieselCostMonthly
  );

  return {
    fleetActualCostDaily,
    fleetDieselCostDaily,
    fleetSavingsInrDaily,
    fleetSavingsPctDaily,
    fleetActualCostMonthly,
    fleetDieselCostMonthly,
    fleetSavingsInrMonthly,
    fleetSavingsPctMonthly,
    hasData: true,
  };
}

export function formatInrAmount(
  amount: number,
  options?: { perDay?: boolean }
): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const formatted = Math.abs(rounded).toLocaleString("en-IN");
  const base = `${sign}₹${formatted}`;
  return options?.perDay ? `${base}/day` : base;
}

export interface SavingsCardDisplay {
  primary: string;
  secondary?: string;
  subtitle?: string;
  compactValue?: boolean;
  /** Green when fleet saves vs diesel; red when fleet costs more. */
  valueColor?: "success" | "error";
}

function savingsValueColor(amount: number): "success" | "error" {
  return amount >= 0 ? "success" : "error";
}

function formatInrWithSavedLabel(amount: number): string {
  const base = formatInrAmount(amount);
  return amount > 0 ? `${base} Saved` : base;
}

function formatPctVsDiesel(pct: number): string {
  return `${pct.toFixed(1)}% vs Diesel`;
}

export function getFleetSavingsCardDisplay(
  result: FleetSavingsResult,
  mode: SavingsViewMode
): SavingsCardDisplay {
  if (!result.hasData) {
    return { primary: "—" };
  }

  const {
    fleetSavingsInrDaily,
    fleetSavingsInrMonthly,
    fleetSavingsPctMonthly,
  } = result;

  switch (mode) {
    case "monthly":
      return {
        primary: formatInrAmount(fleetSavingsInrMonthly),
        subtitle: savingsViewSubtitle("monthly"),
        valueColor: savingsValueColor(fleetSavingsInrMonthly),
      };
    case "daily":
      return {
        primary: formatInrAmount(fleetSavingsInrDaily, { perDay: true }),
        subtitle: savingsViewSubtitle("daily"),
        valueColor: savingsValueColor(fleetSavingsInrDaily),
      };
    case "combined":
      return {
        primary: formatInrWithSavedLabel(fleetSavingsInrMonthly),
        secondary: formatPctVsDiesel(fleetSavingsPctMonthly),
        subtitle: savingsViewSubtitle("combined"),
        compactValue: true,
        valueColor: savingsValueColor(fleetSavingsInrMonthly),
      };
    default:
      return { primary: "—" };
  }
}

/** @deprecated Use getFleetSavingsCardDisplay for structured layout. */
export function formatFleetSavingsDisplay(
  result: FleetSavingsResult,
  mode: SavingsViewMode
): string {
  const card = getFleetSavingsCardDisplay(result, mode);
  if (card.secondary) {
    return `${card.primary} ${card.secondary}`;
  }
  return card.primary;
}

export function savingsViewSubtitle(mode: SavingsViewMode): string | undefined {
  switch (mode) {
    case "monthly":
      return "Fleet monthly savings · daily × 30 est.";
    case "daily":
      return "Fleet daily savings total";
    case "combined":
      return "Monthly fleet savings · % from monthly diesel vs actual";
    default:
      return undefined;
  }
}

/** Chart series mode derived from Savings Analysis (Combined → percent on chart). */
export function savingsChartModeFromView(
  view: SavingsViewMode
): "monthly" | "daily" | "percent" {
  switch (view) {
    case "monthly":
      return "monthly";
    case "daily":
      return "daily";
    case "combined":
      return "percent";
  }
}

/** Compact Y-axis labels — unit shown once on axis title. */
export function formatSavingsTrendAxisValue(value: number): string {
  if (value === 0) return "₹0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    const kStr = Number.isInteger(k) ? String(k) : k.toFixed(1);
    return `${sign}${kStr}K`;
  }
  return `${sign}₹${Math.round(abs)}`;
}

export function formatSavingsTrendAxisPercent(value: number): string {
  if (value === 0) return "0%";
  return `${value.toFixed(0)}%`;
}

export function formatDieselComparisonLabel(pct: number): string {
  const abs = Math.abs(pct).toFixed(1);
  if (pct >= 0) return `${abs}% vs Diesel`;
  return `${abs}% Above Diesel`;
}

export function fleetSavingsTrendValue(
  result: FleetSavingsResult,
  chartMode: "monthly" | "daily" | "percent"
): number | null {
  if (!result.hasData) return null;
  switch (chartMode) {
    case "monthly":
      return result.fleetSavingsInrMonthly;
    case "daily":
      return result.fleetSavingsInrDaily;
    case "percent":
      return result.fleetSavingsPctMonthly;
  }
}

export interface SavingsTrendPoint {
  time: string;
  timestamp: string;
  value: number;
  savingsPct: number;
  savingsInrDaily: number;
  savingsInrMonthly: number;
}

export function savingsTrendBucketMs(timeRange: TimeRangeKey): number {
  switch (timeRange) {
    case "15m":
      return 60 * 1000;
    case "1h":
      return 5 * 60 * 1000;
    case "6h":
      return 15 * 60 * 1000;
    case "12h":
      return 30 * 60 * 1000;
    case "24h":
      return 60 * 60 * 1000;
    case "7d":
      return 6 * 60 * 60 * 1000;
    case "30d":
    case "custom":
      return 12 * 60 * 60 * 1000;
    default:
      return 12 * 60 * 60 * 1000;
  }
}

function latestTimestampInSnapshot(snapshot: readonly TelemetryRecord[]): string {
  return snapshot.reduce((max, r) => {
    return new Date(r.timestamp).getTime() > new Date(max).getTime()
      ? r.timestamp
      : max;
  }, snapshot[0].timestamp);
}

function trendPointFromSnapshot(
  snapshot: readonly TelemetryRecord[],
  chartMode: "monthly" | "daily" | "percent"
): SavingsTrendPoint | null {
  if (!snapshot.length) return null;
  const fleet = computeFleetSavings(snapshot);
  const value = fleetSavingsTrendValue(fleet, chartMode);
  if (value === null) return null;
  const timestamp = latestTimestampInSnapshot(snapshot);
  return {
    time: new Date(timestamp).toLocaleDateString(),
    timestamp,
    value,
    savingsPct: fleet.fleetSavingsPctMonthly,
    savingsInrDaily: fleet.fleetSavingsInrDaily,
    savingsInrMonthly: fleet.fleetSavingsInrMonthly,
  };
}

/** Time-range-aware buckets with latest telemetry per vehicle per bucket. */
function fleetSavingsTrendByBucket(
  records: readonly TelemetryRecord[],
  chartMode: "monthly" | "daily" | "percent",
  bucketMs: number
): SavingsTrendPoint[] {
  const byBucket = new Map<number, Map<string, TelemetryRecord>>();

  for (const r of records) {
    const t = new Date(r.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const bucketKey = bucketMs > 0 ? Math.floor(t / bucketMs) * bucketMs : t;
    const perVehicle = byBucket.get(bucketKey) ?? new Map<string, TelemetryRecord>();
    const existing = perVehicle.get(r.vehicle_id);
    if (
      !existing ||
      new Date(r.timestamp).getTime() > new Date(existing.timestamp).getTime()
    ) {
      perVehicle.set(r.vehicle_id, r);
    }
    byBucket.set(bucketKey, perVehicle);
  }

  return [...byBucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucketKey, perVehicle]) => {
      const snapshot = [...perVehicle.values()];
      const point = trendPointFromSnapshot(snapshot, chartMode);
      if (!point) return null;
      const ts =
        bucketMs > 0
          ? new Date(bucketKey).toISOString()
          : point.timestamp;
      return { ...point, timestamp: ts, time: ts };
    })
    .filter((p): p is SavingsTrendPoint => p !== null);
}

/**
 * Fleet savings trend using computeFleetSavings() per time bucket.
 * Final point is aligned to `latest` so it matches the KPI card (unless alignKpi is false).
 */
export function buildFleetSavingsTrend(
  records: readonly TelemetryRecord[],
  latest: readonly TelemetryRecord[],
  view: SavingsViewMode,
  timeRange: TimeRangeKey,
  options?: { bucketMs?: number; alignKpi?: boolean }
): SavingsTrendPoint[] {
  const chartMode = savingsChartModeFromView(view);
  const bucketMs = options?.bucketMs ?? savingsTrendBucketMs(timeRange);
  const alignKpi = options?.alignKpi ?? true;
  const historical = fleetSavingsTrendByBucket(records, chartMode, bucketMs);

  if (!alignKpi) return historical;

  const kpiPoint = trendPointFromSnapshot(latest, chartMode);
  if (!kpiPoint) return historical;

  if (historical.length === 0) return [kpiPoint];

  const last = historical[historical.length - 1];
  const kpiTime = new Date(kpiPoint.timestamp).getTime();
  const lastTime = new Date(last.timestamp).getTime();
  const kpiBucket =
    bucketMs > 0 ? Math.floor(kpiTime / bucketMs) * bucketMs : kpiTime;
  const lastBucket =
    bucketMs > 0 ? Math.floor(lastTime / bucketMs) * bucketMs : lastTime;

  if (kpiBucket === lastBucket) {
    return [...historical.slice(0, -1), kpiPoint];
  }

  if (kpiTime > lastTime) {
    return [...historical, kpiPoint];
  }

  return historical;
}

export function savingsTrendChartLabels(view: SavingsViewMode): {
  title: string;
  yLabel: string;
  subtitle?: string;
} {
  switch (view) {
    case "monthly":
      return {
        title: "Monthly Savings Trend",
        yLabel: "Monthly Savings (₹)",
      };
    case "daily":
      return {
        title: "Daily Savings Trend",
        yLabel: "Daily Savings (₹/day)",
      };
    case "combined":
      return {
        title: "Fleet Savings Trend (%)",
        yLabel: "Savings (%)",
        subtitle: "Percentage trend shown in Combined view",
      };
  }
}

export function formatSavingsTrendTooltipValue(
  point: {
    value: number;
    savingsInrDaily?: number;
    savingsInrMonthly?: number;
  },
  view: SavingsViewMode
): string {
  switch (view) {
    case "monthly":
      return formatInrAmount(point.savingsInrMonthly ?? 0);
    case "daily":
      return formatInrAmount(point.savingsInrDaily ?? 0, { perDay: true });
    case "combined":
      return `${point.value.toFixed(1)}%`;
  }
}

export function savingsTrendTooltipMetricLabel(view: SavingsViewMode): string {
  switch (view) {
    case "monthly":
      return "Monthly Savings";
    case "daily":
      return "Daily Savings";
    case "combined":
      return "Savings";
  }
}

export function savingsTrendLineColor(latestValue: number): string {
  return latestValue >= 0 ? "#2e7d32" : "#d32f2f";
}

