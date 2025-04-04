# EveryPoll

EveryPoll is a social network website for polls, where every poll can be cross-referenced to any other poll. This document is the complete spec for the project.

## User Experience

1. The atomic unit of EveryPoll is a PollCard, which works like this:

   - Displayed is the question, the author's name and a link to their public profile, buttons for each answer option, and the vote count.
   - When the user clicks an answer, their vote is recorded and the the buttons change to a column chart showing the results, with percentages and the answer they voted for highlighted.
   - Below the chart & vote count (after voting) is a search bar where the user can search for and select another poll to cross-reference.
   - When a cross-referenced poll is selected, if the user hasn't voted on it, the questino/buttons interface is displayed (below the main chart).
   - After they've voted, N new column charts are displayed - one for each answer option. These charts show the results for the original poll, only for people who voted (N) in the cross-referenced poll.
   - When the user clicks on one of those charts, it replaces the main chart, and below the original question is the cross-referenced poll's question with a drop-down of the different answer options.
   - This can be repeated indefinitely.

2. The landing page (everypoll.com) consists of a vertical feed of polls. The feed is an infinite scroll of PollCards selected by an algorithm on the server.

3. The top of the page is a sticky header with the EveryPoll logo on the left, a search bar in the middle (which updates the feed), and buttons on the right.

4. Users are tied to a Google account and must be logged in to vote.

   - If they click a vote button while not logged in, a modal window pops up with a Login with Google button.
   - In the top-right corner is either a Login with Google button or their avatar.
   - Clicking the Login with Google button redirects them to the Google login page, then back to where they were.
   - If they click the avatar, their brought to the user screen where they see their email and a logout button, and a 2-tab interface:
     - The first tab shows polls they've created, in a feed just like the landing page.
     - The second tab shows polls they've voted on, again in a feed just like the landing page.

5. Logged-in users can create polls.
   a. On the top bar, left of the avatar, is a button that says "Create Poll".
   b. Clicking it brings them to the poll creation screen.
   c. There are inputs for the question and for each answer option. Polls require at least 2 answers, and can have up to 10.

## Technical Implementation

It is built from the mentat-template-js repo, which is a full-stack javascript application with a React frontend and Node.js backend. Added is a sqlite database and Google user authentication.

### Backend

1. A sqlite database with the following tables. It should be implemented such that when the application is started, the database is created if it doesn't exist, and the tables are created if they don't exist. A migrations system should be implemented (empty for now) such that when the application is updated, the database is updated to the latest version.

   - Users
     - id (uuid, required, unique)
     - email (text, optional, unique)
     - name (text, optional, unique)
   - Polls
     - id (uuid, required, unique)
     - author_id (uuid, required, foreign key)
     - created_at (datetime, required)
     - question (text, required)
   - Answers
     - id (uuid, required, unique)
     - poll_id (uuid, required, foreign key)
     - text (text, required)
   - Votes
     - id (uuid, required, unique)
     - poll_id (uuid, required, foreign key)
     - answer_id (uuid, required, foreign key)
     - user_id (uuid, required, foreign key)
     - created_at (datetime, required)

2. An express server with the following routes (\* = authenticated):
   - GET /api/auth/me - passes the user's session cookie if found (otherwise null). If cookie is found, it should be verified and the user object should be returned. If not, create a new anonymous user (no email) and session cookie and return that.
   - POST /api/auth/login - redirects the user to the Google login page, passing their id and redirect url.
   - POST /api/auth/google-callback - verifies the user's Google login, updates their database entry with user's name and email, and passes the user's session cookie and user object back to the client.
   - POST /api/auth/logout - clears the user's session cookie.
   - GET /api/feed\* - returns a paginated feed of polls, ordered by creation date.
   - GET /api/feed/search?q=<query>\* - returns a paginated feed of polls that match the query.
   - POST /api/poll\* - creates a new poll
   - POST /api/poll/:id/vote\* - records a vote for the given poll id and answer id, and passes the vote object back to the client.
   - GET /api/poll/:id?p1=<pollId1>&a1=<answerId1>&p2=<pollId2>&a2=<answerId2>\* - returns a poll and all its data by id, with optional cross-references to other polls.
   - GET /api/poll/:id/search?q=<query>&p1...\* - returns a list of polls to cross-reference with the given poll. Query is optional, as are other already-cross-referenced polls.

### Frontend

A react application.

1. React Router with the following pages:

   - / - the landing page with header and feed of polls
   - /poll/:id?p1... - view a single poll and optionally cross-reference
   - /user - view a user's profile and the polls they've created. If logged in and viewing your own profile, there is an option to logout and a second tab with polls you've voted on.
   - /create - create a new poll

2. The following standard components:
   - Header, visible on all pages, with logo, search bar (if on feed), login button or avatar/create poll button
   - PollCard, used to display any poll. Will have many sub-components like answer buttons, column charts, cross-reference search bar, etc.

### Conventions

This project will be built and managed primarily using AI. As such:

1. Try to avoid adding dependencies beyond what is specified in this spec. If you must, use popular libraries and always check for the most recent version.
2. Comment liberally.
3. Add tests wherever possible.

The project is meant to be 'compiled' into code from this spec and ROADMAP.md. The standard way of compiling:

1. The user asks an AI to 'complete the next step'.
2. The AI reviews this document, the ROADMAP.md, and the CHANGELOG.md, determines which step is next, implements it and submits a PR. The PR should include an update to the CHANGELOG.md, with a number corresponding to the step of the ROADMAP.md.
3. The user reviews the PR and gives feedback until it's approved, and proceed to the next step.
4. Based on the user's feedback, the AI may also choose update the README.md and ROADMAP.md, such that the next time the project is 'compiled', that feedback is already incorporated.
