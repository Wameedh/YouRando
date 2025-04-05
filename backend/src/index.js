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
const fs = require("fs");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS - Configure appropriately for your frontend's origin in production
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001", // Allow frontend origin
    credentials: true, // Allow cookies/sessions
  })
);

// Body Parsers
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session Configuration (Consider using connect-mongo for persistence)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "yourandonator_api_secret",
    resave: false,
    saveUninitialized: false,
    // store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), // Example persistence
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true, // Prevent client-side JS access
      // sameSite: 'lax' // Consider 'strict' or 'none' based on your setup
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize/Deserialize user
passport.serializeUser((user, done) => {
  // Store only necessary user info in session to keep it small
  const sessionUser = {
    id: user.id,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
    hasHistoryAccess: user.hasHistoryAccess,
    watchHistory: user.watchHistory, // Consider if this gets too large for session
    lastHistoryUpload: user.lastHistoryUpload,
    settings: user.settings,
    profile: {
      // Store basic profile info if needed by frontend
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
  };
  done(null, sessionUser);
});

passport.deserializeUser((sessionUser, done) => {
  // Retrieve the full user object if necessary, or just use the sessionUser
  done(null, sessionUser);
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
      callbackURL: process.env.REDIRECT_URL || "/auth/google/callback", // Should match Google Console
      scope: SCOPES.BASIC,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
          hasHistoryAccess: false, // Default to false
          watchHistory: [],
          lastHistoryUpload: null,
          settings: { discoveryLevel: "moderate", excludedCategories: [] }, // Default settings
        };
        // Potentially fetch existing user settings/history from DB here
        console.log("User Authenticated:", user.email);
        return done(null, user);
      } catch (error) {
        console.error("Error during Google Strategy execution:", error);
        return done(error, null);
      }
    }
  )
);

// Middleware to check if user is authenticated for API routes
const isAuthenticatedAPI = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized: Please log in." });
};

// Middleware to check if user is authenticated for VIEW routes (redirects)
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  // Redirect to the frontend login page if not authenticated
  res.redirect(
    process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "/login"
  );
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

// Standard authentication callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${
      process.env.FRONTEND_URL || "http://localhost:3001"
    }/login?error=auth_failed`, // Redirect to frontend login on failure
    session: true, // Ensure session is established
  }),
  (req, res) => {
    // Successful authentication, redirect to the frontend dashboard or home page.
    // The frontend will then fetch user status.
    console.log("Auth callback successful, redirecting to frontend.");
    res.redirect(process.env.FRONTEND_URL || "http://localhost:3001");
  }
);

app.post("/auth/logout", (req, res, next) => {
  // Changed to POST as it modifies state
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed." });
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error("Session destruction error:", destroyErr);
        // Still proceed with clearing cookie and sending success
      }
      res.clearCookie("connect.sid"); // Ensure session cookie is cleared
      res.status(200).json({ message: "Logged out successfully." });
    });
  });
});

// API endpoint to check user authentication status
app.get("/api/user/status", isAuthenticatedAPI, (req, res) => {
  // isAuthenticatedAPI already ensures req.user exists
  res.json({
    isAuthenticated: true,
    user: req.user.profile, // Send profile info
    settings: req.user.settings, // Send current settings
    lastHistoryUpload: req.user.lastHistoryUpload,
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

// ** Takeout Upload API **

// Configure Multer for storing uploads
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true }); // Ensure directory exists on startup

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a unique filename: userId-timestamp-originalName
    const userId = req.user?.id || "unknownUser"; // Use user ID if available
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${userId}-${uniqueSuffix}-${file.originalname.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      )}`
    ); // Sanitize filename
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // Increased limit to 30MB for larger history files
  fileFilter: function (req, file, cb) {
    // Accept only JSON files
    if (
      !file.mimetype === "application/json" &&
      !file.originalname.toLowerCase().endsWith(".json")
    ) {
      console.log(
        `Rejected file upload: ${file.originalname}, mimetype: ${file.mimetype}`
      );
      // Pass an error to be caught by the error handling middleware
      return cb(
        new Error("Invalid file type: Only .json files are allowed."),
        false
      );
    }
    cb(null, true);
  },
});

