# EveryPoll Changelog

## Step 6: Cross-Reference Functionality (2025-04-04)

- Enhanced poll retrieval endpoint to support cross-referencing:
  - Added support for query parameters to specify cross-referenced polls and answers
  - Implemented parsing and validation of cross-reference parameters
  - Added ability to handle multiple levels of cross-referencing
  - Returned segmented results based on cross-referenced poll answers
- Implemented comprehensive error handling for cross-referencing:
  - Validated existence of cross-referenced polls
  - Verified answer IDs belong to the correct polls
  - Provided clear error messages for invalid parameters
  - Skipped incomplete cross-reference pairs gracefully
- Created structured response format for cross-references:
  - Included poll question and answer text for context
  - Organized vote counts filtered by cross-referenced answer
  - Maintained compatibility with existing poll retrieval functionality
- Added comprehensive tests for cross-reference functionality:
  - Tested basic cross-reference parameter handling
  - Verified different results for different cross-referenced answers
  - Confirmed multiple cross-references work correctly
  - Validated error handling for invalid parameters
  - Tested behavior with missing parameters

## Step 5: Voting System (2025-04-04)

- Added voting functionality to polls:
  - Implemented POST /api/poll/:id/vote endpoint for recording votes
  - Added proper validation and error handling for vote submissions
  - Ensured votes can only be cast by authenticated users
  - Prevented users from voting twice on the same poll
  - Returned updated vote counts after successful votes
- Enhanced error handling for voting:
  - Validated poll existence before accepting votes
  - Verified that answer IDs belong to the correct poll
  - Provided clear error messages for all validation failures
  - Returned appropriate HTTP status codes for different error cases
- Implemented comprehensive testing for voting system:
  - Tested successful vote recording and database updates
  - Verified authentication requirements for voting
  - Confirmed prevention of duplicate votes
  - Validated error responses for malformed requests
  - Tested vote count accuracy after multiple votes

## Step 4: Poll Creation and Viewing (2025-04-04)

- Created poll controllers following layered architecture pattern:
  - Implemented request validation and HTTP response handling
  - Leveraged existing database utilities for data operations
  - Used proper async/await patterns with error handling
- Added poll creation endpoint with validation:
  - POST /api/poll: Creates a new poll with answers
  - Enforced poll requirements (2-10 answers, non-empty text)
  - Protected endpoint requiring authentication
- Added poll viewing endpoint with details:
  - GET /api/poll/:id: Returns poll with answers, author info, and vote counts
  - Included user's vote status when authenticated
  - Provided appropriate error handling for invalid IDs
- Integrated polls module with main application:
  - Created modular exports for controllers and routes
  - Added proper route middleware
  - Used authentication middleware for protected routes
- Implemented comprehensive testing:
  - Poll creation with valid/invalid data
  - Authentication requirements verification
  - Poll retrieval with all required data
  - Error cases for both endpoints

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