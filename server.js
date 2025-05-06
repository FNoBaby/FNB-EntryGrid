const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
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

// MySQL Connection Configuration for card database
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Log the configuration for debugging
console.log('Database configuration:');
console.log(JSON.stringify({
  ...dbConfig,
  password: dbConfig.password ? '********' : null
}, null, 2));

// Database pool for cards and sections
let pool;

// Function to initialize user database
const initializeUserDatabase = async () => {
  try {
    console.log('Checking user database initialization status...');
    
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
    console.error('User database initialization failed:', error);
    return false;
  }
};

// Initialize cards database function
async function initializeCardDatabase() {
  try {
    if (!pool) {
      console.log('Database not connected. Skipping table initialization.');
      return;
    }
    
    // Create sections table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        \`order\` INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Sections table ready');
    
    // Create cards table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        url VARCHAR(255) NOT NULL,
        iconType VARCHAR(50) NOT NULL,
        imageUrl VARCHAR(255),
        bootstrapIcon VARCHAR(50),
        buttonIcon VARCHAR(50),
        sectionId VARCHAR(36) NOT NULL,
        \`order\` INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sectionId) REFERENCES sections(id) ON DELETE CASCADE
      )
    `);
    console.log('Cards table ready');
    
    // Check if there are any sections, if not, add a default section and card
    const [sections] = await pool.query('SELECT COUNT(*) as count FROM sections');
    if (sections[0].count === 0) {
      await addDefaultSectionAndCard();
    }
  } catch (err) {
    console.error('Error initializing card database tables:', err);
    console.log('Tables may not be properly set up. Some features might not work.');
  }
}

// Add default section and card
async function addDefaultSectionAndCard() {
  console.log('Adding default section and card');
  
  try {
    // Create default section
    const sectionId = uuidv4();
    await pool.query(
      'INSERT INTO sections (id, title, `order`) VALUES (?, ?, ?)',
      [sectionId, 'Example Section', 1]
    );
    console.log('Default section created');
    
    // Create default card
    const cardId = uuidv4();
    await pool.query(
      `INSERT INTO cards (id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, \`order\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cardId,
        'Welcome Card',
        'This is an example card. You can edit this card or add new ones by clicking the buttons above.',
        'https://example.com',
        'bootstrap',
        null,
        'bi-house-fill',
        'bi-arrow-right',
        sectionId,
        1
      ]
    );
    console.log('Default card created');
  } catch (err) {
    console.error('Error creating default data:', err);
  }
}

// Add fallback for database operations
function withDatabaseCheck(handler) {
  return async (req, res) => {
    if (!pool) {
      return res.status(503).json({ 
        error: 'Database connection not available',
        message: 'The server is running in limited mode because the database is not connected.'
      });
    }
    
    try {
      await handler(req, res);
    } catch (err) {
      console.error('Database operation failed:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    }
  };
}

// Connection function for card database
async function connectToCardDatabase() {
  try {
    console.log('Attempting to connect to MySQL for card database with settings:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    
    // Test the connection before creating the pool
    const testConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    // Check if the database exists, create it if it doesn't
    await testConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await testConnection.query(`USE \`${dbConfig.database}\``);
    await testConnection.end();
    
    // Now create the connection pool
    pool = await mysql.createPool(dbConfig);
    console.log('Connected to MySQL database for cards successfully');
    await initializeCardDatabase();
    return true;
  } catch (err) {
    console.error('Error connecting to MySQL for card database:', err);
    console.log('Starting server without card database support. Some features will not work.');
    return false;
  }
}

