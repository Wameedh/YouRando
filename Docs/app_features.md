# YouRando App Features (Backend API & Frontend)

This document tracks implemented features and planned improvements for the YouRando application, now separated into a Backend API and various Frontend clients (starting with React).

## Implemented Features (Backend API)

### Authentication & Authorization
- [x] YouTube OAuth integration (Google Strategy) for user authentication via web flow
- [x] Session-based user management for authenticated API access (primarily for web clients)
- [x] Secure token handling (access & refresh stored in session)
- [x] `/auth/google`, `/auth/google/callback`, `/auth/logout` endpoints for web-based OAuth flow
- [x] `/api/user/status` endpoint to check authentication state (returns JSON)

### Recommendation Engine
- [x] Subscription data retrieval via YouTube API
- [x] Watch history processing (currently via session after Takeout upload - *Needs dedicated upload endpoint*)
- [x] Intelligent recommendation algorithm filtering subscribed channels & watched videos
- [x] Use of diverse search terms for discovery
- [x] Fallback to trending videos or popular videos
- [x] `/api/recommendations` endpoint to serve recommendations (returns JSON)

### User Data & Settings
- [x] `/api/settings` endpoint (GET & POST) for managing user preferences (discovery level, excluded categories) - *Data stored in session, needs persistence*
- [x] Placeholder API routes for data export (`/api/user/data/export`) and deletion (`/api/user/data`) - *Functionality needs full implementation*
- [x] Placeholder API route for Takeout upload (`/api/user/watch-history/upload`) - *Functionality needs verification/refinement*

### API Infrastructure
- [x] Node.js/Express server setup
- [x] CORS configured for frontend communication
- [x] Basic static file serving configured for a React build
- [x] Catch-all route for client-side routing (React Router)

## Implemented Features (Frontend - React - Initial Setup)

- [x] Project initialized using Vite + React
- [x] Basic project structure created
- [x] Client-side routing implemented (`react-router-dom`)
- [x] UI Components created:
  - [x] `Header` (with navigation and user info)
  - [x] `LoginPage`
  - [x] `DashboardPage` (fetches and displays recommendations)
  - [x] `VideoCard` (for displaying individual videos)
  - [x] `SettingsPage` (fetches/saves settings, handles Takeout upload)
  - [x] `LoadingSpinner`
- [x] API Integration:
  - [x] Calling `/api/user/status`, `/api/recommendations`, `/api/settings` (GET/POST), `/api/user/watch-history/upload`, `/auth/logout`
- [x] Authentication state handling (redirects based on user status)
- [x] Settings UI implemented (discovery level, category exclusion)
- [x] Watch history upload UI implemented (file selection, upload, status feedback)
- [x] Loading and error states implemented in UI (Dashboard, Settings)
- [x] Styling implemented using CSS files for components and pages

## Planned Improvements / TODOs

### Backend API
- [ ] Implement persistent storage (e.g., MongoDB) for user profiles, settings, tokens, and processed watch history.
- [ ] Refine and fully implement the `/api/user/watch-history/upload` endpoint for robust Takeout processing.
- [ ] Fully implement `/api/user/data/export` and `/api/user/data` endpoints.
- [x] Implement token-based authentication (`Authorization: Bearer <token>`) for native clients (like tvOS) alongside session auth.
- [ ] Enhance error handling and provide consistent JSON error responses.
- [ ] Add input validation for API endpoints.
- [ ] Consider API versioning.
- [ ] Implement rate limiting.
- [ ] Set up logging (e.g., Winston, Morgan).
- [ ] Add unit and integration tests.

### Frontend (React)
- [ ] Implement global error handling (e.g., interceptor for 401s -> redirect to login).
- [ ] Fetch actual YouTube categories from backend API for Settings page checkboxes.
- [ ] Add frontend unit/integration tests.
- [ ] Further UI/UX refinements as needed.
- [ ] Consider state management library for larger scale (e.g., Zustand, Redux Toolkit) if complexity increases.

### Cross-Cutting
- [ ] Scheduled reminders for refreshing watch history data (requires backend changes + potentially frontend UI).
- [ ] Smarter recommendation filtering based on watch patterns.
- [ ] Recommendation history tracking.

*Note: This document reflects the state after restructuring into backend/frontend.* 