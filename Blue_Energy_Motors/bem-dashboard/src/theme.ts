import { createTheme } from "@mui/material/styles";

/** Blue Energy Motors brand — navy sidebar, electric blue accents */
export const bemTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0a1628",
      dark: "#050d18",
      light: "#1e3a5f",
    },
    secondary: {
      main: "#00a8e8",
      light: "#33c4f0",
      dark: "#0077a8",
    },
    background: {
      default: "#f4f6f9",
      paper: "#ffffff",
    },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#d32f2f" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0a1628",
          color: "#ffffff",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 168, 232, 0.25)",
            borderLeft: "3px solid #00a8e8",
          },
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.08)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(10,22,40,0.08)",
          border: "1px solid rgba(10,22,40,0.06)",
        },
      },
    },
  },
});

export const chartColors = {
  primary: "#00a8e8",
  secondary: "#1e3a5f",
  critical: "#d32f2f",
  warning: "#ed6c02",
  success: "#2e7d32",
};
