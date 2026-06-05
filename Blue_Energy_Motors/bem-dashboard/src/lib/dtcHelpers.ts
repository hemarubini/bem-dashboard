import { parseJsonArray } from "./parsers";

const DTC_DESCRIPTIONS: Record<string, string> = {
  P0217: "Engine coolant over-temperature",
  P0128: "Coolant thermostat malfunction",
  P0520: "Engine oil pressure sensor",
  P0524: "Engine oil pressure too low",
  P0300: "Random/multiple cylinder misfire",
  P0171: "System too lean (bank 1)",
  P0087: "Fuel rail pressure too low",
};

export function dtcDescription(code: string): string {
  return DTC_DESCRIPTIONS[code] ?? `Diagnostic code ${code}`;
}

export interface DtcTableRow {
  timestamp: string;
  vehicle_id: string;
  code: string;
  description: string;
  severity: string;
}

export function expandDtcRows(
  rows: { timestamp: string; vehicle_id: string; dtc_codes: string }[]
): DtcTableRow[] {
  const out: DtcTableRow[] = [];
  for (const row of rows) {
    const codes = parseJsonArray(row.dtc_codes);
    for (const code of codes) {
      const sev =
        code === "P0217" || code === "P0520" || code === "P0087"
          ? "CRITICAL"
          : "WARNING";
      out.push({
        timestamp: row.timestamp,
        vehicle_id: row.vehicle_id,
        code,
        description: dtcDescription(code),
        severity: sev,
      });
    }
  }
  return out.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function countActiveDtcs(latestRecords: { dtc_codes?: string }[]): number {
  let count = 0;
  const seen = new Set<string>();
  for (const r of latestRecords) {
    const codes = parseJsonArray(r.dtc_codes);
    for (const c of codes) {
      if (!seen.has(c)) {
        seen.add(c);
        count++;
      }
    }
  }
  return count;
}
