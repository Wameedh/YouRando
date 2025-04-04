document.addEventListener("DOMContentLoaded", () => {
  const saveSettingsBtn = document.getElementById("save-settings");
  const deleteDataBtn = document.getElementById("delete-data");
  const exportDataBtn = document.getElementById("export-data");
  const discoveryLevelSelect = document.getElementById("discovery-level");
  const excludeCategoryCheckboxes = document.querySelectorAll(
    'input[name="exclude-category"]'
  );

  // Save settings
  saveSettingsBtn.addEventListener("click", () => {
    // Gather settings
    const settings = {
      discoveryLevel: discoveryLevelSelect.value,
      excludedCategories: Array.from(excludeCategoryCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value),
    };

    // Send to server
    fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to save settings");
        }
        return response.json();
      })
      .then((data) => {
        // Show success message
        showNotification("Settings saved successfully", "success");
      })
      .catch((error) => {
        console.error("Error saving settings:", error);
        showNotification("Failed to save settings", "error");
      });
  });

  // Delete user data
  deleteDataBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to delete all your data? This cannot be undone."
      )
    ) {
      fetch("/api/user/data", {
        method: "DELETE",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete data");
          }
          return response.json();
        })
        .then((data) => {
          showNotification("Data deleted successfully", "success");
        })
        .catch((error) => {
          console.error("Error deleting data:", error);
          showNotification("Failed to delete data", "error");
        });
    }
  });

  // Export user data
  exportDataBtn.addEventListener("click", () => {
    fetch("/api/user/data/export")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to export data");
        }
        return response.json();
      })
      .then((data) => {
        // Create a downloadable JSON file
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri =
          "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

        const exportFileName = `yourando-data-${new Date()
          .toISOString()
          .slice(0, 10)}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileName);
        linkElement.click();
      })
      .catch((error) => {
        console.error("Error exporting data:", error);
        showNotification("Failed to export data", "error");
      });
  });

  // Notification helper
  function showNotification(message, type = "info") {
    // Check if notification container exists
    let notificationContainer = document.querySelector(
      ".notification-container"
    );

    if (!notificationContainer) {
      // Create container if it doesn't exist
      notificationContainer = document.createElement("div");
      notificationContainer.className = "notification-container";
      document.body.appendChild(notificationContainer);
    }

    // Create notification
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      notification.remove();
    });

    notification.appendChild(closeBtn);
    notificationContainer.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
});
