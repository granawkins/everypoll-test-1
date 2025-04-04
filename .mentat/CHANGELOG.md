# EveryPoll Changelog

## Step 3: Google OAuth Integration (2025-04-04)

- Added Google OAuth integration:
  - Installed google-auth-library for OAuth functionality
  - Implemented direct fetch requests without Passport.js
  - Created configurable Google client credentials
- Added new authentication routes:
  - GET /api/auth/login: Redirects to Google's OAuth consent screen
  - GET /api/auth/callback: Handles response from Google after authentication
- Implemented Google OAuth utilities:
  - Generation of OAuth URLs with proper scopes
  - Token exchange functionality
  - User profile information retrieval
- Enhanced user management:
  - Created functions to create/update users based on Google profile
  - Maintained compatibility with existing anonymous user system
  - Integrated with JWT token generation
- Secured authentication flow:
  - Added state parameter for CSRF protection
  - Implemented proper error handling for all OAuth steps
  - Used HTTP-only cookies for secure token storage
- Created comprehensive tests:
  - Google login redirect functionality
  - OAuth callback processing with various scenarios
  - User creation and update from Google profiles
  - Error handling for different failure scenarios

## Step 2: Basic JWT Authentication (2025-04-04)

- Added minimal dependencies:
  - jsonwebtoken for JWT token generation and validation
  - cookie-parser for cookie management
- Implemented JWT utilities:
  - Token generation and validation functions
  - Secure HTTP-only cookie settings
  - Anonymous user creation
- Created authentication middleware:
  - `authenticate`: Attaches user to request (anonymous if no valid token)
  - `requireAuth`: Protects routes from unauthenticated users
- Added authentication routes:
  - GET /api/auth/me: Returns user from token or creates anonymous user
  - POST /api/auth/logout: Clears authentication cookie
- Integrated authentication with main application:
  - Added cookie parsing middleware
  - Attached user to all requests
  - Added test protected route
- Created comprehensive tests:
  - JWT token generation and validation
  - Authentication routes behavior
  - Middleware functionality
  - Protected route access control

## Step 1: Database Setup (2025-04-04)

- Added better-sqlite3 and uuid as dependencies
- Created database configuration with separate paths for main and test databases
- Implemented database initialization script that creates tables if they don't exist
- Defined all required tables:
  - Users (id, email, name)
  - Polls (id, author_id, created_at, question)
  - Answers (id, poll_id, text)
  - Votes (id, poll_id, answer_id, user_id, created_at)
- Added foreign key constraints and relationships between tables
- Implemented a migrations system for future schema changes
- Created a comprehensive database utilities class with CRUD operations for all entities
- Added cross-reference functionality to query poll results filtered by another poll's answers
- Created database tests to verify all functionality
- Updated Express application to use the database
- Added database status endpoint for health checking