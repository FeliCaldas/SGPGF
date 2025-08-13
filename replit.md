# Weight Management System

## Overview

This is a comprehensive weight management system for fishing company workers built with Python and Streamlit. The system provides role-based access control with separate dashboards for employees and administrators, real-time weight tracking, and performance analytics.

## Recent Changes (Jan 2025)
- **Architecture Migration**: Migrated from React/Express to Streamlit for simplified deployment and maintenance
- **Running on Port 5000**: Streamlit application configured to run on port 5000 instead of default 8501

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Current Stack (Streamlit)
- **Framework**: Streamlit for full-stack web application
- **Language**: Python 3.11
- **Database**: PostgreSQL for data persistence
- **Authentication**: Custom authentication with bcrypt for password hashing
- **Data Visualization**: Plotly for interactive charts and graphs
- **Data Processing**: Pandas for data manipulation and analysis

### Previous Stack (Reference)
- React 18 with TypeScript frontend
- Node.js with Express.js backend  
- Drizzle ORM for database operations
- Maintained for reference and potential migration back if needed

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect for secure user authentication
- **Session Storage**: PostgreSQL-backed sessions for persistence across requests
- **Role-Based Access**: Admin and regular user roles with middleware protection
- **Security**: HTTP-only cookies with secure flags for session management

### Database Schema
- **Users Table**: Stores user profiles with admin flags, work types, and activity status
- **Weight Records Table**: Tracks daily weight entries with user association, work type, and optional notes
- **Sessions Table**: Required for Replit Auth session persistence

### API Structure
- **Authentication Routes**: `/api/auth/user`, `/api/login`, `/api/logout`
- **User Management**: `/api/users`, `/api/users/active` (admin only)
- **Weight Records**: CRUD operations for weight tracking with date filtering
- **Analytics**: Daily and monthly statistics endpoints

### UI Components
- **Mobile Header**: Consistent navigation header with title and menu
- **Bottom Navigation**: Tab-based navigation for mobile experience
- **Stats Cards**: Reusable cards for displaying metrics
- **Loading Overlay**: Consistent loading states across the application
- **Form Components**: Standardized form inputs with validation

## Data Flow

1. **Authentication Flow**: Users authenticate through Replit Auth, sessions are stored in PostgreSQL
2. **Role-Based Routing**: Admin users see admin dashboard, regular users see user dashboard
3. **Data Fetching**: TanStack Query manages server state with automatic caching and refetching
4. **Form Submission**: React Hook Form with Zod validation ensures data integrity before API calls
5. **Real-time Updates**: Query invalidation ensures UI stays synchronized with server state

## External Dependencies

### Core Technologies
- **Database**: Neon PostgreSQL for scalable cloud database
- **UI Components**: Radix UI primitives for accessible component foundation
- **Validation**: Zod for runtime type validation
- **Date Handling**: date-fns for date manipulation and formatting

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Vite**: Development server with hot module replacement
- **Drizzle Kit**: Database migrations and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for secure authentication (optional)
- **Session Storage**: PostgreSQL sessions with connect-pg-simple
- **Fallback Auth**: Basic session authentication when Replit Auth is not available

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations ensure schema consistency

### Environment Configuration
- **Development**: Uses `tsx` for TypeScript execution with hot reload
- **Production**: Compiled JavaScript with NODE_ENV=production
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Required Environment Variables
- `PORT`: Server port (defaults to 5000)
- `NODE_ENV`: Environment mode (set to "production" for deployment)
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption

### Optional Environment Variables (Replit Auth)
- `REPLIT_DOMAINS`: Comma-separated list of deployment domains
- `REPL_ID`: Replit application ID
- `ISSUER_URL`: OpenID Connect issuer URL (defaults to https://replit.com/oidc)

### Scripts
- `npm run dev`: Development server with hot reload
- `npm run build`: Production build for both frontend and backend
- `npm run start`: Production server startup
- `npm run db:push`: Database schema synchronization

### Deployment Features
- **Graceful Degradation**: Falls back to basic session auth if Replit Auth is not configured
- **Security**: Automatic secure cookie configuration in production
- **Validation**: Comprehensive environment variable validation with clear error messages
- **Flexibility**: Supports both Replit Auth and basic authentication modes

The application follows a monorepo structure with shared TypeScript types and utilities, ensuring type safety across the entire stack while maintaining a clean separation of concerns between client and server code.