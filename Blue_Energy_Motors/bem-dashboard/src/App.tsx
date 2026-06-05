import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { bemTheme } from "./theme";
import { queryClient } from "./lib/queryClient";
import { LastUpdatedProvider } from "./context/LastUpdatedContext";
import { AppLayout } from "./components/AppLayout";
import { FleetOverview } from "./pages/FleetOverview";
import { LNGDashboard } from "./pages/LNGDashboard";
import { EVDashboard } from "./pages/EVDashboard";
import { AlertsDashboard } from "./pages/AlertsDashboard";
import { TripsDashboard } from "./pages/TripsDashboard";
import { VehicleDetails } from "./pages/VehicleDetails";
import { VehicleDetailsIndex } from "./pages/VehicleDetailsIndex";
import { CostAnalytics } from "./pages/CostAnalytics";
import { DTCAnalytics } from "./pages/DTCAnalytics";
import { FleetMap } from "./pages/FleetMap";

export default function App() {
  return (
    <ThemeProvider theme={bemTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LastUpdatedProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<FleetOverview />} />
              <Route path="/lng" element={<LNGDashboard />} />
              <Route path="/ev" element={<EVDashboard />} />
              <Route path="/alerts" element={<AlertsDashboard />} />
              <Route path="/trips" element={<TripsDashboard />} />
              <Route path="/vehicle" element={<VehicleDetailsIndex />} />
              <Route path="/vehicle/:vehicleId" element={<VehicleDetails />} />
              <Route path="/cost" element={<CostAnalytics />} />
              <Route path="/dtc" element={<DTCAnalytics />} />
              <Route path="/map" element={<FleetMap />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </LastUpdatedProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
