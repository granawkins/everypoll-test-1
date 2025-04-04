# EveryPoll Development Roadmap

This roadmap outlines the step-by-step development process for building the EveryPoll application. Each step represents one PR that implements specific features with testable functionality at each stage.

The roadmap is divided into two phases:

1. Backend Development (PRs 1-7)
2. Frontend Development (PRs 8-14)

## Backend Development

## Step 1: Database Setup

**Summary:** Set up the SQLite database with all required tables and a migrations system.

**Tasks:**

- Add SQLite as a dependency (better-sqlite3)
- Create database initialization script that builds the DB if not found
- Define all tables (Users, Polls, Answers, Votes) in the initialization script
- Implement a migrations system for future schema changes
- Create a testing database setup that reinitializes for tests

**Tests:**

- Database should be created automatically when app initializes
- All tables should be created with correct schemas
- Migration system should apply migrations in order
- Test database should reset between test runs
- Basic CRUD operations should work on all tables
- Tests should run successfully in both local and CI environments

## Step 2: Basic JWT Authentication

**Summary:** Implement JWT-based authentication with cookie management and anonymous users.

**Tasks:**

- Add minimal dependencies (jsonwebtoken only)
- Create API routes for basic authentication (/api/auth/\*)
- Implement JWT generation and validation functions
- Store JWTs in HTTP-only cookies for security
- Create anonymous user when no valid JWT is present
- Return user object when valid JWT is provided
- Implement middleware for protected routes

**Tests:**

- `/api/auth/me` should return anonymous user if no JWT
- `/api/auth/me` should return user object if valid JWT
- JWT verification should properly validate tokens
- Protected routes should reject unauthenticated requests
- Authentication middleware should work correctly

## Step 3: Google OAuth Integration

**Summary:** Add Google OAuth authentication to the existing JWT system.

**Tasks:**

- Implement Google OAuth flow using direct fetch requests (no Passport.js)
- Create login endpoint that redirects to Google
- Create callback endpoint to handle Google's response
- Extract user information from Google profile and create/update user
- Generate and set JWT after successful authentication
- Add logout functionality to clear cookies

**Tests:**

- `/api/auth/login` should redirect to Google login
- OAuth callback should properly handle Google's response
- User should be created or updated with Google profile information
- Valid JWT should be set in cookies after successful authentication
- `/api/auth/logout` should clear authentication cookie

## Step 4: Poll Creation and Viewing

**Summary:** Implement API endpoints for creating and viewing polls.

**Architecture:**

- Follow a layered architecture pattern:
  - **Controllers**: Handle HTTP concerns, don't return anything (void)
  - **Services**: Contain business logic, return data (optional layer)
  - **Repositories**: Handle data access (already implemented)

**Tasks:**

- Create poll controllers with proper Express middleware signatures:

  ```typescript
  // Proper pattern for Express controllers in TypeScript
  const createPoll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Logic here, sending response via res.json()
    } catch (error) {
      next(error); // Pass errors to Express error handler
    }
  };
  ```

- Implement validation for poll creation (2-10 answers)
- Create endpoint to get poll details by ID with proper error handling
- Include author information in poll responses
- Setup route protection using the existing auth middleware
- Add appropriate error handling throughout

**Implementation Considerations:**

- When implementing Express route handlers, consider TypeScript compatibility:
  ```typescript
  // TypeScript may raise compatibility errors with Express route handlers
  // If needed, use targeted @ts-expect-error directives for specific routes
  // @ts-expect-error - Express handler compatibility issue
  router.post('/', authenticate, requireAuth, createPoll);
  ```

**Test Setup:**

- Ensure proper database isolation between tests:
  ```typescript
  // In beforeEach of test files
  beforeEach(() => {
    initializeTestDatabase(); // Reset database for clean state
  });
  ```
- Test unique constraint violations by using unique test data
- Use unique data in each test to prevent test interference

**Tests:**

- POST to create poll should validate and store poll with answers
- GET poll by ID should return complete poll with answers and author info
- Non-authenticated users should not be able to create polls
- Invalid polls (too few/many options) should be rejected

## Step 5: Voting System

**Summary:** Add the ability for users to vote on polls and retrieve voting statistics.

**Tasks:**

- Create endpoint for recording votes
- Update poll retrieval endpoint to include vote counts
- Add logic to check if user has already voted
- Ensure votes can only be cast by authenticated users
- Request with malformed data should return appropriate error responses

