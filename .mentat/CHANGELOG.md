# EveryPoll Changelog

## Step 14: User Profile (Owner View) (2025-04-04)

- Enhanced UserProfile component with owner-specific functionality:
  - Added detection of when a user is viewing their own profile
  - Implemented tabbed interface for "Created" and "Voted" polls
  - Added logout functionality directly in profile view
  - Displayed user's email address for owner view
  - Created intuitive tab navigation with visual indicators
- Implemented backend support for viewing user's voted polls:
  - Added new database method to get polls by voter ID
  - Enhanced feed controller to support filtering polls by vote history
  - Implemented security to ensure only the owner can see their voted polls
  - Optimized database queries for performance
- Created responsive UI enhancements:
  - Added styled tabs with active state indicators
  - Implemented logout button with visual feedback
  - Ensured mobile responsiveness for all new features
  - Added appropriate loading states when switching tabs
- Enhanced Feed component to support vote history:
  - Added voterId parameter for filtering polls
  - Updated empty state messages for different contexts
  - Ensured pagination works correctly for voted polls
  - Maintained consistent loading and error states
- Implemented comprehensive test suite:
  - Verified different views for owner versus non-owner profiles
  - Tested tab functionality for switching between created and voted polls
  - Validated logout functionality and redirect behavior
  - Confirmed proper display of user email for owner
  - Tested error handling for unauthorized access to voted polls
  - Verified empty states for both created and voted poll tabs

## Step 13: User Profile (Non-Owner View) (2025-04-04)

- Implemented user profile page to display public user information:
  - Created UserProfile component to show user details and their created polls
  - Added route to access user profiles at `/user/:id`
  - Implemented user avatar display with first letter of name
  - Created clean layout to display user information prominently
  - Added descriptive headers to clarify content sections
- Enhanced backend to support user profile functionality:
  - Added `/api/auth/user/:id` endpoint to fetch public user information
  - Updated feed controller to support filtering polls by author ID
  - Implemented proper validation and error handling for user requests
  - Ensured privacy by only returning necessary public user data
- Added poll author linking throughout the application:
  - Updated PollCard to include clickable links to author profiles
  - Added styling for author links with hover effects
  - Maintained consistent design language with the rest of the application
- Created Feed component enhancements for user-specific polls:
  - Added support for filtering polls by author ID
  - Implemented custom empty state messages based on context
  - Ensured pagination works correctly for user-specific polls
  - Added proper error handling for no polls or API failures
- Added comprehensive styling for profile pages:
  - Created responsive profile header with large avatar
  - Styled user information for clear visibility
  - Implemented consistent loading, error, and empty states
  - Ensured mobile-friendly design for all profile elements
- Implemented extensive testing for UserProfile component:
  - Verified loading states are displayed correctly
  - Tested error handling for API failures
  - Confirmed user information is displayed properly
  - Validated polls created by user are shown in the feed
  - Verified pagination works for user-specific polls
  - Tested empty state when user has no polls

## Step 12: Poll Creation Screen (2025-04-04)

- Created poll creation form with dynamic answer fields:
  - Implemented CreatePoll component with interactive form
  - Added ability to add/remove answer options dynamically
  - Created validation to enforce 2-10 answer options requirement
  - Integrated with poll creation API endpoint
  - Added success/error feedback with helpful messages
  - Implemented automatic redirection to new poll after creation
- Integrated React Router DOM for application routing:
  - Set up routes for homepage, poll creation, and poll view
  - Updated App component to handle client-side routing
  - Created route components and updated navigation flow
  - Refactored navigation to use Link components instead of direct URL changes
- Enhanced Header component for better integration:
  - Updated "Create Poll" button to use React Router
  - Added conditional rendering for search bar based on current route
  - Improved user experience with better navigation handling
- Added comprehensive styling for poll creation:
  - Created clean, user-friendly form layout
  - Added visual feedback for validation states
  - Implemented responsive design for all device sizes
  - Enhanced button interactions and hover states
- Created extensive test suite:
  - Validated form interaction with adding/removing answer options
  - Verified form validation prevents submission with invalid data
  - Confirmed API integration for successful poll creation
  - Tested error handling for API failures
  - Covered user redirection after successful submission

## Step 11: Header Component (2025-04-04)

- Created sticky header component with logo, search, and user controls:
  - Implemented Header component that stays fixed at the top of the viewport
  - Added EveryPoll logo with custom checkmark icon
  - Integrated search functionality that updates feed results
  - Created conditional rendering for user login state (login button vs. avatar)
  - Added "Create Poll" button for authenticated users
- Implemented authentication integration:
  - Connected to auth endpoints to determine user status
  - Implemented login and logout functionality
  - Added proper loading and error states for auth operations
  - Created authenticated and unauthenticated UI states
- Enhanced UI design for better user experience:
  - Added glassmorphism effect with backdrop filter
  - Created animated user avatar with hover effects
  - Styled buttons for login and poll creation
  - Implemented responsive design that works on all device sizes
- Applied comprehensive state management:
  - Managed user authentication state
  - Integrated with parent component's search functionality
  - Added proper error handling for API failures
  - Implemented loading indicators for auth operations
- Created extensive test suite:
  - Verified sticky header positioning
  - Tested search functionality and event handling
  - Validated proper display of login button for unauthenticated users
  - Confirmed avatar and create poll button for authenticated users
  - Tested login/logout functionality and error handling
  - Verified responsive behavior for different viewports

## Step 10: Feed Implementation (2025-04-04)