// Middleware to handle Multer errors specifically
function handleUploadErrors(fieldName) {
  return function (req, res, next) {
    upload.single(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred (e.g., file too large).
        console.error("Multer Error:", err);
        let message = `File upload error: ${err.message}.`;
        if (err.code === "LIMIT_FILE_SIZE") {
          message = `File too large. Maximum size is ${
            upload.limits.fileSize / 1024 / 1024
          }MB.`;
        }
        return res.status(400).json({ success: false, message });
      } else if (err) {
        // An error from the fileFilter or other unknown upload error.
        console.error("Unknown Upload Error:", err);
        return res.status(400).json({
          success: false,
          message:
            err.message || "An unknown error occurred during file upload.",
        });
      }
      // Everything went fine.
      next();
    });
  };
}

app.post(
  "/api/user/watch-history/upload",
  isAuthenticatedAPI,
  handleUploadErrors("historyFile"), // Use the Multer error handler middleware
  async (req, res) => {
    if (!req.file) {
      // This case should ideally be caught by handleUploadErrors if no file is sent,
      // but added as a safeguard.
      return res
        .status(400)
        .json({ success: false, message: "No history file uploaded." });
    }

    const watchHistoryPath = req.file.path;
    let processedCount = 0;
    let processedVideoIds = []; // Store IDs to potentially save to DB

    try {
      console.log(
        `Processing uploaded file: ${watchHistoryPath} (Size: ${req.file.size} bytes)`
      );
      const watchHistoryData = JSON.parse(
        fs.readFileSync(watchHistoryPath, "utf8")
      );

      // Extract only unique video IDs
      processedVideoIds = extractVideoIdsFromTakeout(watchHistoryData);
      processedCount = processedVideoIds.length;
      console.log(
        `Extracted ${processedCount} unique video IDs from watch history file.`
      );

      if (processedCount === 0) {
        // Don't treat empty history as an error, but inform the user
        // Keep existing history flags if they exist
        return res.json({
          success: true,
          processedVideos: 0,
          lastUpdate: req.user.lastHistoryUpload || null,
          message: "Processed history file, but no watch events found.",
        });
      }

      // ** CRITICAL TODO: Persist History **
      // 1. Fetch existing history IDs for user `req.user.id` from DB.
      // 2. Merge `processedVideoIds` with existing IDs (handle potential duplicates).
      // 3. Save the updated list back to the DB.
      // 4. Update `hasHistoryAccess = true` and `lastHistoryUpload = new Date()` in the user's DB record.
      console.warn(
        "Watch history processed but NOT saved persistently. Implement database storage!"
      );

      // Temporarily update session flags (remove once DB is implemented)
      req.session.regenerate((err) => {
        // Regenerate session to save changes immediately
        if (err) {
          return next(err);
        }
        req.user.hasHistoryAccess = true;
        req.user.lastHistoryUpload = new Date().toISOString();
        req.session.save((err) => {
          // Explicitly save session
          if (err) {
            return next(err);
          }
          res.json({
            success: true,
            processedVideos: processedCount,
            lastUpdate: req.user.lastHistoryUpload,
            message:
              "Watch history processed. NOTE: Data persistence not yet implemented.",
          });
        });
      });
    } catch (error) {
      console.error("Error processing watch history upload:", error);
      let message = "Failed to process watch history file.";
      if (error instanceof SyntaxError) {
        message =
          "Invalid JSON file format. Please ensure you uploaded the correct file from Google Takeout.";
      }
      res.status(500).json({
        success: false,
        message: message,
        error: error.message, // Provide error message for debugging
      });
    } finally {
      // Clean up the uploaded file asynchronously
      fs.unlink(watchHistoryPath, (err) => {
        if (err)
          console.error(
            `Error deleting uploaded history file ${watchHistoryPath}:`,
            err
          );
        else console.log(`Cleaned up uploaded file: ${watchHistoryPath}`);
      });
    }
  }
);

