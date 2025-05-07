const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const { sequelize, connectDB } = require('./connection');
const User = require('../models/User');

/**
 * Sets up both user and card databases
 * @returns {Promise<object>} Object containing setup status
 */
async function setupDatabase() {
  try {
    // Initialize user database first
    const userDbInitialized = await initializeUserDatabase();
    
    if (!userDbInitialized) {
      return { userDbInitialized: false, cardDbPool: null };
    }
    
    // Then connect to card database
    const cardDbPool = await connectToCardDatabase();
    
    return { userDbInitialized: true, cardDbPool };
  } catch (error) {
    console.error('Database setup error:', error);
    return { userDbInitialized: false, cardDbPool: null };
  }
}

/**
 * Initializes user database (Sequelize)
 */
async function initializeUserDatabase() {
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
    await sequelize.sync({ alter: false });  // Changed to false to avoid altering existing tables
    console.log('Database tables synced successfully');
    
    const DEBUG = process.env.DEBUG === 'true';
    
    // Log table names to verify
    if (DEBUG) {
      const [tables] = await sequelize.query('SHOW TABLES');
      console.log('Available tables:', tables.map(t => t[Object.keys(t)[0]]));
      
      // Check for the exact table name that might be used
      const tableName = User.tableName || 'Users';
      console.log('User model tableName:', tableName);
      
      // Instead of using tableNameQuery, use a simpler approach to check table existence
      const [checkTable] = await sequelize.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        {
          replacements: [sequelize.config.database, tableName]
        }
      );
      
      console.log(`Table ${tableName} existence check:`, checkTable[0].count > 0 ? 'Exists' : 'Does not exist');
    }
    
    // Check if admin user exists, create if not
    const adminCount = await User.count();
    console.log(`Found ${adminCount} users in the database`);
    
    if (adminCount === 0) {
      console.log('No users found. Creating default admin user...');
      await User.create({
        username: 'admin',
        password: 'admin123', // Will be hashed by model hook
        name: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
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
}

/**
 * Connects to card database and sets up tables (MySQL)
 */
async function connectToCardDatabase() {
  const DEBUG = process.env.DEBUG === 'true';
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
  
  try {
    if (DEBUG) {
      console.log('Attempting to connect to MySQL for card database with settings:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      });
    }
    
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
    
    // Log a success message about the database connection
    console.log(`Successfully connected to database: ${dbConfig.database}`);
    
    await testConnection.end();
    
    // Now create the connection pool
    const pool = await mysql.createPool(dbConfig);
    console.log('Connected to MySQL database for cards successfully');
    await initializeCardDatabase(pool);
    return pool;
  } catch (err) {
    console.error('Error connecting to MySQL for card database:', err);
    console.log('Starting server without card database support. Some features will not work.');
    return null;
  }
}

/**
 * Initialize cards database tables
 */
async function initializeCardDatabase(pool) {
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
    
    // Create cards table if it doesn't exist - add iconColor field
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
        iconColor VARCHAR(50),
        sectionId VARCHAR(36) NOT NULL,
        \`order\` INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sectionId) REFERENCES sections(id) ON DELETE CASCADE
      )
    `);
    console.log('Cards table ready');
    
    // Check if iconColor column exists, add it if it doesn't
    try {
      const [columns] = await pool.query('SHOW COLUMNS FROM cards LIKE "iconColor"');
      if (columns.length === 0) {
        console.log('Adding iconColor column to cards table');
        await pool.query('ALTER TABLE cards ADD COLUMN iconColor VARCHAR(50) AFTER buttonIcon');
      }
    } catch (err) {
      console.error('Error checking or adding iconColor column:', err);
    }
    
    // Check if there are any sections, if not, add a default section and card
    const [sections] = await pool.query('SELECT COUNT(*) as count FROM sections');
    if (sections[0].count === 0) {
      await addDefaultSectionAndCard(pool);
    }
  } catch (err) {
    console.error('Error initializing card database tables:', err);
    console.log('Tables may not be properly set up. Some features might not work.');
  }
}

/**
 * Add default section and card
 */
async function addDefaultSectionAndCard(pool) {
  console.log('Adding default section and card');
  
  try {
    // Create default section
    const sectionId = uuidv4();
    await pool.query(
      'INSERT INTO sections (id, title, `order`) VALUES (?, ?, ?)',
      [sectionId, 'Example Section', 1]
    );
    console.log('Default section created');
    
    // Create default card with iconColor
    const cardId = uuidv4();
    await pool.query(
      `INSERT INTO cards (id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, iconColor, sectionId, \`order\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cardId,
        'Welcome Card',
        'This is an example card. You can edit this card or add new ones by clicking the buttons above.',
        'https://example.com',
        'bootstrap',
        null,
        'bi-house-fill',
        'bi-arrow-right',
        '#0d6efd', // Default blue color
        sectionId,
        1
      ]
    );
    console.log('Default card created');
  } catch (err) {
    console.error('Error creating default data:', err);
  }
}

/**
 * Wrapper function for database operations
 * Can be used in two ways:
 * 1. withDatabaseCheck(handler) - Uses global.cardDbPool
 * 2. withDatabaseCheck(pool, handler) - Uses provided pool
 */
function withDatabaseCheck(poolOrHandler, handler) {
  // Handle both usage patterns
  if (typeof poolOrHandler === 'function' && handler === undefined) {
    // First usage pattern: withDatabaseCheck(handler)
    const handlerFn = poolOrHandler;
    
    return async (req, res) => {
      const dbPool = global.cardDbPool;
      if (!dbPool) {
        return res.status(503).json({ 
          error: 'Database connection not available',
          message: 'The server is running in limited mode because the database is not connected.'
        });
      }
      
      try {
        await handlerFn(req, res, dbPool);
      } catch (err) {
        console.error('Database operation failed:', err);
        res.status(500).json({ error: 'Database operation failed', details: err.message });
      }
    };
  }
  
  // Second usage pattern: withDatabaseCheck(pool, handler)
  const pool = poolOrHandler;
  return async (req, res) => {
    if (!pool) {
      return res.status(503).json({ 
        error: 'Database connection not available',
        message: 'The server is running in limited mode because the database is not connected.'
      });
    }
    
    try {
      await handler(req, res, pool);
    } catch (err) {
      console.error('Database operation failed:', err);
      res.status(500).json({ error: 'Database operation failed', details: err.message });
    }
  };
}

module.exports = { 
  setupDatabase,
  withDatabaseCheck
};