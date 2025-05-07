const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sequelize } = require('../db/connection');

// This route will only be active in development mode
// It helps diagnose issues with users in the database
router.get('/users-diagnostic', async (req, res) => {
  // Only run in non-production environments
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG) {
    return res.status(404).send('Not found');
  }
  
  try {
    // Show only minimal user data for security
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'isActive', 'createdAt']
    });
    
    // Add connection info
    const dbInfo = {
      dialect: sequelize.options.dialect,
      host: sequelize.options.host,
      port: sequelize.options.port,
      database: sequelize.options.database,
      connected: sequelize.authenticate().then(() => true).catch(() => false),
      modelName: User.name,
      tableName: User.tableName || 'Users'
    };
    
    return res.json({
      userCount: users.length,
      users,
      dbInfo,
      connectionState: sequelize.connectionManager.hasOwnProperty('pool') 
        ? {
            pool: {
              size: sequelize.connectionManager.pool.size,
              available: sequelize.connectionManager.pool.available,
              idle: sequelize.connectionManager.pool.idle
            }
        } : 'No pool available'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error fetching users for diagnostic',
      message: error.message,
      stack: error.stack
    });
  }
});

// Add a direct SQL query endpoint for debugging
router.get('/direct-users', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG) {
    return res.status(404).send('Not found');
  }
  
  try {
    // Use direct SQL query to avoid any ORM issues
    const [results] = await sequelize.query('SELECT id, username, role, isActive, createdAt FROM Users');
    
    return res.json({
      query: 'SELECT id, username, role, isActive, createdAt FROM Users',
      userCount: results.length,
      users: results,
      raw: true
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error fetching users with direct SQL',
      message: error.message,
      stack: error.stack
    });
  }
});

// Database test endpoint
router.get('/db-test', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG) {
    return res.status(404).send('Not found');
  }
  
  try {
    // Try to authenticate with the database
    await sequelize.authenticate();
    
    // Get list of all tables in the database
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
      { replacements: [sequelize.config.database] }
    );
    
    // Return success status
    return res.json({
      success: true,
      message: 'Database connection successful',
      tables: tables.map(t => t.table_name || t.TABLE_NAME),
      config: {
        dialect: sequelize.options.dialect,
        host: sequelize.options.host,
        port: sequelize.options.port,
        database: sequelize.config.database,
        username: sequelize.config.username,
        // Don't expose the password
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      stack: process.env.DEBUG === 'true' ? error.stack : undefined
    });
  }
});

module.exports = router;
