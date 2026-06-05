/** ~17 m per step at Mumbai latitudes — separates stacked demo GPS points. */
export const MAP_SPREAD_STEP_DEG = 0.00015;

/** Group vehicles sharing the same rounded coordinate (typical duplicate telemetry). */
const COORD_KEY_DECIMALS = 5;

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(COORD_KEY_DECIMALS)},${lon.toFixed(COORD_KEY_DECIMALS)}`;
}

export type VehicleWithDisplayCoords<T extends { id: string; lat: number; lon: number }> = T & {
  displayLat: number;
  displayLon: number;
  /** True when marker position was nudged for visibility (true GPS unchanged on `lat`/`lon`). */
  displayOffset: boolean;
};

/**
 * When multiple vehicles share the same GPS, apply a small deterministic offset
 * so Leaflet markers do not stack invisibly. True coordinates stay on `lat`/`lon`.
 */
export function vehiclesWithMapDisplayCoords<T extends { id: string; lat: number; lon: number }>(
  vehicles: T[]
): VehicleWithDisplayCoords<T>[] {
  const groups = new Map<string, T[]>();

  for (const v of vehicles) {
    const key = coordKey(v.lat, v.lon);
    const list = groups.get(key) ?? [];
    list.push(v);
    groups.set(key, list);
  }

  const result: VehicleWithDisplayCoords<T>[] = [];

  for (const group of groups.values()) {
    group.sort((a, b) => a.id.localeCompare(b.id));
    group.forEach((v, index) => {
      const offset = group.length > 1 ? index * MAP_SPREAD_STEP_DEG : 0;
      result.push({
        ...v,
        displayLat: v.lat + offset,
        displayLon: v.lon + offset,
        displayOffset: offset > 0,
      });
    });
  }

  return result.sort((a, b) => a.id.localeCompare(b.id));
}
