import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import ElectricCarIcon from "@mui/icons-material/ElectricCar";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import RouteIcon from "@mui/icons-material/Route";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BuildIcon from "@mui/icons-material/Build";
import MapIcon from "@mui/icons-material/Map";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BemLogo } from "./BemLogo";

const DRAWER_WIDTH = 260;

const navItems = [
  { to: "/", label: "Fleet Overview", icon: <DashboardIcon /> },
  { to: "/lng", label: "LNG Fleet", icon: <LocalGasStationIcon /> },
  { to: "/ev", label: "EV Fleet", icon: <ElectricCarIcon /> },
  { to: "/alerts", label: "Alerts", icon: <NotificationsActiveIcon /> },
  { to: "/trips", label: "Trips", icon: <RouteIcon /> },
  { to: "/vehicle", label: "Vehicle Details", icon: <DirectionsCarIcon /> },
  { to: "/cost", label: "Cost Analytics", icon: <AttachMoneyIcon /> },
  { to: "/dtc", label: "DTC Analytics", icon: <BuildIcon /> },
  { to: "/map", label: "Fleet Map", icon: <MapIcon /> },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "primary.main",
          boxShadow: "0 1px 4px rgba(10,22,40,0.08)",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <BemLogo variant="dark" height={48} layout="header" />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            mt: { xs: "64px", sm: "72px" },
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === "/"}
              selected={
                item.to === "/vehicle"
                  ? location.pathname.startsWith("/vehicle")
                  : location.pathname === item.to
              }
              sx={{
                color: "inherit",
                "&.Mui-selected": { color: "#fff" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: { xs: "64px", sm: "72px" },
          ml: 0,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          bgcolor: "background.default",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
