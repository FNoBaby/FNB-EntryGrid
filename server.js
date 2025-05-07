const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const session = require('express-session');
const fs = require('fs');
const dotenv = require('dotenv');

// Load configuration and utilities
const config = require('./config');
const { setupDatabase } = require('./db/setup');
const { setupSecurityMiddleware } = require('./middleware/security');
const { setupSessionMiddleware } = require('./middleware/session');

// Route modules
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const cardRoutes = require('./routes/cards');
const sectionRoutes = require('./routes/sections');
const viewRoutes = require('./routes/views');
const debugRoutes = require('./routes/debug');  // Add debug routes

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Global variables
const ENVIRONMENT = process.env.ENVIRONMENT || 'DEV';
const isProd = ENVIRONMENT === 'PROD';
const DEBUG = process.env.DEBUG === 'true';

console.log(`Starting server in ${ENVIRONMENT} mode${DEBUG ? ' with debugging' : ''}`);

// Initialize database and start server
(async () => {
  try {
    // Initialize databases
    const { userDbInitialized, cardDbPool } = await setupDatabase();
    
    if (!userDbInitialized) {
      console.error('FATAL: Could not initialize user database. Exiting...');
      process.exit(1);
    }
    
    // Verify login.html exists
    const loginFilePath = path.join(__dirname, 'public', 'login.html');
    if (!fs.existsSync(loginFilePath)) {
      console.error('ERROR: login.html file does not exist at:', loginFilePath);
      process.exit(1);
    }
    
    // Security middleware - stricter in production
    setupSecurityMiddleware(app, isProd);
    
    // Enable compression
    app.use(compression());
    
    // Body parser middleware
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    
    // Session middleware
    setupSessionMiddleware(app);
    
    // Set up for multiple proxies if needed (Pterodactyl + Nginx)
    app.set('trust proxy', 2);
    
    // Debug middleware if enabled
    if (DEBUG) {
      app.use((req, res, next) => {
        console.log(`[DEBUG] ${req.method} ${req.url}`);
        if (req.url.includes('/api/users')) {
          console.log(`[DEBUG] Session user:`, req.session.user);
        }
        next();
      });
    }
    
    // Register routes
    app.use('/', authRoutes);
    app.use('/api', apiRoutes);
    app.use('/api/cards', cardRoutes(cardDbPool));
    app.use('/api/sections', sectionRoutes(cardDbPool));
    app.use('/', viewRoutes);

    // Only enable debug routes in non-production environments
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log('Debug routes enabled at /debug/*');
      app.use('/debug', debugRoutes);
    }
    
    // Serve static files AFTER defining routes
    app.use(express.static(path.join(__dirname, 'public'), {
      index: false // Prevent automatically serving index.html
    }));
    
    // Catch-all route
    app.use((req, res, next) => {
      // Block common exploit/scan patterns
      const blockedPaths = [
        '/wp-', '/wordpress', '/wp-admin', '/wp-login', 
        '/admin/config', '/admin/config.php',
        '/phpmyadmin', '/mysql', '/db', 
        '/.env', '/config', '/.git',
        '/xmlrpc.php', '/shell', '/admin.php',
        '/setup-config.php', '/install.php',
        '/.well-known/acme-challenge', '/boaform',
        '/solr', '/vendor', '/cgi-bin', '/status',
        '/jenkins', '/manager', '/api/jsonws'
      ];
      
      // Additional suspicious request methods and paths
      if (req.method !== 'GET' && req.method !== 'POST') {
        if (DEBUG) console.log(`Blocked suspicious ${req.method} request to: ${req.path}`);
        return res.status(404).send('Not Found');
      }
      
      // Check if the request path includes any of the blocked patterns
      const isBlockedPath = blockedPaths.some(path => req.path.includes(path));
      
      if (isBlockedPath) {
        if (DEBUG) console.log(`Blocked suspicious request to: ${req.path}`);
        return res.status(404).send('Not Found');
      }
      
      if (req.session.user) {
        return next();
      }
      if (DEBUG) console.log(`Catch-all: redirecting unauthenticated request for ${req.path} to login`);
      res.redirect('/login');
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running in ${ENVIRONMENT} mode on http://localhost:${PORT}`);
      
      if (isProd) {
        console.log('Production-specific settings enabled:');
        console.log('- Content Security Policy enabled');
        console.log('- Secure cookies enabled');
        console.log('- Debug endpoints disabled');
        console.log('- Session timeout: 7 days');
      } else {
        console.log('Development-specific settings enabled:');
        console.log('- Content Security Policy configured');
        console.log('- Debug endpoints available at /debug-session');
        console.log('- Session timeout: 24 hours');
      }
      
      console.log('\nInitial login with:');
      console.log('Username: admin');
      console.log('Password: admin123');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
})();
