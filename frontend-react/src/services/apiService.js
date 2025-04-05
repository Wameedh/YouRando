import axios from "axios";

// Configure Axios instance for API calls
// Use environment variable for API base URL, fallback to localhost
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000", // Default to backend port
  withCredentials: true, // Important for sending/receiving session cookies
});

// Interceptors can be added here later for global error handling or token injection

const apiService = {
  /**
   * Checks the user's authentication status with the backend.
   * @returns {Promise<object>} Promise resolving to { isAuthenticated: boolean, user: object | null }
   */
  async checkAuthStatus() {
    try {
      const response = await apiClient.get("/api/user/status");
      return response.data;
    } catch (error) {
      console.error("API Service: Error checking auth status", error);
      // Return a default unauthenticated state on error
      return { isAuthenticated: false, user: null };
    }
  },

  /**
   * Logs the user out via the backend API.
   * @returns {Promise<object>} Promise resolving to the backend response.
   */
  async logout() {
    try {
      const response = await apiClient.post("/auth/logout");
      return response.data;
    } catch (error) {
      console.error("API Service: Error during logout", error);
      throw error; // Re-throw error to be handled by the calling component
    }
  },

  /**
   * Fetches video recommendations for the logged-in user.
   * @returns {Promise<Array<object>>} Promise resolving to an array of video objects.
   */
  async getRecommendations() {
    try {
      const response = await apiClient.get("/api/recommendations");
      // Ensure we always return an array, even if backend sends something else unexpectedly
      return Array.isArray(response.data?.videos) ? response.data.videos : [];
    } catch (error) {
      console.error("API Service: Error fetching recommendations", error);
      // Handle specific errors (like 401 Unauthorized) or re-throw
      if (error.response?.status === 401) {
        // Handle unauthorized access, e.g., redirect to login
        console.warn("Unauthorized access attempt for recommendations.");
        // Maybe trigger a logout or redirect globally here in a real app
      }
      throw error; // Re-throw for component-level handling
    }
  },

  /**
   * Fetches the user's current settings.
   * @returns {Promise<object>} Promise resolving to the settings object.
   */
  async getSettings() {
    try {
      const response = await apiClient.get("/api/settings");
      return response.data.settings || {}; // Return empty object if no settings
    } catch (error) {
      console.error("API Service: Error fetching settings", error);
      throw error;
    }
  },

  /**
   * Updates the user's settings.
   * @param {object} settingsData - The settings object to save.
   * @returns {Promise<object>} Promise resolving to the updated settings object.
   */
  async updateSettings(settingsData) {
    try {
      const response = await apiClient.post("/api/settings", settingsData);
      return response.data.settings || {};
    } catch (error) {
      console.error("API Service: Error updating settings", error);
      throw error;
    }
  },

  /**
   * Uploads the watch history file.
   * @param {File} file - The JSON file from Google Takeout.
   * @returns {Promise<object>} Promise resolving to the backend response.
   */
  async uploadWatchHistory(file) {
    const formData = new FormData();
    formData.append("historyFile", file); // Field name must match backend (upload.single)

    try {
      const response = await apiClient.post(
        "/api/user/watch-history/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("API Service: Error uploading history file", error);
      // Provide more specific feedback if possible
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};

export default apiService;
