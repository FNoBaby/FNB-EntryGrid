const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get database parameters
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DIALECT = process.env.DB_DIALECT || 'mysql';

// Create Sequelize instance
console.log(`Connecting to MySQL database at ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: process.env.DEBUG === 'true' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    charset: 'utf8mb4',
    // Ensure proper handling of datetime/timestamps
    dateStrings: true,
    typeCast: true,
    // Increase timeout for session operations
    connectTimeout: 60000,
    // Move options out of the nested 'options' object
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  },
  // Set timezone to UTC to avoid timezone issues
  timezone: '+00:00'
});

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
