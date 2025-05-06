const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

/**
 * Sets up session middleware for the Express app
 * @param {object} app - Express app
 */
function setupSessionMiddleware(app) {
  const isProd = process.env.ENVIRONMENT === 'PROD';
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: true,                // Ensure session is saved
    saveUninitialized: false,
    store: new MySQLStore({
      // Direct connection options instead of using connectionString
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      },
      clearExpired: true,
      checkExpirationInterval: 900000, // Check every 15 minutes
      expiration: 86400000, // Session expiration (24 hours)
      endConnectionOnClose: false,
    }),
    cookie: { 
      secure: 'auto',
      maxAge: isProd ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days in prod, 24 hours in dev
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    },
    name: 'fnobaby.sid',
    rolling: true,
    proxy: true
  }));
}

module.exports = { setupSessionMiddleware };
