require('dotenv').config();

const ENVIRONMENT = process.env.ENVIRONMENT || 'DEV';
const isProd = ENVIRONMENT === 'PROD';

const config = {
  // General settings
  environment: ENVIRONMENT,
  isProd: isProd,
  port: process.env.PORT || (isProd ? 80 : 3000),
  
  // Security settings
  security: {
    enableCSP: isProd,
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    sessionMaxAge: isProd ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days in prod, 24 hours in dev
    secureCookies: isProd
  },
  
  // Database settings (for future use)
  database: {
    useInMemory: !isProd,
    connectionString: process.env.DB_CONNECTION_STRING
  },
  
  // Logging settings
  logging: {
    level: isProd ? 'info' : 'debug',
    console: true,
    file: isProd
  }
};

module.exports = config;
