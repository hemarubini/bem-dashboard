import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  SAVINGS_ANALYSIS_OPTIONS,
  type SavingsViewMode,
} from "@/lib/costHelpers";

interface SavingsAnalysisToggleProps {
  value: SavingsViewMode;
  onChange: (mode: SavingsViewMode) => void;
}

const COMPACT_LABELS: Record<SavingsViewMode, string> = {
  monthly: "Monthly ₹",
  daily: "Daily ₹",
  combined: "Combined",
};

/** Savings Analysis control — segmented toggle on wide screens, dropdown on narrow. */
export function SavingsAnalysisToggle({
  value,
  onChange,
}: SavingsAnalysisToggleProps) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));

  if (compact) {
    return (
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="savings-analysis-label">Savings Analysis</InputLabel>
        <Select
          labelId="savings-analysis-label"
          label="Savings Analysis"
          value={value}
          onChange={(e) => onChange(e.target.value as SavingsViewMode)}
        >
          {SAVINGS_ANALYSIS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mb={0.5}
        lineHeight={1.2}
      >
        Savings Analysis
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: SavingsViewMode | null) => {
          if (next) onChange(next);
        }}
        aria-label="Savings analysis"
        sx={{
          flexWrap: "wrap",
          "& .MuiToggleButton-root": {
            px: 1.25,
            py: 0.5,
            fontSize: "0.75rem",
            textTransform: "none",
          },
        }}
      >
        {SAVINGS_ANALYSIS_OPTIONS.map((o) => (
          <ToggleButton key={o.value} value={o.value} aria-label={o.label}>
            {COMPACT_LABELS[o.value]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
