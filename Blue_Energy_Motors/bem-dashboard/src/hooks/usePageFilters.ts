import { useMemo, useState } from "react";
import {
  type TimeRangeKey,
  type VehicleTypeFilter,
  getTimeRangeBounds,
  vehiclesForType,
} from "@/config/constants";

export function usePageFilters(defaultRange: TimeRangeKey = "1h") {
  const [vehicleType, setVehicleType] = useState<VehicleTypeFilter>("All");
  const [vehicle, setVehicle] = useState("All Vehicles");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(defaultRange);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const bounds = useMemo(
    () => getTimeRangeBounds(timeRange, customStart, customEnd),
    [timeRange, customStart, customEnd]
  );

  const vehicleIds = useMemo(() => {
    const base = vehiclesForType(vehicleType);
    if (vehicle === "All Vehicles") return [...base];
    return [vehicle];
  }, [vehicleType, vehicle]);

  const vehicleOptions = useMemo(() => {
    const ids = vehiclesForType(vehicleType);
    return [
      { value: "All Vehicles", label: "All Vehicles" },
      ...ids.map((id) => ({ value: id, label: id })),
    ];
  }, [vehicleType]);

  const onVehicleTypeChange = (v: VehicleTypeFilter) => {
    setVehicleType(v);
    setVehicle("All Vehicles");
  };

  const filterDeps = [
    vehicleType,
    vehicle,
    timeRange,
    customStart,
    customEnd,
  ];

  return {
    vehicleType,
    setVehicleType: onVehicleTypeChange,
    vehicle,
    setVehicle,
    timeRange,
    setTimeRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    vehicleIds,
    vehicleOptions,
    since: bounds.start,
    until: bounds.end,
    sinceIso: bounds.start.toISOString(),
    filterDeps,
  };
}
