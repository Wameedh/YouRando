# YouRando Backend API Architecture Documentation

## 1. Introduction

This document provides a technical overview of the YouRando backend server (API), designed to support various client applications (web, mobile, TV, etc.). YouRando helps users discover diverse YouTube content beyond their typical recommendations.

The primary goal of this document is to enable developers or AI agents to understand the backend architecture and utilize its API to build new client applications.

## 2. Backend Architecture

### 2.1 Technology Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Authentication:** OAuth 2.0 (Google Sign-In for YouTube Data API access) via Passport.js
*   **API Interaction:** YouTube Data API v3 via `googleapis`
*   **Session Management:** `express-session` (Memory store by default; persistent store like `connect-mongo` recommended for production)
*   **CORS:** Enabled via `cors` middleware for frontend communication.

### 2.2 Core Components

*   **`index.js`:** The main entry point for the Express server. Sets up middleware, defines API routes, configures Passport, handles static file serving for the frontend build, and starts the server.
*   **Middleware:** Includes session management, CORS, JSON body parsing, URL-encoded body parsing, Passport initialization.
*   **Authentication Flow (Web Focus):** Handles the server-side OAuth 2.0 flow with Google primarily for web clients:
    *   `/auth/google` redirects the user to Google's consent screen.
    *   `/auth/google/callback` receives the authorization code, exchanges it for tokens via Passport, stores user profile and tokens in the session, and redirects back to the frontend application URL.
*   **YouTube Service Logic:** Functions interacting with the YouTube Data API v3 (e.g., `getUserSubscriptions`, `getIntelligentRecommendations`, `searchYouTubeVideos`, `getTrendingVideos`) reside within `index.js`. These use the authenticated user's access token (stored in `req.user.accessToken`).
*   **Recommendation Logic:** Fetches video recommendations, filters based on subscriptions and watch history (if available from session/Takeout upload), and attempts to diversify results.

### 2.3 Authentication & Authorization

