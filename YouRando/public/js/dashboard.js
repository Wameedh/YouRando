document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const refreshBtn = document.getElementById("refresh-btn");
  const categoryFilter = document.getElementById("category-filter");
  const recommendationsContainer = document.getElementById("recommendations");
  const loadingElement = document.getElementById("loading");
  const noResultsElement = document.getElementById("no-results");
  const videoTemplate = document.getElementById("video-template");

  // Modal elements
  const takeoutInfoBtn = document.getElementById("takeout-info-btn");
  const takeoutModal = document.getElementById("takeout-modal");
  const closeModal = document.querySelector(".close-modal");
  const historyUploadForm = document.getElementById("history-upload-form");
  const uploadStatus = document.getElementById("upload-status");

  // Notification elements
  const notificationCloseButtons = document.querySelectorAll(
    ".notification-close"
  );
  const updateHistoryBtn = document.getElementById("update-history-btn");

  // Initial state
  let currentRecommendations = [];
  let filteredRecommendations = [];
  let currentCategory = "";
  let userAccessStatus = null;

  // Hide loading initially
  loadingElement.style.display = "none";

  // Event listeners
  refreshBtn.addEventListener("click", fetchRecommendations);
  categoryFilter.addEventListener("change", filterRecommendations);

  // Notification close buttons
  notificationCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const notification = button.closest(".notification");
      if (notification) {
        notification.style.display = "none";
      }
    });
  });

  // Update history button
  if (updateHistoryBtn) {
    updateHistoryBtn.addEventListener("click", () => {
      // Show the takeout modal when update button is clicked
      if (takeoutModal) {
        takeoutModal.style.display = "block";
      }
    });
  }

  // Modal event listeners
  if (takeoutInfoBtn) {
    takeoutInfoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      takeoutModal.style.display = "block";
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      takeoutModal.style.display = "none";
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === takeoutModal) {
      takeoutModal.style.display = "none";
    }
  });

  // History file upload handling
  if (historyUploadForm) {
    historyUploadForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("history-file");
      const file = fileInput.files[0];

      if (!file) {
        uploadStatus.innerHTML = '<p class="error">Please select a file</p>';
        return;
      }

      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        uploadStatus.innerHTML =
          '<p class="error">Please select a JSON file</p>';
        return;
      }

      uploadWatchHistory(file);
    });
  }

  // Upload watch history file
  function uploadWatchHistory(file) {
    uploadStatus.innerHTML =
      "<p>Uploading and processing your watch history...</p>";

    const formData = new FormData();
    formData.append("history-file", file);

    fetch("/api/user/watch-history/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          uploadStatus.innerHTML = `<p class="success">Successfully processed ${data.processedVideos} videos from your watch history!</p>`;
          // Refresh access status to update UI
          checkAccessStatus();
        } else {
          uploadStatus.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
      })
      .catch((error) => {
        console.error("Upload error:", error);
        uploadStatus.innerHTML =
          '<p class="error">An error occurred during upload</p>';
      });
  }

  // Check user access status
  checkAccessStatus();

  // Initial load
  fetchRecommendations();

  // Check user's access status
  function checkAccessStatus() {
    fetch("/api/user/access-status")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch access status");
        }
        return response.json();
      })
      .then((data) => {
        userAccessStatus = data;
        console.log("User access status:", userAccessStatus);
        updateAccessUI(data);
      })
      .catch((error) => {
        console.error("Error checking access status:", error);
      });
  }

  // Update UI based on access status
  function updateAccessUI(accessData) {
    const historyItems = document.querySelectorAll(".status-item");
    if (historyItems.length >= 3) {
      const historyStatusItem = historyItems[2]; // Third status item is for history

      if (accessData.hasHistoryAccess) {
        historyStatusItem.innerHTML = `
          <span class="status-icon success">✓</span>
          <span class="status-text">Excluding videos you've already watched</span>
        `;
      } else {
        historyStatusItem.innerHTML = `
          <span class="status-icon pending">⚠</span>
          <span class="status-text">Watch history integration pending verification</span>
          <a href="/auth/google/with-history" class="btn small primary">Upgrade Permissions</a>
        `;
      }
    }
  }

  // Fetch recommendations from the API
  function fetchRecommendations() {
    showLoading();
    clearRecommendations();

    fetch("/api/recommendations")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }
        return response.json();
      })
      .then((data) => {
        hideLoading();

        if (data.videos && data.videos.length > 0) {
          currentRecommendations = data.videos;
          console.log("Search term used:", data.searchTerm);
          console.log("Recommendation source:", data.source);
          filterRecommendations();
        } else {
          showNoResults();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        hideLoading();
        showNoResults();
      });
  }

  // Filter recommendations by category
  function filterRecommendations() {
    currentCategory = categoryFilter.value;
    console.log("Filtering by category:", currentCategory);

    if (currentCategory) {
      filteredRecommendations = currentRecommendations.filter((video) => {
        // Log what we're checking to help debug
        console.log(
          `Checking video: "${video.title}" | Category: ${
            video.category
          } | Topics: ${video.topics ? video.topics.join(", ") : "none"}`
        );

        // Direct category match
        if (
          video.category &&
          video.category.toLowerCase().includes(currentCategory.toLowerCase())
        ) {
          return true;
        }

        // Match by discovery category (from our search)
        if (
          video.discoveryCategory &&
          video.discoveryCategory.toLowerCase() ===
            currentCategory.toLowerCase()
        ) {
          return true;
        }

        // Match by topics
        if (
          video.topics &&
          video.topics.some((topic) =>
            topic.toLowerCase().includes(currentCategory.toLowerCase())
          )
        ) {
          return true;
        }

        // Match by tags
        if (
          video.tags &&
          video.tags.some((tag) =>
            tag.toLowerCase().includes(currentCategory.toLowerCase())
          )
        ) {
          return true;
        }

        // Check title and description as fallback
        if (video.title.toLowerCase().includes(currentCategory.toLowerCase())) {
          return true;
        }

        if (
          video.description &&
          video.description
            .toLowerCase()
            .includes(currentCategory.toLowerCase())
        ) {
          return true;
        }

        // Special category mappings
        const categoryMappings = {
          comedy: ["funny", "humor", "comedic", "comedy"],
          science: [
            "science",
            "technology",
            "tech",
            "engineering",
            "physics",
            "biology",
            "chemistry",
          ],
          film: ["film", "animation", "movie", "cinema", "documentary"],
          howto: ["howto", "how to", "tutorial", "diy", "how-to", "learn"],
          news: ["news", "politics", "current events", "journalism"],
          travel: ["travel", "events", "tourism", "adventure", "destinations"],
          gaming: ["game", "gaming", "videogame", "gameplay"],
          music: ["music", "song", "concert", "band", "artist"],
          education: [
            "education",
            "learning",
            "study",
            "academic",
            "university",
          ],
          sports: [
            "sports",
            "athletic",
            "exercise",
            "competition",
            "tournament",
          ],
          lifestyle: [
            "lifestyle",
            "fashion",
            "beauty",
            "wellness",
            "self-improvement",
          ],
        };

        // Check if we have special mappings for this category
        if (categoryMappings[currentCategory.toLowerCase()]) {
          const keywords = categoryMappings[currentCategory.toLowerCase()];

          // Check category against keywords
          if (
            video.category &&
            keywords.some((keyword) =>
              video.category.toLowerCase().includes(keyword)
            )
          ) {
            return true;
          }

          // Check title against keywords
          if (
            video.title &&
            keywords.some((keyword) =>
              video.title.toLowerCase().includes(keyword)
            )
          ) {
            return true;
          }

          // Check description against keywords
          if (
            video.description &&
            keywords.some((keyword) =>
              video.description.toLowerCase().includes(keyword)
            )
          ) {
            return true;
          }
        }

        return false;
      });

      console.log(
        `Found ${filteredRecommendations.length} videos matching category '${currentCategory}'`
      );
    } else {
      // No filter applied
      filteredRecommendations = [...currentRecommendations];
      console.log(
        "No category filter applied. Showing all videos:",
        filteredRecommendations.length
      );
    }

    renderRecommendations();
  }

  // Render recommendations to the DOM
  function renderRecommendations() {
    clearRecommendations();

    if (filteredRecommendations.length === 0) {
      showNoResults();
      return;
    }

    hideNoResults();

    filteredRecommendations.forEach((video) => {
      const videoElement = videoTemplate.content.cloneNode(true);

      // Set video details (with safety checks)
      videoElement.querySelector(".video-title").textContent =
        video.title || "Untitled Video";
      videoElement.querySelector(".video-channel").textContent =
        video.channelTitle || "Unknown Channel";
      videoElement.querySelector(".video-description").textContent =
        video.description || "No description available";

      // Set thumbnail (with fallback)
      const thumbnailImg = videoElement.querySelector(".video-thumbnail img");
      thumbnailImg.src = video.thumbnail || "/images/no-thumbnail.png";
      thumbnailImg.alt = video.title || "Video thumbnail";

      // Set watch link
      const watchBtn = videoElement.querySelector(".watch-btn");
      if (video.id) {
        watchBtn.href = `https://www.youtube.com/watch?v=${video.id}`;
      } else {
        watchBtn.style.display = "none";
      }

      // Add category badge if available
      if (video.category) {
        const categoryElement = document.createElement("span");
        categoryElement.className = "category-badge";
        categoryElement.textContent = video.category;
        videoElement.querySelector(".video-info").appendChild(categoryElement);
      }

      // Add discovery information
      if (video.discoveryCategory) {
        const discoveryElement = document.createElement("div");
        discoveryElement.className = "discovery-info";
        discoveryElement.innerHTML = `<span class="discovery-category">${video.discoveryCategory}</span>`;
        videoElement.querySelector(".video-info").appendChild(discoveryElement);
      }

      // Add topic tags if available
      if (video.topics && video.topics.length > 0) {
        const topicsContainer = document.createElement("div");
        topicsContainer.className = "topic-tags";

        // Only show the first 3 topics to save space
        video.topics.slice(0, 3).forEach((topic) => {
          if (topic) {
            const topicTag = document.createElement("span");
            topicTag.className = "topic-tag";
            topicTag.textContent = topic;
            topicsContainer.appendChild(topicTag);
          }
        });

        // Only add the container if we actually have topics
        if (topicsContainer.children.length > 0) {
          videoElement
            .querySelector(".video-info")
            .appendChild(topicsContainer);
        }
      }

      // Set metadata if available
      const metadataContainer = videoElement.querySelector(".video-metadata");

      if (video.viewCount) {
        const viewsElement = videoElement.querySelector(".views");
        viewsElement.textContent = formatViewCount(video.viewCount);
        viewsElement.title = `${video.viewCount} views`;
      } else {
        const viewsElement = videoElement.querySelector(".views");
        if (viewsElement) viewsElement.style.display = "none";
      }

      if (video.duration) {
        const durationElement = videoElement.querySelector(".duration");
        durationElement.textContent = formatDuration(video.duration);
        durationElement.title = `Duration: ${formatDuration(video.duration)}`;
      } else {
        const durationElement = videoElement.querySelector(".duration");
        if (durationElement) durationElement.style.display = "none";
      }

      if (video.publishedAt) {
        const publishedElement = videoElement.querySelector(".published");
        publishedElement.textContent = formatPublishedDate(video.publishedAt);
        publishedElement.title = `Published: ${new Date(
          video.publishedAt
        ).toLocaleDateString()}`;
      } else {
        const publishedElement = videoElement.querySelector(".published");
        if (publishedElement) publishedElement.style.display = "none";
      }

      // Add like count if available
      if (video.likeCount && video.likeCount !== "0") {
        const likesElement = document.createElement("span");
        likesElement.className = "likes";
        likesElement.textContent = formatCount(video.likeCount) + " likes";
        likesElement.title = `${video.likeCount} likes`;
        metadataContainer.appendChild(likesElement);
      }

      // Add to container
      recommendationsContainer.appendChild(videoElement);
    });
  }

  // Helper functions
  function clearRecommendations() {
    recommendationsContainer.innerHTML = "";
  }

  function showLoading() {
    loadingElement.style.display = "flex";
    noResultsElement.style.display = "none";
  }

  function hideLoading() {
    loadingElement.style.display = "none";
  }

  function showNoResults() {
    noResultsElement.style.display = "block";
  }

  function hideNoResults() {
    noResultsElement.style.display = "none";
  }

  // Formatting helpers
  function formatViewCount(views) {
    const count = parseInt(views, 10);
    if (isNaN(count)) return "";

    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else {
      return `${count} views`;
    }
  }

  // Generic count formatter without the "views" text
  function formatCount(countStr) {
    const count = parseInt(countStr, 10);
    if (isNaN(count)) return "";

    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return `${count}`;
    }
  }

  function formatDuration(duration) {
    // Convert ISO 8601 duration to readable format
    // PT1H30M15S -> 1:30:15
    if (!duration) return "";

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  function formatPublishedDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "1 day ago";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    }
  }
});
