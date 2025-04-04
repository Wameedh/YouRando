require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { google } = require("googleapis");
const axios = require("axios");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const fs = require("fs");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "../public")));

// Set up session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "yourandonator",
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize/Deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Define constants for OAuth scopes
const SCOPES = {
  BASIC: [
    "profile",
    "email",
    "https://www.googleapis.com/auth/youtube.readonly",
  ],
  WITH_HISTORY: [
    "profile",
    "email",
    "https://www.googleapis.com/auth/youtube.readonly",
    // The YouTube history scope is restricted and requires Google Takeout instead
    // "https://www.googleapis.com/auth/youtube.history",
  ],
};

// Set up Google OAuth 2.0 Strategy with option for watch history
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URL,
      scope: SCOPES.BASIC,
    },
    (accessToken, refreshToken, profile, done) => {
      // Save the tokens
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        accessToken,
        refreshToken,
        hasHistoryAccess: false, // Explicitly set to false for standard auth
      };

      return done(null, user);
    }
  )
);

// Enhanced Google OAuth 2.0 Strategy with watch history access
passport.use(
  "google-with-history",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URL_WITH_HISTORY,
      scope: SCOPES.WITH_HISTORY,
      passReqToCallback: true,
    },
    (req, accessToken, refreshToken, profile, done) => {
      // We'll no longer use this strategy for history access since it requires Google Takeout
      // Instead, inform the user they need to use Takeout

      // Create new user object with standard access
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        accessToken,
        refreshToken,
        hasHistoryAccess: false, // Don't set history access flag here
      };

      // If user exists, preserve their settings
      if (req.user && req.user.settings) {
        user.settings = req.user.settings;

        // Preserve history access if they previously uploaded via Takeout
        if (req.user.hasHistoryAccess) {
          user.hasHistoryAccess = true;
          user.watchHistory = req.user.watchHistory || [];
        }
      }

      console.log("User authenticated:", user);
      return done(null, user);
    }
  )
);

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};

// Routes
app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

// Standard authentication route
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: SCOPES.BASIC,
  })
);

// Authentication with history access (now redirects to Google Takeout instructions)
app.get("/auth/google/with-history", (req, res) => {
  // Instead of requesting the invalid scope, redirect to dashboard with a flag to show Takeout instructions
  if (req.isAuthenticated()) {
    req.session.showTakeoutInstructions = true;
    res.redirect("/dashboard");
  } else {
    // If not authenticated, first authenticate with standard permissions
    res.redirect("/auth/google");
  }
});

// Add a callback handler for the history-enabled auth
app.get(
  "/auth/google/callback/with-history",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // This is now just a backup/legacy route
    // Set a flag to show the takeout instructions
    req.session.showTakeoutInstructions = true;
    res.redirect("/dashboard");
  }
);

// Standard authentication callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Make sure hasHistoryAccess is explicitly set to false for standard auth
    req.user.hasHistoryAccess = false;
    res.redirect("/dashboard");
  }
);

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Dashboard route (protected)
app.get("/dashboard", isAuthenticated, (req, res) => {
  console.log("🚀 ~ req.user:", req.user);

  // Check if we should show Takeout instructions
  const showTakeoutInstructions = req.session.showTakeoutInstructions || false;

  // Check if we should remind the user to update their watch history
  let shouldRemindHistoryUpdate = false;
  if (req.user.hasHistoryAccess && req.user.lastHistoryUpload) {
    const lastUpdateDate = new Date(req.user.lastHistoryUpload);
    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUpdateDate) / (1000 * 60 * 60 * 24)
    );

    // Remind after 30 days
    if (daysSinceLastUpdate > 30) {
      shouldRemindHistoryUpdate = true;
    }
  }

  // Clear the flag after use
  req.session.showTakeoutInstructions = false;

  res.render("dashboard", {
    user: req.user,
    hasHistoryAccess: req.user.hasHistoryAccess || false,
    showTakeoutInstructions: showTakeoutInstructions,
    shouldRemindHistoryUpdate: shouldRemindHistoryUpdate,
  });
});

// Settings route (protected)
app.get("/settings", isAuthenticated, (req, res) => {
  // Get additional user profile information if available
  if (!req.user.picture && req.user.email) {
    // Create a placeholder profile image based on email
    const emailHash = require("crypto")
      .createHash("md5")
      .update(req.user.email.toLowerCase())
      .digest("hex");
    req.user.picture = `https://www.gravatar.com/avatar/${emailHash}?d=mp`;
  }

  res.render("settings", {
    user: req.user,
    hasHistoryAccess: req.user.hasHistoryAccess || false,
    // Pass any additional user settings that might be stored
    userSettings: req.user.settings || {
      discoveryLevel: "moderate",
      excludedCategories: [],
    },
  });
});

// Add middleware to parse JSON request bodies
app.use(express.json());