*   Authentication relies on Google OAuth 2.0 configured via `passport-google-oauth20`.
*   The primary flow is session-based, suitable for web clients where the session cookie manages state after the initial OAuth redirect.
*   API endpoints requiring user context are protected using the `isAuthenticatedAPI` middleware, which checks `req.isAuthenticated()`.
*   **For Native Clients (e.g., tvOS):**
    *   The current session-based flow is **not** suitable.
    *   **Recommended Approach:** Implement **token-based authentication**. Native clients would perform their own OAuth flow to get an access token and send it in the `Authorization: Bearer <token>` header to backend API endpoints.
    *   **Backend Changes Needed for Native Clients:**
        *   Create a new authentication middleware that verifies the Bearer token (e.g., using Google's token info endpoint).
        *   Modify protected API endpoints to use this new middleware instead of `isAuthenticatedAPI` or support both.
        *   The backend would then use the provided token to make YouTube API calls, rather than relying on the token stored in the server-side session.

## 3. API Endpoints

This section details the primary HTTP endpoints provided by the YouRando backend API.

### 3.1 Authentication (Web Flow)

*   **`GET /auth/google`**
    *   **Description:** Initiates the Google OAuth 2.0 authentication flow for web clients.
    *   **Action:** Redirects the user to the Google consent screen.
    *   **Authentication:** None required.
    *   **Response:** HTTP 302 Redirect.

*   **`GET /auth/google/callback`**
    *   **Description:** Callback URL specified in the Google Cloud Console. Google redirects here after user consent.
    *   **Action:** Exchanges authorization code for tokens via Passport, establishes a user session, stores user profile/tokens in the session, redirects to the frontend URL (`FRONTEND_URL` env var).
    *   **Authentication:** Relies on parameters from Google.
    *   **Request Query Parameters:** `code`, `scope`.
    *   **Response:** HTTP 302 Redirect (to frontend).

*   **`POST /auth/logout`**
    *   **Description:** Logs the user out by destroying the server-side session.
    *   **Action:** Destroys the user's session and clears the session cookie.
    *   **Authentication:** Requires an active session cookie.
    *   **Response:** `200 OK` with JSON `{"message": "Logged out successfully."}` or `500 Internal Server Error`.

### 3.2 Core API

*   **`GET /api/user/status`**
    *   **Description:** Checks if the current user (based on session cookie) is authenticated and retrieves basic profile info.
    *   **Authentication:** Requires active session cookie.
    *   **Response (Success - 200 OK):**
        ```json
        {
          "isAuthenticated": true,
          "user": {
            "name": "string | null",
            "email": "string | null",
            "picture": "string | null",
            "hasHistoryAccess": "boolean",
            "lastHistoryUpload": "string (ISO Date) | null",
            "settings": { "discoveryLevel": "string", "excludedCategories": ["string"] }
          }
        }
        ```
    *   **Response (Not Authenticated - 200 OK):**
        ```json
        {
          "isAuthenticated": false,
          "user": null
        }
        ```

*   **`GET /api/recommendations`**
    *   **Description:** Fetches randomized video recommendations for the authenticated user.
    *   **Authentication:** Requires active session cookie (`isAuthenticatedAPI` middleware).
    *   **Response Format (Success - 200 OK):**
        ```json
        {
          "videos": [
             { "id": "videoId1", "title": "...", ... } // Array of Video Objects (see Sec 4)
          ]
          // Potentially add categories or featured video later
        }
        ```
    *   **Error Responses:**
        *   `401 Unauthorized`: `{"message": "Unauthorized: Please log in."}` or `{"message": "Authentication token missing."}` or `{"message": "Invalid credentials or token expired..."}`
        *   `500 Internal Server Error`: `{"message": "Failed to fetch recommendations."}`

*   **`GET /api/settings`**
    *   **Description:** Retrieves the current user's settings.
    *   **Authentication:** Requires active session cookie.
    *   **Response (Success - 200 OK):**
        ```json
        {
           "settings": { "discoveryLevel": "string", "excludedCategories": ["string"] }
        }
        ```
    *   **Error Responses:** `401 Unauthorized`.

*   **`POST /api/settings`**
    *   **Description:** Updates the current user's settings.
    *   **Authentication:** Requires active session cookie.
    *   **Request Body (JSON):**
        ```json
        {
           "discoveryLevel": "string", // e.g., "moderate", "high"
           "excludedCategories": ["string"] // Array of category names/IDs
        }
        ```
    *   **Response (Success - 200 OK):**
        ```json
        {
           "success": true,
           "settings": { "discoveryLevel": "string", "excludedCategories": ["string"] } // Updated settings
        }
        ```
    *   **Error Responses:** `401 Unauthorized`, `400 Bad Request` (if validation fails - *Needs implementation*), `500 Internal Server Error`.

### 3.3 File Upload (Placeholder)

*   **`POST /api/user/watch-history/upload`**
    *   **Description:** Endpoint for uploading Google Takeout watch history JSON file. (*Needs review and refinement*).
    *   **Authentication:** Requires active session cookie.
    *   **Request:** `multipart/form-data` with a field named `history-file`.
    *   **Response (Success - 200 OK):**
        ```json
        {
          "success": true,
          "processedVideos": "integer",
          "lastUpdate": "string (ISO Date)",
          "message": "Watch history processed successfully"
        }
        ```
    *   **Error Responses:** `400 Bad Request` (no file), `500 Internal Server Error`.

### 3.4 Data Management (Placeholders)

*   **`GET /api/user/data/export`**: Placeholder for exporting user data.
*   **`DELETE /api/user/data`**: Placeholder for deleting user data.
*   **`GET /api/user/access-status`**: Placeholder for checking token validity and scopes.

## 4. Data Models (API Focused)

*   **Video Object:**
    ```json
    {
      "id": "string", // YouTube Video ID
      "title": "string",
      "description": "string | null",
      "channelId": "string",
      "channelTitle": "string",
      "thumbnailUrl": "string", // URL to a default/medium/high quality thumbnail
      "publishedAt": "string", // ISO 8601 format
      "viewCount": "integer | null",
      "likeCount": "integer | null",
      "duration": "string | null" // ISO 8601 duration format (e.g., PT14M22S)
      // "discoveryCategory": "string | null" // Potential future addition
      // "category": "string | null" // Potential future addition from YouTube category ID
    }
    ```
*   **User Settings Object:**
    ```json
    {
       "discoveryLevel": "string",
       "excludedCategories": ["string"]
    }
    ```

## 5. Setup for New Clients

1.  **Register Google Cloud Project:** Obtain `CLIENT_ID` and `CLIENT_SECRET` specific to the new client platform.
2.  **Implement OAuth Flow:** Use platform-specific libraries/methods (e.g., AppAuth for mobile/tvOS) to handle the Google Sign-In flow and obtain an **Access Token**.
3.  **Backend API Interaction (Token-Based):**
    *   Send the obtained Access Token in the `Authorization` header for requests to protected API endpoints: `Authorization: Bearer <ACCESS_TOKEN>`.
    *   The backend **needs to be modified** to validate this Bearer token using a new middleware (see Section 2.3).
4.  **API Key:** The `YOUTUBE_API_KEY` is used by the backend for certain non-authenticated calls (like fetching trending videos if needed) and remains a backend secret.

## 6. Key Considerations & Future Development

*   **Implement Token-Based Auth:** Prioritize adding Bearer token validation middleware for native client support.
*   **Persistent Storage:** Implement a database (e.g., MongoDB with Mongoose and `connect-mongo`) for sessions, user settings, and processed watch history.
*   **Refine Takeout Upload:** Make the upload process more robust, handle larger files, and potentially run processing asynchronously.
*   **API Error Handling:** Implement consistent JSON error responses with appropriate HTTP status codes.
*   **Input Validation:** Add validation to API endpoints (e.g., for settings POST body).
*   **Testing:** Add comprehensive unit and integration tests.
*   **Logging:** Implement structured logging. 