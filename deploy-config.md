# Deployment Configuration

## Required Environment Variables

### Core Application
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (set to "production" for deployment)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption

### Replit Authentication (Optional)
- `REPLIT_DOMAINS` - Comma-separated list of deployment domains
- `REPL_ID` - Replit application ID
- `ISSUER_URL` - OpenID Connect issuer URL (optional, defaults to https://replit.com/oidc)

## Fixed Issues

✅ **PORT Configuration**: Application now uses PORT environment variable properly
✅ **NODE_ENV Handling**: Conditional security settings based on environment
✅ **Session Configuration**: Proper cookie security for production
✅ **Replit Auth**: Made optional for deployments that don't require it
✅ **Environment Validation**: Added proper validation with helpful error messages

## Deployment Steps

1. Ensure all required environment variables are set in deployment secrets
2. Run `npm run build` to create production build
3. Deploy with `NODE_ENV=production`
4. Application will automatically:
   - Use secure cookies in production
   - Validate required environment variables
   - Enable proper session management
   - Use either Replit Auth or basic session auth based on available variables

## Features

- **Graceful Degradation**: If Replit Auth variables are not available, the app falls back to basic session authentication
- **Security**: Proper cookie security settings for production
- **Validation**: Comprehensive environment variable validation with clear error messages
- **Flexibility**: Supports both Replit Auth and basic authentication modes