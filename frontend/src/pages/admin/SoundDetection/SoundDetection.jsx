import React, { useEffect, useState, useRef } from "react";
import { Box, Button, Typography, Paper, List, ListItem, ListItemText, Snackbar, Alert } from "@mui/material";
import Sidebar from "@/components/organisms/Sidebar";
import Header from "@/components/organisms/Header";
import api from "@/utils/api";

const SoundDetection = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((s) => !s);

  const prevRef = useRef(0);
  const initialLoaded = useRef(false);

  const fetchEvents = async () => {
    if (!initialLoaded.current) setLoading(true);
    try {
      const [vRes, fRes] = await Promise.allSettled([
        api.get("/violations"),
        api.get("/horn-events"),
      ]);

      const violations = vRes.status === "fulfilled" ? vRes.value.data || [] : [];
      const files = fRes.status === "fulfilled" ? fRes.value.data || [] : [];

      // Merge arrays, prefer DB violations but include file-origin events
      const merged = [...violations, ...files];

        // Deduplicate by plate + detected_at (ignore detector filename)
        const seen = new Set();
          const dedup = merged.filter((e) => {
          // normalize placeholder UNKNOWN-... to test plate ABC-1234 for easier testing
          let plate = e.plate_number || "";
          if (plate.startsWith && plate.startsWith("UNKNOWN-")) plate = "ABC-1234";
          const key = plate + "::" + (e.detected_at || "");
          if (seen.has(key)) return false;
          seen.add(key);
          // attach normalized plate for rendering
          e._norm_plate = plate;
          return true;
        });

      // Filter events that have a decibel level (likely horn/noise events), sort newest first
      const noiseEvents = dedup
        .filter((e) => e.decibel_level && e.decibel_level > 0)
        .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
        .slice(0, 50);

      // notify if new events arrived
      if (noiseEvents.length > prevRef.current) {
        const newest = noiseEvents[0];
        setLatestEvent(newest);
        setShowAlert(true);
      }

      prevRef.current = noiseEvents.length;
      setEvents(noiseEvents);
    } catch (err) {
      console.error("Failed to load detection events", err);
    } finally {
      if (!initialLoaded.current) {
        setLoading(false);
        initialLoaded.current = true;
      }
    }
  };

  useEffect(() => {
    // initial fetch
    fetchEvents();

    // poll every 5 seconds
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, []);

  const [showAlert, setShowAlert] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} role="admin" />
      <Header onToggleSidebar={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: `calc(100% - 240px)` },
          mt: { xs: "64px", md: "64px" },
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
          Sound Detection (Honk)
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            This page shows recent horn / noise detection events detected by
            the prediction pipeline. Events with a recorded decibel level are
            shown below.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Make sure the prediction service is running and writing events to
            the backend/violation store.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">Recent Noise Events</Typography>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : events.length === 0 ? (
            <Typography>No noise events found.</Typography>
          ) : (
            <List>
              {events.map((ev) => (
                <ListItem key={ev._id || ev.id} divider>
                  <ListItemText
                    primary={`Detected: ${ev._norm_plate || ev.plate_number ? ev._norm_plate || ev.plate_number : "Unknown"} — ${ev.speed || 0} km/h`}
                    secondary={`Decibel: ${ev.decibel_level || "-"} — ${new Date(ev.detected_at).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
          <Snackbar
            open={showAlert}
            autoHideDuration={4000}
            onClose={() => setShowAlert(false)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
              <Alert onClose={() => setShowAlert(false)} severity="info" sx={{ width: "100%" }}>
              New honk detected{latestEvent ? ` — ${latestEvent._norm_plate || latestEvent.plate_number || 'N/A'}` : ''}
            </Alert>
          </Snackbar>
      </Box>
    </Box>
  );
};

export default SoundDetection;
