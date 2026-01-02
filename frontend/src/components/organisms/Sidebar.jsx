import { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Videocam as VideocamIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  Help as HelpIcon,
  Hearing as HearingIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = ({ open = true, onClose, role, title = "App", logo = "/img/logo.png" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [collapsed, setCollapsed] = useState(false);

  const drawerWidth = collapsed ? 70 : 240;

  const toggleDrawer = () => {
    if (collapsedProp != undefined) {
      setCollapsedProp((prev) => !prev)
    }
    setCollapsed((prev) => !prev);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Define nav items based on the role (admin or user)
  const adminNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Live Cam', icon: <VideocamIcon />, path: '/admin/live' },
    { text: 'Manage Violations', icon: <WarningIcon />, path: '/admin/violations' },
    { text: 'Manage Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/admin/reports' },
    { text: 'Sound Detection', icon: <HearingIcon />, path: '/admin/sound-detection' },
    { text: 'Help', icon: <HelpIcon />, path: '/admin/help' },
  ];

  const userNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/user/dashboard' },
    { text: 'Violations', icon: <WarningIcon />, path: '/user/violations' },
    { text: 'Sound Detection', icon: <HearingIcon />, path: '/user/sound-detection' },
    { text: 'Help', icon: <HelpIcon />, path: '/user/help' },
  ];

  const navItems = role === "admin" ? adminNavItems : userNavItems;

  const drawerContent = (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          p: 2,
          minHeight: "64px",
        }}
      >
        {!collapsed && (
          <Typography variant="h6" fontWeight="bold" sx={{ display: "flex", alignItems: "center" }}>
            Roadsense
          </Typography>
        )}
        <IconButton onClick={toggleDrawer} sx={{ color: "white" }}>
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
      <List sx={{ px: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItem disablePadding key={item.text} sx={{ display: "block", mb: 1 }}>
            <Tooltip title={collapsed ? item.text : ""} placement="right">
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: collapsed ? "center" : "initial",
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 1.5,
                  backgroundColor: isActive(item.path)
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon
                  sx={{
                    color: "white",
                    minWidth: 0,
                    mr: collapsed ? "auto" : 2,
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: collapsed ? 0 : 1,
                    "& .MuiTypography-root": {
                      fontWeight: isActive(item.path) ? "bold" : "normal",
                    },
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </>
  );

  useEffect(() => {
    setCollapsed(false); // Reset collapse when mobile
  }, [isMobile]);

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 240,
              backgroundColor: "#0d1b2a",
              color: "white",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              backgroundColor: "#0d1b2a",
              color: "white",
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
