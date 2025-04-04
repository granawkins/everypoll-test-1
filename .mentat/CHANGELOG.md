# EveryPoll Changelog

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