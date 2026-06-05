import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { ReactNode } from "react";

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  minWidth?: number;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  minWidth = 180,
}: FilterSelectProps) {
  return (
    <FormControl size="small" sx={{ minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function FilterRow({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
      {children}
    </Box>
  );
}
