import React, { lazy } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const Live = lazy(() => import("../pages/admin/Live/Live.jsx"));
const Users = lazy(() => import("@/pages/admin/Users/Users"));
const Vehicles = lazy(() => import("@/pages/admin/Vehicles/Vehicles"));
const Violations = lazy(() => import("@/pages/admin/Violations/Violations"));
const Reports = lazy(() => import("@/pages/admin/Reports/Reports"));
const SoundDetection = lazy(() => import("@/pages/admin/SoundDetection/SoundDetection"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const Help = lazy(() => import("@/pages/admin/Help/Help"));

const adminRoutes = [
  <Route
    key="admin-dashboard"
    path="/admin/dashboard"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Dashboard />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-Live"
    path="/admin/live"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Live />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-users"
    path="/admin/users"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Users />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-manage-vehicles"
    path="/admin/vehicles"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Vehicles />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-manage-violations"
    path="/admin/violations"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Violations />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-reports"
    path="/admin/reports"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Reports />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-help"
    path="/admin/help"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <Help />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-sound-detection"
    path="/admin/sound-detection"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <SoundDetection />
      </React.Suspense>
    }
  />,
  <Route
    key="admin-profile"
    path="/admin/profile"
    element={
      <React.Suspense fallback={<div>Loading...</div>}>
        <ProfileEdit />
      </React.Suspense>
    }
  />,
];

export default adminRoutes;
