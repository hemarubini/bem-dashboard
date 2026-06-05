import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { FleetMapVehicle } from "@/lib/fleetMapHelpers";

const cardSx = {
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "12px",
  overflow: "hidden",
} as const;

function VehicleColorChip({ v }: { v: FleetMapVehicle }) {
  return (
    <Chip
      size="small"
      label={v.id}
      sx={{
        fontWeight: 600,
        borderRadius: "8px",
        "& .MuiChip-label": { px: 1 },
      }}
      icon={
        <Box
          component="span"
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: v.vehicleColor,
            border: `2px solid ${v.statusBorderColor}`,
            ml: 0.5,
          }}
        />
      }
    />
  );
}

interface VehicleColorLegendProps {
  vehicles: FleetMapVehicle[];
}

/** Collapsible vehicle identity colors — placed below the map. */
export function VehicleColorLegend({ vehicles }: VehicleColorLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const lng = vehicles.filter((v) => v.isLNG);
  const ev = vehicles.filter((v) => !v.isLNG);

  if (vehicles.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ ...cardSx, mb: 2 }}>
      <Accordion
        expanded={expanded}
        onChange={(_, open) => setExpanded(open)}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: "transparent",
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ px: 2, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}
        >
          <Typography variant="subtitle2" color="primary" fontWeight={700}>
            Vehicle Color Legend ({vehicles.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
          <Box
            sx={{
              maxHeight: 140,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {lng.length > 0 && (
              <Box mb={ev.length > 0 ? 1.5 : 0}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                  LNG
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75}>
                  {lng.map((v) => (
                    <VehicleColorChip key={v.id} v={v} />
                  ))}
                </Box>
              </Box>
            )}
            {ev.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                  EV
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.75}>
                  {ev.map((v) => (
                    <VehicleColorChip key={v.id} v={v} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Fill = vehicle identity · Ring = alert status
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
