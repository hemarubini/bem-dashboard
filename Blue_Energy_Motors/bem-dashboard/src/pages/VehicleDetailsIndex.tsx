import { Navigate } from "react-router-dom";

/** Sidebar link /vehicle → default vehicle */
export function VehicleDetailsIndex() {
  return <Navigate to="/vehicle/LNG-001" replace />;
}
