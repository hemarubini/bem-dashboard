import { parseJsonArray } from "./parsers";
import { dtcDescription } from "./dtcHelpers";

export interface FaultAggregateRow {
  vehicle_id: string;
  code: string;
  description: string;
  firstSeen: string;
  lastSeen: string;
  severity: string;
  source: "dtc" | "fault";
}

function codeSeverity(code: string, source: "dtc" | "fault"): string {
  if (source === "fault") return "WARNING";
  if (code === "P0217" || code === "P0520" || code === "P0087") return "CRITICAL";
  return "WARNING";
}

export function aggregateFaultRows(
  rows: {
    timestamp: string;
    vehicle_id: string;
    dtc_codes?: string;
    fault_codes?: string;
  }[]
): FaultAggregateRow[] {
  const map = new Map<string, FaultAggregateRow>();

  for (const row of rows) {
    const dtcList = parseJsonArray(row.dtc_codes);
    const faultList = parseJsonArray(row.fault_codes);

    for (const code of dtcList) {
      const key = `${row.vehicle_id}:dtc:${code}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          vehicle_id: row.vehicle_id,
          code,
          description: dtcDescription(code),
          firstSeen: row.timestamp,
          lastSeen: row.timestamp,
          severity: codeSeverity(code, "dtc"),
          source: "dtc",
        });
      } else {
        if (new Date(row.timestamp) < new Date(existing.firstSeen))
          existing.firstSeen = row.timestamp;
        if (new Date(row.timestamp) > new Date(existing.lastSeen))
          existing.lastSeen = row.timestamp;
      }
    }

    for (const code of faultList) {
      const key = `${row.vehicle_id}:fault:${code}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          vehicle_id: row.vehicle_id,
          code,
          description: `EV fault ${code}`,
          firstSeen: row.timestamp,
          lastSeen: row.timestamp,
          severity: codeSeverity(code, "fault"),
          source: "fault",
        });
      } else {
        if (new Date(row.timestamp) < new Date(existing.firstSeen))
          existing.firstSeen = row.timestamp;
        if (new Date(row.timestamp) > new Date(existing.lastSeen))
          existing.lastSeen = row.timestamp;
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
}

export function dtcFrequency(rows: FaultAggregateRow[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.code, (counts.get(r.code) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}
