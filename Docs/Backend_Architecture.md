# YouRando Backend Architecture & API Documentation

## 1. Introduction

This document provides a technical overview of the YouRando backend server, designed to support various client applications (web, mobile, TV). YouRando helps users discover diverse YouTube content beyond their typical recommendations.

The primary goal of this document is to enable developers or AI agents to understand the backend architecture and utilize its API to build new client applications.

## 2. Backend Architecture

### 2.1 Technology Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Templating (for Web):** EJS (Embedded JavaScript templates)
*   **Authentication:** OAuth 2.0 (Google Sign-In for YouTube Data API access)
*   **API:** YouTube Data API v3
*   **Session Management:** `express-session` (Potentially with a persistent store like MongoDB, though currently using memory store by default)

### 2.2 Core Components

*   **`index.js`:** The main entry point for the Express server. It sets up middleware, defines routes, and starts the server.
*   **Middleware:** Includes session management, body parsing, and potentially static file serving (for the web app).
*   **Authentication Flow:** Handles the OAuth 2.0 dance with Google. This involves:
    *   Redirecting the user to Google's consent screen.
    *   Receiving an authorization code upon user approval.
    *   Exchanging the code for access and refresh tokens.
    *   Storing tokens securely (currently in the user's session, ideally should be stored more persistently and securely, especially refresh tokens).
*   **YouTube Service Wrapper (Conceptual):** Although not explicitly a separate class in the current structure, the logic interacting with the YouTube Data API v3 resides within specific route handlers. This logic uses the authenticated user's tokens to make API calls.
*   **Recommendation Logic:** The core logic fetches video recommendations based on various criteria (e.g., trending videos, different categories) using the YouTube Data API. It might include logic to filter out videos from subscribed channels or recently watched videos (if history is accessed).

### 2.3 Authentication & Authorization

*   Authentication relies on Google OAuth 2.0.
*   Client applications need to register their own Google Cloud project to obtain `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
*   The backend manages the token exchange and stores the access/refresh tokens.
*   API endpoints requiring user-specific YouTube data are protected and require an active session with valid tokens.
*   **For New Clients (e.g., tvOS):**
    *   Native clients will need to implement an OAuth 2.0 flow suitable for their platform (e.g., using `AppAuth` for iOS/tvOS or platform-specific SDKs).
    *   The backend might need adjustments or dedicated endpoints to handle token verification or exchange initiated by native clients, potentially using a backend-for-frontend (BFF) pattern or a token exchange mechanism.
    *   Alternatively, the client could handle the entire OAuth flow and pass the access token to the backend API for specific requests (requires backend changes to accept and validate these tokens).

## 3. API Endpoints

This section details the primary HTTP endpoints provided by the YouRandoWeb backend. New client applications will interact primarily with these.

**(Note: The current implementation primarily serves the EJS web frontend. Endpoints might need refactoring to return pure JSON for other clients.)**

### 3.1 Authentication

*   **`GET /auth/google`**
    *   **Description:** Initiates the Google OAuth 2.0 authentication flow.
    *   **Action:** Redirects the user to the Google consent screen.
    *   **Authentication:** None required.
    *   **Response:** HTTP 302 Redirect.

*   **`GET /auth/google/callback`**
    *   **Description:** Callback URL specified in the Google Cloud Console. Google redirects here after user consent.
    *   **Action:** Receives the authorization code, exchanges it for tokens, stores tokens in the session, and redirects the user (typically to the dashboard).
    *   **Authentication:** None directly, but relies on parameters from Google.
    *   **Request Query Parameters:** `code` (authorization code), `scope`.
    *   **Response:** HTTP 302 Redirect (e.g., to `/dashboard`).

*   **`GET /auth/logout`**
    *   **Description:** Logs the user out.
    *   **Action:** Destroys the user's session, effectively clearing their authentication tokens.
    *   **Authentication:** Requires an active session cookie.
    *   **Response:** HTTP 302 Redirect (e.g., to `/`).

### 3.2 Core Functionality (Potential JSON Endpoints for Clients)

**(These endpoints might need to be created or adapted from the existing EJS routes to return JSON)**

*   **`GET /api/recommendations` (Example - Needs Implementation)**
    *   **Description:** Fetches randomized video recommendations for the authenticated user.
    *   **Authentication:** Requires active session/valid token.
    *   **Response Format (JSON):**
        ```json
        {
          "categories": [
            {
              "name": "Science & Technology",
              "videos": [
                { "id": "videoId1", "title": "...", "thumbnailUrl": "...", "channelTitle": "..." }
              ]
            }
            // ... other categories
          ],
          "featuredVideo": { "id": "videoIdFeatured", "title": "...", ... }
        }
        ```
    *   **Error Responses:** `401 Unauthorized` (if not authenticated), `500 Internal Server Error` (if YouTube API fails).

*   **`GET /api/user/status` (Example - Needs Implementation)**
    *   **Description:** Checks if the current user is authenticated and retrieves basic profile info.
    *   **Authentication:** Requires active session/valid token.
    *   **Response Format (JSON):**
        ```json
        {
          "isAuthenticated": true,
          "user": {
            "id": "googleUserId",
            "displayName": "User Name",
            "profileImageUrl": "..."
          }
        }
        ```
    *   **Response if not authenticated:**
        ```json
        {
          "isAuthenticated": false,
          "user": null
        }
        ```

### 3.3 Web App Specific Routes (Serve EJS Templates)

*   **`GET /`**: Renders the home/login page.
*   **`GET /dashboard`**: Renders the user's dashboard with recommendations (requires authentication).
*   **`GET /settings`**: Renders the user settings page (requires authentication).
*   **`POST /settings`**: Updates user settings (requires authentication).

## 4. Data Models (API Focused)

When creating JSON API endpoints, consistent data models should be used:

*   **Video Object:**
    ```json
    {
      "id": "string", // YouTube Video ID
      "title": "string",
      "description": "string",
      "channelId": "string",
      "channelTitle": "string",
      "thumbnailUrl": "string", // URL to a high-quality thumbnail
      "publishedAt": "string", // ISO 8601 format
      "viewCount": "integer | null",
      "likeCount": "integer | null",
      "duration": "string" // ISO 8601 duration format (e.g., PT14M22S)
    }
    ```
*   **Video Category Object:**
    ```json
    {
      "name": "string",
      "videos": [Video] // Array of Video objects
    }
    ```

## 5. Setup for New Clients

1.  **Register Google Cloud Project:** Obtain `CLIENT_ID` and `CLIENT_SECRET` specific to the new client platform.
2.  **Implement OAuth Flow:** Use platform-specific libraries/methods to handle the Google Sign-In flow.
3.  **Backend API Interaction:**
    *   **Option A (Session-based - requires web view or equivalent):** If the client can manage cookies and sessions like a browser, it might interact directly with existing web routes after authentication.
    *   **Option B (Token-based - Recommended for Native):** The backend needs modification.
        *   Implement API endpoints that accept an `Authorization: Bearer <ACCESS_TOKEN>` header.
        *   The backend must validate the received access token (e.g., using Google's token info endpoint) before processing the request.
        *   The client would obtain the access token via its native OAuth flow and include it in requests to protected backend API endpoints.
    *   **Option C (BFF):** Create a dedicated Backend-for-Frontend for the new client type. This BFF would handle the specific needs of the client and communicate with the core YouRando backend.
4.  **API Key:** The `YOUTUBE_API_KEY` might still be needed by the backend for non-user-specific API calls (like fetching general trending videos). This should remain a backend secret.

## 6. Key Considerations & Future Development

*   **Token Storage:** Storing tokens (especially refresh tokens) in the server-side session's memory is not robust or secure for production. Use a persistent session store (like Redis or MongoDB) or implement a dedicated secure storage mechanism.
*   **API Design for Clients:** Refactor existing web routes or create new `/api/*` routes that strictly return JSON, making them easier for non-web clients to consume.
*   **Error Handling:** Implement consistent error handling and response formats for API endpoints.
*   **Scalability:** Consider potential bottlenecks, especially around YouTube API quota limits.
*   **Security:** Ensure proper validation of all inputs and secure handling of credentials and tokens. 