- Created landing page with infinite scroll feed of polls:
  - Implemented Feed component that displays a list of polls with pagination
  - Added infinite scroll functionality using IntersectionObserver API
  - Connected feed to backend API endpoints with proper error handling
  - Implemented loading states for initial load and fetching more polls
  - Added empty state when no polls are found and end-of-feed indicator
- Enhanced App component with search functionality:
  - Added search bar in header to filter polls
  - Implemented debounced search to prevent excessive API calls
  - Updated layout with responsive, sticky header design
  - Improved user experience with loading states and error handling
- Updated UI design for feed presentation:
  - Redesigned header with search functionality
  - Enhanced PollCard appearance in feed context
  - Added subtle animations and hover effects
  - Created responsive layout that works on all device sizes
- Added robust state management:
  - Managed polling mechanism for infinite scroll
  - Handled fetch loading and error states
  - Managed search query state with debouncing
  - Added proper cleanup for interval observers
- Implemented extensive error handling:
  - Added graceful degradation for API failures
  - Created retry mechanisms for failed loading attempts
  - Added user-friendly error messages
  - Ensured stable behavior during network issues
- Created comprehensive test suite:
  - Tested infinite scroll functionality
  - Verified search feature works correctly
  - Validated loading states and error handling
  - Confirmed API integration with proper parameters
  - Tested responsive behavior for different viewports

## Step 9: Cross-Reference UI (2025-04-04)

- Enhanced PollCard component with cross-reference functionality:
  - Added cross-reference search bar after voting
  - Implemented selection of polls to cross-reference
  - Created sub-charts for cross-referenced results
  - Added main chart updates when selecting different cross-reference segments
  - Implemented cross-reference selector for managing multiple cross-references
- Created new UI components for cross-reference functionality:
  - Cross-reference search interface with live results
  - Interactive sub-charts for segment analysis
  - Cross-reference selector for switching between different cross-references
  - Active segment indicator for better user context
- Implemented API integration for cross-references:
  - Connected to search API for finding polls to cross-reference
  - Used query parameters to fetch cross-referenced poll data
  - Handled multiple cross-references in the UI
  - Managed cross-reference state updates
- Added cross-reference state management:
  - State for search functionality
  - State for selected cross-references
  - State for active segments in cross-reference sub-charts
  - State for toggling between cross-reference views
- Enhanced styling for cross-reference UI:
  - Created styles for cross-reference search bar
  - Added visualization for cross-reference sub-charts
  - Styled cross-reference selector for easy switching
  - Implemented active state indicators for selections
- Created comprehensive test suite for cross-reference functionality:
  - Verified cross-reference search appears after voting
  - Tested search functionality and result display
  - Confirmed cross-reference selection and data loading
  - Validated sub-chart display and interaction
  - Tested cross-reference selector functionality
  - Verified updating main chart with different segments

## Step 8: Basic PollCard Component (2025-04-04)

- Created PollCard component with complete voting functionality:
  - Implemented interface to display poll questions and answer options
  - Added API integration for voting functionality
  - Created dynamic column chart visualization for voting results
  - Added user vote highlighting for selected answers
  - Displayed vote counts and percentages for transparency
- Developed comprehensive UI states:
  - Pre-voting view with answer buttons
  - Post-voting view with column chart results
  - Loading states for data fetching
  - Error handling for API failures
- Designed responsive styling:
  - Created clean, modern UI for poll interactions
  - Implemented animated column charts for vote results
  - Added visual highlighting for user's selected answer
  - Designed with mobile-first approach
- Added flexible component API:
  - Support for direct poll data injection
  - Support for poll ID with automatic data fetching
  - Comprehensive TypeScript interfaces
- Updated App component:
  - Added integration with PollCard component
  - Created updated UI with consistent styling
  - Implemented automatic poll fetching from feed
- Enhanced styling system:
  - Added dedicated styling for the PollCard component
  - Updated application layout and typography
  - Improved visual hierarchy and readability
- Created comprehensive test suite:
  - Verified display of poll questions and answer buttons
  - Tested API integration for vote submission
  - Validated proper UI updates after voting
  - Confirmed column chart displays with correct percentages
  - Verified user's selected answer highlighting

## Step 7: Feed and Search Routes (2025-04-04)

- Implemented paginated poll feed and search functionality:
  - Created GET /api/feed endpoint with pagination, sorting, and search capabilities
  - Added GET /api/feed/search as an alias for search-focused feed retrieval
  - Implemented GET /api/poll/:id/search for finding polls to cross-reference
  - Enhanced database utilities to support advanced query options
- Added advanced database query capabilities:
  - Extended poll retrieval with flexible filtering and sorting options
  - Implemented text-based search functionality for poll questions
  - Added cross-reference candidate filtering to exclude already referenced polls
  - Optimized query performance with efficient SQL construction
- Created robust pagination support:
  - Implemented limit and offset parameters for all feed endpoints
  - Added total count for proper client-side pagination handling
  - Included hasMore flag to indicate if more results are available
  - Enforced pagination limits for performance and security
- Enhanced search capabilities:
  - Text-based search across poll questions
  - Integration with pagination for handling large result sets
  - Parameter validation and error handling for search queries
  - Filtering for cross-reference candidates with exclusion support
- Implemented sorting options:
  - Newest first sorting (default)
  - Oldest first sorting option
  - Parameter validation for sort options
- Enhanced response formatting:
  - Included author information with each poll
  - Added vote counts for authenticated users
  - Structured pagination metadata for client convenience
  - Maintained consistent response formats across endpoints
- Created comprehensive tests for all new functionality:
  - Feed pagination with different parameters
  - Search functionality with various query terms
  - Cross-reference search with exclusions
  - Sorting behavior verification
  - Parameter validation and error handling

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