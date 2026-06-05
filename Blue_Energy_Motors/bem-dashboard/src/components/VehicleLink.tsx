import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function VehicleLink({
  vehicleId,
  onClick,
}: {
  vehicleId: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      component={RouterLink}
      to={`/vehicle/${vehicleId}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      sx={{ fontWeight: 600, color: "secondary.main" }}
    >
      {vehicleId}
    </Link>
  );
}
