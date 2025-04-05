import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import VideoCard from "../components/VideoCard";
import "./DashboardPage.css";

function DashboardPage({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    setRecommendations([]); // Clear previous recommendations on refresh
    try {
      const videos = await apiService.getRecommendations();
      setRecommendations(videos);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      let errorMessage =
        "Could not load recommendations. Please try again later.";
      // Check for specific backend error messages
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        // Handle specific case of expired credentials
        if (err.response?.status === 401) {
          // TODO: Implement a way to trigger re-authentication globally
          errorMessage += " Your session may have expired.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []); // Fetch on initial mount

  return (
    <div className="dashboard-page">
      <h2>Your Recommendations, {user.name || "User"}!</h2>

      {error && <p className="error-message">Error: {error}</p>}

      <button
        className="refresh-button"
        onClick={fetchRecommendations}
        disabled={isLoading}
      >
        {isLoading ? "Refreshing..." : "Refresh Recommendations"}
      </button>

      {isLoading && recommendations.length === 0 && <LoadingSpinner />}

      {!isLoading && recommendations.length === 0 && !error && (
        <p className="no-results-message">
          No recommendations found. Try refreshing, or upload your watch history
          in Settings for better results.
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations-grid">
          {recommendations.map((video) =>
            video && video.id ? (
              <VideoCard key={video.id} video={video} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
