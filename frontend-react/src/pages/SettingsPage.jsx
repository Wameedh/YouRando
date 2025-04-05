import React, { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SettingsPage.css"; // We'll create/update this CSS file

function SettingsPage({ user, onSettingsUpdate }) {
  const [settings, setSettings] = useState({
    discoveryLevel: "moderate",
    excludedCategories: [],
  });
  const [initialSettings, setInitialSettings] = useState(null); // Store initial settings to detect changes
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    message: "",
    type: "info",
  }); // type: info, success, error
  const [uploading, setUploading] = useState(false);

  // Fetch initial settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentSettings = await apiService.getSettings();
      setSettings(currentSettings);
      setInitialSettings(JSON.parse(JSON.stringify(currentSettings))); // Deep copy for comparison
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("Could not load settings. Please try refreshing.");
      setInitialSettings({}); // Set to empty on error to avoid comparison issues
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target;
    setSettings((prevSettings) => {
      const currentExclusions = prevSettings.excludedCategories || [];
      let newExclusions;
      if (checked) {
        newExclusions = [...currentExclusions, value];
      } else {
        newExclusions = currentExclusions.filter((cat) => cat !== value);
      }
      return { ...prevSettings, excludedCategories: newExclusions };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setUploadStatus({ message: "", type: "info" }); // Clear upload status on save attempt
    try {
      const updatedSettingsData = await apiService.updateSettings(settings);
      setSettings(updatedSettingsData);
      setInitialSettings(JSON.parse(JSON.stringify(updatedSettingsData))); // Update initial settings after save
      setUploadStatus({
        message: "Settings saved successfully!",
        type: "success",
      });
      // Update user object in App.jsx if necessary
      onSettingsUpdate((prevUser) => ({
        ...prevUser,
        settings: updatedSettingsData,
      }));
      setTimeout(() => setUploadStatus({ message: "", type: "info" }), 3000); // Clear message after 3s
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err.message || "Could not save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Basic validation (can add more checks)
      if (
        !selectedFile.name.toLowerCase().endsWith(".json") ||
        selectedFile.type !== "application/json"
      ) {
        setUploadStatus({
          message:
            "Invalid file type. Please upload the .json file from Google Takeout.",
          type: "error",
        });
        setFile(null);
        event.target.value = null; // Clear the file input visually
        return;
      }
      if (selectedFile.size > 30 * 1024 * 1024) {
        // Match backend limit
        setUploadStatus({
          message: "File is too large (Max 30MB).",
          type: "error",
        });
        setFile(null);
        event.target.value = null;
        return;
      }
      setFile(selectedFile);
      setUploadStatus({ message: "", type: "info" }); // Clear previous status on new selection
    } else {
      setFile(null);
    }
  };

  const handleHistoryUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setUploadStatus({
        message: "Please select a file first.",
        type: "error",
      });
      return;
    }
    setUploading(true);
    setError(null); // Clear previous errors
    setUploadStatus({ message: "Uploading...", type: "info" });

    try {
      const response = await apiService.uploadWatchHistory(file);
      setUploadStatus({
        message: response.message || "Upload successful!",
        type: "success",
      });
      // Update user state in App.jsx immediately
      onSettingsUpdate((prevUser) => ({
        ...prevUser,
        hasHistoryAccess: true,
        lastHistoryUpload: response.lastUpdate,
      }));
      setFile(null); // Clear file input
      document.getElementById("historyFile").value = null; // Reset file input field
      setTimeout(() => setUploadStatus({ message: "", type: "info" }), 5000); // Clear message after 5s
    } catch (err) {
      console.error("History upload failed:", err);
      setUploadStatus({
        message:
          err.message || "Upload failed. Please check the file or try again.",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  // Check if settings have changed from initial load
  const settingsChanged =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // TODO: Replace with actual YouTube categories fetched from API if possible
  // These should ideally come from the backend or a shared config
  const availableCategories = [
    { id: "1", name: "Film & Animation" },
    { id: "2", name: "Autos & Vehicles" },
    { id: "10", name: "Music" },
    { id: "15", name: "Pets & Animals" },
    { id: "17", name: "Sports" },
    { id: "19", name: "Travel & Events" },
    { id: "20", name: "Gaming" },
    { id: "22", name: "People & Blogs" },
    { id: "23", name: "Comedy" },
    { id: "24", name: "Entertainment" },
    { id: "25", name: "News & Politics" },
    { id: "26", name: "Howto & Style" },
    { id: "27", name: "Education" },
    { id: "28", name: "Science & Technology" },
    { id: "29", name: "Nonprofits & Activism" },
  ];

  return (
    <div className="settings-page">
      <h2>Settings</h2>
      {error && <p className="error-message">Error: {error}</p>}
      {/* Display non-error status messages */}
      {uploadStatus.message && uploadStatus.type !== "error" && (
        <p className={`status-message ${uploadStatus.type}`}>
          {uploadStatus.message}
        </p>
      )}

      <form onSubmit={handleSave} className="settings-form">
        <h3>Recommendation Preferences</h3>
        <div className="form-group">
          <label htmlFor="discoveryLevel">Discovery Level:</label>
          <select
            id="discoveryLevel"
            name="discoveryLevel"
            value={settings.discoveryLevel || "moderate"}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="low">Focused (More like your usual)</option>
            <option value="moderate">Balanced (Some variety)</option>
            <option value="high">Exploratory (Maximum diversity)</option>
          </select>
        </div>

        <div className="form-group">
          <h4>Exclude Categories:</h4>
          <div className="category-checkbox-group">
            {availableCategories.map((category) => (
              <div key={category.id} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  name="excludedCategories"
                  value={category.id} // Store category ID for potential future use
                  checked={(settings.excludedCategories || []).includes(
                    category.id
                  )}
                  onChange={handleCategoryChange}
                />
                <label htmlFor={`category-${category.id}`}>
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSaving || !settingsChanged}>
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      <hr className="section-divider" />

      <div className="settings-section">
        <h3>Watch History (via Google Takeout)</h3>
        {user.hasHistoryAccess && (
          <p className="history-status">
            Watch history uploaded on:{" "}
            {user.lastHistoryUpload
              ? new Date(user.lastHistoryUpload).toLocaleString()
              : "N/A"}
          </p>
        )}
        <p className="history-info">
          Upload your YouTube watch history (<code>watch-history.json</code>{" "}
          from Google Takeout) to improve recommendations and avoid seeing
          previously watched videos.
        </p>
        <form onSubmit={handleHistoryUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="historyFile">
              Select <code>watch-history.json</code>:
            </label>
            <input
              type="file"
              id="historyFile"
              name="historyFile"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="form-file-input"
            />
          </div>
          <button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload History"}
          </button>
          {/* Display upload errors specifically */}
          {uploadStatus.message && uploadStatus.type === "error" && (
            <p className="error-message upload-error">{uploadStatus.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;