**Tests:**

- POST to vote should record vote in database
- GET poll should include vote counts for each answer
- Users should not be able to vote twice on the same poll
- Non-authenticated users should not be able to vote
- Vote counts should update correctly after new votes

## Step 6: Cross-Reference Functionality

**Summary:** Implement the backend for cross-referencing polls with other polls.

**Tasks:**

- Enhance poll retrieval endpoint to accept cross-reference parameters
- Implement database queries to filter poll results by cross-referenced poll votes
- Return segmented results based on cross-referenced poll answers

**Tests:**

- GET poll with cross-reference params should return filtered results
- Results should segment correctly based on answers from cross-referenced poll
- Multiple levels of cross-referencing should work (nested references)
- Invalid cross-reference parameters should return appropriate errors

## Step 7: Feed and Search Routes

**Summary:** Create endpoints for the poll feed and search functionality.

**Tasks:**

- Implement paginated feed endpoint
- Add search functionality to feed endpoint
- Create endpoint for searching polls to cross-reference
- Include sorting options (newest first by default)

**Tests:**

- GET feed should return paginated list of polls
- Feed should support pagination parameters
- Search should return relevant results based on query
- Cross-reference search should filter appropriately
- Sorting should work as expected

## Frontend Development

## Step 8: Basic PollCard Component

**Summary:** Create the core PollCard component with voting functionality.

**Tasks:**

- Create PollCard component to display poll question and answer options
- Implement voting functionality that calls the appropriate API
- Show column chart and vote count after voting
- Style the component according to application design

**Tests:**

- PollCard should display question and answer buttons
- Clicking vote should call API and update UI
- After voting, column chart should display with percentages
- Vote count should display correctly
- User's selected answer should be highlighted

## Step 9: Cross-Reference UI

**Summary:** Enhance PollCard with cross-reference functionality.

**Tasks:**

- Add cross-reference search bar after voting
- Implement selection of polls to cross-reference
- Create sub-charts for cross-referenced results
- Allow main chart to update when selecting different cross-reference segments
- Display cross-reference text and selector below main question

**Tests:**

- Cross-reference search should appear after voting
- Selecting a poll should load cross-referenced results
- Sub-charts should display correctly for each answer option
- Clicking on sub-charts should update the main chart
- Cross-reference selector should work correctly

## Step 10: Feed Implementation

**Summary:** Create the landing page with an infinite scroll feed of polls.

**Tasks:**

- Implement landing page with feed of polls
- Add infinite scroll functionality
- Connect to feed API endpoint
- Handle loading states and errors

**Tests:**

- Feed should load and display polls
- Scrolling should load more polls
- Each poll in feed should be interactive
- Loading states should display appropriately

## Step 11: Header Component

**Summary:** Create the header with logo, search, and user controls.

**Tasks:**

- Create sticky header component
- Add EveryPoll logo
- Implement search bar that updates feed results
- Add login button or user avatar based on login state

**Tests:**

- Header should stick to top of page
- Search should update feed results
- Login button should appear for logged-out users
- Avatar should appear for logged-in users
- Create poll button should be visible for logged-in users

## Step 12: Poll Creation Screen

**Summary:** Implement the interface for creating new polls.

**Tasks:**

- Create poll creation form with dynamic answer fields
- Implement validation (2-10 answer options)
- Connect to poll creation API
- Add success/error feedback
- Redirect to new poll after creation

**Tests:**

- Form should allow adding/removing answer options
- Validation should prevent submission with too few/many answers
- Successful creation should redirect to new poll
- Errors should display appropriate messages

## Step 13: User Profile (Non-Owner View)

**Summary:** Create the public user profile view.

**Tasks:**

- Implement user profile page
- Show user information (name, etc.)
- Display feed of polls created by user

**Tests:**

- Profile should load user information
- Created polls should display in feed
- Pagination should work for polls feed

## Step 14: User Profile (Owner View)

**Summary:** Enhance user profile with owner-specific functionality.

**Tasks:**

- Add tabs for "Created" and "Voted" polls
- Implement logout functionality
- Show additional user information for the owner
- Connect to appropriate API endpoints

**Tests:**

- Both tabs should display correct polls
- Logout button should function correctly
- Owner should see additional controls/information
- Switching tabs should update displayed polls
