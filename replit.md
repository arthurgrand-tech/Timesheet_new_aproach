# Timesheet Application - Multi-Tenant SaaS

## Overview

This is a multi-tenant SaaS timesheet application built with React, Node.js, and PostgreSQL. The application allows organizations to manage employee timesheets with role-based access control and subscription tiers. It features a modern architecture with a clean separation between frontend and backend components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with JSON responses

### Multi-Tenant Structure
The application implements a multi-tenant architecture where:
- Each organization has its own isolated data space
- Users belong to specific organizations
- All data operations are scoped to the user's organization
- Subscription limits are enforced per organization

## Key Components

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control with three levels:
  - **Employee**: Basic timesheet submission and viewing
  - **Supervisor**: Team management and timesheet approval
  - **Super Admin**: Organization-wide management and settings
- Organization-scoped data access middleware

### Database Schema
- **Organizations**: Multi-tenant organization management
- **Users**: Employee data with role-based permissions
- **Projects**: Project management with client tracking
- **Tasks**: Task assignments linked to projects
- **Timesheets**: Weekly timesheet submissions
- **Timesheet Entries**: Individual time entries per project/task
- **Audit Logs**: Activity tracking for compliance

### Frontend Components
- **Layout System**: Responsive sidebar navigation with mobile support
- **Modal System**: Reusable modals for data entry and management
- **Form Components**: Standardized form inputs with validation
- **Dashboard**: Overview widgets and quick actions
- **Data Tables**: Sortable, filterable data presentation

## Data Flow

1. **User Authentication**: Login validates credentials and returns JWT token
2. **Organization Context**: All API requests include organization context
3. **Role-Based Access**: Middleware checks user permissions for each endpoint
4. **Data Filtering**: Database queries automatically scope to user's organization
5. **Real-time Updates**: React Query manages cache invalidation and updates

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Efficient database connection management

### UI/UX
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Modern icon library
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Development Tools
- **TypeScript**: Static type checking
- **Vite**: Fast build tool and development server
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing

## Deployment Strategy

### Production Build
- Frontend builds to static files served by Express
- Backend compiles to single JavaScript file
- Environment variables manage database connections
- Session storage uses PostgreSQL for persistence

### Development Workflow
- Hot module replacement for frontend development
- Automatic TypeScript checking
- Database migrations with Drizzle Kit
- Replit-optimized development environment

### Key Features
- **Multi-tenant data isolation**
- **Subscription-based user limits**
- **Role-based feature access**
- **Audit logging for compliance**
- **Responsive mobile-first design**
- **Real-time data synchronization**

The application is designed to scale with growing organizations while maintaining strict data isolation and security controls.