// Initialize both databases before starting the server
(async () => {
  // Initialize user database first
  const userDbInitialized = await initializeUserDatabase();
  
  if (!userDbInitialized) {
    console.error('FATAL: Could not initialize user database. Exiting...');
    process.exit(1);
  }
  
  // Then connect to card database - continue even if it fails
  await connectToCardDatabase();
  
  // Continue with server setup after databases are initialized
  
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
        imgSrc: [
          "'self'", 
          "data:", 
          "https://cdn-icons-png.flaticon.com",
          "https://cdn.worldvectorlogo.com",
          "https://assets.ubuntu.com",
          "https://pterodactyl.io",
          "https://avatars.githubusercontent.com"
        ],
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
      clearExpired: true,
      checkExpirationInterval: 900000, // Check every 15 minutes
      expiration: 86400000, // Session expiration (24 hours)
      endConnectionOnClose: false,
    }),
    cookie: { 
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
  
  // Debug middleware if enabled
  if (DEBUG) {
    app.use((req, res, next) => {
      // Log headers and session info
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

  // Login route - POST - Use Sequelize User model
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
        
        // Explicitly save the session
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
        
        // Get return path and delete it from session
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        
        // Force session save again after modifying it
        await new Promise(resolve => req.session.save(resolve));
        
        // Response based on request type
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.json({ success: true, redirect: returnTo });
        } else {
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
  }

  // Redirecting root to dashboard
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });

  // Dashboard route with authentication
  app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log(`Serving dashboard to authenticated user: ${req.session.user.username}`);
    
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading index.html:', err);
        return res.status(500).send('Server Error');
      }
      
      let rendered = data;
      
      // Add user info to the page
      if (req.session && req.session.user) {
        rendered = rendered.replace(
          /<span id="user-name">User<\/span>/,
          `<span id="user-name">${req.session.user.name || req.session.user.username}</span>`
        );
        
        // If user is admin, make admin link visible
        if (req.session.user.role === 'admin') {
          rendered = rendered.replace(
            /<span id="admin-link-container" class="d-none">/,
            '<span id="admin-link-container">'
          );
        }
      }
      
      // Add database connection warning if needed
      if (!pool) {
        const dbWarning = `
          <div class="alert alert-warning alert-dismissible fade show mb-4" role="alert">
            <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Database Connection Issue</h4>
            <p>The server is running in limited mode because it couldn't connect to the database.</p>
            <hr>
            <p class="mb-0">Please check your database settings or contact the administrator.</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `;
        
        // Insert the warning after the page header
        const headerEndPos = rendered.indexOf('</div>', rendered.indexOf('page-header'));
        if (headerEndPos !== -1) {
          rendered = rendered.slice(0, headerEndPos + 6) + dbWarning + rendered.slice(headerEndPos + 6);
        }
      }
      
      res.send(rendered);
    });
  });

  // Admin page
  app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    console.log(`Serving admin page to admin user: ${req.session.user.username}`);
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  // User info API
  app.get('/api/user', isAuthenticated, (req, res) => {
    res.json({ user: req.session.user });
  });

  // Card API endpoints
  // Get all sections
  app.get('/api/sections', withDatabaseCheck(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM sections ORDER BY `order`');
    res.json(rows);
  }));

  // Get a specific section
  app.get('/api/sections/:id', withDatabaseCheck(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(rows[0]);
  }));

  // Create a new section
  app.post('/api/sections', isAuthenticated, withDatabaseCheck(async (req, res) => {
    const { title, order } = req.body;
    const id = uuidv4();
    
    await pool.query(
      'INSERT INTO sections (id, title, `order`) VALUES (?, ?, ?)',
      [id, title, order || 1]
    );
    
    const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  }));

  // Update a section
  app.put('/api/sections/:id', isAuthenticated, withDatabaseCheck(async (req, res) => {
    const { title, order } = req.body;
    
    const [result] = await pool.query(
      'UPDATE sections SET title = ?, `order` = ? WHERE id = ?',
      [title, order, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  }));

  // Delete a section
  app.delete('/api/sections/:id', isAuthenticated, withDatabaseCheck(async (req, res) => {
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Log the delete request for debugging
        console.log(`Deleting section with ID: ${req.params.id}`);
        
        // First delete all cards in the section
        const [cardResult] = await connection.query('DELETE FROM cards WHERE sectionId = ?', [req.params.id]);
        console.log(`Deleted ${cardResult.affectedRows} cards from section ${req.params.id}`);
        
        // Then delete the section
        const [sectionResult] = await connection.query('DELETE FROM sections WHERE id = ?', [req.params.id]);
        
        if (sectionResult.affectedRows === 0) {
          // Rollback if section not found
          await connection.rollback();
          connection.release();
          console.log(`No section found with ID: ${req.params.id}`);
          return res.status(404).json({ error: 'Section not found' });
        }
        
        // Commit the transaction
        await connection.commit();
        connection.release();
        
        console.log(`Successfully deleted section ID: ${req.params.id}`);
        res.json({ 
          message: 'Section deleted successfully', 
          id: req.params.id,
          cardsDeleted: cardResult.affectedRows
        });
      } catch (err) {
        // Rollback on error
        await connection.rollback();
        connection.release();
        throw err;
      }
    } catch (err) {
      console.error('Error in DELETE /api/sections/:id:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    }
  }));

  // Cards endpoints
  // Get all cards
  app.get('/api/cards', withDatabaseCheck(async (req, res) => {
    try {
      let query = 'SELECT * FROM cards';
      const params = [];
      
      // Filter by section if provided
      if (req.query.sectionId) {
        query += ' WHERE sectionId = ?';
        params.push(req.query.sectionId);
      }
      
      query += ' ORDER BY sectionId, `order`';
      
      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error('Error getting cards:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    }
  }));

  // Get a specific card
  app.get('/api/cards/:id', withDatabaseCheck(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(rows[0]);
  }));

  // Create a new card
  app.post('/api/cards', isAuthenticated, withDatabaseCheck(async (req, res) => {
    const { 
      title, description, url, iconType, imageUrl, bootstrapIcon, 
      buttonIcon, sectionId, order 
    } = req.body;
    
    const id = uuidv4();
    
    await pool.query(
      `INSERT INTO cards (id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, \`order\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, order || 1]
    );
    
    const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  }));

  // Update a card
  app.put('/api/cards/:id', isAuthenticated, withDatabaseCheck(async (req, res) => {
    const { 
      title, description, url, iconType, imageUrl, bootstrapIcon, 
      buttonIcon, sectionId, order 
    } = req.body;
    
    const [result] = await pool.query(
      `UPDATE cards
       SET title = ?, description = ?, url = ?, iconType = ?, imageUrl = ?,
       bootstrapIcon = ?, buttonIcon = ?, sectionId = ?, \`order\` = ?
       WHERE id = ?`,
      [title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, order, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  }));

  // Delete a card
  app.delete('/api/cards/:id', isAuthenticated, withDatabaseCheck(async (req, res) => {
    try {
      // Log the delete request for debugging
      console.log(`Deleting card with ID: ${req.params.id}`);
      
      // Execute the query with proper error handling
      const [result] = await pool.query('DELETE FROM cards WHERE id = ?', [req.params.id]);
      
      if (result.affectedRows === 0) {
        console.log(`No card found with ID: ${req.params.id}`);
        return res.status(404).json({ error: 'Card not found' });
      }
      
      console.log(`Successfully deleted card ID: ${req.params.id}`);
      res.json({ message: 'Card deleted successfully', id: req.params.id });
    } catch (err) {
      console.error('Error in DELETE /api/cards/:id:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    }
  }));

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
      console.log(`Blocked suspicious ${req.method} request to: ${req.path}`);
      return res.status(404).send('Not Found');
    }
    
    // Check if the request path includes any of the blocked patterns
    const isBlockedPath = blockedPaths.some(path => req.path.includes(path));
    
    if (isBlockedPath) {
      console.log(`Blocked suspicious request to: ${req.path}`);
      return res.status(404).send('Not Found');
    }
    
    if (req.session.user) {
      return next();
    }
    console.log(`Catch-all: redirecting unauthenticated request for ${req.path} to login`);
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
})();
