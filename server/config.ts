// Environment configuration for deployment
export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL,
  
  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || 'default-secret',
  sessionTtl: 7 * 24 * 60 * 60 * 1000, // 1 week
  
  // Replit Auth configuration
  replitDomains: process.env.REPLIT_DOMAINS,
  replId: process.env.REPL_ID,
  issuerUrl: process.env.ISSUER_URL || 'https://replit.com/oidc',
  
  // Check if Replit Auth is enabled
  get isReplitAuthEnabled() {
    return !!(this.replitDomains && this.replId);
  },
  
  // Validate required environment variables
  validate() {
    const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // For Replit Auth, these are optional but recommended
    if (this.replitDomains && !this.replId) {
      throw new Error('REPL_ID is required when REPLIT_DOMAINS is set');
    }
    
    // Warning for deployment without Replit Auth
    if (this.isProduction && !this.isReplitAuthEnabled) {
      console.warn('Warning: Running in production without Replit Auth. Basic session auth will be used.');
    }
  }
};

// Validate configuration on startup
config.validate();