// Add middleware for file uploads
const upload = multer({
  dest: path.join(__dirname, "../uploads/"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// API route for user settings
app.post("/api/settings", isAuthenticated, (req, res) => {
  try {
    // In a real app, you would store these settings in a database
    // For now, we'll just store them in the session
    if (!req.user.settings) {
      req.user.settings = {};
    }

    // Update user settings
    req.user.settings = {
      ...req.user.settings,
      ...req.body,
    };

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update settings" });
  }
});

// API route to delete user data
app.delete("/api/user/data", isAuthenticated, (req, res) => {
  try {
    // In a real app, you would delete user data from a database
    // For now, we'll just clear the settings from the session
    req.user.settings = {};

    res.json({ success: true, message: "User data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user data:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete user data" });
  }
});

// API route to check the user's access status
app.get("/api/user/access-status", isAuthenticated, async (req, res) => {
  try {
    // Check if token is still valid
    const tokenInfo = await verifyToken(req.user.accessToken);

    // Return user's current access status
    res.json({
      success: true,
      hasHistoryAccess: req.user.hasHistoryAccess || false,
      tokenValid: !!tokenInfo,
      scopes: tokenInfo ? tokenInfo.scope.split(" ") : [],
      tokenExpiresIn: tokenInfo ? tokenInfo.expires_in : 0,
    });
  } catch (error) {
    console.error("Error checking access status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check access status",
      details: error.message,
    });
  }
});

// API route to handle watch history file upload
app.post(
  "/api/user/watch-history/upload",
  isAuthenticated,
  upload.single("history-file"),
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      // Read the uploaded JSON file
      const watchHistoryPath = req.file.path;

      // Parse the JSON content
      const watchHistoryData = JSON.parse(
        fs.readFileSync(watchHistoryPath, "utf8")
      );

      // Extract video IDs from the Google Takeout watch history
      const watchedVideos = extractVideoIdsFromTakeout(watchHistoryData);

      console.log(
        `Processed ${watchedVideos.length} videos from watch history`
      );

      // Store the watch history in the user's session
      req.user.watchHistory = watchedVideos;
      req.user.hasHistoryAccess = true;
      req.user.lastHistoryUpload = new Date().toISOString();

      // Clean up - delete the uploaded file
      fs.unlinkSync(watchHistoryPath);

      res.json({
        success: true,
        processedVideos: watchedVideos.length,
        lastUpdate: req.user.lastHistoryUpload,
        message: "Watch history processed successfully",
      });
    } catch (error) {
      console.error("Error processing watch history:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process watch history file",
      });
    }
  }
);

// Helper function to extract video IDs from Google Takeout JSON
function extractVideoIdsFromTakeout(watchHistoryData) {
  // Ensure the data is in the expected format
  if (!Array.isArray(watchHistoryData)) {
    console.error("Watch history data is not an array");
    return [];
  }

  const videoIds = [];

  // Process each entry in the watch history
  watchHistoryData.forEach((entry) => {
    try {
      // Check if this is a watched video entry
      if (entry.titleUrl && entry.titleUrl.includes("youtube.com/watch")) {
        // Extract the video ID from the URL
        const urlObj = new URL(entry.titleUrl);
        const videoId = urlObj.searchParams.get("v");

        if (videoId) {
          videoIds.push({
            videoId,
            title: entry.title || "Unknown Title",
            time: entry.time || null,
            channelId: null, // Not directly available in Takeout
            channelTitle:
              entry.subtitles && entry.subtitles[0]
                ? entry.subtitles[0].name
                : "Unknown Channel",
          });
        }
      }
    } catch (err) {
      console.error("Error processing watch history entry:", err);
      // Continue processing other entries
    }
  });

  return videoIds;
}

// Create a helper function to create properly authenticated YouTube clients
function createYoutubeClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.youtube({
    version: "v3",
    auth: oauth2Client,
  });
}

// Helper function to verify token validity
async function verifyToken(accessToken) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v1/tokeninfo",
      {
        params: { access_token: accessToken },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
}

// API route to export user data
app.get("/api/user/data/export", isAuthenticated, async (req, res) => {
  try {
    const youtube = createYoutubeClient(req.user.accessToken);

    // Get user's subscriptions
    const subscriptions = await getUserSubscriptions(youtube);

    // Try to get watch history if permission is granted
    let watchHistory = [];
    if (req.user.hasHistoryAccess) {
      watchHistory = await getUserWatchHistory(youtube);
    }

    // Compile user data
    const userData = {
      profile: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      settings: req.user.settings || {},
      permissions: {
        basicAccess: true,
        historyAccess: !!req.user.hasHistoryAccess,
      },
      subscriptions: subscriptions.map((sub) => ({
        channelId: sub.channelId,
        channelTitle: sub.channelTitle,
      })),
      // Don't include actual watch history, just the count for privacy
      watchHistoryCount: watchHistory.length,
    };

    res.json(userData);
  } catch (error) {
    console.error("Error exporting user data:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to export user data" });
  }
});

// API route to get random recommendations
app.get("/api/recommendations", isAuthenticated, async (req, res) => {
  try {
    const youtube = createYoutubeClient(req.user.accessToken);

    // 1. Get user's subscriptions
    const subscriptions = await getUserSubscriptions(youtube);

    // 2. Get user's watch history
    let watchHistory = [];
    if (req.user.hasHistoryAccess && req.user.watchHistory) {
      // Use the watch history from the user's session (from Takeout upload)
      watchHistory = req.user.watchHistory;
      console.log(
        `Using ${watchHistory.length} videos from user's uploaded watch history`
      );
    } else {
      // Try to get a limited history from activities
      watchHistory = await getUserWatchHistory(youtube);
      console.log(
        `Retrieved ${watchHistory.length} videos from limited history sources`
      );
    }

    // 3. Get intelligent recommendations using our enhanced system
    const recommendations = await getIntelligentRecommendations(
      youtube,
      subscriptions,
      watchHistory
    );

    res.json(recommendations);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res
      .status(500)
      .json({ error: "Failed to get recommendations", details: error.message });
  }
});

