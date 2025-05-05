const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const fs = require('fs');
const { sequelize, connectDB } = require('./db/connection');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Environment configuration
const ENVIRONMENT = process.env.ENVIRONMENT || 'DEV';
const isProd = ENVIRONMENT === 'PROD';
const DEBUG = process.env.DEBUG === 'true';
console.log(`Starting server in ${ENVIRONMENT} mode${DEBUG ? ' with debugging' : ''}`);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002; // Default to 3002 instead of 3000

// Function to initialize database
const initializeDatabase = async () => {
  try {
    console.log('Checking database initialization status...');
    
    // First, try to connect
    await connectDB();
    
    // Check if the users table exists and has data
    let tableExists = false;
    try {
      // Query to check if the users table exists
      await User.findOne();
      tableExists = true;
    } catch (error) {
      if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeConnectionError') {
        console.log('Users table does not exist, will be created');
      } else {
        throw error;
      }
    }
    
    // Sync models with database (creates tables if they don't exist)
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });  // Use the imported sequelize instance
    console.log('Database tables synced successfully');
    
    // Check if admin user exists, create if not
    const adminCount = await User.count();
    if (adminCount === 0) {
      console.log('No users found. Creating default admin user...');
      await User.create({
        username: 'admin',
        password: 'admin123', // Will be hashed by model hook
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin'
      });
      console.log('Default admin user created successfully');
    } else {
      console.log(`Found ${adminCount} existing users, database initialization not needed`);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
};

