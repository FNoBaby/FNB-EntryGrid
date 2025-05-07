/**
 * Application configuration settings
 */
const dotenv = require('dotenv');
dotenv.config();

// Environment variables with defaults
const config = {
  // Server settings
  port: process.env.PORT || 3002,
  environment: process.env.ENVIRONMENT || 'DEV',
  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true',
  
  // Database settings
  database: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    name: process.env.DB_NAME || 'dashboard_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    useMysql: process.env.USE_MYSQL !== 'false',
    // Retry settings for database connection
    connectionRetries: 3,
    retryDelay: 5000, // 5 seconds
  },
  
  // Session settings
  session: {
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    expirationDays: process.env.ENVIRONMENT === 'PROD' ? 7 : 1, // 7 days in prod, 1 day in dev
    cookieName: 'fnobaby.sid'
  },
  
  // Security settings
  security: {
    // CSP options controlled by middleware/security.js
    saltRounds: 10,
  }
};

// Helper to check if we're in production mode
config.isProd = config.environment === 'PROD' || config.nodeEnv === 'production';

module.exports = config;
