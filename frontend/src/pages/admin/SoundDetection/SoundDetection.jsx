import React, { useEffect, useState, useRef } from "react";
import { Box, Button, Typography, Paper, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
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
  const lastShownRef = useRef(null);

  const [showAlert, setShowAlert] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);
  const autoCloseTimer = useRef(null);

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

      // keep count for change detection
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

  // Show popup when the newest event changes
  useEffect(() => {
    if (events.length === 0) return;
    const newest = events[0];
    const key = (newest._norm_plate || newest.plate_number || "") + "::" + (newest.detected_at || "");
    if (lastShownRef.current !== key) {
      lastShownRef.current = key;
      console.log("SoundDetection: newest event changed, showing popup", key, newest);
      setLatestEvent(newest);
      setShowAlert(true);
    }
  }, [events]);

  // auto-close dialog after 5 seconds when shown
  useEffect(() => {
    if (showAlert) {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(() => setShowAlert(false), 5000);
    }
    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    };
  }, [showAlert]);

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
            <Box>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </Box>
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
          <Dialog
            open={showAlert}
            onClose={() => setShowAlert(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{ style: { padding: 20, textAlign: 'center' } }}
          >
            <DialogTitle sx={{ fontSize: 20, fontWeight: 'bold' }}>New Honk Detected</DialogTitle>
            <DialogContent>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {latestEvent ? (latestEvent._norm_plate || latestEvent.plate_number || 'Unknown') : 'Unknown'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Decibel: {latestEvent ? (latestEvent.decibel_level || '-') : '-'} — {latestEvent ? new Date(latestEvent.detected_at).toLocaleString() : ''}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                This dialog will close automatically.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
              <Button onClick={() => setShowAlert(false)}>Close</Button>
            </DialogActions>
          </Dialog>
      </Box>
    </Box>
  );
};

export default SoundDetection;
