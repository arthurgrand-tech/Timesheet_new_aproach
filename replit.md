# Timesheet Management System

## Overview

This is a full-stack timesheet management application built with React (frontend) and Express.js (backend). The application features multi-tenant architecture with role-based access control, allowing organizations to manage employee timesheets, projects, and approvals efficiently.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI with shadcn/ui component system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL session store
- **Database Provider**: Neon Database (serverless PostgreSQL)

## Key Components

### Database Schema
- **Multi-tenant**: `tenants` table with organization isolation
- **User Management**: `users` table with role-based access (user, manager, admin)
- **Project Management**: `projects` and `tasks` tables for organizing work
- **Time Tracking**: `timesheets` and `timesheet_entries` for time logging
- **Approval Workflow**: Built-in approval status tracking

### Authentication & Authorization
- **Session-based Authentication**: Using Passport.js with express-session
- **Role-based Access Control**: Three roles with different permissions
  - User: Basic timesheet management
  - Manager: Approval capabilities and team reports
  - Admin: Full system access including user management
- **Tenant Isolation**: All data operations are scoped to the user's tenant

### API Structure
- **RESTful Design**: Standard REST endpoints for all resources
- **Protected Routes**: Middleware for authentication and role checking
- **Tenant Middleware**: Automatic tenant scoping for data access
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Data Flow

1. **User Authentication**: Users log in through the auth page, sessions are managed server-side
2. **Data Fetching**: React Query handles all API calls with caching and error handling
3. **Timesheet Management**: Users create weekly timesheets with entries linked to projects/tasks
4. **Approval Workflow**: Managers can approve/reject submitted timesheets
5. **Reporting**: Managers and admins can view aggregated timesheet data

## External Dependencies

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **wouter**: Lightweight routing library
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Form validation with Zod
- **lucide-react**: Icon library
- **tailwindcss**: Utility-first CSS framework

### Backend Dependencies
- **drizzle-orm**: Type-safe SQL ORM
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **drizzle-zod**: Schema validation integration

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx for TypeScript execution in development
- **Database**: Neon Database with connection pooling
- **Environment**: Environment variables for database URL and session secrets

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database Migrations**: Drizzle Kit handles schema migrations
- **Deployment**: Single Node.js process serving both API and static files

### Key Architectural Decisions

1. **Multi-tenant Architecture**: Chosen to support multiple organizations in a single deployment while maintaining data isolation
2. **Session-based Auth**: Selected over JWT for simplicity and better security for web applications
3. **Drizzle ORM**: Preferred for type safety and better TypeScript integration compared to traditional ORMs
4. **React Query**: Implemented for efficient server state management and caching
5. **Radix UI**: Chosen for accessibility-first component primitives
6. **Neon Database**: Selected for serverless PostgreSQL with automatic scaling

The application follows a traditional MVC pattern on the backend with a modern React architecture on the frontend, emphasizing type safety, accessibility, and maintainability throughout the stack.