# Weight Management System

## Overview

This is a full-stack weight management application built for a fishing company (Pesqueira) to track production weights by employees. The system provides role-based access with admin and user dashboards, allowing weight record entry, analytics, and user management.

## User Preferences

Preferred communication style: Simple, everyday language.
Target audience: Fishing company (Pesqueira) workers and managers
Device support: Must work on mobile devices (mobile-first design)
Language: Portuguese (Brazil)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state management
- **Form Management**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Key Components

#### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-Based Access**: Admin and regular user roles with middleware protection
- **Security**: HTTP-only cookies with secure flag for session management

#### Database Schema
- **Users Table**: Stores user profiles with admin flags, work types, and activity status
- **Weight Records Table**: Tracks daily weight entries with user association, work type, and optional notes
- **Sessions Table**: Required for Replit Auth session persistence

#### API Structure
- **Authentication Routes**: `/api/auth/user`, `/api/login`, `/api/logout`
- **User Management**: `/api/users`, `/api/users/active` (admin only)
- **Weight Records**: CRUD operations for weight tracking with date filtering
- **Analytics**: Daily and monthly statistics endpoints

#### UI Components
- **Admin Dashboard**: User management, weight entry forms, comprehensive analytics
- **User Dashboard**: Personal weight tracking and statistics viewing
- **Landing Page**: Authentication portal for system access
- **Component Library**: shadcn/ui components for consistent design

## Data Flow

1. **Authentication**: Users authenticate through Replit Auth, sessions stored in PostgreSQL
2. **Role-Based Routing**: Admin users access admin dashboard, regular users access user dashboard
3. **Weight Entry**: Forms validate using Zod schemas, data persisted via Drizzle ORM
4. **Analytics**: Real-time calculations for daily/monthly statistics using SQL aggregations
5. **State Management**: React Query handles caching, synchronization, and optimistic updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection with Neon serverless support
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **openid-client**: OpenID Connect authentication
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Fast bundling for production builds

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key (required)
- **REPL_ID**: Replit environment identifier for auth
- **ISSUER_URL**: OpenID Connect issuer (defaults to Replit)

### Deployment Commands
- `npm run build`: Builds both frontend and backend for production
- `npm run start`: Runs production server
- `npm run db:push`: Applies database schema changes
- `npm run dev`: Development server with hot reload

The application is designed to run on Replit's infrastructure with automatic provisioning of PostgreSQL databases and integrated authentication, but can be deployed to other platforms with appropriate environment variable configuration.