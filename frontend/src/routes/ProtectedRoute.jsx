import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchUserProfile } from "@/redux/slices/userSlice";

const ProtectedRoute = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = useSelector((state) => state.user.role);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      dispatch(fetchUserProfile())
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching profile:", err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [dispatch, token]);

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check if admin is trying to access user routes
  if (userRole === "admin" && location.pathname.startsWith("/user")) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Check if user is trying to access admin routes
  if (userRole === "user" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