// Helper function to get user subscriptions
async function getUserSubscriptions(youtube) {
  try {
    // The youtube object is already authenticated with the user's access token
    // Get all subscriptions using pagination if needed
    let allSubscriptions = [];
    let nextPageToken = null;

    do {
      console.log(
        `Fetching subscriptions page ${nextPageToken ? "with token" : "1"}`
      );
      const response = await youtube.subscriptions.list({
        part: "snippet",
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken || undefined,
      });

      if (response.data.items && response.data.items.length > 0) {
        const pageSubscriptions = response.data.items.map((item) => ({
          channelId: item.snippet.resourceId.channelId,
          channelTitle: item.snippet.title,
        }));

        allSubscriptions = allSubscriptions.concat(pageSubscriptions);
        console.log(
          `Got ${pageSubscriptions.length} subscriptions from this page`
        );
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Retrieved ${allSubscriptions.length} total subscriptions`);
    return allSubscriptions;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    // Don't fail completely, just return an empty array
    return [];
  }
}

// Helper function to get user watch history
async function getUserWatchHistory(youtube) {
  try {
    // First check if we have watch history from Takeout
    if (
      youtube.context._options.auth.credentials &&
      youtube.context._options.auth.credentials.userId &&
      youtube.context._options.auth.credentials.userId.watchHistory
    ) {
      const takeoutHistory =
        youtube.context._options.auth.credentials.userId.watchHistory;
      console.log(
        `Using ${takeoutHistory.length} videos from uploaded Takeout watch history`
      );
      return takeoutHistory;
    }

    // If no Takeout data but user has history access flag
    if (
      youtube.context._options.auth.credentials &&
      youtube.context._options.auth.credentials.userId &&
      youtube.context._options.auth.credentials.userId.hasHistoryAccess &&
      youtube.context._options.auth.credentials.userId.watchHistory
    ) {
      const userWatchHistory =
        youtube.context._options.auth.credentials.userId.watchHistory;
      console.log(
        `Using ${userWatchHistory.length} videos from user's watch history storage`
      );
      return userWatchHistory;
    }

    // Fallback: Get as much activity data as possible (up to 200 items)
    console.log(
      "No watch history upload found. Using Activities API as fallback."
    );

    // Enhanced Activities API fallback - get more items
    try {
      let allActivities = [];
      let pageToken = null;
      const maxPages = 4; // Get up to 4 pages (50 items per page = 200 total)
      let currentPage = 0;

      do {
        const response = await youtube.activities.list({
          part: "snippet,contentDetails",
          mine: true,
          maxResults: 50,
          pageToken: pageToken || undefined,
        });

        console.log(
          `Got ${
            response.data.items ? response.data.items.length : 0
          } activities from page ${currentPage + 1}`
        );

        if (response.data.items && response.data.items.length > 0) {
          // Debug: Log the types of activities we're getting
          const activityTypes = {};
          response.data.items.forEach((item) => {
            if (item.snippet && item.snippet.type) {
              if (!activityTypes[item.snippet.type]) {
                activityTypes[item.snippet.type] = 0;
              }
              activityTypes[item.snippet.type]++;
            }
          });
          console.log("Activity types received:", activityTypes);

          // Extract videos from more activity types (not just "watch")
          const watchedVideos = response.data.items
            .filter((item) => {
              // Include watch activities
              if (item.snippet && item.snippet.type === "watch") {
                return true;
              }

              // Include liked videos
              if (item.snippet && item.snippet.type === "like") {
                return true;
              }

              // Include videos from playlists
              if (item.snippet && item.snippet.type === "playlistItem") {
                return true;
              }

              // Include uploaded videos
              if (item.snippet && item.snippet.type === "upload") {
                return true;
              }

              // Include recommended videos
              if (item.snippet && item.snippet.type === "recommendation") {
                return true;
              }

              return false;
            })
            .map((item) => {
              let videoId = null;

              // Try to extract video ID based on activity type
              if (item.contentDetails) {
                if (
                  item.contentDetails.upload &&
                  item.contentDetails.upload.videoId
                ) {
                  videoId = item.contentDetails.upload.videoId;
                } else if (
                  item.contentDetails.playlistItem &&
                  item.contentDetails.playlistItem.resourceId &&
                  item.contentDetails.playlistItem.resourceId.videoId
                ) {
                  videoId = item.contentDetails.playlistItem.resourceId.videoId;
                } else if (
                  item.contentDetails.like &&
                  item.contentDetails.like.resourceId &&
                  item.contentDetails.like.resourceId.videoId
                ) {
                  videoId = item.contentDetails.like.resourceId.videoId;
                } else if (
                  item.contentDetails.recommendation &&
                  item.contentDetails.recommendation.resourceId &&
                  item.contentDetails.recommendation.resourceId.videoId
                ) {
                  videoId =
                    item.contentDetails.recommendation.resourceId.videoId;
                }
              }

              return {
                videoId: videoId,
                title: item.snippet.title || "Unknown Title",
                channelId: item.snippet.channelId || null,
                channelTitle: item.snippet.channelTitle || "Unknown Channel",
                publishedAt: item.snippet.publishedAt || null,
                activityType: item.snippet.type || "unknown",
              };
            })
            .filter((item) => item.videoId !== null);

          console.log(
            `Got ${watchedVideos.length} videos from this page of activities`
          );
          allActivities = allActivities.concat(watchedVideos);
        }

        pageToken = response.data.nextPageToken;
        currentPage++;
      } while (pageToken && currentPage < maxPages);

      console.log(
        `Retrieved ${allActivities.length} videos from user's activities (not full history)`
      );

      if (allActivities.length > 0) {
        return allActivities;
      }

      // Try to get data from playlists
      let allWatchedVideos = [];

      try {
        // Get "Watch Later" playlist if available
        const playlistResponse = await youtube.playlists.list({
          part: "snippet",
          mine: true,
          maxResults: 50,
        });

        const relevantPlaylists = playlistResponse.data.items.filter(
          (item) =>
            item.snippet.title === "Watch Later" ||
            item.snippet.title.includes("History") ||
            item.snippet.title.includes("Liked")
        );

        // Process each relevant playlist
        for (const playlist of relevantPlaylists) {
          try {
            const playlistItems = await youtube.playlistItems.list({
              part: "snippet",
              playlistId: playlist.id,
              maxResults: 50,
            });

            const watchedVideos = playlistItems.data.items.map((item) => ({
              videoId: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              playlistName: playlist.snippet.title,
            }));

            allWatchedVideos = allWatchedVideos.concat(watchedVideos);
          } catch (playlistError) {
            console.log(
              `Error getting items from playlist ${playlist.snippet.title}:`,
              playlistError.message
            );
          }
        }

        if (allWatchedVideos.length > 0) {
          console.log(
            `Retrieved ${allWatchedVideos.length} videos from user's playlists (not full history)`
          );
          return allWatchedVideos;
        }
      } catch (playlistsError) {
        console.log("Error fetching playlists:", playlistsError.message);
      }

      // If still no data, try to get recent popular videos as a baseline
      if (allWatchedVideos.length === 0) {
        console.log(
          "No user activity found. Getting popular videos as baseline."
        );
        try {
          // Use YouTube API to get popular videos
          const popularVideosResponse = await youtube.videos.list({
            part: "snippet",
            chart: "mostPopular",
            regionCode: "US",
            maxResults: 50,
          });

          if (
            popularVideosResponse.data.items &&
            popularVideosResponse.data.items.length > 0
          ) {
            const popularVideos = popularVideosResponse.data.items.map(
              (item) => ({
                videoId: item.id,
                title: item.snippet.title,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                activityType: "popular",
              })
            );

            console.log(
              `Retrieved ${popularVideos.length} popular videos as baseline`
            );
            return popularVideos;
          }
        } catch (popularError) {
          console.log("Error fetching popular videos:", popularError.message);
        }
      }

      // If still no data, return empty array
      console.log(
        "Could not access watch history through any method, using empty list"
      );
      return [];
    } catch (activityError) {
      console.log(
        "Could not access activities, using fallback method",
        activityError.message
      );

      // Fallback: Try to get data from playlists
      let allWatchedVideos = [];

      try {
        // Get "Watch Later" playlist if available
        const playlistResponse = await youtube.playlists.list({
          part: "snippet",
          mine: true,
          maxResults: 50,
        });

        const relevantPlaylists = playlistResponse.data.items.filter(
          (item) =>
            item.snippet.title === "Watch Later" ||
            item.snippet.title.includes("History") ||
            item.snippet.title.includes("Liked")
        );

        // Process each relevant playlist
        for (const playlist of relevantPlaylists) {
          try {
            const playlistItems = await youtube.playlistItems.list({
              part: "snippet",
              playlistId: playlist.id,
              maxResults: 50,
            });

            const watchedVideos = playlistItems.data.items.map((item) => ({
              videoId: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle,
              playlistName: playlist.snippet.title,
            }));

            allWatchedVideos = allWatchedVideos.concat(watchedVideos);
          } catch (playlistError) {
            console.log(
              `Error getting items from playlist ${playlist.snippet.title}:`,
              playlistError.message
            );
          }
        }

        if (allWatchedVideos.length > 0) {
          console.log(
            `Retrieved ${allWatchedVideos.length} videos from user's playlists (not full history)`
          );
          return allWatchedVideos;
        }
      } catch (playlistsError) {
        console.log("Error fetching playlists:", playlistsError.message);
      }

      // If still no data, try to get recent popular videos as a baseline
      if (allWatchedVideos.length === 0) {
        console.log(
          "No user activity found. Getting popular videos as baseline."
        );
        try {
          // Use YouTube API to get popular videos
          const popularVideosResponse = await youtube.videos.list({
            part: "snippet",
            chart: "mostPopular",
            regionCode: "US",
            maxResults: 50,
          });

          if (
            popularVideosResponse.data.items &&
            popularVideosResponse.data.items.length > 0
          ) {
            const popularVideos = popularVideosResponse.data.items.map(
              (item) => ({
                videoId: item.id,
                title: item.snippet.title,
                channelId: item.snippet.channelId,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                activityType: "popular",
              })
            );

            console.log(
              `Retrieved ${popularVideos.length} popular videos as baseline`
            );
            return popularVideos;
          }
        } catch (popularError) {
          console.log("Error fetching popular videos:", popularError.message);
        }
      }

      // If still no data, return empty array
      console.log(
        "Could not access watch history through any method, using empty list"
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching watch history:", error);
    return [];
  }
}

// Main function for intelligent recommendations
async function getIntelligentRecommendations(
  youtube,
  subscriptions,
  watchHistory = []
) {
  try {
    // 1. Extract channel IDs to exclude
    const subscribedChannelIds = subscriptions.map((sub) => sub.channelId);

    // 2. Extract video IDs to exclude
    const watchedVideoIds = watchHistory
      .map((video) => {
        // Handle both API response format and Takeout format
        return (
          video.videoId ||
          (video.titleUrl
            ? new URL(video.titleUrl).searchParams.get("v")
            : null)
        );
      })
      .filter((id) => id !== null);

    console.log(
      `Excluding ${watchedVideoIds.length} watched videos from recommendations`
    );

    // 3. Generate discovery terms based on diverse categories
    const discoveryTerms = getDiscoveryTerms();

    // 4. Get a diverse set of categories to search for
    const allCategories = [
      ...new Set(discoveryTerms.map((item) => item.category)),
    ];

    // Shuffle the categories to get random order
    const shuffledCategories = allCategories.sort(() => Math.random() - 0.5);

    // Take 3-5 categories for diversity
    const selectedCategories = shuffledCategories.slice(
      0,
      Math.floor(Math.random() * 3) + 3
    );
    console.log(
      `Selected categories for diversity: ${selectedCategories.join(", ")}`
    );

    // 5. Collect videos from multiple categories
    let allSearchResults = [];
    const usedTerms = [];

    // For each category, get a random term and fetch videos
    for (const category of selectedCategories) {
      try {
        // Get terms for this category
        const categoryTerms = discoveryTerms.filter(
          (item) => item.category === category
        );

        if (categoryTerms.length === 0) {
          console.log(`No terms found for category: ${category}`);
          continue;
        }

        // Select a random term from this category
        const randomTerm =
          categoryTerms[Math.floor(Math.random() * categoryTerms.length)];

        if (!randomTerm || !randomTerm.term) {
          console.log(`Invalid term for category ${category}:`, randomTerm);
          continue;
        }

        usedTerms.push(randomTerm.term);

        console.log(
          `Searching for category '${category}' with term: ${randomTerm.term}`
        );

        // Search for videos with this term
        const results = await searchYouTubeVideos(randomTerm.term);

        if (results && results.length > 0) {
          // Tag the videos with their category
          const taggedResults = results.map((video) => ({
            ...video,
            discoveryCategory: category,
            discoveryTerm: randomTerm.term,
          }));

          allSearchResults = allSearchResults.concat(taggedResults);
          console.log(
            `Found ${results.length} videos for category '${category}'`
          );
        } else {
          console.log(
            `No results found for category '${category}' with term '${randomTerm.term}'`
          );
        }
      } catch (categoryError) {
        console.error(`Error processing category ${category}:`, categoryError);
        // Continue with the next category
      }
    }

    // If we have very few results, try a generic term
    if (allSearchResults.length < 10) {
      console.log(
        "Not enough results from category search. Adding generic results."
      );
      const genericResults = await searchYouTubeVideos("interesting videos");
      if (genericResults && genericResults.length > 0) {
        const taggedGeneric = genericResults.map((video) => ({
          ...video,
          discoveryCategory: "general",
          discoveryTerm: "interesting videos",
        }));

        allSearchResults = allSearchResults.concat(taggedGeneric);
      }
    }

    // If we still have no results, try trending videos
    if (allSearchResults.length === 0) {
      console.log("No results found. Trying trending videos as fallback...");

      try {
        // Create YouTube API client with the global API key
        if (!process.env.YOUTUBE_API_KEY) {
          console.error("YouTube API key is missing for trending videos!");
          throw new Error("API key missing");
        }

        const youtubeDataApi = google.youtube({
          version: "v3",
          auth: process.env.YOUTUBE_API_KEY,
        });

        // Use videos.list with 'mostPopular' chart to get trending videos
        const response = await youtubeDataApi.videos
          .list({
            part: "snippet,contentDetails,statistics",
            chart: "mostPopular",
            regionCode: "US", // Use US region code as default
            maxResults: 20,
          })
          .catch((error) => {
            console.error("YouTube trending API error:", error.message);
            return null;
          });

        if (response && response.data && response.data.items) {
          console.log(`Found ${response.data.items.length} trending videos`);

          // Map trending videos to our format
          const trendingVideos = response.data.items.map((item) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            discoveryCategory: "trending",
            discoveryTerm: "trending videos",
            category: item.snippet.categoryId || "Entertainment",
            viewCount: item.statistics?.viewCount,
            likeCount: item.statistics?.likeCount,
            duration: item.contentDetails?.duration,
          }));

          allSearchResults = trendingVideos;
        }
      } catch (trendingError) {
        console.error("Error fetching trending videos:", trendingError);
      }
    }

    // As a last resort, provide mock data
    if (allSearchResults.length === 0) {
      console.log("All API attempts failed. Creating sample recommendations.");

      allSearchResults = [
        {
          id: "dQw4w9WgXcQ",
          title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
          description:
            'The official music video for "Never Gonna Give You Up" by Rick Astley',
          thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
          channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
          channelTitle: "Rick Astley",
          publishedAt: "2009-10-25T06:57:33Z",
          discoveryCategory: "music",
          discoveryTerm: "classic music videos",
          category: "Music",
          viewCount: "1200000000",
          likeCount: "12000000",
          duration: "PT3M33S",
        },
        {
          id: "jNQXAC9IVRw",
          title: "Me at the zoo",
          description: "The first video on YouTube",
          thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
          channelId: "UC4QobU6STFB0P71PMvOGN5A",
          channelTitle: "jawed",
          publishedAt: "2005-04-23T14:31:52Z",
          discoveryCategory: "entertainment",
          discoveryTerm: "youtube history",
          category: "Entertainment",
          viewCount: "228000000",
          likeCount: "11000000",
          duration: "PT0M19S",
        },
        {
          id: "9bZkp7q19f0",
          title: "PSY - GANGNAM STYLE(강남스타일) M/V",
          description: "Official music video for PSY - GANGNAM STYLE",
          thumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg",
          channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
          channelTitle: "officialpsy",
          publishedAt: "2012-07-15T07:46:32Z",
          discoveryCategory: "music",
          discoveryTerm: "popular music videos",
          category: "Music",
          viewCount: "4500000000",
          likeCount: "24000000",
          duration: "PT4M13S",
        },
      ];
    }

    // 6. Filter out videos from subscribed channels and already watched videos
    const filteredResults = allSearchResults.filter((video) => {
      // Only filter out subscribed channels if we have subscription data
      const passesSubscriptionFilter =
        subscribedChannelIds.length === 0 ||
        !subscribedChannelIds.includes(video.channelId);

      // Only filter out watched videos if we have watch history
      const passesWatchHistoryFilter =
        watchedVideoIds.length === 0 || !watchedVideoIds.includes(video.id);

      return passesSubscriptionFilter && passesWatchHistoryFilter;
    });

    console.log(
      `Found ${filteredResults.length} videos after filtering out subscribed channels and watched videos`
    );

    // 7. Ensure diversity in the final results by selecting from each category
    let diverseResults = [];

    // Group by discovery category
    const groupedByCategory = {};
    filteredResults.forEach((video) => {
      if (!groupedByCategory[video.discoveryCategory]) {
        groupedByCategory[video.discoveryCategory] = [];
      }
      groupedByCategory[video.discoveryCategory].push(video);
    });

    // Take a few videos from each category to ensure diversity
    Object.keys(groupedByCategory).forEach((category) => {
      // Shuffle the videos in this category
      const categoryVideos = groupedByCategory[category].sort(
        () => Math.random() - 0.5
      );

      // Take 2-4 videos from each category
      const videosToTake = Math.min(
        Math.floor(Math.random() * 3) + 2,
        categoryVideos.length
      );

      diverseResults = diverseResults.concat(
        categoryVideos.slice(0, videosToTake)
      );
    });

    // If we have very few results after filtering, use the original filtered results
    if (diverseResults.length < 5 && filteredResults.length > 0) {
      console.log("Too few diverse results, using filtered results");
      diverseResults = filteredResults;
    }

    // If we still have very few results, use unfiltered results
    if (diverseResults.length < 5 && allSearchResults.length > 0) {
      console.log("Too few results after filtering, using unfiltered results");
      diverseResults = allSearchResults;
    }

    // 8. Shuffle the final list to avoid grouping by category
    diverseResults = diverseResults.sort(() => Math.random() - 0.5);

    // 9. Get detailed information including categories
    const enhancedVideos = await enhanceVideosWithCategories(diverseResults);

    return {
      videos: enhancedVideos,
      source: "YouTube Discovery API",
      searchTerm: usedTerms.join(", "),
      categories: selectedCategories,
    };
  } catch (error) {
    console.error("Error getting intelligent recommendations:", error);

    // Return a fallback response
    return {
      videos: [],
      source: "Error occurred",
      searchTerm: "Fallback",
      error: error.message,
    };
  }
}