// Helper function to create an authenticated YouTube API client
function createYoutubeClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
    // Note: The redirect URL isn't strictly needed here as we're just setting credentials,
    // but it's good practice if you might use it for refresh tokens later.
    // process.env.REDIRECT_URL || '/auth/google/callback'
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.youtube({ version: "v3", auth: oauth2Client });
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
  let subscriptions = [];
  let nextPageToken = null;
  const maxPages = 10; // Limit pages to avoid excessive API usage/quota issues
  let pageCount = 0;

  console.log("Fetching user subscriptions...");

  try {
    do {
      pageCount++;
      const response = await youtube.subscriptions.list({
        part: "snippet",
        mine: true,
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (response.data.items) {
        // Add only necessary info
        const pageSubs = response.data.items
          .map((sub) => ({
            channelId: sub.snippet?.resourceId?.channelId,
            title: sub.snippet?.title,
          }))
          .filter((s) => s.channelId && s.title); // Filter out invalid items
        subscriptions = subscriptions.concat(pageSubs);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken && pageCount < maxPages);

    console.log(`Fetched ${subscriptions.length} subscriptions.`);
    return subscriptions;
  } catch (error) {
    console.error(
      "Error fetching subscriptions:",
      error.response?.data?.error || error.message
    );
    // Re-throw authentication errors to be handled by the route
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error("Invalid Credentials");
    }
    return []; // Return empty on other errors
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

// Main recommendation logic
async function getIntelligentRecommendations(
  youtube, // Authenticated client
  subscriptions, // Array from getUserSubscriptions
  watchedVideoIds = [] // Array of video IDs (strings)
) {
  console.log("Starting intelligent recommendation generation...");
  const subscribedChannelIds = new Set(
    subscriptions.map((sub) => sub.channelId)
  );
  const watchedSet = new Set(watchedVideoIds);

  let recommendations = [];
  const maxRecommendations = 50;
  const searchAttempts = 5; // Limit API calls per request
  let attempts = 0;

  const discoveryTerms = getDiscoveryTerms(); // Get diverse terms
  const usedTerms = new Set();

  try {
    // Attempt 1: Search based on diverse terms using the user's token
    while (
      recommendations.length < maxRecommendations &&
      attempts < searchAttempts
    ) {
      attempts++;
      // Get a term not used yet
      let randomTermObj =
        discoveryTerms[Math.floor(Math.random() * discoveryTerms.length)];
      let termFetchAttempt = 0;
      while (
        usedTerms.has(randomTermObj.term) &&
        termFetchAttempt < discoveryTerms.length
      ) {
        randomTermObj =
          discoveryTerms[Math.floor(Math.random() * discoveryTerms.length)];
        termFetchAttempt++;
      }
      if (usedTerms.has(randomTermObj.term)) {
        console.log("Ran out of unique discovery terms for this request.");
        break; // Avoid infinite loop if all terms used quickly
      }

      const searchTerm = randomTermObj.term;
      usedTerms.add(searchTerm);
      console.log(
        `Recommendation attempt ${attempts}, searching (user auth) for: "${searchTerm}"`
      );

      // Use the authenticated client for searching
      const searchResults = await searchYouTubeVideos(youtube, searchTerm, 20);

      const uniqueNewVideos = searchResults.filter(
        (video) =>
          video &&
          video.id && // Basic validation
          !subscribedChannelIds.has(video.channelId) &&
          !watchedSet.has(video.id) &&
          !recommendations.some((rec) => rec.id === video.id)
      );

      console.log(
        `Found ${uniqueNewVideos.length} unique, new videos for term "${searchTerm}"`
      );
      recommendations = recommendations.concat(uniqueNewVideos);

      if (recommendations.length >= maxRecommendations) break;
    }

    // Attempt 2: Supplement with trending videos if needed (using API Key)
    if (
      recommendations.length < maxRecommendations &&
      process.env.YOUTUBE_API_KEY
    ) {
      console.log("Fetching trending videos (API Key) to supplement...");
      try {
        const apiKeyYoutubeClient = google.youtube({
          version: "v3",
          auth: process.env.YOUTUBE_API_KEY,
        });
        const trending = await getTrendingVideos(apiKeyYoutubeClient, 20);
        const uniqueTrending = trending.filter(
          (video) =>
            video &&
            video.id &&
            !subscribedChannelIds.has(video.channelId) &&
            !watchedSet.has(video.id) &&
            !recommendations.some((rec) => rec.id === video.id)
        );
        console.log(`Adding ${uniqueTrending.length} unique trending videos.`);
        recommendations = recommendations.concat(uniqueTrending);
      } catch (trendingError) {
        console.error("Failed to fetch trending videos:", trendingError);
        // Don't fail the whole process if trending fails
      }
    } else if (
      recommendations.length < maxRecommendations &&
      !process.env.YOUTUBE_API_KEY
    ) {
      console.warn(
        "YOUTUBE_API_KEY missing, cannot fetch trending videos as fallback."
      );
    }

    // Final processing: Deduplicate and limit
    recommendations = recommendations
      .filter(
        (video, index, self) =>
          video &&
          video.id &&
          index === self.findIndex((v) => v && v.id === video.id)
      )
      .slice(0, maxRecommendations)
      .sort(() => Math.random() - 0.5); // Shuffle final list

    console.log(`Generated ${recommendations.length} final recommendations.`);

    return {
      videos: recommendations,
      // Add any other metadata if needed later
    };
  } catch (error) {
    console.error("Error during recommendation generation:", error);
    // Re-throw auth errors
    if (error.message === "Invalid Credentials") {
      throw error;
    }
    // Return empty list for other errors
    return { videos: [], error: error.message };
  }
}

// Provides a diverse set of search terms grouped by category
function getDiscoveryTerms() {
  // Using a simplified list for brevity, expand as needed
  const categoryTerms = {
    education: [
      "documentary",
      "science experiment",
      "history of",
      "learn language",
    ],
    creative: ["art lessons", "music theory", "filmmaking", "drawing tutorial"],
    tech: ["tech review", "coding tutorial", "AI explained", "gadgets"],
    lifestyle: [
      "cooking tutorial",
      "fitness routine",
      "travel vlog",
      "gardening",
    ],
    entertainment: [
      "film analysis",
      "comedy sketch",
      "concert highlights",
      "book review",
    ],
    science: [
      "space exploration",
      "neuroscience",
      "climate change facts",
      "quantum physics simplified",
    ],
    // Add many more categories and terms for better diversity
  };
  const allTerms = [];
  Object.entries(categoryTerms).forEach(([category, terms]) => {
    terms.forEach((term) => {
      allTerms.push({ term, category });
    });
  });
  return allTerms;
}

// Searches YouTube using the provided (authenticated) client
async function searchYouTubeVideos(youtube, searchTerm, maxResults = 10) {
  console.log(
    `Searching YouTube (user auth) for "${searchTerm}" (Max: ${maxResults})`
  );
  try {
    const response = await youtube.search.list({
      part: "snippet",
      q: searchTerm,
      type: "video",
      maxResults: maxResults,
      videoEmbeddable: "true", // Useful filter
      // regionCode: 'US' // Optional: Bias search results
    });

    if (!response.data.items || response.data.items.length === 0) return [];

    // Get video IDs from search results
    const videoIds = response.data.items
      .map((item) => item.id?.videoId)
      .filter((id) => id);
    if (videoIds.length === 0) return [];

    // Fetch full video details for the found IDs using the *same client*
    const detailsResponse = await youtube.videos.list({
      part: "snippet,contentDetails,statistics",
      id: videoIds.join(","),
      maxResults: videoIds.length, // Ensure we ask for details for all found IDs
    });

    // Convert the detailed items to our model
    return (
      detailsResponse.data.items
        ?.map((item) => convertVideoItemToModel(item))
        .filter((v) => v) || []
    );
  } catch (error) {
    console.error(
      `Error searching YouTube for "${searchTerm}":`,
      error.response?.data?.error || error.message
    );
    // Re-throw auth errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error("Invalid Credentials");
    }
    return []; // Return empty on other errors
  }
}

// Fetches trending videos using the provided client (should be API Key client)
async function getTrendingVideos(youtubeApiKeyClient, maxResults = 10) {
  console.log("Fetching trending videos (API Key)...");
  try {
    const response = await youtubeApiKeyClient.videos.list({
      part: "snippet,contentDetails,statistics",
      chart: "mostPopular",
      regionCode: "US", // Consider making this configurable
      maxResults: maxResults,
    });
    return (
      response.data.items
        ?.map((item) => convertVideoItemToModel(item))
        .filter((v) => v) || []
    );
  } catch (error) {
    console.error(
      "Error fetching trending videos:",
      error.response?.data?.error || error.message
    );
    // Log API key specific errors differently if helpful
    return []; // Don't throw, just return empty
  }
}

// Converts a YouTube API video item to our simplified Video model
function convertVideoItemToModel(item) {
  if (!item || !item.id || !item.snippet) return null;
  const snippet = item.snippet;
  const stats = item.statistics;
  const details = item.contentDetails;

  // Prefer standard or high-res thumbnails
  const thumbnailUrl =
    snippet.thumbnails?.standard?.url ||
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url;

  // Basic validation
  if (!thumbnailUrl || !snippet.channelId || !snippet.channelTitle) return null;

  return {
    id: item.id,
    title: snippet.title || "No Title",
    description: snippet.description || null,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    thumbnailUrl: thumbnailUrl,
    publishedAt: snippet.publishedAt || null, // Keep as ISO string
    viewCount: stats?.viewCount ? parseInt(stats.viewCount, 10) : null,
    likeCount: stats?.likeCount ? parseInt(stats.likeCount, 10) : null,
    duration: details?.duration || null, // Keep ISO 8601 duration string
  };
}

// Extracts unique video IDs from Takeout JSON data
function extractVideoIdsFromTakeout(watchHistoryData) {
  if (!Array.isArray(watchHistoryData)) {
    console.error("Watch history data is not an array");
    return [];
  }
  const videoIds = new Set(); // Use a Set for automatic deduplication
  watchHistoryData.forEach((entry) => {
    try {
      // Look for YouTube watch URLs
      if (
        entry.titleUrl &&
        entry.titleUrl.startsWith("https://www.youtube.com/watch?v=")
      ) {
        const urlObj = new URL(entry.titleUrl);
        const videoId = urlObj.searchParams.get("v");
        if (videoId) {
          videoIds.add(videoId);
        }
      }
    } catch (err) {
      // Log problematic entries but continue processing
      console.warn(
        `Skipping entry due to error processing watch history entry: ${err.message}`,
        entry.titleUrl
      );
    }
  });
  return Array.from(videoIds); // Convert Set back to Array
}

// Cleans up old files from the upload directory
function cleanupOldUploadedFiles() {
  const uploadPath = path.join(__dirname, "uploads");
  fs.readdir(uploadPath, (err, files) => {
    if (err) {
      if (err.code === "ENOENT") return; // Directory doesn't exist, nothing to clean
      console.error("Error reading uploads directory for cleanup:", err);
      return;
    }
    const now = Date.now();
    files.forEach((file) => {
      const filePath = path.join(uploadPath, file);
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
          // Handle cases where file might be deleted between readdir and stat
          if (statErr.code !== "ENOENT") {
            console.error(`Error getting stats for file ${file}:`, statErr);
          }
          return;
        }
        // Delete files older than 1 hour
        const fileAgeHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
        if (fileAgeHours > 1) {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error(`Error deleting file ${file}:`, unlinkErr);
            } else if (!unlinkErr) {
              console.log(`Cleaned up old upload file: ${file}`);
            }
          });
        }
      });
    });
  });
}

