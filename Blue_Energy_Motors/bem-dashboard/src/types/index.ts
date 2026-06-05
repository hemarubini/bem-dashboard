export interface TelemetryRecord {
  vehicle_id: string;
  timestamp: string;
  vehicle_type?: string;
  engine_temp_c?: string;
  engine_health_score?: string;
  lng_level_pct?: string;
  tank_pressure_bar?: string;
  oil_level_pct?: string;
  speed_kmh?: string;
  soc_pct?: string;
  soh_pct?: string;
  battery_temp_c?: string;
  remaining_range_km?: string;
  cell_voltage_spread_v?: string;
  motor_temp_c?: string;
  dtc_codes?: string;
  fault_codes?: string;
  trip_id?: string;
  cost_per_km_inr?: string;
  engine_temp_rate?: string;
  soc_drop_rate?: string;
  uptime_pct?: string;
  gps_lat?: string;
  gps_lon?: string;
  daily_cost_inr?: string;
  cost_savings_pct?: string;
  distance_km?: string;
  energy_consumption_kwhkm?: string;
  charging_status?: string;
  charging_power_kw?: string;
  charging_time_min?: string;
  [key: string]: string | undefined;
}

export interface AlertRecord {
  vehicle_id: string;
  alert_id: string;
  timestamp: string;
  severity: string;
  channel?: string;
  description: string;
  vehicle_type?: string;
  trip_id?: string;
  acknowledged?: string | boolean;
  dtc_codes?: string;
  engine_temp?: string;
  soc_pct?: string;
  speed_kmh?: string;
}

export interface TripRecord {
  vehicle_id: string;
  trip_id: string;
  vehicle_type?: string;
  distance_km?: string;
  trip_time_min?: string;
  speed_kmh?: string;
  last_updated?: string;
}
