import { TextField } from "@mui/material";
import {
  TIME_RANGE_OPTIONS,
  type TimeRangeKey,
  type VehicleTypeFilter,
} from "@/config/constants";
import { FilterRow, FilterSelect } from "./FilterBar";

interface GlobalFilterBarProps {
  vehicleType: VehicleTypeFilter;
  onVehicleTypeChange: (v: VehicleTypeFilter) => void;
  vehicle: string;
  onVehicleChange: (v: string) => void;
  vehicleOptions: { value: string; label: string }[];
  timeRange: TimeRangeKey;
  onTimeRangeChange: (v: TimeRangeKey) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (v: string) => void;
  onCustomEndChange?: (v: string) => void;
  showVehicleType?: boolean;
  extra?: React.ReactNode;
}

export function GlobalFilterBar({
  vehicleType,
  onVehicleTypeChange,
  vehicle,
  onVehicleChange,
  vehicleOptions,
  timeRange,
  onTimeRangeChange,
  customStart = "",
  customEnd = "",
  onCustomStartChange,
  onCustomEndChange,
  showVehicleType = true,
  extra,
}: GlobalFilterBarProps) {
  return (
    <FilterRow>
      {showVehicleType && (
        <FilterSelect
          label="Vehicle Type"
          value={vehicleType}
          options={[
            { value: "All", label: "All" },
            { value: "LNG", label: "LNG" },
            { value: "EV", label: "EV" },
          ]}
          onChange={(v) => onVehicleTypeChange(v as VehicleTypeFilter)}
        />
      )}
      <FilterSelect
        label="Vehicle"
        value={vehicle}
        options={vehicleOptions}
        onChange={onVehicleChange}
        minWidth={200}
      />
      <FilterSelect
        label="Time Range"
        value={timeRange}
        options={TIME_RANGE_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
        onChange={(v) => onTimeRangeChange(v as TimeRangeKey)}
        minWidth={200}
      />
      {timeRange === "custom" && (
        <>
          <TextField
            size="small"
            label="Start"
            type="datetime-local"
            value={customStart}
            onChange={(e) => onCustomStartChange?.(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="End"
            type="datetime-local"
            value={customEnd}
            onChange={(e) => onCustomEndChange?.(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </>
      )}
      {extra}
    </FilterRow>
  );
}