// Initialize database before starting the server
(async () => {
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('FATAL: Could not initialize database. Exiting...');
    process.exit(1);
  }
  
  // Continue with server setup after database is initialized
  // Verify login.html exists
  const loginFilePath = path.join(__dirname, 'public', 'login.html');
  if (!fs.existsSync(loginFilePath)) {
    console.error('ERROR: login.html file does not exist at:', loginFilePath);
    process.exit(1);
  }

  // Security middleware - stricter in production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://cdn-icons-png.flaticon.com"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    }
  }));

  // Compress responses
  app.use(compression());

  // Body parser middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // MySQL session store options
  const sessionStoreOptions = process.env.DB_CONNECTION_STRING
    ? {
        // Use connection string
        connectionString: process.env.DB_CONNECTION_STRING,
        createDatabaseTable: true,
        schema: {
          tableName: 'sessions',
          columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
          }
        }
      }
    : {
        // Use individual parameters
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
        }
      };

  // Session configuration with MySQL store
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: true,                // Changed to true to ensure session is saved
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
      // Add these options for better session handling
      clearExpired: true,
      checkExpirationInterval: 900000, // Check every 15 minutes
      expiration: 86400000, // Session expiration (24 hours)
      endConnectionOnClose: false,
    }),
    cookie: { 
      // In Pterodactyl+Nginx setup, securing cookies can be tricky
      // Using 'auto' lets Express decide based on request protocol
      secure: 'auto',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      path: '/'                // Explicitly set path
    },
    name: 'fnobaby.sid',       // Custom session cookie name
    rolling: true,              // Refresh cookie expiration on each request
    proxy: true  // Trust the reverse proxy (Nginx)
  }));

  // Set up for multiple proxies if needed (Pterodactyl + Nginx)
  app.set('trust proxy', 2);
  
  // Add a header parsing middleware to detect the actual protocol
  app.use((req, res, next) => {
    // Log headers helpful for debugging proxy issues
    if (DEBUG) {
      console.log('[DEBUG] Headers:', {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'host': req.headers['host']
      });
    }
    next();
  });

  // Add headers for proper proxy handling
  app.set('trust proxy', 1); // Trust first proxy (Nginx)

  // Add this middleware to log cookies on every request for debugging
  app.use((req, res, next) => {
    console.log('Request cookies:', req.headers.cookie);
    next();
  });

  // Debugging middleware
  if (DEBUG) {
    app.use((req, res, next) => {
      console.log(`[DEBUG] ${req.method} ${req.url}`);
      console.log(`[DEBUG] Session:`, req.session);
      next();
    });
  }

  // Authentication middleware
  const isAuthenticated = (req, res, next) => {
    if (DEBUG) console.log(`[DEBUG] Auth check for ${req.path}: Session user:`, req.session.user);
    
    if (req.session.user) {
      return next();
    }
    
    console.log(`User not authenticated, redirecting to login from ${req.path}`);
    // Store the requested URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  };

  // Admin middleware - check if user is admin
  const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    return res.status(403).redirect('/');
  };

  // IMPORTANT: Handle routes BEFORE serving static files
  // The order is crucial here

  // Login route - GET
  app.get('/login', (req, res) => {
    if (req.session.user) {
      console.log('User already logged in, redirecting to dashboard');
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      return res.redirect(returnTo);
    }
    
    console.log('Serving login page');
    res.sendFile(loginFilePath);
  });

  // Login route - POST - Updated to use Sequelize User model
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (DEBUG) console.log(`[DEBUG] Login attempt for user: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    try {
      // Find user by username
      const user = await User.findOne({ where: { username: username.toLowerCase() } });
      
      if (!user || !user.isActive) {
        console.log(`Invalid login attempt: user '${username}' not found or inactive`);
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      
      if (isMatch) {
        // Update last login time
        await user.update({ lastLogin: new Date() });
        
        // Store user in session (excluding password)
        req.session.user = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        };
        
        // Explicitly save the session with error handling
        await new Promise((resolve, reject) => {
          req.session.save(err => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        console.log(`User ${username} logged in successfully. Session ID: ${req.session.id}`);
        console.log('Session data at login:', req.session);
        
        // Get return path and delete it from session
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        
        // Force session save again after modifying it
        await new Promise(resolve => req.session.save(resolve));
        
        // Use a server-side redirect instead of client-side
        if (req.xhr || req.headers.accept.includes('json')) {
          // API/AJAX request
          return res.json({ success: true, redirect: returnTo });
        } else {
          // Regular form submission
          return res.redirect(returnTo);
        }
      } else {
        console.log(`Invalid login attempt: wrong password for user '${username}'`);
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Logout route
  app.get('/logout', (req, res) => {
    if (req.session.user) {
      console.log(`User ${req.session.user.username} logged out`);
    }
    req.session.destroy(err => {
      if (err) console.error('Error destroying session:', err);
      res.redirect('/login');
    });
  });

  // Debugging middleware to monitor session consistency
  if (DEBUG) {
    app.use((req, res, next) => {
      const sessionId = req.session.id;
      const hasUser = !!req.session.user;
      
      console.log(`[DEBUG] Request: ${req.method} ${req.url}`);
      console.log(`[DEBUG] Session ID: ${sessionId}; Has user: ${hasUser}`);
      
      if (hasUser) {
        console.log(`[DEBUG] Logged in as: ${req.session.user.username}`);
      }
      
      // Add session consistency check to response
      const originalEnd = res.end;
      res.end = function(...args) {
        console.log(`[DEBUG] Response for ${req.url} - Session ID: ${req.session.id}; Has user: ${!!req.session.user}`);
        return originalEnd.apply(this, args);
      };
      
      next();
    });
  }

  // Debug routes - only available in development
  if (!isProd || DEBUG) {
    app.get('/debug-session', (req, res) => {
      res.json({
        environment: ENVIRONMENT,
        sessionExists: !!req.session,
        isAuthenticated: !!req.session.user,
        sessionData: req.session,
        cookies: req.headers.cookie
      });
    });
    
    // Create a test hash route for generating password hashes
    app.get('/debug-hash/:password', async (req, res) => {
      try {
        const hash = await bcrypt.hash(req.params.password, 10);
        res.json({ original: req.params.password, hash });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // Import API routes
  const apiRoutes = require('./routes/api');

  // API routes - use the router
  app.use('/api', apiRoutes);

  // Admin page - protected and requires admin role
  app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    console.log(`Serving admin page to admin user: ${req.session.user.username}`);
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  // Protected dashboard route - MUST come before static file serving
  app.get('/', isAuthenticated, (req, res) => {
    console.log(`Serving dashboard to authenticated user: ${req.session.user.username}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // User info API 
  app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({ user: req.session.user });
  });

  // AFTER defining all routes, THEN serve static files
  app.use(express.static(path.join(__dirname, 'public'), {
    index: false // Prevent automatically serving index.html
  }));

  // Catch-all route to redirect unmatched routes to login if not authenticated
  app.use((req, res, next) => {
    if (req.session.user) {
      return next();
    }
    console.log(`Catch-all: redirecting unauthenticated request for ${req.path} to login`);
    res.redirect('/login');
  });

  // Start server only after database is ready
  app.listen(PORT, () => {
    console.log(`Server running in ${ENVIRONMENT} mode on http://localhost:${PORT}`);
    
    if (isProd) {
      console.log('Production-specific settings enabled:');
      console.log('- Content Security Policy enabled');
      console.log('- Secure cookies enabled');
      console.log('- Debug endpoints disabled');
      console.log('- Session timeout: 7 days');
      console.log('- MySQL for sessions and users');
    } else {
      console.log('Development-specific settings enabled:');
      console.log('- Content Security Policy disabled');
      console.log('- Debug endpoints available at /debug-session');
      console.log('- Session timeout: 24 hours');
      console.log('- MySQL for sessions and users');
    }
    
    console.log('\nInitial login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nTo set up the database with initial users, run:');
    console.log('npm run db:setup');
  });
})();