// Generate discovery terms for diverse content
function getDiscoveryTerms() {
  // Define categories with associated search terms
  const categoryTerms = {
    education: [
      "documentary",
      "science experiment",
      "history of",
      "how things work",
      "physics explained",
      "biology basics",
      "mathematics tutorial",
      "learn language",
      "university lecture",
      "educational animation",
    ],
    creative: [
      "art lessons",
      "music theory",
      "filmmaking techniques",
      "creative writing",
      "drawing tutorial",
      "painting techniques",
      "animation breakdown",
      "craft ideas",
      "design process",
      "creative storytelling",
    ],
    professional: [
      "programming tutorial",
      "business strategy",
      "marketing fundamentals",
      "public speaking tips",
      "leadership skills",
      "career advice",
      "productivity hacks",
      "startup stories",
      "financial literacy",
      "workplace tips",
    ],
    lifestyle: [
      "cooking tutorial",
      "gardening tips",
      "interior design",
      "fitness routine",
      "sustainable living",
      "mindfulness practice",
      "travel guide",
      "life hacks",
      "home renovation",
      "organization tips",
    ],
    entertainment: [
      "film analysis",
      "book review",
      "philosophy lecture",
      "comedy sketch",
      "dance performance",
      "magic tricks",
      "storytelling",
      "poetry reading",
      "concert highlights",
      "theater performance",
    ],
    technology: [
      "tech review",
      "future technology",
      "AI explanation",
      "robotics demonstration",
      "smart home setup",
      "coding challenge",
      "digital art",
      "game development",
      "tech history",
      "software tutorial",
    ],
    niche: [
      "unusual hobbies",
      "rare collections",
      "forgotten history",
      "strange phenomena",
      "hidden places",
      "unique cultures",
      "bizarre foods",
      "unexplained mysteries",
      "antique restoration",
      "obscure sports",
    ],
    sports: [
      "extreme sports highlights",
      "Olympic moments",
      "sports analysis",
      "training techniques",
      "sports history",
      "athlete interview",
      "team dynamics",
      "sports science",
      "underdog stories",
      "game strategy",
    ],
    science: [
      "space exploration",
      "quantum physics",
      "medical breakthroughs",
      "evolutionary biology",
      "climate science",
      "neuroscience discoveries",
      "chemistry experiments",
      "astronomy visualization",
      "geology explained",
      "scientific mysteries",
    ],
    nature: [
      "wildlife documentary",
      "ocean exploration",
      "rainforest ecology",
      "animal behavior",
      "natural wonders",
      "nature photography",
      "conservation efforts",
      "plant species",
      "weather phenomena",
      "ecosystem balance",
    ],
  };

  // Flatten into array but maintain category information for later use
  const allTerms = [];

  Object.entries(categoryTerms).forEach(([category, terms]) => {
    terms.forEach((term) => {
      allTerms.push({
        term: term,
        category: category,
      });
    });
  });

  return allTerms;
}

