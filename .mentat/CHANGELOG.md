# EveryPoll Changelog

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