/** Distinct fill colors for map markers and legend (stable per vehicle_id). */
export const VEHICLE_COLOR_PALETTE = [
  "#1976d2",
  "#9c27b0",
  "#00acc1",
  "#43a047",
  "#ef6c00",
  "#d81b60",
  "#5e35b1",
  "#fbc02d",
  "#00897b",
  "#6d4c41",
] as const;

/** Deterministic vehicle identity color — same id always maps to the same palette entry. */
export function getVehicleColor(vehicleId: string): string {
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return VEHICLE_COLOR_PALETTE[Math.abs(hash) % VEHICLE_COLOR_PALETTE.length];
}