// Search YouTube videos (helper function)
async function searchYouTubeVideos(searchTerm, maxResults = 10) {
  try {
    console.log(`Searching YouTube for: ${searchTerm}`);

    // Create YouTube API client with error checking for API key
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("YouTube API key is missing!");
      return [];
    }

    const youtube = google.youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });

    // Search for videos with additional error handling
    const response = await youtube.search
      .list({
        part: "snippet",
        q: searchTerm,
        maxResults: maxResults,
        type: "video",
        // Remove empty videoCategoryId that's causing the "invalid argument" error
        // videoCategoryId: "", // All categories
      })
      .catch((error) => {
        console.error("YouTube search API error:", error.message);
        // Return null to indicate API error
        return null;
      });

    // If API call failed, return empty array
    if (!response || !response.data || !response.data.items) {
      console.warn("Failed to get search results from YouTube API");
      return [];
    }

    // Transform YouTube API response into our simplified format
    return response.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return [];
  }
}

// Enhance videos with category information
async function enhanceVideosWithCategories(videos) {
  // Check for null or empty videos array
  if (!videos || videos.length === 0) {
    console.warn("No videos to enhance with categories");
    return [];
  }

  try {
    // Get list of video IDs
    const videoIds = videos.map((video) => video.id).filter((id) => id);

    // If no valid IDs, return original videos
    if (videoIds.length === 0) {
      console.warn("No valid video IDs found to enhance");
      return videos;
    }

    // Check for API key
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("YouTube API key is missing for video enhancement!");
      return videos;
    }

    // Create YouTube API client with the global API key
    const youtubeDataApi = google.youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });

    // Fetch detailed video data from YouTube API
    // We're requesting snippet, contentDetails, statistics, and topicDetails
    // to get rich information about each video
    const response = await youtubeDataApi.videos
      .list({
        part: "snippet,contentDetails,statistics,topicDetails",
        id: videoIds.join(","),
        maxResults: 50,
      })
      .catch((error) => {
        console.error("YouTube API error:", error.message);
        // Return null to indicate API error
        return null;
      });

    // If API call failed, return original videos
    if (!response || !response.data || !response.data.items) {
      console.warn("Failed to get enhanced video data from YouTube API");
      return videos;
    }

    // Category mapping for readability
    const categoryMapping = {
      1: "Film & Animation",
      2: "Autos & Vehicles",
      10: "Music",
      15: "Pets & Animals",
      17: "Sports",
      18: "Short Movies",
      19: "Travel & Events",
      20: "Gaming",
      21: "Videoblogging",
      22: "People & Blogs",
      23: "Comedy",
      24: "Entertainment",
      25: "News & Politics",
      26: "Howto & Style",
      27: "Education",
      28: "Science & Technology",
      29: "Nonprofits & Activism",
      30: "Movies",
      31: "Anime/Animation",
      32: "Action/Adventure",
      33: "Classics",
      34: "Comedy",
      35: "Documentary",
      36: "Drama",
      37: "Family",
      38: "Foreign",
      39: "Horror",
      40: "Sci-Fi/Fantasy",
      41: "Thriller",
      42: "Shorts",
      43: "Shows",
      44: "Trailers",
    };

    // Topic mapping for better categorization
    const topicMapping = {
      "/m/04rlf": "Music",
      "/m/05fw6t": "Children's music",
      "/m/02mscn": "Christian music",
      "/m/0ggq0m": "Classical music",
      "/m/01lyv": "Country",
      "/m/02lkt": "Electronic music",
      "/m/0glt670": "Hip hop music",
      "/m/05rwpb": "Independent music",
      "/m/03_d0": "Jazz",
      "/m/028sqc": "Music of Asia",
      "/m/0g293": "Music of Latin America",
      "/m/064t9": "Pop music",
      "/m/06cqb": "Reggae",
      "/m/06j6l": "Rhythm and blues",
      "/m/06by7": "Rock music",
      "/m/0gywn": "Soul music",
      "/m/07s6nbt": "Action game",
      "/m/025zzc": "Action-adventure game",
      "/m/02ntfj": "Casual game",
      "/m/03hf_rm": "Music video game",
      "/m/04q1x3q": "Puzzle video game",
      "/m/01sjng": "Racing video game",
      "/m/0403l3g": "Role-playing video game",
      "/m/021bp2": "Simulation video game",
      "/m/022dc6": "Sports game",
      "/m/03hf5t": "Strategy video game",
      "/m/06ntj": "Sports",
      "/m/0jm_": "American football",
      "/m/018jz": "Baseball",
      "/m/018w8": "Basketball",
      "/m/01cgz": "Boxing",
      "/m/09xp_": "Cricket",
      "/m/02vx4": "Football",
      "/m/037hz": "Golf",
      "/m/03tmr": "Ice hockey",
      "/m/01h7lh": "Mixed martial arts",
      "/m/05hs7w": "Motorsport",
      "/m/066wd": "Professional wrestling",
      "/m/07bs0": "Tennis",
      "/m/07_53": "Volleyball",
      "/m/02jjt": "Entertainment",
      "/m/09kqc": "Humor",
      "/m/02vxn": "Movies",
      "/m/05qjc": "Performing arts",
      "/m/066wd": "Professional wrestling",
      "/m/0f2f9": "TV shows",
      "/m/019_rr": "Lifestyle",
      "/m/032tl": "Fashion",
      "/m/027x7n": "Fitness",
      "/m/02wbm": "Food",
      "/m/03glg": "Hobby",
      "/m/068hy": "Pets",
      "/m/041xxh": "Physical attractiveness",
      "/m/07c1v": "Technology",
      "/m/07bxq": "Tourism",
      "/m/07k1x": "Vehicles",
      "/m/01k8wb": "Knowledge",
      "/m/098wr": "Society",
    };

    // Create a map of enhanced video details
    const videoDetailsMap = {};
    response.data.items.forEach((item) => {
      const videoId = item.id;
      const snippet = item.snippet || {};
      const statistics = item.statistics || {};
      const contentDetails = item.contentDetails || {};
      const topicDetails = item.topicDetails || {};

      // Map category ID to readable name
      const categoryId = snippet.categoryId;
      const categoryName = categoryMapping[categoryId] || null;

      // Extract topics if available
      let topics = [];
      if (topicDetails && topicDetails.topicCategories) {
        topics = topicDetails.topicCategories.map((topicUrl) => {
          // Extract the topic ID from the URL
          const topicId = topicUrl.split("/").pop();
          // Map to readable name if available
          return (
            topicMapping[`/m/${topicId}`] ||
            topicUrl.split("/").pop().replace(/_/g, " ")
          );
        });
      }

      videoDetailsMap[videoId] = {
        category: categoryName,
        topics: topics,
        tags: snippet.tags || [],
        duration: contentDetails.duration,
        viewCount: statistics.viewCount,
        likeCount: statistics.likeCount,
        commentCount: statistics.commentCount,
        publishedAt: snippet.publishedAt,
      };
    });

    // Combine original video data with enhanced details
    return videos.map((video) => {
      const enhancedDetails = videoDetailsMap[video.id] || {};
      return {
        ...video,
        ...enhancedDetails,
      };
    });
  } catch (error) {
    console.error("Error enhancing videos with categories:", error);
    // Return original videos if enhancement fails
    return videos;
  }
}

// Helper function to clean up old uploaded files
function cleanupOldUploadedFiles() {
  const fs = require("fs");
  const path = require("path");
  const uploadsDir = path.join(__dirname, "../uploads/");

  // Read all files in the uploads directory
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error("Error reading uploads directory:", err);
      return;
    }

    // Current time
    const now = Date.now();

    // Check each file
    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);

      // Get file stats
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${file}:`, err);
          return;
        }

        // Calculate file age in hours
        const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

        // Delete files older than 1 hour
        if (fileAge > 1) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${file}:`, err);
            } else {
              console.log(`Deleted old upload file: ${file}`);
            }
          });
        }
      });
    });
  });
}

// Run cleanup every hour
setInterval(cleanupOldUploadedFiles, 60 * 60 * 1000);

// Run cleanup on app start
cleanupOldUploadedFiles();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