// --- Static File Serving & Catch-all (For React Frontend) ---

// Serve static files from the React app's build directory (Vite uses 'dist')
const staticFilesPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend-react",
  "dist"
);
console.log(`Configuring static file serving from: ${staticFilesPath}`);
app.use(express.static(staticFilesPath));

// The "catchall" handler for client-side routing
app.get("*", (req, res, next) => {
  // Exclude API routes and Auth routes from the catchall
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) {
    return next(); // Pass to 404 handler if no API route matches
  }

  const indexPath = path.join(staticFilesPath, "index.html");
  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.warn("React build index.html not found at:", indexPath);
      // Send a more informative message if the frontend isn't built/found
      res
        .status(404)
        .send(
          `<h1>Frontend not found</h1>` +
            `<p>Ensure the React app in 'frontend-react' is built (e.g., run 'npm run build' inside the 'frontend-react' directory).</p>` +
            `<p>Expected location: ${indexPath}</p>`
        );
    } else {
      // Serve the main HTML file for any non-API, non-Auth request
      res.sendFile(indexPath);
    }
  });
});

// --- Server Startup ---

// Run initial cleanup
cleanupOldUploadedFiles();
// Run cleanup periodically (e.g., every hour)
setInterval(cleanupOldUploadedFiles, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`API Server listening on port ${PORT}`);
  console.log(
    `Frontend URL configured for CORS/Redirects: ${
      process.env.FRONTEND_URL || "http://localhost:3001"
    }`
  );
  console.log(`Serving frontend static files from: ${staticFilesPath}`);
});
