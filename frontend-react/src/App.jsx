import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import apiService from "./services/apiService"; // We'll create this next
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import Header from "./components/Header"; // Placeholder
import LoadingSpinner from "./components/LoadingSpinner"; // Placeholder
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const navigate = useNavigate();

  // Check auth status on initial load
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.checkAuthStatus();
        if (data.isAuthenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      navigate("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show an error message to the user
    }
  };

  if (isLoading) {
    return <LoadingSpinner />; // Show loading indicator during initial check
  }

  return (
    <div className="App">
      {user && <Header user={user} onLogout={handleLogout} />}{" "}
      {/* Show header only if logged in */}
      <main>
        <Routes>
          <Route
            path="/login"
            element={
              !user ? <LoginPage /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <DashboardPage user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              user ? (
                <SettingsPage user={user} onSettingsUpdate={setUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Default route: Redirect to dashboard if logged in, else to login */}
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
