# EOS Platform - Project Documentation for Claude

## Project Overview
EOS Platform is a web application for implementing the Entrepreneurial Operating System (EOS) methodology. It helps organizations manage their Vision/Traction Organizer (VTO), priorities, issues, and team accountability.

## Key Architecture Decisions

### Database
- **PostgreSQL** - All data is stored in PostgreSQL, hosted on Railway
- **NO LOCAL FILE STORAGE** - Documents and files are stored as bytea in PostgreSQL, NOT on the filesystem
- Railway deployments have ephemeral filesystems - any local files are lost on redeploy

### Technology Stack
- **Backend**: Node.js with Express
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **Hosting**: Railway (both frontend and backend)
- **Authentication**: JWT tokens

### Document Storage
- Documents are stored in the `documents` table
- File content should be stored in a `file_content` bytea column in PostgreSQL
- The `file_path` column is deprecated and should not be used
- This ensures documents persist across deployments

### Important URLs
- Production: https://42vibes.com
- API: https://eos-platform-production.up.railway.app/api/v1

### Common Commands
- Lint: `npm run lint`
- Type check: `npm run typecheck` (if available)

## Current Issues and Solutions

### Document Download 404 Error
- **Problem**: Documents were being stored on local filesystem which is lost on Railway redeploy
- **Solution**: Store document content in PostgreSQL bytea column instead of filesystem

## Database Schema Notes

### Documents Table
- `id`: UUID primary key
- `title`: Document title
- `description`: Optional description
- `category`: Document category (strategy, blueprints, policies, etc.)
- `file_name`: Original filename
- `file_path`: DEPRECATED - do not use
- `file_content`: bytea column for storing actual file data (needs to be added)
- `file_size`: Size in bytes
- `mime_type`: MIME type of file
- `visibility`: company, department, or private
- `organization_id`: Foreign key to organizations
- `department_id`: Optional foreign key to teams
- `uploaded_by`: Foreign key to users
- `related_priority_id`: Optional foreign key to priorities

## Development Guidelines

1. Always use PostgreSQL for data persistence
2. Never rely on local filesystem for storage
3. Test features with Railway deployments in mind
4. Document any new architectural decisions in this file